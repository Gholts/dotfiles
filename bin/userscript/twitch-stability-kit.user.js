// ==UserScript==
// @name         Twitch Stability Kit
// @namespace    gholts.twitch.stability-kit
// @version      2026.07.11.9
// @description  Max quality, channel points, live recovery, UI cleanup, and gentle playback keepalive for Twitch.
// @author       Gholts
// @license      GNU Affero General Public License v3.0
// @match        https://www.twitch.tv/*
// @match        https://player.twitch.tv/*
// @match        https://embed.twitch.tv/*
// @icon         https://assets.twitch.tv/assets/favicon-32-e29e246c157142c94346.png
// @run-at       document-start
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(() => {
    "use strict";

    const VERSION = "2026.07.11.9";

    const DEFAULTS = Object.freeze({
        maxQuality: true,
        autoClaimPoints: true,
        autoBackToLive: true,
        autoStartWatching: true,
        cleanUi: true,
        keepPlaying: true,
        wakeLock: false,
        debug: false,
        qualityBurstMs: 10000,
        qualityStepMs: 500,
        playerCacheMs: 3000,
        playerMissCacheMs: 1000,
        playerMissBackoffMaxMs: 30000,
        maxFiberNodes: 1000,
        maxFiberAncestors: 60,
        domCooldownMs: 250,
        claimCooldownMs: 3500,
        liveCooldownMs: 2500,
        gateCooldownMs: 3000,
        manualPauseWindowMs: 1500,
        pipKeepaliveMs: 12000,
        qualityStallWindowMs: 60000,
        qualityStallLimit: 3,
        qualitySuspendMs: 60000,
        qualityUiConfirmMs: 300000,
        qualityUiStepCooldownMs: 300,
        pipMountDelayMs: 1500,
    });

    const TOGGLES = Object.freeze([
        ["maxQuality", "Max quality"],
        ["autoClaimPoints", "Claim points"],
        ["autoBackToLive", "Back to live"],
        ["autoStartWatching", "Start watching"],
        ["cleanUi", "Clean UI"],
        ["keepPlaying", "Keep playing"],
        ["wakeLock", "Wake lock"],
        ["debug", "Debug logs"],
    ]);
    const STORE_PREFIX = "twitchStabilityKit.";
    const CONFIG = { ...DEFAULTS };

    function storageKey(key) {
        return `${STORE_PREFIX}${key}`;
    }

    function readBool(key, fallback) {
        try {
            if (typeof GM_getValue === "function") {
                const value = GM_getValue(storageKey(key), fallback);
                if (typeof value === "boolean") return value;
            }
        } catch {}
        try {
            const value = localStorage.getItem(storageKey(key));
            if (value === "true") return true;
            if (value === "false") return false;
        } catch {}
        return fallback;
    }

    function writeBool(key, value) {
        try {
            if (typeof GM_setValue === "function") {
                GM_setValue(storageKey(key), value);
                return;
            }
        } catch {}
        try {
            localStorage.setItem(storageKey(key), String(value));
        } catch {}
    }

    for (const [key] of TOGGLES) CONFIG[key] = readBool(key, DEFAULTS[key]);

    const host = location.hostname;
    const path = location.pathname || "";
    const isFrame = (() => {
        try {
            return window.frameElement !== null;
        } catch {
            return true;
        }
    })();
    const isEmbed =
        host === "player.twitch.tv" ||
        host === "embed.twitch.tv" ||
        path.startsWith("/embed/");
    if (isFrame && !isEmbed) return;

    const pageGlobal =
        typeof unsafeWindow === "object" && unsafeWindow
            ? unsafeWindow
            : window;
    const RUNTIME_KEY = "__twitchStabilityKitRuntime";
    try {
        if (pageGlobal[RUNTIME_KEY]) return;
        Object.defineProperty(pageGlobal, RUNTIME_KEY, {
            value: Object.freeze({ version: VERSION }),
            configurable: true,
        });
    } catch {
        if (document.documentElement?.dataset.twitchStabilityKit) return;
    }

    const markRuntime = () => {
        if (document.documentElement)
            document.documentElement.dataset.twitchStabilityKit = VERSION;
    };
    markRuntime();
    const CHAT_MUTATION_SELECTOR =
        '.chat-room, .chat-list, [data-a-target="chat-container"], [data-test-selector="chat-scrollable-area__message-container"]';

    const log = (...args) => {
        if (CONFIG.debug) console.debug("[TwitchKit]", ...args);
    };

    const isVisible = (el) => {
        if (!el || !el.isConnected) return false;
        const rect = el.getBoundingClientRect?.();
        return !!rect && rect.width > 0 && rect.height > 0;
    };

    const onceBody = (fn) => {
        let done = false;
        let mo = null;
        const run = () => {
            if (done || !document.body) return;
            done = true;
            mo?.disconnect();
            fn();
        };
        if (document.body) {
            run();
            return;
        }
        document.addEventListener("DOMContentLoaded", run, { once: true });
        if (document.documentElement) {
            mo = new MutationObserver(run);
            mo.observe(document.documentElement, { childList: true });
        }
    };

    const PLAYER_ROOT_SELECTOR =
        '[data-a-target="video-player"], [data-a-target="player-container"], .video-player';
    let lastMainVideo = null;

    function getPlayerRoot() {
        const root = document.querySelector(PLAYER_ROOT_SELECTOR);
        if (root) return root;
        return isEmbed ? document.body : null;
    }

    function getMainVideo() {
        const root = getPlayerRoot();
        const pipVideo = document.pictureInPictureElement;
        if (pipVideo?.tagName === "VIDEO" && pipVideo.isConnected) {
            lastMainVideo = pipVideo;
            return pipVideo;
        }
        if (!root) return lastMainVideo?.isConnected ? lastMainVideo : null;
        const video = [...root.querySelectorAll("video")].find(
            (video) =>
                isVisible(video) && !video.closest('[class*="carousel"]'),
        );
        if (video) {
            lastMainVideo = video;
            return video;
        }
        return root.contains(lastMainVideo) ? lastMainVideo : null;
    }

    function injectRuntimeCss() {
        if (document.getElementById("twitch-kit-runtime-css")) return;
        const style = document.createElement("style");
        style.id = "twitch-kit-runtime-css";
        style.textContent = `
      html[data-twitch-kit-quality-ui="1"] .ReactModal__Overlay:has(> [role="menu"]),
      html[data-twitch-kit-quality-ui="1"] .ReactModal__Content[role="menu"] {
        opacity: 0 !important;
        pointer-events: none !important;
      }

      .player-controls__right-control-group div:has(> #twitch-kit-pip-control) {
        display: flex !important;
        flex: 0 0 auto !important;
        flex-wrap: nowrap !important;
        white-space: nowrap !important;
      }

      #twitch-kit-pip-control {
        flex: 0 0 32px !important;
      }
    `;
        (document.head || document.documentElement).appendChild(style);
    }

    function injectCleanerCss() {
        const existing = document.getElementById("twitch-kit-css");
        if (!CONFIG.cleanUi) {
            existing?.remove();
            return;
        }
        if (existing) return;
        const style = document.createElement("style");
        style.id = "twitch-kit-css";
        style.textContent = `
      [data-test-selector="extension-disclaimer"],
      [data-a-target="top-nav-get-bits-button"],
      [data-a-target="top-nav-get-bits-button"] ~ .tw-new-item-indicator__container,
      div:has([data-a-target="top-nav-get-bits-button"]) > .tw-new-item-indicator__container,
      [data-a-target="prime-offers-icon"],
      [data-a-target="prime-offers-icon"] ~ .tw-new-item-indicator__container,
      div:has([data-a-target="prime-offers-icon"]) > .tw-new-item-indicator__container,
      .prime-offers,
      .top-nav__prime,
      .channel-panels,
      .channel-panels-container,
      [data-test-selector="masonry_container_selector"],
      [data-test-selector="user-notice-line"],
      .chat-room div:has(> div > button[aria-label="Previous leaderboard set" i]),
      .chat-room div:has(> div > button[aria-label$="Leaderboard" i]),
      html body [data-a-target="side-nav-stories-root"],
      html body [class*="storiesLeftNav" i],
      html body button[data-twitch-kit-hidden="1"],
      html body button[data-a-target*="gift" i],
      html body button[aria-label*="Gift a Sub" i],
      html body div:has(> div > div > button[data-a-target="gift-button"]),
      [data-target="channel-header-right"] > div:has([data-a-target="top-nav-get-bits-button"]),
      [data-a-target="video-player"] button:has([data-a-target="content-classification-warning-disclosure-overlay"]),
      [data-a-target="video-player"] .top-bar,
      [data-a-target="player-container"] .top-bar,
      .video-player .top-bar {
        display: none !important;
      }
    `;
        (document.head || document.documentElement).appendChild(style);
    }

    function getFiber(el) {
        if (!el) return null;
        for (const key in el) {
            if (
                key.startsWith("__reactFiber$") ||
                key.startsWith("__reactInternalInstance$") ||
                key.startsWith("__reactContainer$")
            ) {
                return el[key];
            }
        }
        return null;
    }

    function asPlayer(value) {
        if (!value) return null;
        const direct =
            value.mediaPlayerInstance ||
            value.playerInstance ||
            value.player ||
            value;
        if (
            direct &&
            typeof direct.getQualities === "function" &&
            typeof direct.setQuality === "function"
        )
            return direct;
        if (
            direct?.core &&
            typeof direct.core.getQualities === "function" &&
            typeof direct.setQuality === "function"
        )
            return direct;
        return null;
    }

    function playerFromFiber(node) {
        const buckets = [
            node.memoizedProps,
            node.pendingProps,
            node.stateNode,
            node.stateNode?.props,
        ];
        for (const bucket of buckets) {
            const player = asPlayer(bucket);
            if (player) return player;
        }
        return null;
    }

    function scanFiberAncestors(start) {
        const seen = new Set();
        let node = start;
        let count = 0;

        while (node && count++ < CONFIG.maxFiberAncestors) {
            if (seen.has(node)) return null;
            seen.add(node);
            const player = playerFromFiber(node);
            if (player) return player;
            node = node.return;
        }

        return null;
    }

    function scanFiber(start) {
        if (!start) return null;
        const seen = new Set();
        const stack = [start];
        let count = 0;

        while (stack.length && count < CONFIG.maxFiberNodes) {
            const node = stack.pop();
            if (!node || seen.has(node)) continue;
            seen.add(node);
            count += 1;

            const player = playerFromFiber(node);
            if (player) return player;

            if (node.child) stack.push(node.child);
            if (node !== start && node.sibling) stack.push(node.sibling);
        }

        return null;
    }

    let cachedPlayer = null;
    let cachedVideo = null;
    let cachedAt = 0;
    let playerMissCount = 0;
    let playerBackoffUntil = 0;

    function findPlayer() {
        const now = Date.now();
        const video = getMainVideo();
        if (
            cachedPlayer &&
            cachedVideo === video &&
            now - cachedAt < CONFIG.playerCacheMs
        )
            return cachedPlayer;
        if (
            !cachedPlayer &&
            cachedVideo === video &&
            now - cachedAt < CONFIG.playerMissCacheMs
        )
            return null;
        if (!cachedPlayer && now < playerBackoffUntil) return null;

        const root = getPlayerRoot();
        const roots = [video, root].filter(Boolean);

        for (const root of roots) {
            const fiber = getFiber(root);
            const player = scanFiberAncestors(fiber) || scanFiber(fiber);
            if (player) {
                cachedPlayer = player;
                cachedVideo = video;
                cachedAt = now;
                playerMissCount = 0;
                playerBackoffUntil = 0;
                return player;
            }
        }

        cachedPlayer = null;
        cachedVideo = video;
        cachedAt = now;
        playerMissCount += 1;
        if (playerMissCount >= 5) {
            const delay = Math.min(
                CONFIG.playerMissBackoffMaxMs,
                CONFIG.playerMissCacheMs *
                    2 ** Math.min(playerMissCount - 5, 5),
            );
            playerBackoffUntil = now + delay;
        }
        return null;
    }

    const qualityLabel = (q) =>
        String(q?.group || q?.name || q?.quality || q || "");
    const qualityParts = (q) =>
        [
            q?.group,
            q?.name,
            q?.quality,
            q?.label,
            q?.displayName,
            typeof q === "string" ? q : null,
        ]
            .filter(Boolean)
            .map(String);
    const qualityHeight = (q) => {
        const label = qualityLabel(q).toLowerCase();
        const parsed = label.match(/(\d{3,4})p/);
        if (Number(q?.height)) return Number(q.height);
        if (parsed) return Number(parsed[1]);
        if (label === "source" || label === "chunked") return 10000;
        return 0;
    };
    const qualityFps = (q) => {
        const parsed = qualityLabel(q).match(/p(\d{2,3})/);
        return Number(
            q?.frameRate || q?.framerate || (parsed && parsed[1]) || 0,
        );
    };
    const isAutoQuality = (q) => {
        return qualityParts(q).some((part) => {
            const label = part.toLowerCase();
            return label === "auto" || label.includes("auto");
        });
    };

    function getQualities(player) {
        try {
            const qs = player.getQualities?.();
            if (Array.isArray(qs) && qs.length) return qs;
        } catch {}
        try {
            const qs = player.core?.getQualities?.();
            if (Array.isArray(qs)) return qs;
        } catch {}
        return [];
    }

    function currentQualityMatches(player, best) {
        let current;
        try {
            current = player.getQuality?.();
        } catch {}
        const bestIds = new Set(
            [best?.group, best?.name, best?.quality]
                .filter(Boolean)
                .map(String),
        );
        const currentIds = [
            current?.group,
            current?.name,
            current?.quality,
            typeof current === "string" ? current : null,
        ]
            .filter(Boolean)
            .map(String);
        return currentIds.some((id) => bestIds.has(id));
    }

    function disableAutoQuality(player) {
        try {
            player.setAutoQualityMode?.(false);
        } catch {}
    }

    function applyQuality(player, best) {
        disableAutoQuality(player);
        const targets = [best?.group, best?.name, best?.quality, best].filter(
            (x) => x !== undefined && x !== null && x !== "",
        );
        for (const target of targets) {
            try {
                player.setQuality(target, false);
                return true;
            } catch {}
            try {
                player.setQuality(target);
                return true;
            } catch {}
        }
        return false;
    }

    function forceBestQuality() {
        if (!CONFIG.maxQuality || qualityBlocked()) return false;
        return forceBestQualityViaMenu();
    }

    let qualityTimer = 0;
    let qualityUntil = 0;
    let qualityOk = 0;
    let qualitySuspendedUntil = 0;
    let qualityUiConfirmedAt = 0;
    let qualityUiVideo = null;
    let qualityUiNextActionAt = 0;
    let qualityUiOwnsMenu = false;
    let qualityUiClosing = false;
    let qualityUiSafetyTimer = 0;
    const qualityStalls = [];

    function qualityBlocked() {
        return Date.now() < qualitySuspendedUntil;
    }

    function recordQualityStall() {
        const now = Date.now();
        qualityUiConfirmedAt = 0;
        while (
            qualityStalls.length &&
            now - qualityStalls[0] > CONFIG.qualityStallWindowMs
        ) {
            qualityStalls.shift();
        }
        qualityStalls.push(now);
        if (qualityStalls.length >= CONFIG.qualityStallLimit) {
            qualitySuspendedUntil = now + CONFIG.qualitySuspendMs;
            stopQualityBurst();
            qualityStalls.length = 0;
            log("quality suspended");
        }
    }

    function qualityMenuItems() {
        return [...document.querySelectorAll('[role="menuitemradio"]')].filter(
            isVisible,
        );
    }

    function qualityMenuItemChecked(item) {
        if (item.getAttribute("aria-checked") === "true") return true;
        const control = item.querySelector(
            'input[type="radio"], [role="radio"]',
        );
        return !!(
            control?.checked || control?.getAttribute("aria-checked") === "true"
        );
    }

    function bestQualityMenuItem(items) {
        const choices = items
            .filter((item) => {
                const text = item.textContent || "";
                return (
                    !isAutoQuality(text) &&
                    (qualityHeight(text) > 0 || /\bsource\b/i.test(text))
                );
            })
            .sort((a, b) => {
                const aText = a.textContent || "";
                const bText = b.textContent || "";
                return (
                    qualityHeight(bText) - qualityHeight(aText) ||
                    qualityFps(bText) - qualityFps(aText)
                );
            });
        return (
            choices.find((item) =>
                /\bsource\b/i.test(item.textContent || ""),
            ) || choices[0]
        );
    }

    function endQualityUiAutomation() {
        qualityUiOwnsMenu = false;
        qualityUiClosing = false;
        if (qualityUiSafetyTimer) window.clearTimeout(qualityUiSafetyTimer);
        qualityUiSafetyTimer = 0;
        window.setTimeout(() => {
            delete document.documentElement?.dataset.twitchKitQualityUi;
        }, 50);
    }

    function beginQualityUiAutomation() {
        qualityUiOwnsMenu = true;
        qualityUiClosing = false;
        if (document.documentElement)
            document.documentElement.dataset.twitchKitQualityUi = "1";
        if (qualityUiSafetyTimer) window.clearTimeout(qualityUiSafetyTimer);
        qualityUiSafetyTimer = window.setTimeout(() => {
            const settingsButton = getPlayerRoot()?.querySelector(
                '[data-a-target="player-settings-button"]',
            );
            const menu = document.querySelector('[role="menu"]');
            if (menu && settingsButton) settingsButton.click();
            endQualityUiAutomation();
        }, 5000);
    }

    function closeOwnedQualityMenu() {
        if (!qualityUiOwnsMenu) return true;
        const menus = [...document.querySelectorAll('[role="menu"]')];
        const menu = menus.find(
            (candidate) =>
                candidate.querySelector(
                    '[data-a-target="player-settings-menu-item-quality"], [data-a-target="player-settings-submenu-quality-option"], [data-test-selector="main-menu"]',
                ) !== null,
        );
        if (!menu) {
            endQualityUiAutomation();
            return true;
        }

        const backButton = menu.querySelector(
            'button[data-test-selector="main-menu"]',
        );
        if (backButton) {
            backButton.click();
            return false;
        }

        const closeButton = [
            ...menu.querySelectorAll('[role="menuitem"]'),
        ].find(
            (item) => (item.textContent || "").trim().toLowerCase() === "close",
        );
        if (closeButton) closeButton.click();
        else
            getPlayerRoot()
                ?.querySelector('[data-a-target="player-settings-button"]')
                ?.click();
        endQualityUiAutomation();
        return true;
    }

    function forceBestQualityViaMenu() {
        const video = getMainVideo();
        if (!video) return false;
        const now = Date.now();
        if (qualityUiOwnsMenu && qualityUiClosing)
            return closeOwnedQualityMenu();
        if (
            qualityUiVideo === video &&
            now - qualityUiConfirmedAt < CONFIG.qualityUiConfirmMs
        )
            return true;
        if (now < qualityUiNextActionAt) return false;

        const items = qualityMenuItems();
        if (items.length) {
            if (!qualityUiOwnsMenu) return false;
            const best = bestQualityMenuItem(items);
            if (!best) return false;
            if (!qualityMenuItemChecked(best))
                (best.querySelector("label") || best).click();
            qualityUiVideo = video;
            qualityUiConfirmedAt = now;
            qualityUiNextActionAt = now + CONFIG.qualityUiStepCooldownMs;
            log("quality menu", (best.textContent || "").trim());
            qualityUiClosing = true;
            return false;
        }

        const qualityButton = document.querySelector(
            '[data-a-target="player-settings-menu-item-quality"]',
        );
        if (qualityButton && isVisible(qualityButton)) {
            if (!qualityUiOwnsMenu) return false;
            qualityUiNextActionAt = now + CONFIG.qualityUiStepCooldownMs;
            qualityButton.click();
            return false;
        }

        const settingsButton = getPlayerRoot()?.querySelector(
            '[data-a-target="player-settings-button"]',
        );
        if (settingsButton && isVisible(settingsButton)) {
            if ([...document.querySelectorAll('[role="menu"]')].some(isVisible))
                return false;
            beginQualityUiAutomation();
            qualityUiNextActionAt = now + CONFIG.qualityUiStepCooldownMs;
            settingsButton.click();
        }
        return false;
    }

    function burstQuality(durationMs = CONFIG.qualityBurstMs) {
        if (!CONFIG.maxQuality || qualityBlocked() || !getPlayerRoot()) return;
        qualityUntil = Math.max(qualityUntil, Date.now() + durationMs);
        qualityOk = 0;
        if (qualityTimer) return;

        const tick = () => {
            qualityTimer = 0;
            let ok = false;
            try {
                ok = forceBestQuality();
            } catch (err) {
                log("quality error", err);
            }
            if (ok && ++qualityOk >= 2) return;
            if (Date.now() <= qualityUntil)
                qualityTimer = window.setTimeout(tick, CONFIG.qualityStepMs);
        };

        qualityTimer = window.setTimeout(tick, 0);
    }

    function stopQualityBurst() {
        if (qualityTimer) window.clearTimeout(qualityTimer);
        qualityTimer = 0;
        qualityUntil = 0;
        qualityOk = 0;
    }

    function claimPoints() {
        if (!CONFIG.autoClaimPoints) return;
        const now = Date.now();
        if (now - claimPoints.lastClick < CONFIG.claimCooldownMs) return;

        const selectors = [
            '[data-test-selector="community-points-summary"] .claimable-bonus__icon',
            ".claimable-bonus__icon",
        ];

        for (const selector of selectors) {
            const el = document.querySelector(selector);
            const button =
                el?.closest?.("button") ||
                (el?.tagName === "BUTTON" ? el : null);
            if (button && !button.disabled && isVisible(button)) {
                claimPoints.lastClick = now;
                button.click();
                log("claimed points");
                return;
            }
        }

        const buttons = document.querySelectorAll(
            "button[aria-label], button[data-test-selector]",
        );
        for (const button of buttons) {
            const label =
                `${button.getAttribute("aria-label") || ""} ${button.getAttribute("data-test-selector") || ""}`.toLowerCase();
            if (
                !button.disabled &&
                isVisible(button) &&
                label.includes("claim") &&
                (label.includes("bonus") || label.includes("point"))
            ) {
                claimPoints.lastClick = now;
                button.click();
                log("claimed points");
                return;
            }
        }
    }
    claimPoints.lastClick = 0;

    const backToLivePatterns = [
        /\bback\s+to\s+live\b/,
        /\breturn\s+to\s+live\b/,
        /\bgo\s+to\s+live\b/,
        /voltar.*(live|vivo)/,
        /retour.*direct/,
        /zur[u\u00fc]ck.*live/,
        /volver.*(live|directo|vivo)/,
        /regresar.*(live|directo|vivo)/,
        /\u623b\u308b.*(\u30e9\u30a4\u30d6|live)/,
        /\u8fd4\u56de.*(\u76f4\u64ad|live)/,
    ];
    const blockWords = [
        "clip",
        "settings",
        "config",
        "follow",
        "subscribe",
        "chat",
        "share",
    ];

    function clickBackToLive() {
        if (!CONFIG.autoBackToLive) return;
        const now = Date.now();
        if (now - clickBackToLive.lastClick < CONFIG.liveCooldownMs) return;

        const root = getPlayerRoot();
        if (!root) return;

        const buttons = root.querySelectorAll("button");
        for (const button of buttons) {
            if (!isVisible(button) || button.disabled) continue;
            const label =
                `${button.textContent || ""} ${button.getAttribute("aria-label") || ""} ${button.dataset?.aTarget || ""}`.toLowerCase();
            if (
                label.length > 90 ||
                blockWords.some((word) => label.includes(word))
            )
                continue;
            if (
                button.dataset?.aTarget?.includes("back-to-live") ||
                backToLivePatterns.some((pattern) => pattern.test(label))
            ) {
                clickBackToLive.lastClick = now;
                button.click();
                qualityUiConfirmedAt = 0;
                burstQuality(4000);
                log("back to live");
                return;
            }
        }
    }
    clickBackToLive.lastClick = 0;

    function clickContentGate() {
        if (!CONFIG.autoStartWatching) return;
        const now = Date.now();
        if (now - clickContentGate.lastClick < CONFIG.gateCooldownMs) return;
        const root = getPlayerRoot();
        if (!root) return;

        const selectors = [
            '[data-a-target="content-classification-gate-overlay-start-watching-button"]',
            '[data-a-target="player-overlay-content-gate"] button:not([disabled])',
        ];

        for (const selector of selectors) {
            const button = root.querySelector(selector);
            if (button && !button.disabled && isVisible(button)) {
                clickContentGate.lastClick = now;
                button.click();
                log("content gate");
                return;
            }
        }
    }
    clickContentGate.lastClick = 0;

    function restoreCleanUiElements() {
        document
            .querySelectorAll('[data-twitch-kit-hidden="1"]')
            .forEach((box) => {
                box.hidden = false;
                delete box.dataset.twitchKitHidden;
            });
    }

    function cleanUiElements() {
        if (!CONFIG.cleanUi) {
            restoreCleanUiElements();
            return;
        }
        document
            .querySelectorAll('[class*="carousel"] video')
            .forEach((video) => {
                try {
                    video.muted = true;
                    video.volume = 0;
                    video.pause();
                } catch {}
                const box = video.closest('[class*="carousel"]');
                if (box && !box.hidden) {
                    box.dataset.twitchKitHidden = "1";
                    box.hidden = true;
                }
            });

        document.querySelectorAll("button").forEach((button) => {
            const label = (button.textContent || "")
                .replace(/\s+/g, " ")
                .trim();
            if (!/^(?:Gift Turbo|Gift a Sub)$/i.test(label) || button.hidden)
                return;
            button.dataset.twitchKitHidden = "1";
            button.hidden = true;
        });
    }

    const boundVideos = new WeakSet();
    let wasPlaying = false;
    let lastPlayerInputAt = 0;
    let lastManualPauseAt = 0;
    let inPictureInPicture = false;
    let pipKeepaliveTimer = 0;
    let pipButton = null;
    let pipMountTemplate = null;
    let pipMountTemplateAt = 0;
    let pipMountTimer = 0;

    function getNativeMainVideo() {
        try {
            const nativeDocument = pageGlobal.document;
            const nativeRoot =
                nativeDocument?.querySelector(PLAYER_ROOT_SELECTOR);
            const nativeVideo = nativeRoot?.querySelector("video");
            if (nativeVideo) return nativeVideo;
        } catch {}
        return getMainVideo();
    }

    function nativePiPSupport(video = getNativeMainVideo()) {
        let standardRequest = null;
        try {
            const candidate =
                video?.requestPictureInPicture ||
                pageGlobal.HTMLVideoElement?.prototype?.requestPictureInPicture;
            if (typeof candidate === "function") standardRequest = candidate;
        } catch {}
        return {
            standardRequest,
            webkit: typeof video?.webkitSetPresentationMode === "function",
        };
    }

    function nativePiPActive(video = getNativeMainVideo()) {
        if (!video) return false;
        try {
            const nativeDocument = video.ownerDocument || pageGlobal.document;
            if (nativeDocument?.pictureInPictureElement === video) return true;
        } catch {}
        return video.webkitPresentationMode === "picture-in-picture";
    }

    function updatePiPButton() {
        if (!pipButton?.isConnected) return;
        const video = getNativeMainVideo();
        const support = nativePiPSupport(video);
        const supported = !!(support.standardRequest || support.webkit);
        const active = nativePiPActive(video);
        pipButton.disabled = !video || !supported;
        pipButton.setAttribute("aria-pressed", String(active));
        pipButton.setAttribute(
            "aria-label",
            active ? "Exit system mini player" : "Open system mini player",
        );
        pipButton.title = pipButton.disabled
            ? "System mini player unavailable"
            : pipButton.getAttribute("aria-label");
    }

    async function toggleNativePiP() {
        const video = getNativeMainVideo();
        if (!video) return;
        const nativeDocument = video.ownerDocument || pageGlobal.document;
        const support = nativePiPSupport(video);
        try {
            if (nativeDocument?.pictureInPictureElement) {
                await nativeDocument.exitPictureInPicture?.();
            } else if (nativePiPActive(video) && support.webkit) {
                video.webkitSetPresentationMode("inline");
            } else if (support.standardRequest) {
                await support.standardRequest.call(video);
            } else if (support.webkit) {
                if (
                    typeof video.webkitSupportsPresentationMode !==
                        "function" ||
                    video.webkitSupportsPresentationMode("picture-in-picture")
                ) {
                    video.webkitSetPresentationMode("picture-in-picture");
                }
            }
        } catch (err) {
            log("mini player error", err);
        }
        updatePiPButton();
    }

    function schedulePiPButtonMount(delayMs) {
        if (pipMountTimer) return;
        pipMountTimer = window.setTimeout(
            () => {
                pipMountTimer = 0;
                ensurePiPButton();
            },
            Math.max(50, delayMs),
        );
    }

    function playerControlsHavePiPRoom(settingsButton) {
        const group = settingsButton.closest(
            ".player-controls__right-control-group",
        );
        if (!group) return false;
        const available = group.getBoundingClientRect().width;
        const used = [...group.children].reduce(
            (width, child) => width + child.getBoundingClientRect().width,
            0,
        );
        return available >= used + 32;
    }

    function ensurePiPButton() {
        const existing = document.getElementById("twitch-kit-pip-control");
        if (existing?.isConnected) {
            pipButton = existing.querySelector("button");
            updatePiPButton();
            return;
        }

        const root = getPlayerRoot();
        const settingsButton = root?.querySelector(
            '[data-a-target="player-settings-button"]',
        );
        const template = settingsButton?.closest('[class*="InjectLayout"]');
        if (!settingsButton || !template?.parentElement) return;

        const now = Date.now();
        if (pipMountTemplate !== template) {
            pipMountTemplate = template;
            pipMountTemplateAt = now;
        }
        const mountDelay = CONFIG.pipMountDelayMs - (now - pipMountTemplateAt);
        if (mountDelay > 0) {
            schedulePiPButtonMount(mountDelay);
            return;
        }
        if (!playerControlsHavePiPRoom(settingsButton)) {
            schedulePiPButtonMount(250);
            return;
        }

        const control = template.cloneNode(true);
        control.id = "twitch-kit-pip-control";
        control.querySelectorAll("[id]").forEach((element) => {
            element.removeAttribute("id");
        });
        const button = control.querySelector("button");
        const svg = button?.querySelector("svg");
        if (!button || !svg) return;

        button.removeAttribute("aria-expanded");
        button.removeAttribute("aria-haspopup");
        button.removeAttribute("data-a-target");
        button.dataset.twitchKitPipButton = "1";
        button.type = "button";
        svg.replaceChildren();
        const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path",
        );
        path.setAttribute(
            "d",
            "M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-8v-2h8V6H3v12h7v2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm10 7h7v6h-7v-6Z",
        );
        svg.appendChild(path);
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleNativePiP();
        });

        template.parentElement.insertBefore(control, template);
        pipButton = button;
        updatePiPButton();
    }

    function isManagedVideo(video) {
        return video?.isConnected && video === getMainVideo();
    }

    function isPiPVideo(video = getMainVideo()) {
        return (
            !!video &&
            (inPictureInPicture || nativePiPActive(getNativeMainVideo()))
        );
    }

    function stopPiPKeepalive() {
        if (pipKeepaliveTimer) window.clearInterval(pipKeepaliveTimer);
        pipKeepaliveTimer = 0;
    }

    function shouldPiPKeepalive() {
        const video = getMainVideo();
        return (
            !!video &&
            isPiPVideo(video) &&
            (CONFIG.maxQuality || CONFIG.keepPlaying)
        );
    }

    function runPiPKeepalive() {
        const video = getMainVideo();
        if (!video || !isPiPVideo(video)) return;
        if (CONFIG.maxQuality) forceBestQuality();
        if (CONFIG.keepPlaying && wasPlaying && video.paused && !video.ended)
            resumeVideo();
    }

    function updatePiPKeepalive() {
        if (!shouldPiPKeepalive()) {
            stopPiPKeepalive();
            return;
        }
        runPiPKeepalive();
        if (!pipKeepaliveTimer) {
            pipKeepaliveTimer = window.setInterval(() => {
                if (shouldPiPKeepalive()) runPiPKeepalive();
                else stopPiPKeepalive();
            }, CONFIG.pipKeepaliveMs);
        }
    }

    function recoverPlaybackSoon(delayMs = 1000) {
        if (!CONFIG.keepPlaying || !wasPlaying || !isPiPVideo()) return;
        window.setTimeout(() => {
            resumeVideo();
            if (CONFIG.maxQuality) forceBestQuality();
        }, delayMs);
    }

    function bindVideo(video) {
        if (!video || boundVideos.has(video)) return;
        boundVideos.add(video);
        video.addEventListener(
            "play",
            () => {
                if (!isManagedVideo(video)) return;
                wasPlaying = true;
                burstQuality(6000);
                updatePiPKeepalive();
            },
            true,
        );
        video.addEventListener(
            "playing",
            () => {
                if (!isManagedVideo(video)) return;
                wasPlaying = true;
                burstQuality(6000);
                updatePiPKeepalive();
            },
            true,
        );
        video.addEventListener(
            "pause",
            () => {
                if (!isManagedVideo(video)) return;
                const now = Date.now();
                if (
                    !document.hidden ||
                    now - lastPlayerInputAt < CONFIG.manualPauseWindowMs
                ) {
                    wasPlaying = false;
                    lastManualPauseAt = now;
                } else {
                    recoverPlaybackSoon();
                }
            },
            true,
        );
        video.addEventListener(
            "enterpictureinpicture",
            () => {
                if (!isManagedVideo(video)) return;
                inPictureInPicture = true;
                wasPlaying = !video.paused && !video.ended;
                burstQuality(15000);
                updatePiPKeepalive();
                updatePiPButton();
            },
            true,
        );
        video.addEventListener(
            "leavepictureinpicture",
            () => {
                inPictureInPicture = false;
                stopPiPKeepalive();
                updatePiPButton();
            },
            true,
        );
        video.addEventListener(
            "webkitpresentationmodechanged",
            () => {
                inPictureInPicture = nativePiPActive(getNativeMainVideo());
                updatePiPKeepalive();
                updatePiPButton();
            },
            true,
        );
        for (const name of ["waiting", "stalled"]) {
            video.addEventListener(
                name,
                () => {
                    if (isManagedVideo(video)) recordQualityStall();
                    recoverPlaybackSoon(1500);
                },
                true,
            );
        }
        video.addEventListener(
            "suspend",
            () => recoverPlaybackSoon(1500),
            true,
        );
        video.addEventListener(
            "loadedmetadata",
            () => {
                if (isManagedVideo(video)) {
                    qualityUiConfirmedAt = 0;
                    burstQuality(8000);
                }
            },
            true,
        );
        video.addEventListener(
            "canplay",
            () => {
                if (isManagedVideo(video)) burstQuality(5000);
            },
            true,
        );
    }

    function bindVideos() {
        bindVideo(getMainVideo());
        updatePiPKeepalive();
        updatePiPButton();
    }

    function resumeVideo() {
        if (!CONFIG.keepPlaying || !wasPlaying) return;
        const video = getMainVideo();
        try {
            if (
                video?.paused &&
                !video.ended &&
                (video.readyState >= 2 || isPiPVideo(video))
            ) {
                const promise = video.play();
                if (promise?.catch) promise.catch(() => {});
            }
        } catch {}
    }

    let wakeLock = null;
    let wakeLockRequest = null;
    let wakeLockReleaseQueued = false;
    function releaseWakeLock() {
        wakeLockReleaseQueued = !!wakeLockRequest;
        const lock = wakeLock;
        wakeLock = null;
        if (!lock) return;
        try {
            const promise = lock.release();
            if (promise?.catch) promise.catch(() => {});
        } catch {}
    }

    async function requestWakeLock() {
        if (
            !CONFIG.wakeLock ||
            document.hidden ||
            getMainVideo()?.paused !== false ||
            wakeLock ||
            wakeLockRequest ||
            !navigator.wakeLock?.request
        )
            return;
        try {
            wakeLockRequest = navigator.wakeLock.request("screen");
            const lock = await wakeLockRequest;
            wakeLock = lock;
            lock.addEventListener(
                "release",
                () => {
                    if (wakeLock === lock) wakeLock = null;
                },
                { once: true },
            );
        } catch {
        } finally {
            wakeLockRequest = null;
            if (wakeLockReleaseQueued || document.hidden) releaseWakeLock();
        }
    }

    let menuCommandIds = [];

    function registerMenuCommands() {
        if (typeof GM_registerMenuCommand !== "function") return;

        const canRefresh = typeof GM_unregisterMenuCommand === "function";
        if (menuCommandIds.length) {
            if (!canRefresh) return;
            for (const id of menuCommandIds) {
                try {
                    GM_unregisterMenuCommand(id);
                } catch {}
            }
            menuCommandIds = [];
        }

        for (const [key, label] of TOGGLES) {
            const state = CONFIG[key] ? "on" : "off";
            const commandLabel = canRefresh
                ? `${label} = ${state}`
                : `Toggle ${label}`;
            try {
                const id = GM_registerMenuCommand(commandLabel, () => {
                    setToggle(key, !CONFIG[key]);
                });
                menuCommandIds.push(id);
            } catch {}
        }
    }

    function setToggle(key, value) {
        if (typeof DEFAULTS[key] !== "boolean") return;
        CONFIG[key] = Boolean(value);
        writeBool(key, CONFIG[key]);
        applyToggleChange(key);
        registerMenuCommands();
    }

    function applyToggleChange(key) {
        cachedPlayer = null;
        cachedVideo = null;
        cachedAt = 0;
        qualityUiConfirmedAt = 0;
        qualityUiVideo = null;
        qualityUiNextActionAt = 0;

        if (key === "maxQuality" && !CONFIG.maxQuality) stopQualityBurst();
        if (key === "wakeLock" && !CONFIG.wakeLock) releaseWakeLock();
        if (
            (key === "maxQuality" || key === "keepPlaying") &&
            !shouldPiPKeepalive()
        ) {
            stopPiPKeepalive();
        }
        if (key === "cleanUi") {
            injectCleanerCss();
            cleanUiElements();
        }

        scheduleDomWork();
        if (CONFIG.maxQuality && getMainVideo()) burstQuality(4000);
        if (CONFIG.wakeLock) requestWakeLock();
        updatePiPKeepalive();
    }

    function mutationTarget(mutation) {
        const target = mutation.target;
        const elementNode = typeof Node === "undefined" ? 1 : Node.ELEMENT_NODE;
        if (target?.nodeType === elementNode) return target;
        return target?.parentElement || null;
    }

    function hasNonChatMutation(mutations) {
        return mutations.some((mutation) => {
            const target = mutationTarget(mutation);
            return (
                !target ||
                typeof target.closest !== "function" ||
                !target.closest(CHAT_MUTATION_SELECTOR)
            );
        });
    }

    function runDomWork() {
        markRuntime();
        injectRuntimeCss();
        injectCleanerCss();
        ensurePiPButton();
        bindVideos();
        cleanUiElements();
        claimPoints();
        if (getPlayerRoot()) {
            clickBackToLive();
            clickContentGate();
        }
    }

    let domScheduled = false;
    let lastDomRun = 0;

    function scheduleDomWork() {
        if (domScheduled) return;
        domScheduled = true;
        const delay = Math.max(
            0,
            CONFIG.domCooldownMs - (Date.now() - lastDomRun),
        );
        window.setTimeout(() => {
            window.requestAnimationFrame(() => {
                domScheduled = false;
                lastDomRun = Date.now();
                runDomWork();
            });
        }, delay);
    }

    function onPageActivity() {
        scheduleDomWork();
        if (getMainVideo()) {
            burstQuality(8000);
            window.setTimeout(resumeVideo, 150);
            requestWakeLock();
        }
    }

    function patchNavigation() {
        let pageHistory = history;
        try {
            pageHistory = pageGlobal.history || history;
        } catch {}
        for (const name of ["pushState", "replaceState"]) {
            const original = pageHistory[name];
            if (original?.__twitchKitPatched) continue;
            const wrapped = function wrappedHistoryState(...args) {
                const result = original.apply(this, args);
                window.setTimeout(onPageActivity, 0);
                return result;
            };
            Object.defineProperty(wrapped, "__twitchKitPatched", {
                value: true,
            });
            pageHistory[name] = wrapped;
        }
        window.addEventListener("popstate", onPageActivity, true);
    }

    injectRuntimeCss();
    injectCleanerCss();
    patchNavigation();
    registerMenuCommands();

    document.addEventListener(
        "pointerdown",
        (event) => {
            if (event.target?.closest?.(PLAYER_ROOT_SELECTOR)) {
                lastPlayerInputAt = Date.now();
            }
        },
        true,
    );

    document.addEventListener(
        "keydown",
        (event) => {
            const target = event.target;
            if (
                target?.isContentEditable ||
                ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName)
            )
                return;
            if (
                event.defaultPrevented ||
                event.metaKey ||
                event.ctrlKey ||
                event.altKey
            )
                return;
            if (event.key === " " || event.key?.toLowerCase() === "k")
                if (getMainVideo()) lastPlayerInputAt = Date.now();
        },
        true,
    );

    document.addEventListener(
        "visibilitychange",
        () => {
            if (document.hidden) {
                const video = getMainVideo();
                const activeVideo = video && !video.paused && !video.ended;
                wasPlaying =
                    Date.now() - lastManualPauseAt < CONFIG.manualPauseWindowMs
                        ? false
                        : wasPlaying || activeVideo;
                updatePiPKeepalive();
                releaseWakeLock();
                return;
            }
            updatePiPKeepalive();
            onPageActivity();
        },
        true,
    );

    window.addEventListener("focus", onPageActivity, true);
    window.addEventListener("pageshow", onPageActivity, true);
    window.addEventListener("pagehide", releaseWakeLock, true);
    window.addEventListener("load", onPageActivity, { once: true });

    onceBody(() => {
        runDomWork();
        burstQuality(12000);
        requestWakeLock();

        const observer = new MutationObserver((mutations) => {
            if (hasNonChatMutation(mutations)) scheduleDomWork();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        window.setInterval(onPageActivity, 30000);
    });
})();
