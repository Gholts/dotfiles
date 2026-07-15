// ==UserScript==
// @name         X Block Toolkit
// @namespace    gholts.x.block-toolkit
// @version      2026.07.15.7
// @description  Bulk-block members or followers of an open X List and add a native-style block button to posts.
// @author       Gholts
// @license      GNU Affero General Public License v3.0
// @match        https://x.com/*
// @match        https://twitter.com/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(() => {
    "use strict";

    const API_PATH = "/i/api/1.1/blocks/create.json";
    const AUTH_PATCH_MARK = "__xBlockToolkitAuthPatch";
    const UNBLOCK_GUARD_MARK = "__xBlockToolkitUnblockGuard";
    const POST_BUTTON_ATTR = "data-x-block-toolkit-button";
    const POST_BUTTON_WRAPPER_ATTR = "data-x-block-toolkit-button-wrapper";
    const SUPPRESSED_NOTICE_ATTR = "data-x-block-toolkit-suppressed-notice";
    const PANEL_ID = "x-block-toolkit-panel";
    const STYLE_ID = "x-block-toolkit-style";
    const TOAST_ID = "x-block-toolkit-toast";
    const BLOCK_CONCURRENCY = 4;
    const REQUEST_GAP_MS = 120;
    const SCAN_WAIT_MS = 180;
    const SEARCH_BLOCK_NOTICE =
        "Thanks. X will use this to make your timeline better.";
    const pageWindow =
        typeof unsafeWindow === "object" && unsafeWindow
            ? unsafeWindow
            : window;

    const bulk = {
        running: false,
        cancelled: false,
        blocked: 0,
        failed: 0,
        total: 0,
    };

    let bearerToken = "";
    let nativeFetch = null;
    let scanScheduled = false;
    let toastTimer = 0;

    class CancelledError extends Error {}

    function getHeader(headers, name) {
        if (!headers) return "";
        const wanted = name.toLowerCase();

        try {
            if (typeof headers.get === "function") {
                return headers.get(name) || headers.get(wanted) || "";
            }
        } catch {}

        if (Array.isArray(headers)) {
            for (const [key, value] of headers) {
                if (String(key).toLowerCase() === wanted) return value;
            }
            return "";
        }

        if (typeof headers === "object") {
            for (const key of Object.keys(headers)) {
                if (key.toLowerCase() === wanted) return headers[key];
            }
        }

        return "";
    }

    function captureBearer(value) {
        const token = String(value || "").trim();
        if (/^Bearer\s+\S+/i.test(token)) bearerToken = token;
    }

    function captureFetchHeaders(input, init) {
        try {
            captureBearer(getHeader(init?.headers, "authorization"));
            captureBearer(getHeader(input?.headers, "authorization"));
        } catch {}
    }

    function patchAuthHeaders() {
        const currentFetch = pageWindow.fetch;
        if (typeof currentFetch === "function") {
            nativeFetch = currentFetch.bind(pageWindow);
        }

        if (pageWindow[AUTH_PATCH_MARK]) return;
        pageWindow[AUTH_PATCH_MARK] = true;

        if (typeof currentFetch === "function") {
            pageWindow.fetch = function (input, init) {
                captureFetchHeaders(input, init);
                return currentFetch.apply(this, arguments);
            };
        }

        const Xhr = pageWindow.XMLHttpRequest;
        const originalSetHeader = Xhr?.prototype?.setRequestHeader;
        if (typeof originalSetHeader === "function") {
            Xhr.prototype.setRequestHeader = function (name, value) {
                if (String(name || "").toLowerCase() === "authorization") {
                    captureBearer(value);
                }
                return originalSetHeader.apply(this, arguments);
            };
        }
    }

    function getCsrfToken() {
        const match = document.cookie.match(/(?:^|;\s*)ct0=([^;]+)/);
        if (!match) return "";
        try {
            return decodeURIComponent(match[1]);
        } catch {
            return match[1];
        }
    }

    function delay(ms) {
        return new Promise((resolve) => pageWindow.setTimeout(resolve, ms));
    }

    async function cancellableDelay(ms) {
        let remaining = ms;
        while (remaining > 0) {
            if (bulk.cancelled) throw new CancelledError();
            const step = Math.min(remaining, 500);
            await delay(step);
            remaining -= step;
        }
    }

    async function waitForAuth(timeoutMs = 12000, cancellable = false) {
        const deadline = Date.now() + timeoutMs;
        while (!bearerToken && Date.now() < deadline) {
            if (cancellable && bulk.cancelled) throw new CancelledError();
            await delay(200);
        }
        if (!bearerToken) {
            throw new Error("X auth not captured. Reload X, then try again.");
        }
    }

    function rateLimitDelay(response) {
        const reset = Number(response.headers.get("x-rate-limit-reset"));
        if (Number.isFinite(reset) && reset > 0) {
            return Math.max(5000, reset * 1000 - Date.now() + 1500);
        }

        const retryAfter = Number(response.headers.get("retry-after"));
        if (Number.isFinite(retryAfter) && retryAfter > 0) {
            return retryAfter * 1000 + 500;
        }
        return 60000;
    }

    async function responseError(response) {
        let detail = "";
        try {
            const payload = await response.json();
            detail =
                payload?.errors?.[0]?.message ||
                payload?.error ||
                payload?.detail ||
                "";
        } catch {}
        return `X block request failed (${response.status}${detail ? `: ${detail}` : ""})`;
    }

    async function blockAccount(target, options = {}) {
        await waitForAuth(12000, Boolean(options.cancellable));
        if (!nativeFetch) throw new Error("X fetch API unavailable.");

        for (let attempt = 0; attempt < 5; attempt++) {
            if (options.cancellable && bulk.cancelled)
                throw new CancelledError();

            const csrfToken = getCsrfToken();
            if (!csrfToken)
                throw new Error("X CSRF token unavailable. Reload X.");

            const body = new URLSearchParams();
            if (target.userId) body.set("user_id", target.userId);
            else if (target.handle) body.set("screen_name", target.handle);
            else throw new Error("No X account identifier found.");
            body.set("skip_status", "1");
            body.set("include_entities", "0");

            const response = await nativeFetch(
                `${location.origin}${API_PATH}`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        authorization: bearerToken,
                        "content-type": "application/x-www-form-urlencoded",
                        "x-csrf-token": csrfToken,
                        "x-twitter-active-user": "yes",
                        "x-twitter-auth-type": "OAuth2Session",
                        "x-twitter-client-language":
                            document.documentElement.lang || "en",
                    },
                    body: body.toString(),
                },
            );

            if (response.ok) return;

            if (response.status === 429 && attempt < 4) {
                const waitMs = rateLimitDelay(response);
                options.onRateLimit?.(waitMs);
                if (options.cancellable) await cancellableDelay(waitMs);
                else await delay(waitMs);
                continue;
            }

            if (response.status >= 500 && attempt < 4) {
                if (options.cancellable)
                    await cancellableDelay(2000 * (attempt + 1));
                else await delay(2000 * (attempt + 1));
                continue;
            }

            throw new Error(await responseError(response));
        }
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            [${POST_BUTTON_ATTR}][data-state="busy"] { opacity: 0.45; }
            [${POST_BUTTON_ATTR}][data-state="blocked"] > div {
                color: rgb(244, 33, 46) !important;
            }
            [${SUPPRESSED_NOTICE_ATTR}] { display: none !important; }

            #${PANEL_ID} {
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 0;
                margin-left: auto;
                padding: 0;
                font: 15px/20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            #${PANEL_ID} .x-block-toolkit-status {
                min-width: 0;
                max-width: 260px;
                overflow: hidden;
                color: rgb(113, 118, 123);
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            #${PANEL_ID} button {
                flex: 0 0 auto;
                height: 32px;
                min-height: 32px;
                padding: 0 16px;
                border: 0;
                border-radius: 9999px;
                background: rgb(244, 33, 46);
                color: white;
                font: inherit;
                font-weight: 700;
                cursor: pointer;
                white-space: nowrap;
            }
            #${PANEL_ID} button:hover { background: rgb(220, 30, 41); }
            #${PANEL_ID} button[data-running="true"] {
                background: rgb(83, 100, 113);
            }

            #${TOAST_ID} {
                position: fixed;
                left: 50%;
                bottom: 24px;
                transform: translateX(-50%);
                z-index: 2147483647;
                max-width: min(520px, calc(100vw - 32px));
                padding: 10px 16px;
                border-radius: 9999px;
                background: rgb(15, 20, 25);
                color: white;
                box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
                font: 700 14px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                pointer-events: none;
            }

            @media (max-width: 700px) {
                #${PANEL_ID} .x-block-toolkit-status { display: none; }
                #${PANEL_ID} button { padding: 0 12px; }
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function showToast(message, durationMs = 3500) {
        document.getElementById(TOAST_ID)?.remove();
        pageWindow.clearTimeout(toastTimer);

        const toast = document.createElement("div");
        toast.id = TOAST_ID;
        toast.setAttribute("role", "status");
        toast.textContent = message;
        document.body.appendChild(toast);
        toastTimer = pageWindow.setTimeout(() => toast.remove(), durationMs);
    }

    function directDescendant(element, selector) {
        return Array.from(element.querySelectorAll(selector)).find(
            (candidate) => candidate.closest("article") === element,
        );
    }

    function postHandle(article) {
        const time = directDescendant(article, "time");
        const statusHref = time?.closest("a[href]")?.getAttribute("href") || "";
        const statusMatch = statusHref.match(
            /^\/?([A-Za-z0-9_]+)\/status\/\d+/,
        );
        if (statusMatch) return statusMatch[1];

        for (const link of article.querySelectorAll('a[href^="/"]')) {
            if (link.closest("article") !== article) continue;
            const href = link.getAttribute("href") || "";
            const match = href.match(/^\/([A-Za-z0-9_]+)$/);
            if (match) return match[1];
        }
        return "";
    }

    async function waitForUiElement(find, timeoutMs, errorMessage) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const element = find();
            if (element) return element;
            await delay(50);
        }
        throw new Error(errorMessage);
    }

    async function blockPostThroughNativeUi(article, handle) {
        const more = directDescendant(article, 'button[data-testid="caret"]');
        if (!more) throw new Error("Native More button unavailable.");

        let confirmation = null;
        try {
            more.click();

            const blockItem = await waitForUiElement(
                () => {
                    const items = Array.from(
                        document.querySelectorAll(
                            '[data-testid="Dropdown"] [data-testid="block"]',
                        ),
                    );
                    const wanted = `@${handle}`.toLowerCase();
                    return (
                        items.find((item) =>
                            (item.textContent || "")
                                .toLowerCase()
                                .includes(wanted),
                        ) || (items.length === 1 ? items[0] : null)
                    );
                },
                3000,
                `Native Block action for @${handle} unavailable.`,
            );
            blockItem.click();

            confirmation = await waitForUiElement(
                () =>
                    document.querySelector(
                        '[data-testid="confirmationSheetDialog"]',
                    ),
                3000,
                "Native block confirmation unavailable.",
            );
            const confirm = confirmation.querySelector(
                '[data-testid="confirmationSheetConfirm"]',
            );
            if (!confirm)
                throw new Error(
                    "Native Block confirmation button unavailable.",
                );

            confirm.click();
            await waitForUiElement(
                () => !confirmation.isConnected,
                12000,
                "Native block request did not finish.",
            );
        } catch (error) {
            if (confirmation?.isConnected) {
                confirmation
                    .querySelector('[data-testid="confirmationSheetCancel"]')
                    ?.click();
            } else if (document.querySelector('[data-testid="Dropdown"]')) {
                more.click();
            }
            throw error;
        }
    }

    function setBlockIcon(button) {
        const svg = button.querySelector("svg");
        if (!svg) return;
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.innerHTML =
            '<g><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM4 12a8 8 0 0 1 12.9-6.31L5.69 16.9A7.96 7.96 0 0 1 4 12Zm8 8a7.96 7.96 0 0 1-4.9-1.69L18.31 7.1A8 8 0 0 1 12 20Z"></path></g>';
    }

    function configurePostButton(button, article, handle) {
        button.setAttribute(POST_BUTTON_ATTR, "");
        button.setAttribute("aria-label", `Block @${handle}`);
        button.setAttribute("title", `Block @${handle}`);
        button.removeAttribute("aria-describedby");
        button.removeAttribute("aria-expanded");
        button.removeAttribute("aria-haspopup");
        button.removeAttribute("data-testid");
        button.type = "button";
        button.dataset.handle = handle;
        button.dataset.state = "ready";

        for (const element of button.querySelectorAll("[id], [data-testid]")) {
            element.removeAttribute("id");
            element.removeAttribute("data-testid");
        }
        setBlockIcon(button);

        button.addEventListener(
            "click",
            async (event) => {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                if (button.dataset.state !== "ready") return;

                const currentHandle =
                    postHandle(article) || button.dataset.handle;
                button.dataset.state = "busy";
                button.disabled = true;
                button.setAttribute("aria-label", `Blocking @${currentHandle}`);

                try {
                    await blockPostThroughNativeUi(article, currentHandle);

                    // X owns success handling and timeline removal. If X keeps this
                    // post rendered, allow retry after its native UI settles.
                    pageWindow.setTimeout(() => {
                        if (!button.isConnected) return;
                        button.dataset.state = "ready";
                        button.disabled = false;
                        button.setAttribute(
                            "aria-label",
                            `Block @${currentHandle}`,
                        );
                        button.setAttribute("title", `Block @${currentHandle}`);
                    }, 4000);
                } catch (error) {
                    button.dataset.state = "ready";
                    button.disabled = false;
                    button.setAttribute(
                        "aria-label",
                        `Block @${currentHandle}`,
                    );
                    showToast(error.message || "Block failed", 6000);
                }
            },
            true,
        );
    }

    function addPostBlockButton(article) {
        const caret = directDescendant(article, 'button[data-testid="caret"]');
        if (!caret?.parentElement) return;

        const handle = postHandle(article);
        if (!handle) return;

        const grok = directDescendant(
            article,
            'button[aria-label="Grok actions"]',
        );
        if (!grok) return;

        let actionRow = grok.parentElement;
        while (
            actionRow &&
            actionRow !== article &&
            !actionRow.contains(caret)
        ) {
            actionRow = actionRow.parentElement;
        }
        if (!actionRow || actionRow === article) return;

        let grokSlot = grok;
        let caretSlot = caret;
        while (grokSlot.parentElement !== actionRow) {
            grokSlot = grokSlot.parentElement;
        }
        while (caretSlot.parentElement !== actionRow) {
            caretSlot = caretSlot.parentElement;
        }
        if (grokSlot === caretSlot) return;

        const existing = Array.from(
            article.querySelectorAll(`[${POST_BUTTON_ATTR}]`),
        ).find((button) => button.closest("article") === article);
        if (existing) {
            const slot = existing.closest(`[${POST_BUTTON_WRAPPER_ATTR}]`);
            const correctlyPlaced =
                slot?.parentElement === actionRow &&
                slot.nextElementSibling === caretSlot;
            if (existing.dataset.handle === handle && correctlyPlaced) return;
            if (slot) slot.remove();
            else existing.remove();
        }

        // Clone X's complete Grok action slot. This preserves native spacing,
        // hover target, responsive classes, icon sizing, and alignment.
        const slot = grokSlot.cloneNode(true);
        const button = slot.matches("button")
            ? slot
            : slot.querySelector('button[aria-label="Grok actions"]');
        if (!button) return;

        for (const element of [
            slot,
            ...slot.querySelectorAll("[id], [data-testid]"),
        ]) {
            element.removeAttribute("id");
            element.removeAttribute("data-testid");
        }
        slot.setAttribute(POST_BUTTON_WRAPPER_ATTR, "");
        configurePostButton(button, article, handle);
        caretSlot.before(slot);
    }

    function isSupportedListHeading(element) {
        const text = (element?.textContent || "").trim();
        return text === "List members" || text === "List followers";
    }

    function suppressSearchBlockNotices() {
        const isLiveSearch =
            location.pathname === "/search" &&
            new URLSearchParams(location.search).get("f") === "live";

        for (const cell of document.querySelectorAll(
            '[data-testid="cellInnerDiv"]',
        )) {
            const text = (cell.textContent || "").replace(/\s+/g, " ").trim();
            const isBlockNotice =
                isLiveSearch &&
                text === SEARCH_BLOCK_NOTICE &&
                !cell.querySelector('article[data-testid="tweet"]');
            cell.toggleAttribute(SUPPRESSED_NOTICE_ATTR, isBlockNotice);
        }
    }

    function isUnblockConfirmation(dialog) {
        const confirm = dialog?.querySelector(
            '[data-testid="confirmationSheetConfirm"]',
        );
        return (confirm?.textContent || "").trim().toLowerCase() === "unblock";
    }

    function cancelVisibleUnblockConfirmations() {
        for (const dialog of document.querySelectorAll(
            '[data-testid="confirmationSheetDialog"]',
        )) {
            if (!isUnblockConfirmation(dialog)) continue;
            dialog
                .querySelector('[data-testid="confirmationSheetCancel"]')
                ?.click();
        }
    }

    function preventUnblockConfirmClick(event) {
        const target = event.target instanceof Element ? event.target : null;
        const confirm = target?.closest(
            '[data-testid="confirmationSheetConfirm"]',
        );
        const dialog = confirm?.closest(
            '[data-testid="confirmationSheetDialog"]',
        );
        if (!dialog || !isUnblockConfirmation(dialog)) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        dialog
            .querySelector('[data-testid="confirmationSheetCancel"]')
            ?.click();
    }

    function installUnblockGuard() {
        if (pageWindow[UNBLOCK_GUARD_MARK]) return;
        pageWindow[UNBLOCK_GUARD_MARK] = true;
        document.addEventListener("click", preventUnblockConfirmClick, true);
    }

    function findListDialog() {
        const headings = document.querySelectorAll(
            '#modal-header, [role="heading"], h1, h2',
        );
        for (const heading of headings) {
            if (!isSupportedListHeading(heading)) continue;
            const dialog = heading.closest('[role="dialog"]');
            if (dialog) return dialog;
        }
        return null;
    }

    function updatePanel(status, buttonText) {
        const panel = document.getElementById(PANEL_ID);
        if (!panel) return;
        const statusElement = panel.querySelector(".x-block-toolkit-status");
        const button = panel.querySelector("button");
        if (statusElement) {
            statusElement.textContent = status || "";
            statusElement.hidden = !status;
        }
        if (button && buttonText) button.textContent = buttonText;
        if (button) {
            button.dataset.running = String(bulk.running);
            button.title = status || buttonText || "Block all members";
            button.setAttribute(
                "aria-label",
                status && buttonText ? `${buttonText}. ${status}` : buttonText,
            );
        }
    }

    function ensureListPanel() {
        const dialog = findListDialog();
        const existing = document.getElementById(PANEL_ID);
        if (!dialog) {
            existing?.remove();
            return;
        }
        if (existing && dialog.contains(existing)) return;
        existing?.remove();

        const heading = Array.from(
            dialog.querySelectorAll('#modal-header, [role="heading"], h1, h2'),
        ).find(isSupportedListHeading);
        const close = dialog.querySelector(
            'button[data-testid="app-bar-close"]',
        );
        const header = close?.parentElement?.parentElement;
        if (!heading || !header?.contains(heading)) return;

        const listType =
            heading.textContent.trim() === "List followers"
                ? "followers"
                : "members";

        const panel = document.createElement("div");
        panel.id = PANEL_ID;
        panel.setAttribute("role", "region");
        panel.setAttribute("aria-label", "X list blocker");

        const status = document.createElement("div");
        status.className = "x-block-toolkit-status";
        status.hidden = true;
        status.setAttribute("aria-live", "polite");

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `Block all ${listType}`;
        button.title = `Block all ${listType} of this list`;
        button.setAttribute("aria-label", `Block all ${listType}`);
        button.addEventListener("click", () => {
            if (bulk.running) {
                bulk.cancelled = true;
                updatePanel("Stopping after current request…", "Stopping…");
                return;
            }
            startBulkBlock();
        });

        panel.append(status, button);
        header.appendChild(panel);
    }

    function findListScroller(dialog) {
        const candidates = [dialog, ...dialog.querySelectorAll("*")].filter(
            (element) => {
                if (element.scrollHeight <= element.clientHeight + 20)
                    return false;
                const overflow = getComputedStyle(element).overflowY;
                return overflow === "auto" || overflow === "scroll";
            },
        );
        candidates.sort(
            (a, b) =>
                b.scrollHeight -
                b.clientHeight -
                (a.scrollHeight - a.clientHeight),
        );
        return candidates[0] || null;
    }

    function collectVisibleMembers(dialog, targets, alreadyBlocked) {
        const before = targets.size + alreadyBlocked.size;

        for (const cell of dialog.querySelectorAll(
            '[data-testid="UserCell"]',
        )) {
            const action = Array.from(
                cell.querySelectorAll("button[data-testid]"),
            ).find((button) =>
                /^\d+-(?:follow|unfollow|unblock)$/.test(
                    button.getAttribute("data-testid") || "",
                ),
            );
            if (!action) continue;

            const match = (action.getAttribute("data-testid") || "").match(
                /^(\d+)-(follow|unfollow|unblock)$/,
            );
            if (!match) continue;

            const [, userId, actionName] = match;
            if (actionName === "unblock") {
                alreadyBlocked.add(userId);
                targets.delete(userId);
            } else if (!alreadyBlocked.has(userId)) {
                targets.set(userId, { userId });
            }
        }

        return targets.size + alreadyBlocked.size - before;
    }

    async function scanListMembers(dialog) {
        const scroller = findListScroller(dialog);
        if (!scroller) throw new Error("List scroller not found.");

        const targets = new Map();
        const alreadyBlocked = new Set();
        const initialScrollTop = scroller.scrollTop;
        let stagnantRounds = 0;

        try {
            for (let pass = 0; pass < 5000 && stagnantRounds < 5; pass++) {
                if (bulk.cancelled) throw new CancelledError();

                const foundBeforeScroll = collectVisibleMembers(
                    dialog,
                    targets,
                    alreadyBlocked,
                );
                updatePanel(
                    `Scanning… ${targets.size} to block · ${alreadyBlocked.size} already blocked`,
                    "Stop",
                );

                const oldTop = scroller.scrollTop;
                const oldHeight = scroller.scrollHeight;
                const step = Math.max(
                    450,
                    Math.floor(scroller.clientHeight * 0.95),
                );
                scroller.scrollTop = Math.min(oldTop + step, oldHeight);
                await cancellableDelay(SCAN_WAIT_MS);

                const foundAfterScroll = collectVisibleMembers(
                    dialog,
                    targets,
                    alreadyBlocked,
                );
                const atBottom =
                    scroller.scrollTop + scroller.clientHeight >=
                    scroller.scrollHeight - 4;
                const moved = scroller.scrollTop > oldTop + 1;
                const grew = scroller.scrollHeight > oldHeight + 1;
                const found = foundBeforeScroll + foundAfterScroll;

                if (atBottom && !moved && !grew && found === 0) {
                    stagnantRounds++;
                } else {
                    stagnantRounds = 0;
                }
            }
        } finally {
            if (scroller.isConnected) scroller.scrollTop = initialScrollTop;
        }

        return {
            targets: [...targets.values()],
            alreadyBlocked: alreadyBlocked.size,
        };
    }

    async function startBulkBlock() {
        const dialog = findListDialog();
        if (!dialog) {
            showToast("Open an X List members or followers page first.");
            return;
        }
        if (
            !pageWindow.confirm(
                "Block every currently unblocked account in this X List?\n\nYou can stop the run, but completed blocks will remain.",
            )
        ) {
            return;
        }

        bulk.running = true;
        bulk.cancelled = false;
        bulk.blocked = 0;
        bulk.failed = 0;
        bulk.total = 0;
        updatePanel("Waiting for X authorization…", "Stop");

        try {
            await waitForAuth(12000, true);
            const scan = await scanListMembers(dialog);
            bulk.total = scan.targets.length;

            if (!bulk.total) {
                updatePanel(
                    `Done. ${scan.alreadyBlocked} members already blocked.`,
                    "Run again",
                );
                return;
            }

            const workerCount = Math.min(BLOCK_CONCURRENCY, bulk.total);
            let nextIndex = 0;

            const runWorker = async (workerIndex) => {
                try {
                    if (workerIndex > 0) {
                        await cancellableDelay(workerIndex * REQUEST_GAP_MS);
                    }

                    while (!bulk.cancelled) {
                        const index = nextIndex++;
                        if (index >= bulk.total) return;
                        const target = scan.targets[index];

                        updatePanel(
                            `Blocking ${bulk.blocked + bulk.failed}/${bulk.total}… ${workerCount} parallel`,
                            "Stop",
                        );

                        try {
                            await blockAccount(target, {
                                cancellable: true,
                                onRateLimit: (waitMs) =>
                                    updatePanel(
                                        `Rate limited. Retrying in ${Math.ceil(waitMs / 1000)}s…`,
                                        "Stop",
                                    ),
                            });
                            bulk.blocked++;
                        } catch (error) {
                            if (error instanceof CancelledError) return;
                            bulk.failed++;
                            console.warn(
                                "[XBlockToolkit]",
                                target.userId,
                                error,
                            );
                        }

                        updatePanel(
                            `Blocking ${bulk.blocked + bulk.failed}/${bulk.total}… ${bulk.failed} failed`,
                            "Stop",
                        );

                        if (nextIndex < bulk.total && !bulk.cancelled) {
                            await cancellableDelay(REQUEST_GAP_MS);
                        }
                    }
                } catch (error) {
                    if (!(error instanceof CancelledError)) throw error;
                }
            };

            await Promise.all(
                Array.from({ length: workerCount }, (_, index) =>
                    runWorker(index),
                ),
            );
            if (bulk.cancelled) throw new CancelledError();

            updatePanel(
                `Done. ${bulk.blocked} blocked · ${bulk.failed} failed · ${scan.alreadyBlocked} already blocked`,
                "Run again",
            );
            showToast(`List blocking finished: ${bulk.blocked} blocked`, 5000);
        } catch (error) {
            if (error instanceof CancelledError) {
                updatePanel(
                    `Stopped. ${bulk.blocked} blocked · ${bulk.failed} failed`,
                    "Resume",
                );
            } else {
                updatePanel(error.message || "Bulk block failed", "Retry");
                showToast(error.message || "Bulk block failed", 6000);
            }
        } finally {
            bulk.running = false;
            bulk.cancelled = false;
            const button = document.querySelector(`#${PANEL_ID} button`);
            if (button) button.dataset.running = "false";
        }
    }

    function scanPage() {
        scanScheduled = false;
        injectStyles();
        cancelVisibleUnblockConfirmations();
        suppressSearchBlockNotices();
        for (const article of document.querySelectorAll(
            'article[data-testid="tweet"]',
        )) {
            addPostBlockButton(article);
        }
        ensureListPanel();
    }

    function scheduleScan() {
        if (scanScheduled) return;
        scanScheduled = true;
        pageWindow.requestAnimationFrame(scanPage);
    }

    function startUi() {
        if (!document.documentElement) {
            pageWindow.setTimeout(startUi, 0);
            return;
        }
        installUnblockGuard();
        scanPage();
        new MutationObserver(scheduleScan).observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    patchAuthHeaders();

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startUi, { once: true });
    } else {
        startUi();
    }
})();
