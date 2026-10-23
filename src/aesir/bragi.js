// ============================================================================
// CHRONO CLIENT - AESIR MODULE: BRAGI (Language & Auto Chat Translator 🗣️)
// ============================================================================
(function() {
    "use strict";

    window.Chrono = window.Chrono || {};

    const BRAGI_LANGUAGES = [
        { code: "en", flag: "🇬🇧", name: "English" },
        { code: "fr", flag: "🇫🇷", name: "Français" },
        { code: "es", flag: "🇪🇸", name: "Español" },
        { code: "de", flag: "🇩🇪", name: "Deutsch" },
        { code: "it", flag: "🇮🇹", name: "Italiano" },
        { code: "pt", flag: "🇵🇹", name: "Português" },
        { code: "ru", flag: "🇷🇺", name: "Русский" },
        { code: "uk", flag: "🇺🇦", name: "Українська" },
        { code: "pl", flag: "🇵🇱", name: "Polski" },
        { code: "tr", flag: "🇹🇷", name: "Türkçe" },
        { code: "nl", flag: "🇳🇱", name: "Nederlands" },
        { code: "sv", flag: "🇸🇪", name: "Svenska" },
        { code: "no", flag: "🇳🇴", name: "Norsk" },
        { code: "da", flag: "🇩🇰", name: "Dansk" },
        { code: "fi", flag: "🇫🇮", name: "Suomi" },
        { code: "cs", flag: "🇨🇿", name: "Čeština" },
        { code: "ro", flag: "🇷🇴", name: "Română" },
        { code: "hu", flag: "🇭🇺", name: "Magyar" },
        { code: "el", flag: "🇬🇷", name: "Ελληνικά" },
        { code: "ar", flag: "🇸🇦", name: "العربية" },
        { code: "he", flag: "🇮🇱", name: "עברית" },
        { code: "hi", flag: "🇮🇳", name: "हिन्दी" },
        { code: "ja", flag: "🇯🇵", name: "日本語" },
        { code: "ko", flag: "🇰🇷", name: "한국어" },
        { code: "zh-CN", flag: "🇨🇳", name: "简体中文" },
        { code: "zh-TW", flag: "🇹🇼", name: "繁體中文" },
        { code: "vi", flag: "🇻🇳", name: "Tiếng Việt" },
        { code: "th", flag: "🇹🇭", name: "ไทย" },
        { code: "id", flag: "🇮🇩", name: "Bahasa Indonesia" }
    ];

    // State & Settings (Default: OFF, opt-in for zero baseline overhead)
    const defaultLang = (typeof navigator !== "undefined" && navigator.language && navigator.language.toLowerCase().startsWith("fr")) ? "fr" : "fr";
    const state = {
        enabled: localStorage.getItem("chrono_bragi_enabled") === "1", // Default: OFF (Opt-in)
        targetLang: localStorage.getItem("chrono_bragi_target_lang") || defaultLang,
        incomingChat: localStorage.getItem("chrono_bragi_incoming_chat") !== "0", // Default: ON when Bragi is enabled
        outgoingChat: localStorage.getItem("chrono_bragi_outgoing_chat") === "1", // Default: OFF (Xtransceiver /tr only)
        outgoingLang: localStorage.getItem("chrono_bragi_outgoing_lang") || "en",
        gameUI: localStorage.getItem("chrono_bragi_game_ui") === "1" // Default: OFF
    };

    // Translation Engine & In-Memory / Local Storage Cache
    const TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single";
    const translationCache = Object.create(null);
    try {
        const stored = JSON.parse(localStorage.getItem("chrono_bragi_cache") || "{}");
        for (let k in stored) {
            const v = stored[k];
            if (typeof v === "string") translationCache[k] = { translated: v, detected: "" };
            else if (v && typeof v.translated === "string") translationCache[k] = v;
        }
    } catch(e) {}

    function getCached(cacheKey) {
        const val = translationCache[cacheKey];
        if (val === undefined || val === null) return null;
        if (typeof val === "string") return { translated: val, detected: "" };
        if (typeof val === "object" && typeof val.translated === "string") return val;
        return null;
    }

    function persistCache() {
        try {
            const keys = Object.keys(translationCache);
            if (keys.length > 500) {
                const trimmed = {};
                keys.slice(keys.length - 350).forEach(k => { trimmed[k] = translationCache[k]; });
                localStorage.setItem("chrono_bragi_cache", JSON.stringify(trimmed));
            } else {
                localStorage.setItem("chrono_bragi_cache", JSON.stringify(translationCache));
            }
        } catch(e) {}
    }

    let persistDebounce = null;
    function schedulePersistCache() {
        if (persistDebounce) return;
        persistDebounce = setTimeout(() => {
            persistDebounce = null;
            if (typeof window.requestIdleCallback === "function") {
                window.requestIdleCallback(persistCache, { timeout: 3000 });
            } else {
                persistCache();
            }
        }, 12000);
    }

    // Queued Translation Worker: prevents HTTP connection flooding & network packet contention
    const translationQueue = [];
    let isTranslating = false;

    function processTranslationQueue() {
        if (isTranslating || translationQueue.length === 0) return;
        isTranslating = true;
        const item = translationQueue.shift();

        const cacheKey = item.target + "|" + item.trimmed;
        const cached = getCached(cacheKey);
        if (cached) {
            isTranslating = false;
            try { item.callback(cached.translated, cached.detected); } catch(e) {}
            setTimeout(processTranslationQueue, 5);
            return;
        }

        const url = TRANSLATE_URL + "?client=gtx&sl=auto&tl=" + encodeURIComponent(item.target) +
                    "&dt=t&q=" + encodeURIComponent(item.trimmed);

        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.timeout = 4000;
        xhr.onload = function() {
            try {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const data = JSON.parse(xhr.responseText);
                    let translated = "";
                    if (data && data[0]) {
                        for (let i = 0; i < data[0].length; i++) {
                            if (data[0][i] && data[0][i][0]) translated += data[0][i][0];
                        }
                    }
                    const detected = (data && data[2]) ? String(data[2]).toLowerCase() : "";
                    translationCache[cacheKey] = { translated: translated, detected: detected };
                    schedulePersistCache();
                    try { item.callback(translated, detected); } catch(e) {}
                } else {
                    try { item.callback("", ""); } catch(e) {}
                }
            } catch(e) {
                try { item.callback("", ""); } catch(e) {}
            } finally {
                isTranslating = false;
                setTimeout(processTranslationQueue, 60);
            }
        };
        xhr.onerror = function() {
            isTranslating = false;
            try { item.callback("", ""); } catch(e) {}
            setTimeout(processTranslationQueue, 150);
        };
        xhr.ontimeout = function() {
            isTranslating = false;
            try { item.callback("", ""); } catch(e) {}
            setTimeout(processTranslationQueue, 150);
        };
        try {
            xhr.send();
        } catch(e) {
            isTranslating = false;
            try { item.callback("", ""); } catch(e) {}
            setTimeout(processTranslationQueue, 150);
        }
    }

    function translateText(text, target, callback) {
        if (!text || typeof text !== "string") {
            callback("", "");
            return;
        }
        const trimmed = text.trim();
        if (trimmed.length < 2) {
            callback(trimmed, "");
            return;
        }

        const cacheKey = target + "|" + trimmed;
        const cached = getCached(cacheKey);
        if (cached) {
            callback(cached.translated, cached.detected);
            return;
        }

        if (translationQueue.length > 25) {
            translationQueue.splice(0, 10);
        }

        translationQueue.push({ trimmed: trimmed, target: target, callback: callback });
        processTranslationQueue();
    }

    // Helper: detect player's current username
    function getLocalPlayerName() {
        let name = "";
        try {
            if (typeof window.client === "object" && window.client) {
                if (window.client.accountName) name = window.client.accountName;
                else if (window.client.main && window.client.main.name) name = window.client.main.name;
                else if (window.client.self && window.client.self.entity && window.client.self.entity.name) name = window.client.self.entity.name;
                else if (window.client.state && window.client.state.self && window.client.state.self.entity && window.client.state.self.entity.name) name = window.client.state.self.entity.name;
            }
        } catch(e) {}
        if (!name) {
            const loggedIn = document.querySelector(".logged-in-name");
            if (loggedIn && loggedIn.textContent) name = loggedIn.textContent.trim();
        }
        if (!name) {
            const titleEl = document.querySelector(".account-title");
            if (titleEl && titleEl.textContent) {
                const m = titleEl.textContent.match(/logged in as\s+(.+)$/i);
                if (m) name = m[1].trim();
            }
        }
        if (!name && window.Chrono && window.Chrono.currentPlayerName) {
            name = window.Chrono.currentPlayerName;
        }
        return name;
    }

    // ── Incoming Chat Translation (In-Place Native Replacement) ──
    let ourMutations = false;
    const recentSentMessages = [];

    function isOwnChatMessage(el) {
        if (!el) return false;
        const sender = el.querySelector(".chat-message-sender");
        const senderName = sender ? (sender.textContent || "").trim().toLowerCase() : "";
        const myName = (getLocalPlayerName() || "").toLowerCase();
        if (myName && senderName && senderName === myName) return true;

        if (!myName && recentSentMessages.length > 0) {
            const info = extractChatText(el);
            const now = Date.now();
            const idx = recentSentMessages.findIndex(m => (now - m.time < 5000) && m.text === info.text.toLowerCase());
            if (idx !== -1) {
                if (senderName && sender) {
                    window.Chrono = window.Chrono || {};
                    window.Chrono.currentPlayerName = sender.textContent.trim();
                }
                recentSentMessages.splice(idx, 1);
                return true;
            }
        }
        return false;
    }

    function findChatMsgTextNode(el) {
        if (!el) return null;
        const sender = el.querySelector(".chat-message-sender");
        if (sender) {
            let n = sender.nextSibling;
            while (n) {
                if (n.nodeType === 3 && n.nodeValue && n.nodeValue.replace(/^[:\s]+/, "").length > 0) return n;
                n = n.nextSibling;
            }
        }
        // Fallback: search all text nodes inside el, skipping sender and role badges
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        let cur;
        while ((cur = walker.nextNode())) {
            if (sender && (cur === sender || sender.contains(cur))) continue;
            const p = cur.parentElement;
            if (p && (p.classList.contains("chat-message-sender") || p.classList.contains("dev") || p.classList.contains("mod"))) continue;
            if (cur.nodeValue && cur.nodeValue.replace(/^[:\s]+/, "").trim().length > 0) return cur;
        }
        return null;
    }

    function extractChatText(el) {
        const textNode = findChatMsgTextNode(el);
        if (textNode) {
            const raw = textNode.nodeValue || "";
            const m = raw.match(/^([:\s]+)/);
            return {
                textNode: textNode,
                prefix: m ? m[1] : "",
                text: raw.substring(m ? m[1].length : 0).trim()
            };
        }
        const sender = el.querySelector(".chat-message-sender");
        const full = el.textContent || "";
        const senderText = sender ? sender.textContent : "";
        let text = full;
        if (senderText && full.indexOf(senderText) !== -1) {
            text = full.substring(full.indexOf(senderText) + senderText.length);
        }
        const m = text.match(/^([:\s]+)/);
        return {
            textNode: null,
            prefix: m ? m[1] : ": ",
            text: text.replace(/^[:\s]+/, "").trim()
        };
    }

    function processChatNode(el) {
        if (!state.enabled || !state.incomingChat) return;
        if (!el || el.nodeType !== 1) return;
        if (!el.classList || !el.classList.contains("chat-message")) return;
        if (el.dataset && el.dataset.bragiProcessed) return;


        const info = extractChatText(el);
        if (!info.text || info.text.length < 2 || info.text.length > 600) return;
        if (info.text.startsWith("/")) return; // Ignore game commands

        el.dataset.bragiProcessed = "1";

        if (info.textNode) {
            el.dataset.bragiOriginal = info.textNode.nodeValue;
            el.dataset.bragiPrefix = info.prefix;
        }

        const target = state.targetLang || "fr";
        const capturedTextNode = info.textNode;
        const capturedPrefix = info.prefix;
        const capturedText = info.text;

        translateText(capturedText, target, function(translated, detected) {
            if (!translated || !translated.trim()) return;

            // If source language matches target or translation is identical, no replacement needed
            if (detected && detected.toLowerCase() === target.toLowerCase()) return;
            if (translated.trim().toLowerCase() === capturedText.trim().toLowerCase()) return;

            ourMutations = true;
            try {
                if (capturedTextNode && capturedTextNode.parentNode) {
                    capturedTextNode.nodeValue = capturedPrefix + translated;
                } else {
                    const sender = el.querySelector(".chat-message-sender");
                    const container = sender ? sender.parentNode : el;
                    if (container) {
                        if (sender) {
                            let s = sender.nextSibling;
                            while (s) {
                                const next = s.nextSibling;
                                s.remove();
                                s = next;
                            }
                            container.appendChild(document.createTextNode((capturedPrefix || ": ") + translated));
                        } else {
                            container.textContent = translated;
                        }
                    }
                }

                // Interactive toggle tooltip & click-to-revert
                el.title = "Original: " + capturedText + " (Click to toggle)";
                el.style.cursor = "pointer";
                let isOriginal = false;
                el.onclick = function(e) {
                    if (e.target && e.target.closest && e.target.closest(".chat-message-sender")) return;
                    isOriginal = !isOriginal;
                    ourMutations = true;
                    try {
                        const newTxt = isOriginal ? (capturedPrefix + capturedText) : (capturedPrefix + translated);
                        if (capturedTextNode && capturedTextNode.parentNode) {
                            capturedTextNode.nodeValue = newTxt;
                        } else {
                            const sender = el.querySelector(".chat-message-sender");
                            if (sender && sender.nextSibling) {
                                sender.nextSibling.nodeValue = newTxt;
                            }
                        }
                    } finally {
                        ourMutations = false;
                    }
                };
            } finally {
                ourMutations = false;
            }
        });
    }

    function revertAllChatTranslations() {
        const msgs = document.querySelectorAll(".chat-message[data-bragi-processed]");
        msgs.forEach(el => {
            const orig = el.dataset.bragiOriginal;
            if (orig) {
                const textNode = findChatMsgTextNode(el);
                if (textNode) {
                    ourMutations = true;
                    try { textNode.nodeValue = orig; } finally { ourMutations = false; }
                }
            }
            el.onclick = null;
            el.title = "";
            el.style.cursor = "";
            delete el.dataset.bragiProcessed;
            delete el.dataset.bragiOriginal;
            delete el.dataset.bragiPrefix;
        });
    }

    let chatObserver = null;

    function startChatObserver() {
        if (chatObserver) return;
        if (!state.enabled || !state.incomingChat) return;

        function attach() {
            if (chatObserver) return;
            const root = document.body || document.documentElement;
            if (!root) {
                setTimeout(attach, 200);
                return;
            }

            // Immediately scan existing chat messages in the document
            const existing = document.querySelectorAll(".chat-message");
            const startIdx = Math.max(0, existing.length - 12);
            for (let i = startIdx; i < existing.length; i++) {
                processChatNode(existing[i]);
            }

            chatObserver = new MutationObserver(mutations => {
                if (ourMutations) return;
                if (!state.enabled || !state.incomingChat) return;

                for (let i = 0; i < mutations.length; i++) {
                    const mut = mutations[i];
                    if (mut.type !== "childList") continue;
                    const added = mut.addedNodes;
                    for (let j = 0; j < added.length; j++) {
                        const node = added[j];
                        if (node.nodeType !== 1) continue;
                        if (node.classList && node.classList.contains("chat-message")) {
                            processChatNode(node);
                        } else if (node.querySelectorAll) {
                            const sub = node.querySelectorAll(".chat-message");
                            for (let k = 0; k < sub.length; k++) {
                                processChatNode(sub[k]);
                            }
                        }
                    }
                }
            });

            chatObserver.observe(root, { childList: true, subtree: true });
        }

        attach();
    }

    function stopChatObserver() {
        if (chatObserver) {
            chatObserver.disconnect();
            chatObserver = null;
        }
    }

    // ── Outgoing Chat Handling ──
    // Rule: Never auto-translate user messages. Regular messages are sent 100% as typed.
    // If Xtransceiver is enabled, only translate if user explicitly writes /tr <message>.
    let xtransceiverSkip = false;
    window.addEventListener("keydown", function(ev) {
        if (ev.key !== "Enter") return;

        const input = document.getElementById("chat-input");
        if (!input || ev.target !== input) return;

        if (xtransceiverSkip) {
            xtransceiverSkip = false;
            return;
        }

        const raw = (input.value || "").trim();
        if (!raw) return;

        // Remember sent text so we recognize our own message in incoming chat
        const mySentText = raw.startsWith("/tr ") ? raw.substring(4).trim() : raw;
        recentSentMessages.push({ text: mySentText.toLowerCase(), time: Date.now() });
        if (recentSentMessages.length > 10) recentSentMessages.shift();

        // If Xtransceiver is active AND message starts with /tr : translate before sending
        if (state.enabled && state.outgoingChat && raw.startsWith("/tr ")) {
            const textToTranslate = raw.substring(4).trim();
            if (!textToTranslate) return;

            ev.preventDefault();
            ev.stopImmediatePropagation();
            ev.stopPropagation();

            const outTarget = state.outgoingLang || "en";
            translateText(textToTranslate, outTarget, function(translated) {
                input.value = (translated && translated.trim()) ? translated : textToTranslate;
                xtransceiverSkip = true;
                const fakeEnter = new KeyboardEvent("keydown", {
                    key: "Enter",
                    code: "Enter",
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true
                });
                input.dispatchEvent(fakeEnter);
            });
            return;
        }

        // Regular message: do NOT touch input.value at all, game sends it as typed!
    }, true /* Capture phase */);

    // ── Full Game UI Translation (Optional) ──
    const uiOriginalText = new WeakMap();
    const uiTranslatedNodes = new Set();

    function shouldTranslateNode(node) {
        if (!node || !node.nodeValue) return false;
        const trimmed = node.nodeValue.trim();
        if (trimmed.length < 2) return false;
        if (/^[\d\s\W]+$/.test(trimmed)) return false;
        if (/^\d+(\.\d+)?\s*(s|ms|m|km|px|fps|hp|mp|%|x)?$/i.test(trimmed)) return false;
        if (/^[\d\s\/.,:%-]+$/.test(trimmed)) return false;

        const p = node.parentElement;
        if (!p) return false;
        if (p.closest("input, textarea, script, style, .chat-message, .leaderboard-name, [id^='chrono-']")) return false;
        return true;
    }

    function translateUINode(node, target) {
        if (!shouldTranslateNode(node)) return;
        let original = uiOriginalText.get(node);
        if (original === undefined) {
            original = node.nodeValue;
            uiOriginalText.set(node, original);
        }

        const leading = original.match(/^\s*/)[0];
        const trailing = original.match(/\s*$/)[0];
        const trimmed = original.substring(leading.length, original.length - trailing.length);
        if (trimmed.length < 2) return;

        translateText(trimmed, target, function(translated) {
            if (!translated || !translated.trim()) return;
            if (translated.trim().toLowerCase() === trimmed.toLowerCase()) return;
            ourMutations = true;
            try {
                node.nodeValue = leading + translated + trailing;
                uiTranslatedNodes.add(node);
            } finally {
                ourMutations = false;
            }
        });
    }

    function walkAndTranslateUI() {
        if (!state.enabled || !state.gameUI) return;
        const target = state.targetLang || "en";
        if (!document.body) return;

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: function(n) {
                return shouldTranslateNode(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
            }
        });
        let n;
        while ((n = walker.nextNode())) translateUINode(n, target);
    }

    function revertUITranslations() {
        ourMutations = true;
        try {
            uiTranslatedNodes.forEach(node => {
                const orig = uiOriginalText.get(node);
                if (orig !== undefined && node.parentNode) node.nodeValue = orig;
            });
            uiTranslatedNodes.clear();
        } finally {
            ourMutations = false;
        }
    }

    let uiObserver = null;
    function startGameUIObserver() {
        if (uiObserver) return;
        if (!document.body) {
            setTimeout(startGameUIObserver, 300);
            return;
        }

        uiObserver = new MutationObserver(mutations => {
            if (ourMutations) return;
            if (!state.enabled || !state.gameUI) return;
            const target = state.targetLang || "en";

            for (let m = 0; m < mutations.length; m++) {
                const mut = mutations[m];
                if (mut.type !== "childList") continue;
                for (let a = 0; a < mut.addedNodes.length; a++) {
                    const node = mut.addedNodes[a];
                    if (node.nodeType === 3) {
                        translateUINode(node, target);
                    } else if (node.nodeType === 1) {
                        if (node.id && node.id.startsWith("chrono-")) continue;
                        if (node.classList && node.classList.contains("chat-message")) continue;
                        const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
                        let sub;
                        while ((sub = w.nextNode())) translateUINode(sub, target);
                    }
                }
            }
        });

        uiObserver.observe(document.body, { childList: true, subtree: true });
        walkAndTranslateUI();
    }

    function stopGameUIObserver() {
        if (uiObserver) {
            uiObserver.disconnect();
            uiObserver = null;
        }
    }

    // Public API
    window.Chrono.Bragi = {
        languages: BRAGI_LANGUAGES,
        SUPPORTED_LANGUAGES: BRAGI_LANGUAGES,
        state: state,
        config: state,
        translateText: translateText,
        translate: translateText,
        translateUI: walkAndTranslateUI,
        restoreUI: revertUITranslations,
        setEnabled: function(val) {
            state.enabled = Boolean(val);
            localStorage.setItem("chrono_bragi_enabled", state.enabled ? "1" : "0");
            if (!state.enabled) {
                stopChatObserver();
                stopGameUIObserver();
                revertAllChatTranslations();
                revertUITranslations();
            } else {
                if (state.incomingChat) startChatObserver();
                if (state.gameUI) startGameUIObserver();
            }
            if (typeof window.Chrono?.updateBragiSettingsUI === "function") {
                try { window.Chrono.updateBragiSettingsUI(); } catch(e) {}
            }
        },
        setTargetLang: function(code) {
            state.targetLang = code;
            localStorage.setItem("chrono_bragi_target_lang", code);
            revertAllChatTranslations();
            if (state.gameUI) {
                revertUITranslations();
                walkAndTranslateUI();
            }
            if (state.enabled && state.incomingChat) startChatObserver();
        },
        setIncomingChat: function(val) {
            state.incomingChat = Boolean(val);
            localStorage.setItem("chrono_bragi_incoming_chat", state.incomingChat ? "1" : "0");
            if (!state.incomingChat) {
                stopChatObserver();
                revertAllChatTranslations();
            } else if (state.enabled) {
                startChatObserver();
            }
        },
        setOutgoingChat: function(val) {
            state.outgoingChat = Boolean(val);
            localStorage.setItem("chrono_bragi_outgoing_chat", state.outgoingChat ? "1" : "0");
        },
        setOutgoingLang: function(code) {
            state.outgoingLang = code;
            localStorage.setItem("chrono_bragi_outgoing_lang", code);
        },
        setGameUI: function(val) {
            state.gameUI = Boolean(val);
            localStorage.setItem("chrono_bragi_game_ui", state.gameUI ? "1" : "0");
            if (!state.gameUI) {
                stopGameUIObserver();
                revertUITranslations();
            } else if (state.enabled) {
                startGameUIObserver();
                walkAndTranslateUI();
            }
        },
        clearCache: function() {
            for (let k in translationCache) delete translationCache[k];
            localStorage.removeItem("chrono_bragi_cache");
        },
        getCacheSize: function() {
            return Object.keys(translationCache).length;
        }
    };

    // Auto-mount observers on document ready
    function initBragi() {
        window.addEventListener("beforeunload", persistCache);
        if (state.enabled) {
            if (state.incomingChat) startChatObserver();
            if (state.gameUI) startGameUIObserver();
        }
        if (typeof window.Chrono?.updateBragiSettingsUI === "function") {
            try { window.Chrono.updateBragiSettingsUI(); } catch(e) {}
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initBragi);
    } else {
        initBragi();
    }
})();
