// ==UserScript==
// @name         Universal Shortlink Resolver
// @namespace    gholts.universal-shortlink-resolver
// @version      2026.08.28
// @description  Resolve common redirect wrappers and conservative shortlink pages without defeating access controls.
// @author       Gholts
// @license      GNU Affero General Public License v3.0
// @homepageURL  https://github.com/Gholts/Dotfiles/tree/main/bin/userscript
// @updateURL    https://raw.githubusercontent.com/Gholts/Dotfiles/main/bin/userscript/universal-shortlink-resolver.user.js
// @downloadURL  https://raw.githubusercontent.com/Gholts/Dotfiles/main/bin/userscript/universal-shortlink-resolver.user.js
// @match        http://*/*
// @match        https://*/*
// @connect      *
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// @inject-into  auto
// @noframes
// ==/UserScript==

(() => {
    "use strict";

    try {
        if (window.self !== window.top) return;
    } catch {
        return;
    }

    const CONFIG = Object.freeze({
        debug: false,
        autoClick: true,
        followRedirects: true,
        popupControl: true,
        maxRedirectHops: 5,
        networkTimeoutMs: 10000,
        mutationDebounceMs: 180,
        minimumConfidence: 90,
        sameTabNavigation: true,
        cacheSize: 128,
        maxDecodeLayers: 4,
        maxResponseBytes: 512 * 1024,
        maxClicksPerRoute: 2,
        maxActionsPerDocument: 4,
        cacheTtlMs: 30 * 60 * 1000,
        countdownPatchMs: 120 * 1000,
        observerNodeBudget: 250,
        initialProbeMs: 12000,
        popupArmMs: 2500,
        ambiguityMargin: 5,
        shortenerActivationScore: 55,
        actionMinimumConfidence: 92,
        networkMinimumContext: 65,
        maxInlineScriptBytes: 256 * 1024,
        maxTextProbeChars: 24000,
    });

    const PREFIX = "[Universal Shortlink Resolver]";
    const INSTANCE_KEY = Symbol.for(
        "gholts.universalShortlinkResolver.instance",
    );
    const SESSION_CACHE_KEY = "universalShortlinkResolver.cache.v1";
    const SESSION_TRAIL_KEY = "universalShortlinkResolver.trail.v1";
    const MAX_URL_LENGTH = 8192;
    const MAX_DECODE_VALUES = 64;
    const MAX_JSON_VALUES = 32;
    const MAX_SCRIPT_LITERALS = 64;
    const HTTP_REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
    const DESTINATION_KEYS = new Set([
        "url",
        "u",
        "target",
        "dest",
        "destination",
        "redirect",
        "redirect_url",
        "redirect_uri",
        "to",
        "link",
        "out",
        "r",
    ]);
    const URL_DATA_ATTRIBUTES = Object.freeze([
        "data-url",
        "data-link",
        "data-href",
        "data-target-url",
        "data-destination",
        "data-dest",
        "data-redirect",
        "data-redirect-url",
        "data-out",
        "data-final-url",
        "data-target",
    ]);
    const INTERNAL_HOST_SUFFIXES = Object.freeze([
        ".localhost",
        ".local",
        ".localdomain",
        ".internal",
        ".intranet",
        ".lan",
        ".home",
        ".home.arpa",
        ".corp",
        ".private",
        ".test",
        ".invalid",
        ".example",
    ]);
    const URL_HTML_ENTITIES = Object.freeze({
        amp: "&",
        apos: "'",
        bsol: "\\",
        colon: ":",
        comma: ",",
        commat: "@",
        equals: "=",
        gt: ">",
        lcub: "{",
        lpar: "(",
        lsqb: "[",
        lt: "<",
        num: "#",
        percnt: "%",
        period: ".",
        plus: "+",
        quest: "?",
        quot: '"',
        rcub: "}",
        rpar: ")",
        rsqb: "]",
        semi: ";",
        sol: "/",
    });
    const SAFE_ACTION_PATTERN =
        /^(?:continue(?:\s+to\s+(?:the\s+)?(?:link|site|destination))?|get(?:\s+the)?\s+link|generate(?:\s+the)?\s+link|skip(?:\s+ad)?|proceed|access(?:\s+the)?\s+link|go\s+to(?:\s+the)?\s+link|open\s+link|visit\s+link)$/i;
    const DANGEROUS_ACTION_PATTERN =
        /\b(?:log\s*in|login|sign\s*in|register|sign\s*up|buy|purchase|subscribe|delete|remove\s+account|install|download\s+(?:software|app|extension|program)|payment|pay\s+now|checkout|wallet|account|connect\s+wallet|authorize|grant\s+access)\b/i;
    const SHORTENER_TEXT_PATTERN =
        /\b(?:short(?:ened)?\s+link|destination\s+link|your\s+link\s+is\s+(?:almost\s+)?ready|continue\s+to\s+(?:the\s+)?link|skip\s+ad|redirecting\s+(?:you\s+)?(?:to|in)|please\s+wait\s+\d+|link\s+will\s+be\s+ready)\b/i;
    const COUNTDOWN_TEXT_PATTERN =
        /\b(?:wait|ready|continue|redirect|link|skip)?\s*(?:in\s+)?\d{1,3}\s*(?:seconds?|secs?|s)\b/i;
    const WRAPPER_PATH_PATTERN =
        /(?:^|\/)(?:go|out|away|redirect|redir|link|skip|visit|external)(?:\/|$)/i;
    const WRAPPER_HOST_PATTERN =
        /(?:^|[.-])(?:short|shorten|shortlink|redirect|redir|link|lnk)(?:[.-]|$)/i;
    const POPUP_NOISE_PATTERN =
        /(?:^|[./?&=_-])(?:ads?|advert|banner|clickunder|popunder|popup|promo|sponsor|tracker|tracking)(?:$|[./?&=_-])/i;
    const ROUTE_EVENTS = Object.freeze([
        "popstate",
        "hashchange",
        "pageshow",
    ]);
    const nativeSetTimeout = window.setTimeout.bind(window);
    const nativeClearTimeout = window.clearTimeout.bind(window);
    const nativeQueueMicrotask =
        typeof window.queueMicrotask === "function"
            ? window.queueMicrotask.bind(window)
            : (callback) => Promise.resolve().then(callback);

    function debugLog(...args) {
        if (CONFIG.debug) console.debug(PREFIX, ...args);
    }

    function infoLog(...args) {
        console.info(PREFIX, ...args);
    }

    function warnLog(...args) {
        console.warn(PREFIX, ...args);
    }

    function errorMessage(error) {
        if (error instanceof Error) return error.message;
        return String(error || "Unknown error");
    }

    function normalizeWhitespace(value) {
        return String(value || "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function clamp(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, value));
    }

    function lowerHostname(hostname) {
        return String(hostname || "")
            .toLowerCase()
            .replace(/\.$/, "");
    }

    function ipv4Number(hostname) {
        const parts = hostname.split(".");
        if (
            parts.length !== 4 ||
            parts.some((part) => !/^\d{1,3}$/.test(part))
        ) {
            return null;
        }
        const octets = parts.map(Number);
        if (octets.some((octet) => octet > 255)) return null;
        return (
            ((octets[0] << 24) |
                (octets[1] << 16) |
                (octets[2] << 8) |
                octets[3]) >>>
            0
        );
    }

    function inIpv4Range(value, base, prefix) {
        if (prefix === 0) return true;
        const mask = (0xffffffff << (32 - prefix)) >>> 0;
        return (value & mask) === (base & mask);
    }

    function isNonPublicIpv4(hostname) {
        const value = ipv4Number(hostname);
        if (value === null) return false;
        const blocked = [
            [0x00000000, 8],
            [0x0a000000, 8],
            [0x64400000, 10],
            [0x7f000000, 8],
            [0xa9fe0000, 16],
            [0xac100000, 12],
            [0xc0000000, 24],
            [0xc0000200, 24],
            [0xc0586300, 24],
            [0xc0a80000, 16],
            [0xc6120000, 15],
            [0xc6336400, 24],
            [0xcb007100, 24],
            [0xe0000000, 4],
            [0xf0000000, 4],
        ];
        return blocked.some(([base, prefix]) =>
            inIpv4Range(value, base, prefix),
        );
    }

    function expandIpv6(hostname) {
        let source = hostname.replace(/^\[|\]$/g, "").toLowerCase();
        const zoneIndex = source.indexOf("%");
        if (zoneIndex >= 0) source = source.slice(0, zoneIndex);
        if (!source.includes(":")) return null;

        const ipv4Match = source.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
        if (ipv4Match) {
            const value = ipv4Number(ipv4Match[1]);
            if (value === null) return null;
            source =
                source.slice(0, ipv4Match.index) +
                ((value >>> 16) & 0xffff).toString(16) +
                ":" +
                (value & 0xffff).toString(16);
        }

        if ((source.match(/::/g) || []).length > 1) return null;
        const halves = source.split("::");
        const left = halves[0] ? halves[0].split(":") : [];
        const right = halves.length > 1 && halves[1] ? halves[1].split(":") : [];
        if (
            [...left, ...right].some(
                (part) => !/^[0-9a-f]{1,4}$/.test(part),
            )
        ) {
            return null;
        }
        const missing = 8 - left.length - right.length;
        if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
        return [
            ...left,
            ...Array(Math.max(0, missing)).fill("0"),
            ...right,
        ].map((part) => Number.parseInt(part, 16));
    }

    function isNonPublicIpv6(hostname) {
        const parts = expandIpv6(hostname);
        if (!parts) return false;
        const first = parts[0];
        if (first < 0x2000 || first > 0x3fff) return true;
        if (first === 0x2001 && parts[1] === 0x0db8) return true;
        if (first === 0x2001 && parts[1] === 0x0002) return true;
        if (
            first === 0x2001 &&
            (parts[1] & 0xfff0) === 0x0010
        ) {
            return true;
        }
        return false;
    }

    function isInternalHostname(hostname) {
        const host = lowerHostname(hostname).replace(/^\[|\]$/g, "");
        if (!host) return true;
        if (host === "localhost") return true;
        if (
            INTERNAL_HOST_SUFFIXES.some(
                (suffix) => host === suffix.slice(1) || host.endsWith(suffix),
            )
        ) {
            return true;
        }
        if (host.endsWith(".arpa")) return true;
        if (ipv4Number(host) !== null) return isNonPublicIpv4(host);
        if (host.includes(":")) return isNonPublicIpv6(host);
        if (!host.includes(".")) return true;
        return false;
    }

    function validateUrl(raw, baseUrl = location.href) {
        let text;
        try {
            text = String(raw ?? "").trim();
        } catch {
            return { ok: false, reason: "unreadable URL", url: null };
        }
        if (!text || text.length > MAX_URL_LENGTH) {
            return { ok: false, reason: "empty or oversized URL", url: null };
        }
        if (/[\u0000-\u001f\u007f]/.test(text)) {
            return { ok: false, reason: "control characters", url: null };
        }

        let url;
        try {
            url = new URL(text, baseUrl);
        } catch {
            return { ok: false, reason: "malformed URL", url: null };
        }
        if (url.protocol !== "http:" && url.protocol !== "https:") {
            return {
                ok: false,
                reason: "unsafe protocol " + url.protocol,
                url: null,
            };
        }
        if (url.username || url.password) {
            return { ok: false, reason: "embedded credentials", url: null };
        }
        if (isInternalHostname(url.hostname)) {
            return {
                ok: false,
                reason: "private or internal destination",
                url: null,
            };
        }
        return { ok: true, reason: "", url };
    }

    function canonicalUrl(raw) {
        const checked = validateUrl(raw);
        if (!checked.ok) return "";
        const url = new URL(checked.url.href);
        url.hash = "";
        return url.href;
    }

    function sameCanonicalUrl(left, right) {
        const a = canonicalUrl(left);
        const b = canonicalUrl(right);
        return Boolean(a && b && a === b);
    }

    function looksLikeRelativeUrl(value) {
        return /^(?:\/(?!\/)|\.{1,2}\/|\?|#)/.test(value);
    }

    function looksLikeEncodedDestination(value) {
        const text = String(value || "").trim();
        if (!text || text.length > MAX_URL_LENGTH) return false;
        return (
            /^(?:https?:)?\/\//i.test(text) ||
            looksLikeRelativeUrl(text) ||
            /^%[0-9a-f]{2}/i.test(text) ||
            /https?%3a/i.test(text) ||
            /^(?:\{|\[|"|')/.test(text) ||
            /&(?:amp|quot|#\d+|#x[0-9a-f]+);/i.test(text) ||
            /^[a-z0-9+/_-]{12,}={0,2}$/i.test(text)
        );
    }

    function stripWrapping(value) {
        let text = String(value || "").trim();
        const pairs = [
            ['"', '"'],
            ["'", "'"],
            ["(", ")"],
        ];
        for (const [start, end] of pairs) {
            if (
                text.length >= 2 &&
                text.startsWith(start) &&
                text.endsWith(end)
            ) {
                text = text.slice(1, -1).trim();
                break;
            }
        }
        return text;
    }

    function decodeHtmlEntities(value) {
        const text = String(value || "");
        if (!text.includes("&")) return text;
        return text.replace(
            /&(?:#(\d{1,7})|#x([0-9a-f]{1,6})|([a-z][a-z0-9]+));/gi,
            (entity, decimal, hexadecimal, named) => {
                if (decimal || hexadecimal) {
                    const codePoint = Number.parseInt(
                        decimal || hexadecimal,
                        decimal ? 10 : 16,
                    );
                    if (
                        !Number.isFinite(codePoint) ||
                        codePoint > 0x10ffff ||
                        (codePoint >= 0xd800 && codePoint <= 0xdfff)
                    ) {
                        return entity;
                    }
                    try {
                        return String.fromCodePoint(codePoint);
                    } catch {
                        return entity;
                    }
                }
                return URL_HTML_ENTITIES[named.toLowerCase()] || entity;
            },
        );
    }

    function decodePercent(value, formEncoded = false) {
        try {
            const source = formEncoded
                ? String(value).replace(/\+/g, "%20")
                : String(value);
            return decodeURIComponent(source);
        } catch {
            return "";
        }
    }

    function decodeBase64(value) {
        const text = String(value || "").trim();
        if (
            text.length < 12 ||
            text.length > MAX_URL_LENGTH ||
            !/^[a-z0-9+/_-]+={0,2}$/i.test(text)
        ) {
            return "";
        }
        let normalized = text.replace(/-/g, "+").replace(/_/g, "/");
        const remainder = normalized.length % 4;
        if (remainder === 1) return "";
        if (remainder) normalized += "=".repeat(4 - remainder);

        try {
            const binary = atob(normalized);
            const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
            let decoded = "";
            try {
                decoded = new TextDecoder("utf-8", { fatal: true }).decode(
                    bytes,
                );
            } catch {
                if (
                    [...binary].some((char) => {
                        const code = char.charCodeAt(0);
                        return code < 9 || (code > 13 && code < 32);
                    })
                ) {
                    return "";
                }
                decoded = binary;
            }
            return looksLikeEncodedDestination(decoded) ? decoded : "";
        } catch {
            return "";
        }
    }

    function collectJsonStrings(value) {
        const output = [];
        let parsed;
        try {
            parsed = JSON.parse(String(value));
        } catch {
            return output;
        }

        const queue = [{ value: parsed, key: "", depth: 0 }];
        while (queue.length && output.length < MAX_JSON_VALUES) {
            const item = queue.shift();
            if (item.depth > CONFIG.maxDecodeLayers) continue;
            if (typeof item.value === "string") {
                if (
                    !item.key ||
                    DESTINATION_KEYS.has(item.key.toLowerCase()) ||
                    looksLikeEncodedDestination(item.value)
                ) {
                    output.push(item.value);
                }
                continue;
            }
            if (!item.value || typeof item.value !== "object") continue;
            if (Array.isArray(item.value)) {
                for (const child of item.value.slice(0, 16)) {
                    queue.push({
                        value: child,
                        key: item.key,
                        depth: item.depth + 1,
                    });
                }
                continue;
            }
            for (const [key, child] of Object.entries(item.value).slice(0, 24)) {
                queue.push({
                    value: child,
                    key,
                    depth: item.depth + 1,
                });
            }
        }
        return output;
    }

    function decodeJavascriptString(value, quote) {
        const source = String(value || "");
        if (
            quote === String.fromCharCode(96) &&
            source.includes("$" + "{")
        ) {
            return "";
        }
        let output = "";
        for (let index = 0; index < source.length; index += 1) {
            const char = source[index];
            if (char !== "\\") {
                output += char;
                continue;
            }
            index += 1;
            if (index >= source.length) return "";
            const escaped = source[index];
            const simple = {
                b: "\b",
                f: "\f",
                n: "\n",
                r: "\r",
                t: "\t",
                v: "\v",
                "0": "\0",
                "\\": "\\",
                "'": "'",
                '"': '"',
            };
            if (Object.hasOwn(simple, escaped)) {
                output += simple[escaped];
                continue;
            }
            if (escaped === "\n") continue;
            if (escaped === "\r") {
                if (source[index + 1] === "\n") index += 1;
                continue;
            }
            if (escaped === "x") {
                const hex = source.slice(index + 1, index + 3);
                if (!/^[0-9a-f]{2}$/i.test(hex)) return "";
                output += String.fromCharCode(Number.parseInt(hex, 16));
                index += 2;
                continue;
            }
            if (escaped === "u") {
                if (source[index + 1] === "{") {
                    const end = source.indexOf("}", index + 2);
                    if (end < 0) return "";
                    const hex = source.slice(index + 2, end);
                    if (!/^[0-9a-f]{1,6}$/i.test(hex)) return "";
                    const codePoint = Number.parseInt(hex, 16);
                    if (codePoint > 0x10ffff) return "";
                    output += String.fromCodePoint(codePoint);
                    index = end;
                    continue;
                }
                const hex = source.slice(index + 1, index + 5);
                if (!/^[0-9a-f]{4}$/i.test(hex)) return "";
                output += String.fromCharCode(Number.parseInt(hex, 16));
                index += 4;
                continue;
            }
            output += escaped;
        }
        return output;
    }

    function readJavascriptLiteral(source, start, quote) {
        let raw = "";
        let escaped = false;
        const limit = Math.min(source.length, start + 4096);
        for (let index = start; index < limit; index += 1) {
            const char = source[index];
            if (!escaped && char === quote) {
                return {
                    value: decodeJavascriptString(raw, quote),
                    end: index + 1,
                };
            }
            if (
                !escaped &&
                quote !== String.fromCharCode(96) &&
                (char === "\n" || char === "\r")
            ) {
                return null;
            }
            raw += char;
            if (escaped) escaped = false;
            else if (char === "\\") escaped = true;
        }
        return null;
    }

    function destinationParamsFromUrl(url) {
        const output = [];
        try {
            for (const [key, value] of url.searchParams) {
                if (DESTINATION_KEYS.has(key.toLowerCase()) && value) {
                    output.push({ key: key.toLowerCase(), value });
                }
            }
            let hash = url.hash.slice(1);
            if (hash.startsWith("?")) hash = hash.slice(1);
            if (hash.includes("=")) {
                const params = new URLSearchParams(hash);
                for (const [key, value] of params) {
                    if (DESTINATION_KEYS.has(key.toLowerCase()) && value) {
                        output.push({ key: key.toLowerCase(), value });
                    }
                }
            }
        } catch {}
        return output;
    }

    function extractDestinationUrls(raw, baseUrl, allowRelative = false) {
        const queue = [
            {
                value: stripWrapping(decodeHtmlEntities(raw)),
                depth: 0,
                evidence: ["literal"],
            },
        ];
        const seen = new Set();
        const results = [];

        while (queue.length && seen.size < MAX_DECODE_VALUES) {
            const item = queue.shift();
            const value = stripWrapping(item.value);
            if (!value || value.length > MAX_URL_LENGTH || seen.has(value)) {
                continue;
            }
            seen.add(value);

            const mayResolve =
                /^(?:https?:)?\/\//i.test(value) ||
                (allowRelative && looksLikeRelativeUrl(value));
            if (mayResolve) {
                const checked = validateUrl(value, baseUrl);
                if (checked.ok) {
                    const nested = destinationParamsFromUrl(checked.url);
                    results.push({
                        url: checked.url.href,
                        depth: item.depth,
                        evidence: item.evidence,
                        hasNested: nested.length > 0,
                    });
                    if (item.depth < CONFIG.maxDecodeLayers) {
                        for (const parameter of nested) {
                            queue.push({
                                value: parameter.value,
                                depth: item.depth + 1,
                                evidence: [
                                    ...item.evidence,
                                    "parameter:" + parameter.key,
                                ],
                            });
                        }
                    }
                }
            }

            if (item.depth >= CONFIG.maxDecodeLayers) continue;
            const variants = [];
            const html = decodeHtmlEntities(value);
            if (html !== value) {
                variants.push([html, "html-entities"]);
            }
            const percent = decodePercent(value);
            if (percent && percent !== value) {
                variants.push([percent, "percent"]);
            }
            if (value.includes("+")) {
                const formPercent = decodePercent(value, true);
                if (formPercent && formPercent !== value) {
                    variants.push([formPercent, "form-percent"]);
                }
            }
            const base64 = decodeBase64(value);
            if (base64 && base64 !== value) {
                variants.push([base64, "base64"]);
            }
            if (/^\s*[\[{"']/.test(value)) {
                for (const jsonValue of collectJsonStrings(value)) {
                    variants.push([jsonValue, "json"]);
                }
            }
            for (const [next, evidence] of variants) {
                queue.push({
                    value: next,
                    depth: item.depth + 1,
                    evidence: [...item.evidence, evidence],
                });
            }
        }

        if (!results.length) return [];
        const leafDepth = Math.max(...results.map((result) => result.depth));
        const leaves = results.filter(
            (result) => result.depth === leafDepth && !result.hasNested,
        );
        const selected =
            leaves.length > 0
                ? leaves
                : results.filter((result) => result.depth === leafDepth);
        const unique = new Map();
        for (const result of selected) {
            const key = canonicalUrl(result.url);
            if (key && !unique.has(key)) unique.set(key, result);
        }
        return [...unique.values()];
    }

    class LruCache {
        constructor(limit, ttlMs) {
            this.limit = Math.max(1, limit);
            this.ttlMs = Math.max(1000, ttlMs);
            this.entries = new Map();
        }

        get(key) {
            const entry = this.entries.get(key);
            if (!entry) return null;
            if (Date.now() - entry.at > this.ttlMs) {
                this.entries.delete(key);
                return null;
            }
            this.entries.delete(key);
            this.entries.set(key, entry);
            return entry.value;
        }

        set(key, value) {
            this.entries.delete(key);
            this.entries.set(key, { value, at: Date.now() });
            while (this.entries.size > this.limit) {
                this.entries.delete(this.entries.keys().next().value);
            }
        }
    }

    function readSessionJson(key, fallback) {
        try {
            const parsed = JSON.parse(sessionStorage.getItem(key) || "");
            return parsed ?? fallback;
        } catch {
            return fallback;
        }
    }

    function writeSessionJson(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
        } catch {}
    }

    const resolvedCache = new LruCache(CONFIG.cacheSize, CONFIG.cacheTtlMs);

    function sessionCacheGet(source) {
        const key = canonicalUrl(source);
        if (!key) return "";
        const now = Date.now();
        const entries = readSessionJson(SESSION_CACHE_KEY, []);
        if (!Array.isArray(entries)) return "";
        let changed = false;
        let destination = "";
        const live = [];
        for (const entry of entries) {
            if (
                !entry ||
                typeof entry.source !== "string" ||
                typeof entry.destination !== "string" ||
                !Number.isFinite(entry.at) ||
                now - entry.at > CONFIG.cacheTtlMs
            ) {
                changed = true;
                continue;
            }
            live.push(entry);
            if (entry.source === key) destination = entry.destination;
        }
        if (changed) writeSessionJson(SESSION_CACHE_KEY, live);
        const checked = validateUrl(destination);
        return checked.ok ? checked.url.href : "";
    }

    function sessionCacheSet(source, destination) {
        const sourceKey = canonicalUrl(source);
        const checked = validateUrl(destination);
        if (!sourceKey || !checked.ok) return;
        const now = Date.now();
        let entries = readSessionJson(SESSION_CACHE_KEY, []);
        if (!Array.isArray(entries)) entries = [];
        entries = entries.filter(
            (entry) =>
                entry &&
                entry.source !== sourceKey &&
                Number.isFinite(entry.at) &&
                now - entry.at <= CONFIG.cacheTtlMs,
        );
        entries.push({
            source: sourceKey,
            destination: checked.url.href,
            at: now,
        });
        writeSessionJson(
            SESSION_CACHE_KEY,
            entries.slice(-CONFIG.cacheSize),
        );
    }

    function getCachedResolution(source) {
        const key = canonicalUrl(source);
        if (!key) return "";
        const memory = resolvedCache.get(key);
        if (memory) {
            const checked = validateUrl(memory);
            if (checked.ok) return checked.url.href;
        }
        const stored = sessionCacheGet(key);
        if (stored) resolvedCache.set(key, stored);
        return stored;
    }

    function cacheResolution(source, destination) {
        const key = canonicalUrl(source);
        const checked = validateUrl(destination);
        if (!key || !checked.ok || sameCanonicalUrl(key, checked.url.href)) {
            return;
        }
        resolvedCache.set(key, checked.url.href);
        sessionCacheSet(key, checked.url.href);
    }

    function markRouteVisit(url) {
        const key = canonicalUrl(url);
        if (!key) return;
        const now = Date.now();
        let entries = readSessionJson(SESSION_TRAIL_KEY, []);
        if (!Array.isArray(entries)) entries = [];
        entries = entries.filter(
            (entry) =>
                entry &&
                typeof entry.url === "string" &&
                Number.isFinite(entry.at) &&
                now - entry.at <= CONFIG.cacheTtlMs,
        );
        entries.push({ url: key, at: now });
        writeSessionJson(
            SESSION_TRAIL_KEY,
            entries.slice(-CONFIG.cacheSize),
        );
    }

    function hasVisitedRoute(url) {
        const key = canonicalUrl(url);
        if (!key) return false;
        const now = Date.now();
        const entries = readSessionJson(SESSION_TRAIL_KEY, []);
        return (
            Array.isArray(entries) &&
            entries.some(
                (entry) =>
                    entry &&
                    entry.url === key &&
                    Number.isFinite(entry.at) &&
                    now - entry.at <= CONFIG.cacheTtlMs,
            )
        );
    }

    function isGoogleRedirect(url) {
        return (
            /^(?:www\.)?google\.(?:com|[a-z]{2}|com\.[a-z]{2}|co\.[a-z]{2})$/i.test(
                url.hostname,
            ) && url.pathname === "/url"
        );
    }

    function isYoutubeRedirect(url) {
        return (
            /^(?:[a-z0-9-]+\.)?youtube\.com$/i.test(url.hostname) &&
            url.pathname === "/redirect"
        );
    }

    function isFacebookRedirect(url) {
        return (
            /^(?:[a-z0-9-]+\.)?facebook\.com$/i.test(url.hostname) &&
            (url.pathname === "/l.php" ||
                /\/flx\/warn\/?$/i.test(url.pathname))
        );
    }

    function hasGenericWrapperSignal(url) {
        return (
            WRAPPER_HOST_PATTERN.test(url.hostname) ||
            WRAPPER_PATH_PATTERN.test(url.pathname)
        );
    }

    class AdapterRegistry {
        constructor() {
            this.adapters = [];
            this.cleanups = [];
        }

        register(adapter) {
            if (
                !adapter ||
                typeof adapter.name !== "string" ||
                typeof adapter.match !== "function" ||
                typeof adapter.run !== "function"
            ) {
                throw new TypeError("Invalid shortlink adapter");
            }
            this.adapters.push(adapter);
            this.adapters.sort(
                (left, right) =>
                    (right.priority || 0) - (left.priority || 0),
            );
            return this;
        }

        cleanup() {
            for (const cleanup of this.cleanups.splice(0)) {
                try {
                    cleanup();
                } catch (error) {
                    debugLog("Adapter cleanup failed:", errorMessage(error));
                }
            }
        }

        run(url, context) {
            this.cleanup();
            for (const adapter of this.adapters) {
                let matches = false;
                try {
                    matches = Boolean(adapter.match(url, context));
                } catch (error) {
                    warnLog(
                        "Adapter match failed:",
                        adapter.name,
                        errorMessage(error),
                    );
                    continue;
                }
                if (!matches) continue;
                try {
                    const result = adapter.run(context) || {};
                    for (const candidate of result.candidates || []) {
                        context.addCandidate({
                            ...candidate,
                            source:
                                candidate.source ||
                                "adapter:" + adapter.name,
                        });
                    }
                    if (Number.isFinite(result.contextScore)) {
                        context.raiseContext(result.contextScore);
                    }
                    if (typeof adapter.cleanup === "function") {
                        this.cleanups.push(() => adapter.cleanup(context));
                    }
                    debugLog("Adapter matched:", adapter.name);
                } catch (error) {
                    warnLog(
                        "Adapter run failed:",
                        adapter.name,
                        errorMessage(error),
                    );
                }
            }
        }
    }

    const adapterRegistry = new AdapterRegistry()
        .register({
            name: "Google redirect wrapper",
            priority: 100,
            match: isGoogleRedirect,
            run({ url }) {
                const candidates = [];
                for (const key of ["q", "url"]) {
                    const value = url.searchParams.get(key);
                    if (value) {
                        candidates.push({
                            raw: value,
                            baseUrl: url.href,
                            score: 100,
                            evidence: ["google", "parameter:" + key],
                        });
                    }
                }
                return { candidates, contextScore: 100 };
            },
        })
        .register({
            name: "YouTube redirect wrapper",
            priority: 95,
            match: isYoutubeRedirect,
            run({ url }) {
                const value =
                    url.searchParams.get("q") ||
                    url.searchParams.get("url");
                return {
                    candidates: value
                        ? [
                              {
                                  raw: value,
                                  baseUrl: url.href,
                                  score: 100,
                                  evidence: ["youtube", "redirect-parameter"],
                              },
                          ]
                        : [],
                    contextScore: 100,
                };
            },
        })
        .register({
            name: "Facebook redirect wrapper",
            priority: 90,
            match: isFacebookRedirect,
            run({ url }) {
                const value =
                    url.searchParams.get("u") ||
                    url.searchParams.get("url");
                return {
                    candidates: value
                        ? [
                              {
                                  raw: value,
                                  baseUrl: url.href,
                                  score: 100,
                                  evidence: ["facebook", "redirect-parameter"],
                              },
                          ]
                        : [],
                    contextScore: 100,
                };
            },
        })
        .register({
            name: "Generic query wrapper",
            priority: 10,
            match(url) {
                return (
                    hasGenericWrapperSignal(url) &&
                    destinationParamsFromUrl(url).length > 0
                );
            },
            run({ url }) {
                const candidates = destinationParamsFromUrl(url).map(
                    ({ key, value }) => ({
                        raw: value,
                        baseUrl: url.href,
                        score: key === "r" ? 92 : 94,
                        evidence: ["generic-wrapper", "parameter:" + key],
                    }),
                );
                return { candidates, contextScore: 75 };
            },
        });

    const state = {
        generation: 0,
        routeUrl: "",
        contextScore: 0,
        blocker: "",
        blockerLogged: "",
        active: false,
        domReady: document.readyState !== "loading",
        candidates: new Map(),
        actionCandidates: new Map(),
        processedNodes: new WeakSet(),
        clickedElements: new WeakSet(),
        actionSignatures: new Set(),
        pendingRoots: new Map(),
        observer: null,
        observerMode: "",
        scanTimer: 0,
        probeTimer: 0,
        countdownTimer: 0,
        countdownScanTimer: 0,
        countdownActive: false,
        countdownCleanup: null,
        routeClickCount: 0,
        documentActionCount: 0,
        popupArmedUntil: 0,
        popupExpectedUrl: "",
        popupActionLabel: "",
        navigating: false,
        navigationTimer: 0,
        routeRepeated: false,
        networkStartedGeneration: -1,
        postClickTimers: new Set(),
        hookCleanups: [],
        destroyed: false,
    };

    function clearTimer(name) {
        if (!state[name]) return;
        nativeClearTimeout(state[name]);
        state[name] = 0;
    }

    function clearPostClickTimers() {
        for (const timer of state.postClickTimers) nativeClearTimeout(timer);
        state.postClickTimers.clear();
    }

    function raiseContext(score, reason = "") {
        if (!Number.isFinite(score)) return;
        const next = clamp(Math.round(score), 0, 100);
        if (next <= state.contextScore) return;
        state.contextScore = next;
        debugLog("Context score:", next, reason);
    }

    function candidateSourceKind(source) {
        return String(source || "generic").split(":")[0];
    }

    function addCandidate(specification) {
        if (
            !specification ||
            specification.raw === undefined ||
            specification.raw === null
        ) {
            return [];
        }
        const baseUrl = specification.baseUrl || state.routeUrl || location.href;
        const decoded = extractDestinationUrls(
            specification.raw,
            baseUrl,
            Boolean(specification.allowRelative),
        );
        const added = [];

        for (const result of decoded) {
            const checked = validateUrl(result.url, baseUrl);
            if (!checked.ok) {
                debugLog(
                    "Rejected candidate:",
                    checked.reason,
                    String(specification.raw).slice(0, 160),
                );
                continue;
            }
            if (sameCanonicalUrl(checked.url.href, state.routeUrl)) continue;
            const key = canonicalUrl(checked.url.href);
            if (!key) continue;

            const source = specification.source || "generic";
            const evidence = new Set([
                ...(specification.evidence || []),
                ...result.evidence,
                source,
            ]);
            const score = clamp(
                Number(specification.score) || 0,
                0,
                100,
            );
            const existing = state.candidates.get(key);
            if (existing && existing.generation === state.generation) {
                const previousKinds = existing.sourceKinds.size;
                existing.sourceKinds.add(candidateSourceKind(source));
                for (const item of evidence) existing.evidence.add(item);
                existing.baseScore = Math.max(existing.baseScore, score);
                if (existing.sourceKinds.size > previousKinds) {
                    existing.corroboration = Math.min(
                        6,
                        existing.corroboration + 2,
                    );
                }
                if (!existing.element && specification.element) {
                    existing.element = specification.element;
                }
                added.push(existing);
                continue;
            }

            const candidate = {
                url: checked.url.href,
                key,
                baseScore: score,
                corroboration: 0,
                sourceKinds: new Set([candidateSourceKind(source)]),
                evidence,
                element: specification.element || null,
                generation: state.generation,
            };
            state.candidates.set(key, candidate);
            added.push(candidate);
            debugLog(
                "Candidate:",
                candidate.baseScore,
                candidate.url,
                [...candidate.evidence],
            );
        }
        return added;
    }

    function effectiveCandidateScore(candidate) {
        const contextBonus =
            candidate.baseScore >= 98
                ? 0
                : Math.min(8, Math.floor(state.contextScore / 20) * 2);
        return clamp(
            candidate.baseScore + candidate.corroboration + contextBonus,
            0,
            100,
        );
    }

    function rankedCandidates(minimum = 0) {
        const output = [];
        for (const candidate of state.candidates.values()) {
            if (candidate.generation !== state.generation) continue;
            const checked = validateUrl(candidate.url);
            if (!checked.ok) continue;
            if (sameCanonicalUrl(candidate.url, state.routeUrl)) continue;
            const score = effectiveCandidateScore(candidate);
            if (score < minimum) continue;
            output.push({ candidate, score });
        }
        output.sort(
            (left, right) =>
                right.score - left.score ||
                right.candidate.baseScore - left.candidate.baseScore ||
                left.candidate.url.localeCompare(right.candidate.url),
        );
        return output;
    }

    function chooseUnambiguousCandidate(minimum = CONFIG.minimumConfidence) {
        const ranked = rankedCandidates(minimum);
        if (!ranked.length) return null;
        if (
            ranked.length > 1 &&
            ranked[0].score - ranked[1].score < CONFIG.ambiguityMargin &&
            ranked[0].candidate.key !== ranked[1].candidate.key
        ) {
            debugLog(
                "Navigation withheld: ambiguous candidates",
                ranked[0].candidate.url,
                ranked[1].candidate.url,
            );
            return null;
        }
        return ranked[0];
    }

    function elementsMatching(root, selector, limit = 500) {
        const output = [];
        try {
            if (root instanceof Element && root.matches(selector)) {
                output.push(root);
            }
            if (typeof root.querySelectorAll === "function") {
                for (const element of root.querySelectorAll(selector)) {
                    if (output.length >= limit) break;
                    output.push(element);
                }
            }
        } catch (error) {
            debugLog("Selector failed:", selector, errorMessage(error));
        }
        return output;
    }

    function rootHasSelector(root, selector) {
        try {
            if (root instanceof Element && root.matches(selector)) return true;
            return Boolean(root.querySelector?.(selector));
        } catch {
            return false;
        }
    }

    function ownerDocumentFor(root) {
        if (root?.nodeType === Node.DOCUMENT_NODE) return root;
        return root?.ownerDocument || document;
    }

    function boundedText(root, limit = CONFIG.maxTextProbeChars) {
        const output = [];
        let length = 0;
        try {
            const owner = ownerDocumentFor(root);
            const walker = owner.createTreeWalker(
                root,
                NodeFilter.SHOW_TEXT,
            );
            let node = walker.nextNode();
            while (node && length < limit) {
                const parentName = node.parentElement?.localName;
                if (
                    parentName !== "script" &&
                    parentName !== "style" &&
                    parentName !== "noscript" &&
                    parentName !== "template"
                ) {
                    const text = normalizeWhitespace(node.nodeValue);
                    if (text) {
                        output.push(text);
                        length += text.length + 1;
                    }
                }
                node = walker.nextNode();
            }
        } catch {
            return normalizeWhitespace(root.textContent).slice(0, limit);
        }
        return output.join(" ").slice(0, limit);
    }

    function detectAutomationGate(root = document) {
        const captchaSelectors = [
            ".g-recaptcha",
            "[data-sitekey][data-callback]",
            "iframe[src*='recaptcha']",
            "iframe[src*='hcaptcha']",
            "iframe[src*='challenges.cloudflare.com']",
            ".h-captcha",
            ".cf-turnstile",
            "[name='cf-turnstile-response']",
            "#cf-chl-widget",
            "#challenge-stage",
        ];
        if (captchaSelectors.some((selector) => rootHasSelector(root, selector))) {
            return "human-verification gate detected";
        }
        if (
            rootHasSelector(
                root,
                "input[type='password'], form[action*='login'], form[action*='signin'], form[action*='auth']",
            )
        ) {
            return "authentication gate detected";
        }
        if (
            rootHasSelector(
                root,
                "input[autocomplete='cc-number'], input[autocomplete='cc-csc'], form[action*='payment'], form[action*='checkout']",
            )
        ) {
            return "payment gate detected";
        }

        const title = normalizeWhitespace(ownerDocumentFor(root).title);
        const text = (
            title +
            " " +
            boundedText(root, Math.min(8000, CONFIG.maxTextProbeChars))
        ).slice(0, 10000);
        if (
            /\b(?:captcha|verify\s+(?:that\s+)?you(?:'re|\s+are)?\s+human|checking\s+your\s+browser|performing\s+security\s+verification|cloudflare\s+turnstile)\b/i.test(
                text,
            )
        ) {
            return "explicit human-verification gate detected";
        }
        if (
            /\b(?:sign\s+in|log\s+in|register)\s+to\s+(?:continue|proceed|access|view)\b/i.test(
                text,
            )
        ) {
            return "login requirement detected";
        }
        if (
            /\b(?:subscribe|purchase|pay|upgrade)\s+to\s+(?:continue|proceed|access|view)|members?\s+only|premium\s+access\s+required\b/i.test(
                text,
            )
        ) {
            return "subscription or access-control gate detected";
        }
        return "";
    }

    function stopAutomation(reason) {
        if (!reason) return;
        state.blocker = reason;
        state.popupArmedUntil = 0;
        state.popupExpectedUrl = "";
        disableCountdownPatch();
        disconnectObserver();
        clearTimer("probeTimer");
        clearPostClickTimers();
        if (state.blockerLogged !== reason) {
            state.blockerLogged = reason;
            infoLog("Automation stopped:", reason);
        }
    }

    function documentBaseUrl(doc, fallback) {
        try {
            const base = doc.querySelector("base[href]")?.getAttribute("href");
            if (base) {
                const checked = validateUrl(base, fallback);
                if (checked.ok) return checked.url.href;
            }
        } catch {}
        return fallback;
    }

    function parseMetaRefresh(content) {
        const match = String(content || "").match(
            /^\s*(\d+(?:\.\d+)?)?\s*;\s*url\s*=\s*(.+?)\s*$/i,
        );
        if (!match) return null;
        const delay = Number.parseFloat(match[1] || "0");
        const raw = stripWrapping(match[2]);
        if (!raw) return null;
        return { delay: Number.isFinite(delay) ? delay : 0, raw };
    }

    function scriptLiteralSpecs(source, baseUrl, sourceName = "script") {
        const specs = [];
        const patterns = [
            {
                regex: /(?:window\s*\.\s*)?location(?:\s*\.\s*href)?\s*=\s*(["'\x60])/gi,
                score: 88,
                kind: "location-assignment",
            },
            {
                regex: /(?:window\s*\.\s*)?location\s*\.\s*(?:assign|replace)\s*\(\s*(["'\x60])/gi,
                score: 91,
                kind: "location-method",
            },
            {
                regex: /window\s*\.\s*open\s*\(\s*(["'\x60])/gi,
                score: 78,
                kind: "window-open-literal",
            },
        ];
        for (const pattern of patterns) {
            let match;
            while (
                specs.length < MAX_SCRIPT_LITERALS &&
                (match = pattern.regex.exec(source))
            ) {
                const quote = match[1];
                const literal = readJavascriptLiteral(
                    source,
                    pattern.regex.lastIndex,
                    quote,
                );
                if (!literal) continue;
                pattern.regex.lastIndex = literal.end;
                if (!literal.value || !looksLikeEncodedDestination(literal.value)) {
                    continue;
                }
                specs.push({
                    raw: literal.value,
                    baseUrl,
                    score: pattern.score,
                    source: sourceName + ":" + pattern.kind,
                    evidence: [pattern.kind],
                    allowRelative: true,
                });
            }
        }
        return specs;
    }

    function elementLabel(element) {
        return normalizeWhitespace(
            element.getAttribute?.("aria-label") ||
                element.getAttribute?.("title") ||
                element.getAttribute?.("value") ||
                element.textContent ||
                "",
        ).slice(0, 200);
    }

    function hasSafeActionLabel(element) {
        return SAFE_ACTION_PATTERN.test(elementLabel(element));
    }

    function isDangerousElement(element) {
        const label = elementLabel(element);
        if (DANGEROUS_ACTION_PATTERN.test(label)) return true;
        if (element.hasAttribute?.("download")) return true;
        const href = element.getAttribute?.("href") || "";
        if (/^(?:javascript|data|blob|file):/i.test(href.trim())) return true;
        const form = element.closest?.("form");
        if (!form) return false;
        const formText = (
            elementLabel(form) +
            " " +
            (form.getAttribute("action") || "")
        ).slice(0, 1000);
        if (DANGEROUS_ACTION_PATTERN.test(formText)) return true;
        return Boolean(
            form.querySelector(
                "input[type='password'], input[type='email'], input[type='tel'], input[type='file'], input[autocomplete='cc-number'], input[autocomplete='cc-csc']",
            ),
        );
    }

    function isNeutralSubmitControl(element) {
        const form = element.closest?.("form");
        if (!form) return true;
        const type = String(
            element.getAttribute?.("type") ||
                (element.localName === "button" ? "submit" : ""),
        ).toLowerCase();
        if (type !== "submit") return true;
        if ((form.getAttribute("method") || "get").toLowerCase() !== "get") {
            return false;
        }
        return !form.querySelector(
            "input:not([type='hidden']):not([type='submit']):not([type='button']), textarea, select",
        );
    }

    function candidateSpecsFromElement(element, baseUrl) {
        const specs = [];
        if (!(element instanceof Element)) return specs;
        const label = elementLabel(element);
        const safeLabel = SAFE_ACTION_PATTERN.test(label);
        const dangerous = isDangerousElement(element);
        const localName = element.localName;

        if (localName === "meta") {
            const httpEquiv = (
                element.getAttribute("http-equiv") || ""
            ).toLowerCase();
            if (httpEquiv === "refresh") {
                const refresh = parseMetaRefresh(
                    element.getAttribute("content"),
                );
                if (refresh) {
                    specs.push({
                        raw: refresh.raw,
                        baseUrl,
                        score: refresh.delay <= 10 ? 98 : 92,
                        source: "meta-refresh",
                        evidence: ["meta-refresh", "delay:" + refresh.delay],
                        allowRelative: true,
                        element,
                    });
                }
            }
            return specs;
        }

        if (localName === "script" && !element.hasAttribute("src")) {
            const source = String(element.textContent || "").slice(
                0,
                CONFIG.maxInlineScriptBytes,
            );
            return scriptLiteralSpecs(source, baseUrl, "inline-script").map(
                (spec) => ({ ...spec, element }),
            );
        }

        if (localName === "a" || localName === "area") {
            const href = element.getAttribute("href");
            if (href && !dangerous) {
                const hint = (
                    (element.id || "") +
                    " " +
                    (element.className || "") +
                    " " +
                    (element.getAttribute("rel") || "")
                ).toString();
                let score = 0;
                if (safeLabel) score = 86;
                else if (
                    /\b(?:destination|continue|external|final|out|redirect|skip)\b/i.test(
                        hint,
                    )
                ) {
                    score = 78;
                }
                if (score) {
                    specs.push({
                        raw: href,
                        baseUrl,
                        score,
                        source: "anchor",
                        evidence: safeLabel
                            ? ["safe-action-label", label]
                            : ["anchor-hint"],
                        allowRelative: true,
                        element,
                    });
                }
            }
        }

        if (localName === "form" && !dangerous) {
            const action = element.getAttribute("action");
            if (action && safeLabel) {
                specs.push({
                    raw: action,
                    baseUrl,
                    score: 78,
                    source: "form-action",
                    evidence: ["safe-form-label", label],
                    allowRelative: true,
                    element,
                });
            }
        }

        if (
            localName === "input" &&
            (element.getAttribute("type") || "").toLowerCase() === "hidden"
        ) {
            const name = (element.getAttribute("name") || "").toLowerCase();
            const value = element.getAttribute("value");
            if (
                value &&
                DESTINATION_KEYS.has(name) &&
                looksLikeEncodedDestination(value)
            ) {
                specs.push({
                    raw: value,
                    baseUrl,
                    score: 82,
                    source: "hidden-input",
                    evidence: ["input-name:" + name],
                    allowRelative: true,
                    element,
                });
            }
        }

        if (!dangerous) {
            for (const attribute of URL_DATA_ATTRIBUTES) {
                const value = element.getAttribute(attribute);
                if (!value || !looksLikeEncodedDestination(value)) continue;
                specs.push({
                    raw: value,
                    baseUrl,
                    score:
                        (attribute === "data-target" ? 70 : 82) +
                        (safeLabel ? 6 : 0),
                    source: "data-attribute",
                    evidence: [attribute, ...(safeLabel ? [label] : [])],
                    allowRelative: true,
                    element,
                });
            }
        }

        const onclick = element.getAttribute("onclick");
        if (onclick && !dangerous) {
            for (const spec of scriptLiteralSpecs(
                onclick.slice(0, 8192),
                baseUrl,
                "inline-handler",
            )) {
                specs.push({
                    ...spec,
                    score: Math.max(spec.score, safeLabel ? 86 : 82),
                    element,
                });
            }
        }
        return specs;
    }

    function collectDocumentCandidateSpecs(doc, fallbackUrl) {
        const specs = [];
        const baseUrl = documentBaseUrl(doc, fallbackUrl);
        const selector = [
            "meta[http-equiv]",
            "script:not([src])",
            "a[href]",
            "area[href]",
            "form[action]",
            "input[type='hidden']",
            "[onclick]",
            ...URL_DATA_ATTRIBUTES.map((attribute) => "[" + attribute + "]"),
        ].join(",");
        let scriptBytes = 0;
        for (const element of elementsMatching(doc, selector, 1000)) {
            if (element.localName === "script") {
                const size = String(element.textContent || "").length;
                if (scriptBytes + size > CONFIG.maxInlineScriptBytes) continue;
                scriptBytes += size;
            }
            for (const spec of candidateSpecsFromElement(element, baseUrl)) {
                specs.push(spec);
                if (specs.length >= 500) return specs;
            }
        }
        return specs;
    }

    function addCandidateSpecs(specs) {
        for (const spec of specs) addCandidate(spec);
    }

    function elementIsVisible(element) {
        if (!(element instanceof Element) || !element.isConnected) return false;
        if (
            element.hidden ||
            element.getAttribute("aria-hidden") === "true" ||
            element.closest("[hidden], [inert], [aria-hidden='true']")
        ) {
            return false;
        }
        try {
            const style = getComputedStyle(element);
            if (
                style.display === "none" ||
                style.visibility === "hidden" ||
                Number.parseFloat(style.opacity || "1") <= 0.01
            ) {
                return false;
            }
            return element.getClientRects().length > 0;
        } catch {
            return false;
        }
    }

    function actionSignature(element) {
        const parts = [
            canonicalUrl(state.routeUrl),
            element.localName,
            elementLabel(element).toLowerCase(),
            element.getAttribute?.("href") || "",
            element.getAttribute?.("data-url") || "",
            element.getAttribute?.("data-link") || "",
            element.id || "",
        ];
        return parts.join("|").slice(0, 2048);
    }

    function actionScore(element) {
        if (!(element instanceof Element)) return 0;
        if (state.contextScore < 65) return 0;
        const label = elementLabel(element);
        if (!SAFE_ACTION_PATTERN.test(label)) return 0;
        if (isDangerousElement(element) || !isNeutralSubmitControl(element)) {
            return 0;
        }
        if (
            element.matches(
                ":disabled, [disabled], [aria-disabled='true'], [aria-busy='true']",
            )
        ) {
            return 0;
        }
        if (!elementIsVisible(element)) return 0;

        let score = 70;
        if (
            /\b(?:get|generate|skip|access|go|open|visit)\b/i.test(label)
        ) {
            score += 5;
        }
        if (
            element.matches("a[href]") ||
            URL_DATA_ATTRIBUTES.some((name) => element.hasAttribute(name))
        ) {
            score += 12;
        }
        const hint = (
            (element.id || "") +
            " " +
            (element.className || "")
        ).toString();
        if (/\b(?:continue|generate|link|proceed|skip)\b/i.test(hint)) {
            score += 8;
        }
        score += Math.min(15, Math.floor(state.contextScore / 5));
        return clamp(score, 0, 100);
    }

    function considerAction(element) {
        if (!(element instanceof Element)) return;
        const score = actionScore(element);
        if (score <= 0) {
            state.actionCandidates.delete(element);
            return;
        }
        state.actionCandidates.set(element, {
            element,
            score,
            generation: state.generation,
        });
    }

    function bestAction() {
        const ranked = [];
        for (const [element, entry] of state.actionCandidates) {
            if (
                entry.generation !== state.generation ||
                !element.isConnected
            ) {
                state.actionCandidates.delete(element);
                continue;
            }
            const score = actionScore(element);
            if (score < CONFIG.actionMinimumConfidence) continue;
            if (state.clickedElements.has(element)) continue;
            if (state.actionSignatures.has(actionSignature(element))) continue;
            ranked.push({ element, score });
        }
        ranked.sort((left, right) => right.score - left.score);
        if (
            ranked.length > 1 &&
            ranked[0].score - ranked[1].score < CONFIG.ambiguityMargin &&
            elementLabel(ranked[0].element).toLowerCase() !==
                elementLabel(ranked[1].element).toLowerCase()
        ) {
            return null;
        }
        return ranked[0] || null;
    }

    function quickContextScore() {
        let score = state.contextScore;
        let url;
        try {
            url = new URL(state.routeUrl);
        } catch {
            return score;
        }
        if (WRAPPER_HOST_PATTERN.test(url.hostname)) score = Math.max(score, 30);
        if (WRAPPER_PATH_PATTERN.test(url.pathname)) score = Math.max(score, 25);
        if (destinationParamsFromUrl(url).length) score = Math.max(score, 25);
        if (!state.domReady || !document.documentElement) return score;

        const text = (
            normalizeWhitespace(document.title) +
            " " +
            boundedText(
                document.body || document.documentElement,
                CONFIG.maxTextProbeChars,
            )
        ).slice(0, CONFIG.maxTextProbeChars);
        const hasShortenerText = SHORTENER_TEXT_PATTERN.test(text);
        const hasCountdown = COUNTDOWN_TEXT_PATTERN.test(text);
        const hasSafeAction = elementsMatching(
                document,
                "a, button, input[type='button'], input[type='submit'], [role='button']",
                200,
            ).some(hasSafeActionLabel);
        if (hasShortenerText) score = Math.max(score, 70);
        if (hasCountdown) score = Math.max(score, 55);
        if (hasSafeAction) score = Math.max(score, 55);
        if (hasCountdown && hasSafeAction) score = Math.max(score, 70);
        if (
            hasSafeAction &&
            (WRAPPER_HOST_PATTERN.test(url.hostname) ||
                WRAPPER_PATH_PATTERN.test(url.pathname))
        ) {
            score = Math.max(score, 70);
        }
        if (
            elementsMatching(document, "meta[http-equiv]", 20).some((meta) =>
                parseMetaRefresh(meta.getAttribute("content")),
            )
        ) {
            score = Math.max(score, 95);
        }
        return score;
    }

    function parseResponseHeaders(rawHeaders) {
        const headers = new Map();
        for (const line of String(rawHeaders || "").split(/[\r\n]+/)) {
            const index = line.indexOf(":");
            if (index <= 0) continue;
            const name = line.slice(0, index).trim().toLowerCase();
            const value = line.slice(index + 1).trim();
            if (!name) continue;
            if (headers.has(name)) {
                headers.set(name, headers.get(name) + ", " + value);
            } else {
                headers.set(name, value);
            }
        }
        return headers;
    }

    function gmRequest(method, url) {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest !== "function") {
                reject(new Error("GM_xmlhttpRequest unavailable"));
                return;
            }
            let settled = false;
            let tooLarge = false;
            let control = null;
            const backupTimer = nativeSetTimeout(() => {
                if (settled) return;
                settled = true;
                try {
                    control?.abort();
                } catch {}
                reject(new Error("Network request timed out"));
            }, CONFIG.networkTimeoutMs + 1000);

            const finish = (callback, value) => {
                if (settled) return;
                settled = true;
                nativeClearTimeout(backupTimer);
                callback(value);
            };
            const fail = (label, response) => {
                finish(
                    reject,
                    new Error(
                        label +
                            (response?.statusText
                                ? ": " + response.statusText
                                : ""),
                    ),
                );
            };

            const details = {
                method,
                url,
                anonymous: true,
                timeout: CONFIG.networkTimeoutMs,
                responseType: "text",
                redirect: "manual",
                headers: {
                    Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.2",
                    ...(method === "GET"
                        ? {
                              Range:
                                  "bytes=0-" +
                                  String(CONFIG.maxResponseBytes - 1),
                          }
                        : {}),
                },
                onprogress(response) {
                    if (
                        Number(response.loaded) > CONFIG.maxResponseBytes &&
                        !settled
                    ) {
                        tooLarge = true;
                        try {
                            control?.abort();
                        } catch {}
                        finish(
                            reject,
                            new Error("Network response exceeded size limit"),
                        );
                    }
                },
                onload(response) {
                    const text = String(response.responseText || "");
                    if (text.length > CONFIG.maxResponseBytes) {
                        finish(
                            reject,
                            new Error("Network response exceeded size limit"),
                        );
                        return;
                    }
                    finish(resolve, {
                        status: Number(response.status) || 0,
                        statusText: String(response.statusText || ""),
                        finalUrl: String(response.finalUrl || url),
                        headers: parseResponseHeaders(
                            response.responseHeaders,
                        ),
                        text,
                    });
                },
                onerror(response) {
                    fail("Network request failed", response);
                },
                ontimeout(response) {
                    fail("Network request timed out", response);
                },
                onabort(response) {
                    if (!tooLarge) fail("Network request aborted", response);
                },
            };

            try {
                control = GM_xmlhttpRequest(details);
            } catch (error) {
                finish(reject, error);
            }
        });
    }

    function bestDestinationFromSpecs(specs, minimum = 90) {
        const candidates = new Map();
        for (const spec of specs) {
            const decoded = extractDestinationUrls(
                spec.raw,
                spec.baseUrl || location.href,
                Boolean(spec.allowRelative),
            );
            for (const result of decoded) {
                const checked = validateUrl(
                    result.url,
                    spec.baseUrl || location.href,
                );
                if (!checked.ok) continue;
                const key = canonicalUrl(checked.url.href);
                if (!key) continue;
                const existing = candidates.get(key);
                const score = clamp(Number(spec.score) || 0, 0, 100);
                if (!existing || score > existing.score) {
                    candidates.set(key, {
                        url: checked.url.href,
                        score,
                    });
                }
            }
        }
        const ranked = [...candidates.values()]
            .filter((candidate) => candidate.score >= minimum)
            .sort((left, right) => right.score - left.score);
        if (!ranked.length) return "";
        if (
            ranked.length > 1 &&
            ranked[0].score - ranked[1].score < CONFIG.ambiguityMargin
        ) {
            return "";
        }
        return ranked[0].url;
    }

    function staticDestinationFromResponse(response, baseUrl) {
        const specs = [];
        const refresh = parseMetaRefresh(response.headers.get("refresh"));
        if (refresh) {
            specs.push({
                raw: refresh.raw,
                baseUrl,
                score: refresh.delay <= 10 ? 98 : 92,
                allowRelative: true,
            });
        }

        const contentType = response.headers.get("content-type") || "";
        const text = response.text.trim();
        if (
            /(?:application\/json|text\/json)/i.test(contentType) ||
            /^(?:\{|\[)/.test(text)
        ) {
            for (const value of collectJsonStrings(text)) {
                specs.push({
                    raw: value,
                    baseUrl,
                    score: 94,
                    allowRelative: true,
                });
            }
        }

        if (
            /(?:text\/html|application\/xhtml\+xml)/i.test(contentType) ||
            /^<!doctype\s+html|^<html|^<head|^<meta/i.test(text)
        ) {
            try {
                const doc = new DOMParser().parseFromString(
                    response.text,
                    "text/html",
                );
                if (detectAutomationGate(doc)) return "";
                specs.push(...collectDocumentCandidateSpecs(doc, baseUrl));
            } catch (error) {
                debugLog(
                    "Malformed network HTML ignored:",
                    errorMessage(error),
                );
            }
        }
        return bestDestinationFromSpecs(specs);
    }

    class NetworkResolver {
        constructor(request) {
            this.request = request;
            this.inFlight = new Map();
        }

        resolve(sourceUrl) {
            const checked = validateUrl(sourceUrl);
            if (!checked.ok) {
                return Promise.resolve({
                    url: "",
                    reason: checked.reason,
                });
            }
            const source = checked.url.href;
            const cached = getCachedResolution(source);
            if (cached) {
                return Promise.resolve({ url: cached, reason: "cache" });
            }
            const key = canonicalUrl(source);
            if (this.inFlight.has(key)) return this.inFlight.get(key);

            const promise = this.resolveUncached(source)
                .catch((error) => {
                    debugLog(
                        "Network resolution failed:",
                        errorMessage(error),
                    );
                    return { url: "", reason: errorMessage(error) };
                })
                .finally(() => this.inFlight.delete(key));
            this.inFlight.set(key, promise);
            return promise;
        }

        async resolveUncached(source) {
            let current = source;
            let hops = 0;
            let method = "HEAD";
            const visited = new Set([canonicalUrl(source)]);

            while (hops <= CONFIG.maxRedirectHops) {
                const checked = validateUrl(current);
                if (!checked.ok) {
                    return { url: "", reason: checked.reason };
                }
                current = checked.url.href;
                const currentKey = canonicalUrl(current);
                if (!currentKey) return { url: "", reason: "invalid URL" };

                let response;
                try {
                    response = await this.request(method, current);
                } catch (error) {
                    if (method === "HEAD") {
                        method = "GET";
                        continue;
                    }
                    throw error;
                }

                const reportedFinal = validateUrl(
                    response.finalUrl || current,
                    current,
                );
                if (!reportedFinal.ok) {
                    return {
                        url: "",
                        reason: "unsafe final URL: " + reportedFinal.reason,
                    };
                }
                const finalChanged = !sameCanonicalUrl(
                    reportedFinal.url.href,
                    current,
                );

                if (
                    HTTP_REDIRECT_STATUSES.has(response.status) &&
                    response.headers.get("location")
                ) {
                    if (hops >= CONFIG.maxRedirectHops) {
                        return {
                            url: "",
                            reason: "maximum redirect hops reached",
                        };
                    }
                    const next = validateUrl(
                        response.headers.get("location"),
                        current,
                    );
                    if (!next.ok) {
                        return {
                            url: "",
                            reason:
                                "unsafe redirect target: " + next.reason,
                        };
                    }
                    const nextKey = canonicalUrl(next.url.href);
                    if (!nextKey || visited.has(nextKey)) {
                        return { url: "", reason: "redirect loop detected" };
                    }
                    visited.add(nextKey);
                    current = next.url.href;
                    method =
                        response.status === 303 ? "GET" : "HEAD";
                    hops += 1;
                    continue;
                }

                if (finalChanged) {
                    debugLog(
                        "Userscript manager followed opaque redirect chain:",
                        current,
                        "->",
                        reportedFinal.url.href,
                    );
                    if (visited.has(canonicalUrl(reportedFinal.url.href))) {
                        return { url: "", reason: "redirect loop detected" };
                    }
                    cacheResolution(source, reportedFinal.url.href);
                    return {
                        url: reportedFinal.url.href,
                        reason: "opaque-final-url",
                    };
                }

                if (
                    method === "HEAD" &&
                    (response.status === 0 ||
                        response.status === 403 ||
                        response.status === 405 ||
                        response.status === 501 ||
                        (response.status >= 200 && response.status < 300))
                ) {
                    method = "GET";
                    continue;
                }

                if (method === "GET") {
                    const destination = staticDestinationFromResponse(
                        response,
                        current,
                    );
                    if (
                        destination &&
                        !sameCanonicalUrl(destination, source)
                    ) {
                        cacheResolution(source, destination);
                        return { url: destination, reason: "static-response" };
                    }
                }

                if (!sameCanonicalUrl(current, source)) {
                    cacheResolution(source, current);
                    return { url: current, reason: "redirect-chain" };
                }
                return { url: "", reason: "no network destination" };
            }
            return { url: "", reason: "maximum redirect hops reached" };
        }
    }

    const networkResolver = new NetworkResolver(gmRequest);

    const firefoxPageScope =
        typeof exportFunction === "function"
            ? window.wrappedJSObject ||
              (typeof unsafeWindow === "object"
                  ? unsafeWindow?.wrappedJSObject
                  : null)
            : null;
    const pageWindow =
        firefoxPageScope ||
        (typeof unsafeWindow === "object" && unsafeWindow
            ? unsafeWindow
            : window);
    const pageScope = firefoxPageScope || null;
    let originalPageOpen = null;

    function exportPageFunction(callback) {
        if (!pageScope || typeof exportFunction !== "function") {
            return callback;
        }
        try {
            return exportFunction(callback, pageScope);
        } catch (error) {
            debugLog("Page function export failed:", errorMessage(error));
            return callback;
        }
    }

    function copyFunctionShape(wrapper, original) {
        try {
            Object.defineProperty(wrapper, "name", {
                configurable: true,
                value: original.name,
            });
            Object.defineProperty(wrapper, "length", {
                configurable: true,
                value: original.length,
            });
            Object.defineProperty(wrapper, "toString", {
                configurable: true,
                value: original.toString.bind(original),
            });
        } catch {}
    }

    function patchOwnMethod(target, name, makeWrapper) {
        if (!target) return { cleanup() {}, original: null };
        let original;
        try {
            original = target[name];
        } catch {
            return { cleanup() {}, original: null };
        }
        if (typeof original !== "function") {
            return { cleanup() {}, original: null };
        }

        const hadOwn = Object.prototype.hasOwnProperty.call(target, name);
        const ownDescriptor = hadOwn
            ? Object.getOwnPropertyDescriptor(target, name)
            : null;
        const localWrapper = makeWrapper(original);
        copyFunctionShape(localWrapper, original);
        const wrapper = exportPageFunction(localWrapper);
        try {
            Object.defineProperty(target, name, {
                configurable: true,
                enumerable: ownDescriptor?.enumerable ?? false,
                writable: true,
                value: wrapper,
            });
        } catch (error) {
            debugLog("Page method patch failed:", name, errorMessage(error));
            return { cleanup() {}, original };
        }

        return {
            original,
            cleanup() {
                try {
                    if (target[name] !== wrapper) return;
                    if (hadOwn && ownDescriptor) {
                        Object.defineProperty(target, name, ownDescriptor);
                    } else {
                        delete target[name];
                    }
                } catch {}
            },
        };
    }

    function installHistoryHooks() {
        let pageHistory;
        try {
            pageHistory = pageWindow.history;
        } catch {
            return;
        }
        for (const name of ["pushState", "replaceState"]) {
            const patch = patchOwnMethod(pageHistory, name, (original) => {
                return function (...args) {
                    let before = "";
                    try {
                        before = String(pageWindow.location.href);
                    } catch {}
                    const result = Reflect.apply(original, this, args);
                    let after = "";
                    try {
                        after = String(pageWindow.location.href);
                    } catch {}
                    if (after && after !== before) {
                        nativeQueueMicrotask(() =>
                            handleRouteSignal("history." + name),
                        );
                    }
                    return result;
                };
            });
            state.hookCleanups.push(patch.cleanup);
        }
    }

    function expectedPopupDestination(raw) {
        if (!raw) return "";
        const decoded = extractDestinationUrls(raw, state.routeUrl, true);
        for (const result of decoded) {
            if (
                state.popupExpectedUrl &&
                sameCanonicalUrl(result.url, state.popupExpectedUrl)
            ) {
                return result.url;
            }
            const existing = state.candidates.get(canonicalUrl(result.url));
            if (
                existing &&
                existing.generation === state.generation &&
                effectiveCandidateScore(existing) >= CONFIG.minimumConfidence
            ) {
                return result.url;
            }
        }
        return "";
    }

    function installPopupHook() {
        if (!CONFIG.popupControl) return;
        const patch = patchOwnMethod(pageWindow, "open", (original) => {
            originalPageOpen = original;
            return function (url, target, features) {
                if (
                    state.destroyed ||
                    state.blocker ||
                    Date.now() > state.popupArmedUntil
                ) {
                    return Reflect.apply(original, this, arguments);
                }

                let raw = "";
                try {
                    raw = url === undefined || url === null ? "" : String(url);
                } catch {}
                const confirmed = expectedPopupDestination(raw);
                if (confirmed) {
                    nativeQueueMicrotask(() => {
                        addCandidate({
                            raw: confirmed,
                            baseUrl: state.routeUrl,
                            score: 98,
                            source: "confirmed-popup",
                            evidence: [
                                "armed-action",
                                state.popupActionLabel,
                            ],
                        });
                        evaluateAutomation("confirmed popup");
                    });
                    debugLog("Captured confirmed popup destination:", confirmed);
                    return null;
                }

                const checked = raw
                    ? validateUrl(raw, state.routeUrl)
                    : { ok: false, reason: "blank popup" };
                const reason =
                    checked.ok && POPUP_NOISE_PATTERN.test(checked.url.href)
                        ? "obvious popup noise"
                        : checked.ok
                          ? "unconfirmed popup target"
                          : checked.reason;
                debugLog("Blocked popup during shortlink action:", reason, raw);
                return null;
            };
        });
        if (!originalPageOpen) originalPageOpen = patch.original;
        state.hookCleanups.push(patch.cleanup);
    }

    function candidateUrlFromElement(element) {
        const values = [];
        const href = element.getAttribute?.("href");
        if (href) values.push(href);
        for (const attribute of URL_DATA_ATTRIBUTES) {
            const value = element.getAttribute?.(attribute);
            if (value) values.push(value);
        }
        for (const value of values) {
            const destinations = extractDestinationUrls(
                value,
                state.routeUrl,
                true,
            );
            if (destinations.length === 1) return destinations[0].url;
        }
        return chooseUnambiguousCandidate(80)?.candidate.url || "";
    }

    function armPopupForElement(element) {
        state.popupArmedUntil = Date.now() + CONFIG.popupArmMs;
        state.popupExpectedUrl = candidateUrlFromElement(element);
        state.popupActionLabel = elementLabel(element);
    }

    function handleCapturedClick(event) {
        if (
            state.destroyed ||
            state.blocker ||
            !state.active ||
            !event.isTrusted
        ) {
            return;
        }
        const element = event.target?.closest?.(
            "a, button, input[type='button'], input[type='submit'], [role='button']",
        );
        if (
            !element ||
            !hasSafeActionLabel(element) ||
            isDangerousElement(element)
        ) {
            return;
        }
        armPopupForElement(element);
    }

    function findPropertyDescriptor(object, name) {
        let current = object;
        while (current) {
            try {
                const descriptor = Object.getOwnPropertyDescriptor(
                    current,
                    name,
                );
                if (descriptor) return descriptor;
                current = Object.getPrototypeOf(current);
            } catch {
                return null;
            }
        }
        return null;
    }

    function patchDocumentGetter(documentObject, name, activeValue) {
        const hadOwn = Object.prototype.hasOwnProperty.call(
            documentObject,
            name,
        );
        const ownDescriptor = hadOwn
            ? Object.getOwnPropertyDescriptor(documentObject, name)
            : null;
        const effective = findPropertyDescriptor(documentObject, name);
        const originalGet = effective?.get;
        const getter = exportPageFunction(function () {
            if (state.countdownActive) return activeValue;
            if (typeof originalGet === "function") {
                return Reflect.apply(originalGet, this, []);
            }
            return effective?.value;
        });
        try {
            Object.defineProperty(documentObject, name, {
                configurable: true,
                enumerable: effective?.enumerable ?? true,
                get: getter,
            });
        } catch {
            return () => {};
        }
        return () => {
            try {
                const current = Object.getOwnPropertyDescriptor(
                    documentObject,
                    name,
                );
                if (current?.get !== getter) return;
                if (hadOwn && ownDescriptor) {
                    Object.defineProperty(
                        documentObject,
                        name,
                        ownDescriptor,
                    );
                } else {
                    delete documentObject[name];
                }
            } catch {}
        };
    }

    function enableCountdownPatch() {
        if (
            state.countdownActive ||
            state.blocker ||
            !state.active ||
            state.destroyed
        ) {
            return;
        }
        let pageDocument;
        try {
            pageDocument = pageWindow.document;
        } catch {
            return;
        }
        if (!pageDocument) return;

        state.countdownActive = true;
        const cleanups = [
            patchDocumentGetter(pageDocument, "hidden", false),
            patchDocumentGetter(pageDocument, "webkitHidden", false),
            patchDocumentGetter(pageDocument, "visibilityState", "visible"),
            patchDocumentGetter(
                pageDocument,
                "webkitVisibilityState",
                "visible",
            ),
        ];
        const focusPatch = patchOwnMethod(
            pageDocument,
            "hasFocus",
            (original) =>
                function (...args) {
                    if (state.countdownActive) return true;
                    return Reflect.apply(original, this, args);
                },
        );
        cleanups.push(focusPatch.cleanup);
        state.countdownCleanup = () => {
            for (const cleanup of cleanups.reverse()) cleanup();
        };
        clearTimer("countdownTimer");
        state.countdownTimer = nativeSetTimeout(
            disableCountdownPatch,
            CONFIG.countdownPatchMs,
        );
        scheduleCountdownRescan();
        debugLog("Temporary visibility/focus patch enabled");
    }

    function disableCountdownPatch() {
        clearTimer("countdownTimer");
        clearTimer("countdownScanTimer");
        if (!state.countdownActive && !state.countdownCleanup) return;
        state.countdownActive = false;
        const cleanup = state.countdownCleanup;
        state.countdownCleanup = null;
        try {
            cleanup?.();
        } catch {}
        debugLog("Temporary visibility/focus patch disabled");
    }

    function suppressTimerPauseEvent(event) {
        if (!state.countdownActive) return;
        event.stopImmediatePropagation();
        event.stopPropagation();
    }

    function openDestination(url) {
        if (CONFIG.sameTabNavigation) {
            try {
                const pageLocation = pageWindow.location;
                return Reflect.apply(pageLocation.replace, pageLocation, [url]);
            } catch (error) {
                debugLog(
                    "Page-realm navigation failed:",
                    errorMessage(error),
                );
                location.replace(url);
                return undefined;
            }
        }
        if (typeof originalPageOpen === "function") {
            return Reflect.apply(originalPageOpen, pageWindow, [
                url,
                "_blank",
                "noopener,noreferrer",
            ]);
        }
        return window.open(url, "_blank", "noopener,noreferrer");
    }

    function navigateTo(destination, reason) {
        if (
            state.destroyed ||
            state.blocker ||
            state.navigating ||
            state.documentActionCount >= CONFIG.maxActionsPerDocument
        ) {
            return false;
        }
        const checked = validateUrl(destination, state.routeUrl);
        if (!checked.ok) {
            debugLog("Navigation rejected:", checked.reason);
            return false;
        }
        if (sameCanonicalUrl(checked.url.href, state.routeUrl)) return false;
        if (hasVisitedRoute(checked.url.href)) {
            stopAutomation("navigation loop protection triggered");
            return false;
        }

        state.navigating = true;
        state.documentActionCount += 1;
        state.popupArmedUntil = 0;
        markRouteVisit(state.routeUrl);
        cacheResolution(state.routeUrl, checked.url.href);
        disableCountdownPatch();
        disconnectObserver();
        clearPostClickTimers();
        debugLog("Navigating:", checked.url.href, "reason:", reason);
        try {
            openDestination(checked.url.href);
        } catch (error) {
            state.navigating = false;
            warnLog("Navigation failed:", errorMessage(error));
            return false;
        }
        clearTimer("navigationTimer");
        const routeAtNavigation = state.routeUrl;
        state.navigationTimer = nativeSetTimeout(() => {
            if (
                sameCanonicalUrl(location.href, routeAtNavigation) &&
                !state.destroyed
            ) {
                state.navigating = false;
                startObserver("active");
                scheduleScan(document, true);
            }
        }, 4000);
        return true;
    }

    function disconnectObserver() {
        try {
            state.observer?.disconnect();
        } catch {}
        state.observer = null;
        state.observerMode = "";
        clearTimer("scanTimer");
        state.pendingRoots.clear();
    }

    function startObserver(mode = "sentinel") {
        if (state.destroyed || state.blocker || !document.documentElement) {
            return;
        }
        if (state.observer && state.observerMode === mode) return;
        disconnectObserver();

        state.observerMode = mode;
        state.observer = new MutationObserver((records) => {
            if (state.destroyed || state.blocker) return;
            let queued = 0;
            for (const record of records) {
                if (record.type === "attributes") {
                    scheduleScan(record.target, true);
                    queued += 1;
                    continue;
                }
                for (const node of record.addedNodes) {
                    if (queued >= CONFIG.observerNodeBudget) {
                        scheduleScan(document, false);
                        return;
                    }
                    if (
                        node.nodeType === Node.ELEMENT_NODE ||
                        node.nodeType === Node.DOCUMENT_FRAGMENT_NODE
                    ) {
                        scheduleScan(node, false);
                        queued += 1;
                    }
                }
            }
        });

        const options =
            mode === "active"
                ? {
                      childList: true,
                      subtree: true,
                      attributes: true,
                      attributeFilter: [
                          "href",
                          "action",
                          "content",
                          "onclick",
                          "value",
                          "disabled",
                          "aria-disabled",
                          "aria-busy",
                          "aria-label",
                          "class",
                          "style",
                          ...URL_DATA_ATTRIBUTES,
                      ],
                  }
                : { childList: true, subtree: true };
        try {
            state.observer.observe(document.documentElement, options);
        } catch (error) {
            state.observer = null;
            state.observerMode = "";
            debugLog("Mutation observer failed:", errorMessage(error));
        }

        clearTimer("probeTimer");
        if (mode === "sentinel") {
            const generation = state.generation;
            state.probeTimer = nativeSetTimeout(() => {
                if (
                    generation === state.generation &&
                    !state.active &&
                    !state.blocker
                ) {
                    disconnectObserver();
                    debugLog("Unrelated-page sentinel stopped");
                }
            }, CONFIG.initialProbeMs);
        }
    }

    function scheduleScan(root = document, force = false) {
        if (state.destroyed || state.blocker || !root) return;
        const prior = state.pendingRoots.get(root);
        state.pendingRoots.set(root, Boolean(prior || force));
        if (state.pendingRoots.size > 64) {
            state.pendingRoots.clear();
            state.pendingRoots.set(document, false);
        }
        if (state.scanTimer) return;
        state.scanTimer = nativeSetTimeout(
            flushScheduledScans,
            CONFIG.mutationDebounceMs,
        );
    }

    function strongSpecsFromRoot(root) {
        const specs = [];
        const baseUrl = documentBaseUrl(document, state.routeUrl);
        let scriptBytes = 0;
        for (const element of elementsMatching(
            root,
            "meta[http-equiv], script:not([src])",
            100,
        )) {
            if (element.localName === "script") {
                const size = String(element.textContent || "").length;
                if (scriptBytes + size > CONFIG.maxInlineScriptBytes) continue;
                scriptBytes += size;
            }
            specs.push(...candidateSpecsFromElement(element, baseUrl));
        }
        return specs;
    }

    function updateContextFromRoot(root) {
        const text = boundedText(root, 6000);
        const hasShortenerText = SHORTENER_TEXT_PATTERN.test(text);
        const hasCountdown = COUNTDOWN_TEXT_PATTERN.test(text);
        const hasSafeAction = elementsMatching(
            root,
            "a, button, input[type='button'], input[type='submit'], [role='button']",
            100,
        ).some(hasSafeActionLabel);
        if (hasShortenerText) raiseContext(70, "shortener page text");
        if (hasCountdown) raiseContext(55, "countdown text");
        if (hasSafeAction) raiseContext(55, "safe action label");
        if (hasCountdown && hasSafeAction) {
            raiseContext(70, "countdown and safe action");
        }
    }

    function activateDynamicEngine(reason) {
        if (state.active || state.blocker || state.destroyed) return;
        state.active = true;
        clearTimer("probeTimer");
        startObserver("active");
        debugLog("Dynamic engine activated:", reason);
        scheduleScan(document, true);
    }

    function scanInactiveRoot(root) {
        const gate = detectAutomationGate(root);
        if (gate) {
            stopAutomation(gate);
            return;
        }
        const strongSpecs = strongSpecsFromRoot(root);
        if (strongSpecs.length) {
            addCandidateSpecs(strongSpecs);
            const strongest = Math.max(
                ...strongSpecs.map((spec) => spec.score || 0),
            );
            if (strongest >= 98) raiseContext(95, "meta refresh");
            else if (strongest >= 88) {
                raiseContext(65, "literal redirect");
            }
        }
        updateContextFromRoot(root);
        if (root === document || root === document.documentElement) {
            raiseContext(quickContextScore(), "document classification");
        }
        if (
            state.contextScore >= CONFIG.shortenerActivationScore ||
            chooseUnambiguousCandidate(CONFIG.minimumConfidence)
        ) {
            activateDynamicEngine("classification threshold");
        }
    }

    function activeElementSelector() {
        return [
            "meta[http-equiv]",
            "script:not([src])",
            "a[href]",
            "area[href]",
            "button",
            "input[type='button']",
            "input[type='submit']",
            "input[type='hidden']",
            "[role='button']",
            "form[action]",
            "[onclick]",
            ...URL_DATA_ATTRIBUTES.map((attribute) => "[" + attribute + "]"),
        ].join(",");
    }

    function scanActiveRoot(root, force) {
        const gate = detectAutomationGate(root);
        if (gate) {
            stopAutomation(gate);
            return;
        }
        updateContextFromRoot(root);
        const baseUrl = documentBaseUrl(document, state.routeUrl);
        const limit =
            root === document
                ? Math.max(1000, CONFIG.observerNodeBudget)
                : CONFIG.observerNodeBudget;
        let scriptBytes = 0;
        for (const element of elementsMatching(
            root,
            activeElementSelector(),
            limit,
        )) {
            if (!force && state.processedNodes.has(element)) continue;
            if (element.localName === "script") {
                const size = String(element.textContent || "").length;
                if (scriptBytes + size > CONFIG.maxInlineScriptBytes) {
                    state.processedNodes.add(element);
                    continue;
                }
                scriptBytes += size;
            }
            addCandidateSpecs(candidateSpecsFromElement(element, baseUrl));
            if (
                element.matches(
                    "a, button, input[type='button'], input[type='submit'], [role='button']",
                )
            ) {
                considerAction(element);
            }
            state.processedNodes.add(element);
        }

        if (hasCountdownSignal(root)) enableCountdownPatch();
    }

    function hasCountdownSignal(root) {
        if (!state.active) return false;
        if (
            rootHasSelector(
                root,
                "[id*='countdown' i], [class*='countdown' i], [id*='timer' i], [class*='timer' i]",
            )
        ) {
            return true;
        }
        return COUNTDOWN_TEXT_PATTERN.test(boundedText(root, 6000));
    }

    function scheduleCountdownRescan() {
        clearTimer("countdownScanTimer");
        if (!state.countdownActive || state.destroyed || state.blocker) return;
        const generation = state.generation;
        state.countdownScanTimer = nativeSetTimeout(() => {
            if (
                generation !== state.generation ||
                !state.countdownActive ||
                state.blocker
            ) {
                return;
            }
            for (const element of elementsMatching(
                document,
                "a, button, input[type='button'], input[type='submit'], [role='button']",
                100,
            )) {
                considerAction(element);
            }
            evaluateAutomation("countdown tick");
            scheduleCountdownRescan();
        }, 1000);
    }

    function flushScheduledScans() {
        state.scanTimer = 0;
        if (state.destroyed || state.blocker) {
            state.pendingRoots.clear();
            return;
        }
        const generation = state.generation;
        const pending = [...state.pendingRoots.entries()];
        state.pendingRoots.clear();
        for (const [root, force] of pending) {
            if (generation !== state.generation || state.blocker) return;
            try {
                if (state.active) scanActiveRoot(root, force);
                else scanInactiveRoot(root);
            } catch (error) {
                warnLog("DOM scan failed:", errorMessage(error));
            }
        }
        evaluateAutomation("DOM scan");
    }

    function clickAction(entry) {
        if (
            !CONFIG.autoClick ||
            state.blocker ||
            state.navigating ||
            state.routeClickCount >= CONFIG.maxClicksPerRoute ||
            state.documentActionCount >= CONFIG.maxActionsPerDocument
        ) {
            return false;
        }
        const gate = detectAutomationGate(document);
        if (gate) {
            stopAutomation(gate);
            return false;
        }
        const element = entry?.element;
        if (!element || actionScore(element) < CONFIG.actionMinimumConfidence) {
            return false;
        }
        const signature = actionSignature(element);
        if (
            state.clickedElements.has(element) ||
            state.actionSignatures.has(signature)
        ) {
            return false;
        }

        state.clickedElements.add(element);
        state.actionSignatures.add(signature);
        state.routeClickCount += 1;
        state.documentActionCount += 1;
        armPopupForElement(element);
        debugLog(
            "Clicking high-confidence action:",
            entry.score,
            elementLabel(element),
        );
        try {
            element.click();
        } catch (error) {
            warnLog("Automated click failed:", errorMessage(error));
            return false;
        }

        const generation = state.generation;
        for (const delay of [250, 900, 2200]) {
            const timer = nativeSetTimeout(() => {
                state.postClickTimers.delete(timer);
                if (
                    generation === state.generation &&
                    !state.destroyed &&
                    !state.blocker
                ) {
                    scheduleScan(document, true);
                }
            }, delay);
            state.postClickTimers.add(timer);
        }
        return true;
    }

    function maybeResolveCurrentRoute() {
        if (
            !CONFIG.followRedirects ||
            state.blocker ||
            state.navigating ||
            state.contextScore < CONFIG.networkMinimumContext ||
            state.networkStartedGeneration === state.generation
        ) {
            return;
        }
        state.networkStartedGeneration = state.generation;
        const generation = state.generation;
        const source = state.routeUrl;
        networkResolver.resolve(source).then((result) => {
            if (
                state.destroyed ||
                generation !== state.generation ||
                state.blocker
            ) {
                return;
            }
            if (result.url) {
                addCandidate({
                    raw: result.url,
                    baseUrl: source,
                    score: 98,
                    source: "network",
                    evidence: [result.reason],
                });
                evaluateAutomation("network resolution");
            } else {
                debugLog("No network destination:", result.reason);
            }
        });
    }

    function evaluateAutomation(reason) {
        if (state.destroyed || state.blocker || state.navigating) return;
        if (state.domReady) {
            const gate = detectAutomationGate(document);
            if (gate) {
                stopAutomation(gate);
                return;
            }
        }

        const destination = chooseUnambiguousCandidate(
            CONFIG.minimumConfidence,
        );
        if (state.routeRepeated && (state.active || destination)) {
            stopAutomation("route loop protection triggered");
            return;
        }
        if (destination) {
            if (
                destination.candidate.baseScore < 95 &&
                state.contextScore < 65
            ) {
                debugLog(
                    "Navigation withheld: insufficient page context",
                    destination.candidate.url,
                );
                return;
            }
            navigateTo(
                destination.candidate.url,
                reason + " score=" + destination.score,
            );
            return;
        }
        if (!state.active || !state.domReady) return;

        const action = bestAction();
        if (action && clickAction(action)) return;
        maybeResolveCurrentRoute();
    }

    function resetRouteState() {
        adapterRegistry.cleanup();
        disableCountdownPatch();
        disconnectObserver();
        clearTimer("probeTimer");
        clearTimer("navigationTimer");
        clearPostClickTimers();
        state.generation += 1;
        state.contextScore = 0;
        state.blocker = "";
        state.blockerLogged = "";
        state.active = false;
        state.candidates.clear();
        state.actionCandidates.clear();
        state.processedNodes = new WeakSet();
        state.pendingRoots.clear();
        state.routeClickCount = 0;
        state.popupArmedUntil = 0;
        state.popupExpectedUrl = "";
        state.popupActionLabel = "";
        state.navigating = false;
        state.routeRepeated = false;
        state.networkStartedGeneration = -1;
    }

    function beginRoute(reason) {
        if (state.destroyed) return;
        const checked = validateUrl(location.href);
        if (!checked.ok) {
            disconnectObserver();
            debugLog("Resolver inactive:", checked.reason);
            return;
        }
        resetRouteState();
        state.routeUrl = checked.url.href;
        state.routeRepeated = hasVisitedRoute(state.routeUrl);
        debugLog("Route:", state.routeUrl, "trigger:", reason);

        const cached = getCachedResolution(state.routeUrl);
        if (cached) {
            addCandidate({
                raw: cached,
                baseUrl: state.routeUrl,
                score: 100,
                source: "session-cache",
                evidence: ["recent-resolution"],
            });
        }

        const url = new URL(state.routeUrl);
        adapterRegistry.run(url, {
            url,
            generation: state.generation,
            addCandidate,
            raiseContext,
        });
        evaluateAutomation("URL adapter");
        if (state.navigating || state.blocker) return;

        startObserver("sentinel");
        if (state.domReady) scheduleScan(document, true);
    }

    function handleRouteSignal(reason) {
        if (state.destroyed) return;
        let current;
        try {
            current = new URL(location.href).href;
        } catch {
            return;
        }
        if (current !== state.routeUrl) {
            beginRoute(reason);
        } else if (state.domReady && !state.blocker) {
            scheduleScan(document, true);
        }
    }

    function handleDomReady() {
        if (state.destroyed) return;
        state.domReady = true;
        scheduleScan(document, true);
    }

    function destroy() {
        if (state.destroyed) return;
        state.destroyed = true;
        adapterRegistry.cleanup();
        disableCountdownPatch();
        disconnectObserver();
        clearTimer("probeTimer");
        clearTimer("navigationTimer");
        clearPostClickTimers();
        for (const cleanup of state.hookCleanups.splice(0).reverse()) {
            try {
                cleanup();
            } catch {}
        }
        try {
            if (globalThis[INSTANCE_KEY]?.cleanup === destroy) {
                delete globalThis[INSTANCE_KEY];
            }
        } catch {}
    }

    function bootstrap() {
        const current = validateUrl(location.href);
        if (!current.ok) {
            debugLog("Resolver disabled:", current.reason);
            return;
        }

        try {
            globalThis[INSTANCE_KEY]?.cleanup?.();
        } catch {}
        globalThis[INSTANCE_KEY] = { cleanup: destroy };

        document.addEventListener("click", handleCapturedClick, true);
        state.hookCleanups.push(() =>
            document.removeEventListener("click", handleCapturedClick, true),
        );
        document.addEventListener(
            "visibilitychange",
            suppressTimerPauseEvent,
            true,
        );
        state.hookCleanups.push(() =>
            document.removeEventListener(
                "visibilitychange",
                suppressTimerPauseEvent,
                true,
            ),
        );
        window.addEventListener("blur", suppressTimerPauseEvent, true);
        state.hookCleanups.push(() =>
            window.removeEventListener("blur", suppressTimerPauseEvent, true),
        );

        for (const eventName of ROUTE_EVENTS) {
            const listener = () => {
                if (eventName === "pageshow") {
                    state.navigating = false;
                    clearTimer("navigationTimer");
                }
                handleRouteSignal(eventName);
            };
            window.addEventListener(eventName, listener);
            state.hookCleanups.push(() =>
                window.removeEventListener(eventName, listener),
            );
        }
        window.addEventListener("unload", destroy, { once: true });
        state.hookCleanups.push(() =>
            window.removeEventListener("unload", destroy),
        );

        installHistoryHooks();
        installPopupHook();

        if (state.domReady) nativeQueueMicrotask(handleDomReady);
        else {
            document.addEventListener("DOMContentLoaded", handleDomReady, {
                once: true,
            });
            state.hookCleanups.push(() =>
                document.removeEventListener(
                    "DOMContentLoaded",
                    handleDomReady,
                ),
            );
        }
        beginRoute("initial load");
    }

    bootstrap();
})();
