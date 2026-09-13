// ============================================================================
// CHRONO CLIENT - AESIR MODULE: FREYJA (Tournament & Anti-Cheat Mode 🛡️)
// ============================================================================
(function() {
    try {
        window.Chrono = window.Chrono || {};

    // === TOURNAMENT & TS (TOURNAMENT SPECTATOR) WINDOW (Purple Obsidian Theme 🏆) ===
    let isTournamentModeActive = (localStorage.getItem("chrono_tournament_mode") === "true");
    let activeTourTab = "anticheat";

    // --- TS (Tournament Spectator) State & Engine ---
    let isGrbActive = (localStorage.getItem("chrono_ts_grb_active") === "true");
    let isAutoMovingRight = false;
    let isCargoActive = isGrbActive && (localStorage.getItem("chrono_ts_cargo_active") === "true");
    const CARGO_STAT_META = {
        speed:  { name: "Speed", keynum: "[1]", digit: 1, icon: "⚡", bg: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", border: "#38bdf8", glow: "rgba(56, 189, 248, 0.45)", text: "#e0f2fe", defaultTarget: 17, step: 0.5, min: 1, max: 50 },
        energy: { name: "Energy", keynum: "[2]", digit: 2, icon: "🔋", bg: "linear-gradient(135deg, #d97706 0%, #b45309 100%)", border: "#fbbf24", glow: "rgba(251, 191, 36, 0.45)", text: "#fef3c7", defaultTarget: 100, step: 5, min: 10, max: 999 },
        regen:  { name: "Regen", keynum: "[3]", digit: 3, icon: "💖", bg: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)", border: "#4ade80", glow: "rgba(74, 222, 128, 0.45)", text: "#dcfce7", defaultTarget: 7, step: 0.5, min: 1, max: 50 },
        abi1:   { name: "Ability 1", keynum: "[4]", digit: 4, icon: "🔮", bg: "linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)", border: "#c084fc", glow: "rgba(192, 132, 252, 0.45)", text: "#f3e8ff", defaultTarget: 5, step: 1, min: 1, max: 5 },
        abi2:   { name: "Ability 2", keynum: "[5]", digit: 5, icon: "✨", bg: "linear-gradient(135deg, #a21caf 0%, #86198f 100%)", border: "#f472b6", glow: "rgba(244, 114, 182, 0.45)", text: "#fdf2f8", defaultTarget: 5, step: 1, min: 1, max: 5 },
        abi3:   { name: "Ability 3", keynum: "[6]", digit: 6, icon: "💥", bg: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)", border: "#fb7185", glow: "rgba(251, 113, 133, 0.45)", text: "#ffe4e6", defaultTarget: 5, step: 1, min: 1, max: 5 }
    };

    let cargoPipeline = [
        { stat: "speed", target: 17 },
        { stat: "abi1", target: 5 },
        { stat: "regen", target: 7 },
        { stat: "energy", target: 100 }
    ];
    try {
        const savedPipe = JSON.parse(localStorage.getItem("chrono_ts_cargo_pipeline") || "null");
        if (Array.isArray(savedPipe) && savedPipe.length > 0) {
            cargoPipeline = savedPipe.map(b => ({
                stat: b.stat,
                target: b.target !== undefined ? b.target : (b.count || (CARGO_STAT_META[b.stat] ? CARGO_STAT_META[b.stat].defaultTarget : 1))
            }));
        }
    } catch(e) {}
    let cargoPipelineStep = 0;
    let cargoPipelineProgress = 0;

    function getPlayerStatValue(player, stat) {
        if (!player) return 0;
        if (stat === "speed") {
            if (typeof player.speed === "number") {
                return player.speed > 100 ? (player.speed / 30) : player.speed;
            }
            return 0;
        }
        if (stat === "energy") {
            if (typeof player.maxEnergy === "number") return player.maxEnergy;
            if (typeof player.max_energy === "number") return player.max_energy;
            if (typeof player.energy === "number") return player.energy;
            return 0;
        }
        if (stat === "regen") {
            if (typeof player.energyRegen === "number") return player.energyRegen;
            if (typeof player.energy_regen === "number") return player.energy_regen;
            if (typeof player.regen === "number") return player.regen;
            return 0;
        }
        if (stat === "abi1") {
            const a = player.abilityOne || player.ability_one || (player.abilities && player.abilities[0]);
            if (a && typeof a.level === "number") return a.level;
            if (typeof player.abilityOneLevel === "number") return player.abilityOneLevel;
            return 0;
        }
        if (stat === "abi2") {
            const a = player.abilityTwo || player.ability_two || (player.abilities && player.abilities[1]);
            if (a && typeof a.level === "number") return a.level;
            if (typeof player.abilityTwoLevel === "number") return player.abilityTwoLevel;
            return 0;
        }
        if (stat === "abi3") {
            const a = player.abilityThree || player.ability_three || (player.abilities && player.abilities[2]);
            if (a && typeof a.level === "number") return a.level;
            if (typeof player.abilityThreeLevel === "number") return player.abilityThreeLevel;
            return 0;
        }
        return 0;
    }

    let chronoWorldState = null;
    let chronoSelfWrapper = null;
    let chronoSelfId = null;
    let chronoLocalPlayer = null;
    let chronoInitialStats = null;
    let chronoGameKeys = null;
    let chronoGameState = null;
    let chronoGameClient = null;
    let chronoAfterSendQueue = [];

    function hookProcessInputs(gs) {
        if (!gs || gs._chrono_pi_hooked || typeof gs.processInputs !== "function") return;
        gs._chrono_pi_hooked = true;
        const origProcessInputs = gs.processInputs;
        gs.processInputs = function() {
            if (isAnyMenuOpen() && this.keys && this.keys.keys) {
                for (let k = 0; k < this.keys.keys.length; k++) {
                    this.keys.keys[k] = false;
                }
            }
            if (isGrbActive && isAutoMovingRight && this.keys) {
                try {
                    if (typeof this.keys.keyDown === "function") {
                        this.keys.keyDown(6); // D
                        this.keys.keyDown(9); // ArrowRight
                    }
                    if (this.keys.keys) {
                        this.keys.keys[6] = true;
                        this.keys.keys[9] = true;
                    }
                } catch(e) {}
            }

            const res = origProcessInputs.apply(this, arguments);

            if (chronoAfterSendQueue.length > 0) {
                const kObj = this.keys || chronoGameKeys;
                while (chronoAfterSendQueue.length > 0) {
                    const act = chronoAfterSendQueue.shift();
                    if (kObj) {
                        try {
                            if (typeof kObj.keyUp === "function") kObj.keyUp(act);
                            if (kObj.keys) kObj.keys[act] = false;
                        } catch(e) {}
                    }
                }
            }

            return res;
        };
    }

    function _hookPropertyOnce(prop, cb) {
        try {
            Object.defineProperty(Object.prototype, prop, {
                configurable: true,
                get: function() { return undefined; },
                set: function(val) {
                    try { delete Object.prototype[prop]; } catch(e) {}
                    this[prop] = val;
                    try { cb(this); } catch(e) {}
                    return val;
                }
            });
        } catch(e) {}
    }

    _hookPropertyOnce("xpBar", function(gs) {
        chronoGameState = gs;
        if (gs.keys) chronoGameKeys = gs.keys;
        if (gs.self && gs.self.entity) chronoLocalPlayer = gs.self.entity;
        hookProcessInputs(gs);
    });

    function getGameRef() {
        if (chronoGameState && chronoGameState.keys) {
            return {
                gameState: chronoGameState,
                player: chronoLocalPlayer || chronoGameState.areaInfo?.self?.entity || chronoGameState.self?.entity,
                keys: chronoGameKeys || chronoGameState.keys
            };
        }
        try {
            const el = document.querySelector('div.quests-launcher') || document.querySelector('div.settings-launcher') || document.querySelector('canvas');
            if (!el) return null;
            const reactKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
            if (!reactKey) return null;

            let fiber = el[reactKey];
            let depth = 0;
            while (fiber && depth < 30) {
                if (fiber.stateNode?.gameState) {
                    const gs = fiber.stateNode.gameState;
                    chronoGameState = gs;
                    if (gs.keys) chronoGameKeys = gs.keys;
                    if (gs.areaInfo?.self?.entity) chronoLocalPlayer = gs.areaInfo.self.entity;
                    hookProcessInputs(gs);
                    return {
                        gameState: gs,
                        player: chronoLocalPlayer || gs.areaInfo?.self?.entity || gs.self?.entity,
                        keys: chronoGameKeys || gs.keys
                    };
                }
                fiber = fiber.return;
                depth++;
            }
        } catch(e) {}
        return null;
    }

    function isValidPlayerEntity(p) {
        if (!p) return false;
        const ent = p.entity || p;
        return (typeof ent.speed === "number" && typeof ent.x === "number" && typeof ent.y === "number");
    }

    function getLocalPlayer() {
        const ref = getGameRef();
        if (ref && isValidPlayerEntity(ref.player)) return ref.player;
        if (isValidPlayerEntity(chronoLocalPlayer)) return chronoLocalPlayer;
        if (typeof window.client === "object" && window.client) {
            if (isValidPlayerEntity(window.client.main?.entity)) return window.client.main.entity;
            if (isValidPlayerEntity(window.client.self?.entity)) return window.client.self.entity;
            if (isValidPlayerEntity(window.client.player)) return window.client.player;
        }
        return null;
    }

    function applyTournamentModeSecurity(active) {
        isTournamentModeActive = active;
        localStorage.setItem("chrono_tournament_mode", active ? "true" : "false");

        if (window.ipc) {
            window.ipc.postMessage(JSON.stringify({
                action: "set_tournament_mode",
                active: active
            }));
        }

        // In-Game Watermark / Banner (Top-Left)
        let watermark = document.getElementById("chrono-tournament-watermark");
        if (active) {
            if (!watermark) {
                watermark = document.createElement("div");
                watermark.id = "chrono-tournament-watermark";
                watermark.style.cssText = "position: fixed; top: 12px; left: 12px; background: linear-gradient(135deg, rgba(88, 28, 135, 0.9) 0%, rgba(59, 7, 100, 0.95) 100%); border: 1px solid rgba(192, 132, 252, 0.5); border-radius: 8px; padding: 6px 12px; color: #f3e8ff; font-family: system-ui, -apple-system, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6), 0 0 12px rgba(168, 85, 247, 0.4); z-index: 999999; display: flex; align-items: center; gap: 8px; pointer-events: none;";
                watermark.innerHTML = '<img src="data:image/png;base64,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" style="width: 18px; height: 18px; object-fit: contain;" /><span>TOURNY • MODE</span>';
                document.body.appendChild(watermark);
            } else {
                watermark.style.display = "flex";
            }
        } else {
            if (watermark) watermark.style.display = "none";
        }
    }

    function updateGrbBadge() {
        let badge = document.getElementById("chrono-grb-badge");
        if (isGrbActive) {
            if (!badge) {
                badge = document.createElement("div");
                badge.id = "chrono-grb-badge";
                badge.style.cssText = "position: fixed; bottom: 48px; right: 12px; background: linear-gradient(135deg, rgba(88, 28, 135, 0.92) 0%, rgba(49, 10, 100, 0.95) 100%); border: 1px solid rgba(192, 132, 252, 0.5); border-radius: 8px; padding: 6px 12px; color: #f3e8ff; font-family: system-ui, -apple-system, sans-serif; font-size: 11px; font-weight: 800; z-index: 999999; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6), 0 0 12px rgba(168, 85, 247, 0.4); pointer-events: none;";
                document.body.appendChild(badge);
            }
            badge.style.display = "flex";
            badge.innerHTML = '<span style="color: #c084fc; font-size: 13px;">⏩ GRB</span>' +
                '<span style="color: ' + (isAutoMovingRight ? '#4ade80' : '#facc15') + ';">' +
                (isAutoMovingRight ? '• AUTO-RIGHT ON' : '• RIGHT LOCKED (PRESS RIGHT TO TOGGLE)') + '</span>';
        } else {
            if (badge) badge.style.display = "none";
        }
    }

    function applyGrbState(active) {
        isGrbActive = active;
        localStorage.setItem("chrono_ts_grb_active", active ? "true" : "false");
        if (!active) {
            isAutoMovingRight = false;
            sendGameKey("right", false);
            applyCargoState(false);
        }
        updateGrbBadge();
        syncTournamentUi();
    }

    function applyCargoState(active) {
        if (active && !isGrbActive) return;
        isCargoActive = active;
        localStorage.setItem("chrono_ts_cargo_active", active ? "true" : "false");
        syncTournamentUi();
    }

    function saveCargoPipeline() {
        localStorage.setItem("chrono_ts_cargo_pipeline", JSON.stringify(cargoPipeline));
    }

    function isMoveDirection(code, key) {
        const c = (code || "").toLowerCase();
        const k = (key || "").toLowerCase();
        if (c === "keyw" || c === "arrowup" || k === "z" || k === "w") return "up";
        if (c === "keys" || c === "arrowdown" || k === "s") return "down";
        if (c === "keya" || c === "arrowleft" || k === "q" || k === "a") return "left";
        if (c === "keyd" || c === "arrowright" || k === "d") return "right";
        return null;
    }

    function isAnyMenuOpen() {
        const modals = [
            "#chrono-menu-modal",
            "#chrono-runs-window",
            "#chrono-leaderboard-window",
            "#chrono-tournament-window",
            ".settings-window",
            ".quests-window",
            ".quests",
            ".settings"
        ];
        for (const sel of modals) {
            const el = document.querySelector(sel);
            if (el && (el.style.display === "flex" || el.style.display === "block" || el.offsetParent !== null)) {
                return true;
            }
        }
        return false;
    }

    function sendGameKey(keyName, isDown) {
        const type = isDown ? "keydown" : "keyup";
        const keyMap = {
            right: { key: "d", code: "KeyD", keyCode: 68, arrowKey: "ArrowRight", arrowCode: "ArrowRight", arrowKeyCode: 39, num: 6, arrowNum: 9 },
            up:    { key: "w", code: "KeyW", keyCode: 87, arrowKey: "ArrowUp", arrowCode: "ArrowUp", arrowKeyCode: 38, num: 19, arrowNum: 18 },
            down:  { key: "s", code: "KeyS", keyCode: 83, arrowKey: "ArrowDown", arrowCode: "ArrowDown", arrowKeyCode: 40, num: 10, arrowNum: 5 },
            left:  { key: "a", code: "KeyA", keyCode: 65, arrowKey: "ArrowLeft", arrowCode: "ArrowLeft", arrowKeyCode: 37, num: 4, arrowNum: 8 }
        };
        const info = keyMap[keyName];
        if (!info) return;

        // 1. Direct Evades Key Manager invocation
        const allKeyObjects = [
            chronoGameKeys,
            chronoGameState?.keys,
            chronoGameClient?.keys,
            window.client?.state?.keys,
            window.client?.keys
        ].filter(Boolean);

        for (const kObj of allKeyObjects) {
            try {
                if (isDown) {
                    if (typeof kObj.keyDown === "function") {
                        kObj.keyDown(info.num);
                        kObj.keyDown(info.arrowNum);
                    }
                    if (kObj.keys) {
                        kObj.keys[info.num] = true;
                        kObj.keys[info.arrowNum] = true;
                    }
                } else {
                    if (typeof kObj.keyUp === "function") {
                        kObj.keyUp(info.num);
                        kObj.keyUp(info.arrowNum);
                    }
                    if (kObj.keys) {
                        kObj.keys[info.num] = false;
                        kObj.keys[info.arrowNum] = false;
                    }
                }
            } catch(e) {}
        }

        // 2. DOM Events
        const targets = [
            document.getElementById("canvas"),
            document.querySelector("canvas"),
            document.activeElement,
            document.body,
            document.documentElement,
            document,
            window
        ].filter(Boolean);

        function createKeyEvent(evType, k, c, kc) {
            const ev = new KeyboardEvent(evType, {
                key: k,
                code: c,
                keyCode: kc,
                which: kc,
                charCode: kc,
                bubbles: true,
                cancelable: true,
                composed: true,
                view: window
            });
            try { Object.defineProperty(ev, "keyCode", { get: () => kc }); } catch(e) {}
            try { Object.defineProperty(ev, "which", { get: () => kc }); } catch(e) {}
            try { Object.defineProperty(ev, "code", { get: () => c }); } catch(e) {}
            try { Object.defineProperty(ev, "key", { get: () => k }); } catch(e) {}
            return ev;
        }

        const ev1 = createKeyEvent(type, info.key, info.code, info.keyCode);
        const ev2 = createKeyEvent(type, info.arrowKey, info.arrowCode, info.arrowKeyCode);

        for (const t of targets) {
            try { t.dispatchEvent(ev1); } catch(e) {}
            try { t.dispatchEvent(ev2); } catch(e) {}
        }
    }

    function doUpgrade(digit) {
        const d = parseInt(digit, 10);
        if (isNaN(d) || d < 1 || d > 6) return;

        // 1. Direct client upgrade API
        try {
            if (typeof window.client?.upgrade === "function") window.client.upgrade(d);
            if (typeof window.client?.upgradeStat === "function") window.client.upgradeStat(d);
            if (typeof window.upgradeStat === "function") window.upgradeStat(d);
            if (typeof window.upgrade === "function") window.upgrade(d);
        } catch(e) {}

        // 2. Direct keys manager with Evades action mapping (Speed="upgradeSpeed", MaxEnergy="upgradeMaxEnergy", Regen="upgradeEnergyRegen", Abi1="upgradeAbilityOne", Abi2="upgradeAbilityTwo", Abi3="upgradeAbilityThree")
        const ACTION_MAP = { 1: "upgradeSpeed", 2: "upgradeMaxEnergy", 3: "upgradeEnergyRegen", 4: "upgradeAbilityOne", 5: "upgradeAbilityTwo", 6: "upgradeAbilityThree" };
        const act = ACTION_MAP[d];
        const ref = getGameRef();
        const allKeyObjects = [
            ref?.keys,
            chronoGameKeys,
            chronoGameState?.keys,
            chronoGameClient?.keys,
            window.client?.state?.keys,
            window.client?.keys
        ].filter(Boolean);

        if (act !== undefined) {
            for (const kObj of allKeyObjects) {
                try {
                    if (typeof kObj.keyDown === "function") kObj.keyDown(act);
                    if (kObj.keys) kObj.keys[act] = true;
                } catch(e) {}
            }
            chronoAfterSendQueue.push(act);
            setTimeout(() => {
                for (const kObj of allKeyObjects) {
                    try {
                        if (typeof kObj.keyUp === "function") kObj.keyUp(act);
                        if (kObj.keys) kObj.keys[act] = false;
                    } catch(e) {}
                }
            }, 60);
        }


        // 3. Dispatch full DOM KeyboardEvents (Digit + AZERTY + Numpad)
        const code = "Digit" + d;
        const numpadCode = "Numpad" + d;
        const key = String(d);
        const kc = 48 + d;
        const azertyKey = ["", "&", "é", '"', "'", "(", "-", "è", "_", "ç"][d] || key;

        const targets = [
            document.getElementById("canvas"),
            document.querySelector("canvas"),
            document.activeElement,
            document.body,
            document.documentElement,
            document,
            window
        ].filter(Boolean);

        function createKeyEvent(evType, k, c, keyNum) {
            const ev = new KeyboardEvent(evType, {
                key: k,
                code: c,
                keyCode: keyNum,
                which: keyNum,
                charCode: keyNum,
                bubbles: true,
                cancelable: true,
                composed: true,
                view: window
            });
            try { Object.defineProperty(ev, "keyCode", { get: () => keyNum }); } catch(e) {}
            try { Object.defineProperty(ev, "which", { get: () => keyNum }); } catch(e) {}
            try { Object.defineProperty(ev, "code", { get: () => c }); } catch(e) {}
            try { Object.defineProperty(ev, "key", { get: () => k }); } catch(e) {}
            return ev;
        }

        for (const t of targets) {
            try { t.dispatchEvent(createKeyEvent("keydown", key, code, kc)); } catch(e) {}
            try { t.dispatchEvent(createKeyEvent("keydown", azertyKey, code, kc)); } catch(e) {}
            try { t.dispatchEvent(createKeyEvent("keydown", key, numpadCode, 96 + d)); } catch(e) {}
        }

        setTimeout(() => {
            for (const t of targets) {
                try { t.dispatchEvent(createKeyEvent("keyup", key, code, kc)); } catch(e) {}
                try { t.dispatchEvent(createKeyEvent("keyup", azertyKey, code, kc)); } catch(e) {}
                try { t.dispatchEvent(createKeyEvent("keyup", key, numpadCode, 96 + d)); } catch(e) {}
            }
        }, 35);
    }

    // Capture keyboard events for GRB
    if (!window._chrono_grb_hooked) {
        window._chrono_grb_hooked = true;

        // Reset counts on respawn click or space/enter
        window.addEventListener("click", function(e) {
            if (e.target && (e.target.classList.contains("respawn-btn") || e.target.classList.contains("respawn-button") || e.target.closest(".death-screen") || e.target.closest(".victory-screen"))) {
                chronoInitialStats = null;
                cargoPipelineStep = 0;
                cargoPipelineProgress = 0;
                if (typeof renderCargoPuzzlePipeline === "function") renderCargoPuzzlePipeline();
            }
        }, true);

        window.addEventListener("keydown", function(e) {
            // Space / Enter reset stat counts for new run
            if (e.key === " " || e.code === "Space" || e.code === "Enter") {
                chronoInitialStats = null;
                cargoPipelineStep = 0;
                cargoPipelineProgress = 0;
                if (typeof renderCargoPuzzlePipeline === "function") renderCargoPuzzlePipeline();
            }

            if (!e.isTrusted) return;

            if (!isGrbActive) return;
            const dir = isMoveDirection(e.code, e.key);
            if (dir === "up" || dir === "down" || dir === "left") {
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
            }
            if (dir === "right") {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (!isAutoMovingRight) {
                    isAutoMovingRight = true;
                    updateGrbBadge();
                    sendGameKey("right", true);
                } else {
                    isAutoMovingRight = false;
                    updateGrbBadge();
                    sendGameKey("right", false);
                }
                return false;
            }
        }, true);

        window.addEventListener("keyup", function(e) {
            if (!e.isTrusted) return;

            if (!isGrbActive) return;
            const dir = isMoveDirection(e.code, e.key);
            if (dir === "up" || dir === "down" || dir === "left") {
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
            }
            if (dir === "right") {
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
            }
        }, true);

        // Block mouse/touch steering movements during GRB
        function shouldBlockGrbMouse(e) {
            if (!isGrbActive) return false;
            if (isAnyMenuOpen()) return false;
            const target = e && e.target;
            if (target && target.closest) {
                if (target.closest("#chrono-menu-modal") || 
                    target.closest("#chrono-runs-window") || 
                    target.closest("#chrono-leaderboard-window") || 
                    target.closest("#chrono-tournament-window") || 
                    target.closest("#chrono-hourglass-launcher") || 
                    target.closest("#chrono-runs-launcher") || 
                    target.closest("#chrono-leaderboard-launcher") || 
                    target.closest("#chrono-tournament-launcher") || 
                    target.closest(".settings-launcher") || 
                    target.closest(".quests-launcher") ||
                    target.closest(".quests-window") ||
                    target.closest(".quests") ||
                    target.closest(".settings")) {
                    return false;
                }
            }
            return true;
        }

        const blockEvents = ["mousemove", "pointermove", "touchmove", "mousedown", "pointerdown", "touchstart"];
        blockEvents.forEach(evt => {
            window.addEventListener(evt, function(e) {
                if (!e.isTrusted) return;
                if (shouldBlockGrbMouse(e)) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    return false;
                }
            }, true);
            document.addEventListener(evt, function(e) {
                if (!e.isTrusted) return;
                if (shouldBlockGrbMouse(e)) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    return false;
                }
            }, true);
        });

        // Maintain GRB across Alt-Tab & window blur
        const maintainGrbOnBlur = function() {
            if (isGrbActive && isAutoMovingRight) {
                sendGameKey("right", true);
            }
        };
        window.addEventListener("blur", maintainGrbOnBlur);
        window.addEventListener("focus", maintainGrbOnBlur);
        document.addEventListener("visibilitychange", maintainGrbOnBlur);

        // Continuous TS Ticker: Auto-Right Glide & Cargo Stat Upgrades
        let cargoLastKeyPressTime = 0;

        setInterval(() => {
            if (!isGrbActive) return;

            // 1. Maintain Auto Right Movement
            if (isAutoMovingRight) {
                sendGameKey("right", true);
            }

            // 2. Cargo Auto-Upgrades (Scratch Puzzle Sequence Engine)
            if (isCargoActive && cargoPipeline.length > 0) {
                const player = getLocalPlayer();
                if (player) {
                    const isDead = player.removed || (player.death_timer && player.death_timer > 0) || (player.deathTimer && player.deathTimer > 0) || (player.alive === false);
                    const curLvl = player.level || 1;
                    if (isDead || (curLvl === 1 && chronoLastObservedLevel > 1)) {
                        chronoInitialStats = null;
                        cargoPipelineStep = 0;
                        cargoPipelineProgress = 0;
                        if (typeof renderCargoPuzzlePipeline === "function") renderCargoPuzzlePipeline();
                    }
                    chronoLastObservedLevel = curLvl;

                    // Find first unfinished target in pipeline based on real hero stats
                    let activeStep = cargoPipeline.length;
                    for (let i = 0; i < cargoPipeline.length; i++) {
                        const block = cargoPipeline[i];
                        const meta = CARGO_STAT_META[block.stat] || CARGO_STAT_META.speed;
                        const targetVal = parseFloat(block.target ?? block.count) || meta.defaultTarget;
                        const currentVal = getPlayerStatValue(player, block.stat);
                        if (currentVal < targetVal - 0.01) {
                            activeStep = i;
                            break;
                        }
                    }

                    const prevStep = cargoPipelineStep;
                    cargoPipelineStep = activeStep;

                    if (prevStep !== cargoPipelineStep) {
                        if (typeof renderCargoPuzzlePipeline === "function") renderCargoPuzzlePipeline();
                    }

                    // Send upgrade key whenever target is not reached!
                    if (cargoPipelineStep < cargoPipeline.length) {
                        const activeBlock = cargoPipeline[cargoPipelineStep];
                        const meta = CARGO_STAT_META[activeBlock.stat] || CARGO_STAT_META.speed;
                        const now = Date.now();

                        if (now - cargoLastKeyPressTime >= 80) {
                            cargoLastKeyPressTime = now;
                            doUpgrade(meta.digit);
                        }
                    }
                } else {
                    const now = Date.now();
                    if (cargoPipelineStep < cargoPipeline.length && now - cargoLastKeyPressTime >= 100) {
                        cargoLastKeyPressTime = now;
                        const activeBlock = cargoPipeline[cargoPipelineStep];
                        const meta = CARGO_STAT_META[activeBlock.stat] || CARGO_STAT_META.speed;
                        doUpgrade(meta.digit);
                    }
                }
            }
        }, 50);
    }

    const tournamentWindow = document.createElement("div");
    tournamentWindow.id = "chrono-tournament-window";
    tournamentWindow.style.display = "none";
    tournamentWindow.style.position = "fixed";
    tournamentWindow.style.top = "0";
    tournamentWindow.style.left = "0";
    tournamentWindow.style.width = "100vw";
    tournamentWindow.style.height = "100vh";
    tournamentWindow.style.backgroundColor = "rgba(4, 2, 10, 0.82)";
    tournamentWindow.style.backdropFilter = "blur(14px)";
    tournamentWindow.style.webkitBackdropFilter = "blur(14px)";
    tournamentWindow.style.zIndex = "10000003";
    tournamentWindow.style.justifyContent = "center";
    tournamentWindow.style.alignItems = "center";
    tournamentWindow.style.fontFamily = "system-ui, -apple-system, sans-serif";

    tournamentWindow.innerHTML = 
        '<div style="' +
            'width: 680px; max-width: 95vw; max-height: 90vh;' +
            'background: linear-gradient(145deg, #11081f 0%, #1d0f33 50%, #0d0618 100%);' +
            'border: 1px solid rgba(168, 85, 247, 0.45); border-radius: 16px;' +
            'box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 40px rgba(147, 51, 234, 0.25);' +
            'display: flex; flex-direction: column; overflow: hidden; color: #f3e8ff;' +
        '">' +
            '<!-- Header (Purple Violet Theme) -->' +
            '<div style="' +
                'padding: 16px 22px; background: linear-gradient(90deg, rgba(107, 33, 168, 0.75) 0%, rgba(88, 28, 135, 0.5) 100%);' +
                'border-bottom: 1px solid rgba(168, 85, 247, 0.35); display: flex; align-items: center; justify-content: space-between;' +
            '">' +
                '<div style="display: flex; align-items: center; gap: 14px;">' +
                    '<img id="chrono-tour-header-icon" src="data:image/png;base64,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" style="width: 32px; height: 32px; filter: drop-shadow(0 0 10px #c084fc);" />' +
                    '<div>' +
                        '<div style="font-weight: 800; font-size: 16px; letter-spacing: 0.5px; color: #f5d0fe;">TOURNAMENT & TS HUB</div>' +
                        '<div style="font-size: 11px; color: #d8b4fe;">Anti-Cheat Protection & Tournament Spectator Mods</div>' +
                    '</div>' +
                '</div>' +
                '<button id="chrono-tournament-close-btn" style="' +
                    'background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4);' +
                    'color: #fca5a5; width: 28px; height: 28px; border-radius: 50%; cursor: pointer;' +
                    'display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold;' +
                    'transition: all 0.2s ease;' +
                '">✕</button>' +
            '</div>' +

            '<!-- Category Tabs Bar -->' +
            '<div style="display: flex; gap: 8px; padding: 12px 24px 0 24px; border-bottom: 1px solid rgba(168, 85, 247, 0.2); background: rgba(10, 5, 20, 0.5);">' +
                '<button id="chrono-tour-tab-anticheat" style="background: rgba(168, 85, 247, 0.25); border: 1px solid #c084fc; border-bottom: none; border-radius: 8px 8px 0 0; padding: 8px 16px; color: #f5d0fe; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s ease;">' +
                    '<span>🛡️</span> <span>Anti-Cheat</span>' +
                '</button>' +
                '<button id="chrono-tour-tab-ts" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-bottom: none; border-radius: 8px 8px 0 0; padding: 8px 16px; color: #cbd5e1; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s ease;">' +
                    '<span>👁️</span> <span>TS (Tournament Spectator)</span>' +
                '</button>' +
            '</div>' +

            '<!-- Body Content Area -->' +
            '<div style="padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; max-height: 70vh;">' +
                '<!-- PANE 1: ANTI-CHEAT -->' +
                '<div id="chrono-tour-pane-anticheat" style="display: flex; flex-direction: column; gap: 16px;">' +
                    '<!-- Mode Switch Card -->' +
                    '<div style="background: rgba(20, 10, 36, 0.75); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 14px;">' +
                        '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                            '<div style="display: flex; flex-direction: column; gap: 2px;">' +
                                '<span style="font-weight: 800; font-size: 14px; color: #f5d0fe; display: flex; align-items: center; gap: 8px;">' +
                                    '<span>⚡ STRICT TOURNAMENT LOCKDOWN</span>' +
                                    '<span id="chrono-tour-status-pill" style="font-size: 9.5px; font-weight: 800; padding: 2px 8px; border-radius: 4px; background: rgba(148, 163, 184, 0.2); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.4);">DISABLED</span>' +
                                '</span>' +
                                '<span style="font-size: 11.5px; color: #cbd5e1; line-height: 1.4;">Disable and prevent any scripts, mods or hooks from being injected or used.</span>' +
                            '</div>' +
                            '<label style="position: relative; display: inline-block; width: 52px; height: 28px; flex-shrink: 0; cursor: pointer;">' +
                                '<input type="checkbox" id="chrono-tour-toggle-btn" style="position: absolute; opacity: 0; width: 0; height: 0;" />' +
                                '<span id="chrono-tour-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.15); transition: 0.3s; border-radius: 28px; border: 1px solid rgba(255,255,255,0.25);">' +
                                    '<span id="chrono-tour-knob" style="position: absolute; height: 20px; width: 20px; left: 4px; bottom: 3px; background-color: white; transition: 0.3s; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.5);"></span>' +
                                '</span>' +
                            '</label>' +
                        '</div>' +
                    '</div>' +

                    '<!-- Integrity Guards Box -->' +
                    '<div style="background: rgba(12, 6, 24, 0.65); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 10px;">' +
                        '<div style="font-size: 11.5px; font-weight: 700; color: #c084fc; text-transform: uppercase; letter-spacing: 0.5px;">🛡️ ACTIVE INTEGRITY GUARDS</div>' +
                        '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px;">' +
                            '<div style="background: rgba(25, 12, 45, 0.6); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.15); display: flex; align-items: center; justify-content: space-between;">' +
                                '<span style="color: #cbd5e1;">📁 Scripts Folder (<code>scripts/</code>)</span>' +
                                '<span id="chrono-tour-guard-scripts" style="color: #94a3b8; font-weight: 700;">UNLOCKED</span>' +
                            '</div>' +
                            '<div style="background: rgba(25, 12, 45, 0.6); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.15); display: flex; align-items: center; justify-content: space-between;">' +
                                '<span style="color: #cbd5e1;">💉 Runtime Script Injection</span>' +
                                '<span id="chrono-tour-guard-inject" style="color: #94a3b8; font-weight: 700;">ALLOWED</span>' +
                            '</div>' +
                            '<div style="background: rgba(25, 12, 45, 0.6); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.15); display: flex; align-items: center; justify-content: space-between;">' +
                                '<span style="color: #cbd5e1;">⚡ Dynamic Code Execution</span>' +
                                '<span id="chrono-tour-guard-eval" style="color: #94a3b8; font-weight: 700;">UNRESTRICTED</span>' +
                            '</div>' +
                            '<div style="background: rgba(25, 12, 45, 0.6); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.15); display: flex; align-items: center; justify-content: space-between;">' +
                                '<span style="color: #cbd5e1;">🏷️ Official Integrity Watermark</span>' +
                                '<span id="chrono-tour-guard-watermark" style="color: #94a3b8; font-weight: 700;">OFF</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                '<!-- PANE 2: TS (TOURNAMENT SPECTATOR) -->' +
                '<div id="chrono-tour-pane-ts" style="display: none; flex-direction: column; gap: 16px;">' +
                    '<!-- GRB Card -->' +
                    '<div style="background: rgba(20, 10, 36, 0.75); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 12px;">' +
                        '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                            '<div style="display: flex; flex-direction: column; gap: 2px;">' +
                                '<span style="font-weight: 800; font-size: 14px; color: #f5d0fe; display: flex; align-items: center; gap: 8px;">' +
                                    '<span>⏩ GRB (Go Right Bot)</span>' +
                                    '<span id="chrono-ts-grb-pill" style="font-size: 9.5px; font-weight: 800; padding: 2px 8px; border-radius: 4px; background: rgba(148, 163, 184, 0.2); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.4);">DISABLED</span>' +
                                '</span>' +
                                '<span style="font-size: 11.5px; color: #cbd5e1; line-height: 1.4;">Lock all movement to Right only. Pressing your Move Right key toggles continuous automatic right movement.</span>' +
                            '</div>' +
                            '<label style="position: relative; display: inline-block; width: 52px; height: 28px; flex-shrink: 0; cursor: pointer;">' +
                                '<input type="checkbox" id="chrono-ts-grb-toggle" style="position: absolute; opacity: 0; width: 0; height: 0;" />' +
                                '<span id="chrono-ts-grb-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.15); transition: 0.3s; border-radius: 28px; border: 1px solid rgba(255,255,255,0.25);">' +
                                    '<span id="chrono-ts-grb-knob" style="position: absolute; height: 20px; width: 20px; left: 4px; bottom: 3px; background-color: white; transition: 0.3s; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.5);"></span>' +
                                '</span>' +
                            '</label>' +
                        '</div>' +
                        '<div style="background: rgba(10, 5, 22, 0.6); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.15); font-size: 11px; color: #cbd5e1; display: flex; justify-content: space-between; align-items: center;">' +
                            '<span>🎮 Controls: <b>Move Right (D / →)</b> toggles auto-gliding on/off</span>' +
                            '<span style="color: #a855f7; font-weight: 700;">Up / Down / Left Locked 🔒</span>' +
                        '</div>' +
                    '</div>' +

                    '<!-- Cargo Auto Upgrader Card (Scratch Puzzle Sequence) -->' +
                    '<div id="chrono-ts-cargo-card" style="background: rgba(20, 10, 36, 0.75); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 14px;">' +
                        '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                            '<div style="display: flex; flex-direction: column; gap: 2px;">' +
                                '<span style="font-weight: 800; font-size: 14px; color: #f5d0fe; display: flex; align-items: center; gap: 8px;">' +
                                    '<span>📦 Cargo Puzzle Sequence (Auto Upgrader)</span>' +
                                    '<span id="chrono-ts-cargo-pill" style="font-size: 9.5px; font-weight: 800; padding: 2px 8px; border-radius: 4px; background: rgba(148, 163, 184, 0.2); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.4);">LOCKED (REQUIRES GRB)</span>' +
                                '</span>' +
                                '<span style="font-size: 11.5px; color: #cbd5e1; line-height: 1.4;">Visual Scratch-style puzzle blocks for sequential stat progression. Only activatable when GRB is enabled.</span>' +
                            '</div>' +
                            '<label style="position: relative; display: inline-block; width: 52px; height: 28px; flex-shrink: 0; cursor: pointer;">' +
                                '<input type="checkbox" id="chrono-ts-cargo-toggle" disabled style="position: absolute; opacity: 0; width: 0; height: 0;" />' +
                                '<span id="chrono-ts-cargo-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.08); transition: 0.3s; border-radius: 28px; border: 1px solid rgba(255,255,255,0.12);">' +
                                    '<span id="chrono-ts-cargo-knob" style="position: absolute; height: 20px; width: 20px; left: 4px; bottom: 3px; background-color: rgba(255,255,255,0.4); transition: 0.3s; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.5);"></span>' +
                                '</span>' +
                            '</label>' +
                        '</div>' +

                        '<!-- Path Configuration Panel -->' +
                        '<div id="chrono-ts-cargo-config-panel" style="background: rgba(10, 5, 22, 0.6); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 12px;">' +
                            '<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">' +
                                '<div style="display: flex; align-items: center; gap: 8px;">' +
                                    '<span style="font-size: 11.5px; font-weight: 700; color: #c084fc; text-transform: uppercase;">🧩 PUZZLE PIPELINE</span>' +
                                    '<span id="chrono-cargo-total-pts" style="font-size: 10.5px; font-weight: 800; background: rgba(168, 85, 247, 0.25); border: 1px solid rgba(192, 132, 252, 0.4); color: #f5d0fe; padding: 2px 8px; border-radius: 6px;">Target Sequence</span>' +
                                '</div>' +
                                '<div style="display: flex; gap: 5px; flex-wrap: wrap;">' +
                                    '<button id="chrono-cargo-preset-mango" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(234, 88, 12, 0.25) 100%); border: 1px solid rgba(251, 191, 36, 0.5); color: #fef08a; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 5px; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);">🥭 Mango (Spd 17 > Abi1 Lv5 > Reg 7 > Energy)</button>' +
                                '</div>' +
                            '</div>' +

                            '<!-- Add Puzzle Block Toolbar (Order: Speed, Energy, Regen, Abi1, Abi2, Abi3) -->' +
                            '<div style="display: flex; align-items: center; justify-content: space-between; background: rgba(20, 10, 36, 0.8); border: 1px dashed rgba(168, 85, 247, 0.35); border-radius: 8px; padding: 6px 10px; flex-wrap: wrap; gap: 6px;">' +
                                '<span style="font-size: 10.5px; font-weight: 700; color: #e9d5ff;">➕ Add Target:</span>' +
                                '<div style="display: flex; gap: 5px; flex-wrap: wrap;">' +
                                    '<button id="chrono-cargo-add-spd" style="background: #0284c7; border: 1px solid #38bdf8; color: #ffffff; padding: 3px 7px; border-radius: 5px; font-size: 10px; font-weight: 700; cursor: pointer;">+ ⚡ Speed [1]</button>' +
                                    '<button id="chrono-cargo-add-ab1" style="background: #9333ea; border: 1px solid #c084fc; color: #ffffff; padding: 3px 7px; border-radius: 5px; font-size: 10px; font-weight: 700; cursor: pointer;">+ 🔮 Abi 1 [4]</button>' +
                                    '<button id="chrono-cargo-add-reg" style="background: #16a34a; border: 1px solid #4ade80; color: #ffffff; padding: 3px 7px; border-radius: 5px; font-size: 10px; font-weight: 700; cursor: pointer;">+ 💖 Regen [3]</button>' +
                                    '<button id="chrono-cargo-add-ene" style="background: #d97706; border: 1px solid #fbbf24; color: #ffffff; padding: 3px 7px; border-radius: 5px; font-size: 10px; font-weight: 700; cursor: pointer;">+ 🔋 Energy [2]</button>' +
                                    '<button id="chrono-cargo-add-ab2" style="background: #a21caf; border: 1px solid #f472b6; color: #ffffff; padding: 3px 7px; border-radius: 5px; font-size: 10px; font-weight: 700; cursor: pointer;">+ ✨ Abi 2 [5]</button>' +
                                    '<button id="chrono-cargo-add-ab3" style="background: #e11d48; border: 1px solid #fb7185; color: #ffffff; padding: 3px 7px; border-radius: 5px; font-size: 10px; font-weight: 700; cursor: pointer;">+ 💥 Abi 3 [6]</button>' +
                                    '<button id="chrono-cargo-clear-pipe" style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; padding: 3px 7px; border-radius: 5px; font-size: 10px; font-weight: 700; cursor: pointer;">🗑️ Clear</button>' +
                                '</div>' +
                            '</div>' +

                            '<!-- Puzzle Pieces Sequence Chain -->' +
                            '<div id="chrono-cargo-puzzle-chain" style="display: flex; align-items: center; gap: 8px; overflow-x: auto; padding: 8px 4px; min-height: 80px; scrollbar-width: thin;">' +
                            '</div>' +

                            '<div style="font-size: 10.5px; color: #94a3b8; line-height: 1.3;">' +
                                '💡 Targets are executed sequentially based on your actual hero stats. When stat reaches the target, it advances to the next step!' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

    function switchTourTab(tab) {
        activeTourTab = tab;
        const tabAc = document.getElementById("chrono-tour-tab-anticheat");
        const tabTs = document.getElementById("chrono-tour-tab-ts");
        const paneAc = document.getElementById("chrono-tour-pane-anticheat");
        const paneTs = document.getElementById("chrono-tour-pane-ts");

        if (tab === "anticheat") {
            if (tabAc) {
                tabAc.style.background = "rgba(168, 85, 247, 0.25)";
                tabAc.style.borderColor = "#c084fc";
                tabAc.style.color = "#f5d0fe";
            }
            if (tabTs) {
                tabTs.style.background = "rgba(255, 255, 255, 0.05)";
                tabTs.style.borderColor = "rgba(255, 255, 255, 0.1)";
                tabTs.style.color = "#cbd5e1";
            }
            if (paneAc) paneAc.style.display = "flex";
            if (paneTs) paneTs.style.display = "none";
        } else {
            if (tabTs) {
                tabTs.style.background = "rgba(168, 85, 247, 0.25)";
                tabTs.style.borderColor = "#c084fc";
                tabTs.style.color = "#f5d0fe";
            }
            if (tabAc) {
                tabAc.style.background = "rgba(255, 255, 255, 0.05)";
                tabAc.style.borderColor = "rgba(255, 255, 255, 0.1)";
                tabAc.style.color = "#cbd5e1";
            }
            if (paneAc) paneAc.style.display = "none";
            if (paneTs) paneTs.style.display = "flex";
        }
    }

    function syncTournamentUi() {
        const toggle = document.getElementById("chrono-tour-toggle-btn");
        const pill = document.getElementById("chrono-tour-status-pill");
        const slider = document.getElementById("chrono-tour-slider");
        const knob = document.getElementById("chrono-tour-knob");
        const gScripts = document.getElementById("chrono-tour-guard-scripts");
        const gInject = document.getElementById("chrono-tour-guard-inject");
        const gEval = document.getElementById("chrono-tour-guard-eval");
        const gWatermark = document.getElementById("chrono-tour-guard-watermark");

        const active = (localStorage.getItem("chrono_tournament_mode") === "true");
        if (toggle) toggle.checked = active;

        if (active) {
            if (pill) {
                pill.innerText = "ACTIVE (LOCKDOWN)";
                pill.style.background = "linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(147, 51, 234, 0.5))";
                pill.style.color = "#f5d0fe";
                pill.style.borderColor = "#c084fc";
            }
            if (slider) {
                slider.style.backgroundColor = "#9333ea";
                slider.style.borderColor = "#c084fc";
            }
            if (knob) {
                knob.style.transform = "translateX(24px)";
                knob.style.backgroundColor = "#ffffff";
            }
            if (gScripts) { gScripts.innerText = "LOCKED & BLOCKED"; gScripts.style.color = "#4ade80"; }
            if (gInject) { gInject.innerText = "FORBIDDEN"; gInject.style.color = "#4ade80"; }
            if (gEval) { gEval.innerText = "DISABLED"; gEval.style.color = "#4ade80"; }
            if (gWatermark) { gWatermark.innerText = "ON (VISIBLE)"; gWatermark.style.color = "#4ade80"; }
        } else {
            if (pill) {
                pill.innerText = "DISABLED";
                pill.style.background = "rgba(148, 163, 184, 0.2)";
                pill.style.color = "#cbd5e1";
                pill.style.borderColor = "rgba(148, 163, 184, 0.4)";
            }
            if (slider) {
                slider.style.backgroundColor = "rgba(255,255,255,0.15)";
                slider.style.borderColor = "rgba(255,255,255,0.2)";
            }
            if (knob) {
                knob.style.transform = "translateX(0px)";
                knob.style.backgroundColor = "#cbd5e1";
            }
            if (gScripts) { gScripts.innerText = "UNLOCKED"; gScripts.style.color = "#94a3b8"; }
            if (gInject) { gInject.innerText = "ALLOWED"; gInject.style.color = "#94a3b8"; }
            if (gEval) { gEval.innerText = "UNRESTRICTED"; gEval.style.color = "#94a3b8"; }
            if (gWatermark) { gWatermark.innerText = "OFF"; gWatermark.style.color = "#94a3b8"; }
        }

        // Sync TS (GRB & Cargo)
        const grbToggle = document.getElementById("chrono-ts-grb-toggle");
        const grbPill = document.getElementById("chrono-ts-grb-pill");
        const grbSlider = document.getElementById("chrono-ts-grb-slider");
        const grbKnob = document.getElementById("chrono-ts-grb-knob");
        const cargoToggle = document.getElementById("chrono-ts-cargo-toggle");
        const cargoPill = document.getElementById("chrono-ts-cargo-pill");
        const cargoSlider = document.getElementById("chrono-ts-cargo-slider");
        const cargoKnob = document.getElementById("chrono-ts-cargo-knob");

        if (active) {
            if (grbToggle) { grbToggle.checked = false; grbToggle.disabled = true; }
            if (grbSlider) {
                grbSlider.style.backgroundColor = "rgba(255,255,255,0.05)";
                grbSlider.style.borderColor = "rgba(255,255,255,0.1)";
            }
            if (grbKnob) {
                grbKnob.style.transform = "translateX(0px)";
                grbKnob.style.backgroundColor = "rgba(255,255,255,0.3)";
            }
            if (grbPill) {
                grbPill.innerText = "BLOCKED BY LOCKDOWN";
                grbPill.style.background = "rgba(239, 68, 68, 0.2)";
                grbPill.style.color = "#fca5a5";
                grbPill.style.borderColor = "rgba(239, 68, 68, 0.4)";
            }

            if (cargoToggle) { cargoToggle.checked = false; cargoToggle.disabled = true; }
            if (cargoSlider) {
                cargoSlider.style.backgroundColor = "rgba(255,255,255,0.05)";
                cargoSlider.style.borderColor = "rgba(255,255,255,0.1)";
            }
            if (cargoKnob) {
                cargoKnob.style.transform = "translateX(0px)";
                cargoKnob.style.backgroundColor = "rgba(255,255,255,0.3)";
            }
            if (cargoPill) {
                cargoPill.innerText = "BLOCKED BY LOCKDOWN";
                cargoPill.style.background = "rgba(239, 68, 68, 0.2)";
                cargoPill.style.color = "#fca5a5";
                cargoPill.style.borderColor = "rgba(239, 68, 68, 0.4)";
            }
        } else {
            if (grbToggle) { grbToggle.disabled = false; grbToggle.checked = isGrbActive; }
            if (grbSlider) {
                grbSlider.style.backgroundColor = isGrbActive ? "#9333ea" : "rgba(255,255,255,0.15)";
                grbSlider.style.borderColor = isGrbActive ? "#c084fc" : "rgba(255,255,255,0.25)";
            }
            if (grbKnob) {
                grbKnob.style.transform = isGrbActive ? "translateX(24px)" : "translateX(0px)";
                grbKnob.style.backgroundColor = isGrbActive ? "#ffffff" : "#cbd5e1";
            }
            if (grbPill) {
                grbPill.innerText = isGrbActive ? "ACTIVE (RIGHT LOCK)" : "DISABLED";
                grbPill.style.background = isGrbActive ? "rgba(168, 85, 247, 0.25)" : "rgba(148, 163, 184, 0.2)";
                grbPill.style.color = isGrbActive ? "#f5d0fe" : "#cbd5e1";
                grbPill.style.borderColor = isGrbActive ? "rgba(192, 132, 252, 0.5)" : "rgba(148, 163, 184, 0.4)";
            }

            if (cargoToggle) {
                cargoToggle.disabled = !isGrbActive;
                cargoToggle.checked = (isGrbActive && isCargoActive);
            }
            if (cargoSlider) {
                cargoSlider.style.backgroundColor = (isGrbActive && isCargoActive) ? "#9333ea" : (isGrbActive ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)");
                cargoSlider.style.borderColor = (isGrbActive && isCargoActive) ? "#c084fc" : (isGrbActive ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)");
            }
            if (cargoKnob) {
                cargoKnob.style.transform = (isGrbActive && isCargoActive) ? "translateX(24px)" : "translateX(0px)";
                cargoKnob.style.backgroundColor = (isGrbActive && isCargoActive) ? "#ffffff" : (isGrbActive ? "#cbd5e1" : "rgba(255,255,255,0.4)");
            }
            if (cargoPill) {
                if (!isGrbActive) {
                    cargoPill.innerText = "LOCKED (REQUIRES GRB)";
                    cargoPill.style.background = "rgba(148, 163, 184, 0.2)";
                    cargoPill.style.color = "#94a3b8";
                    cargoPill.style.borderColor = "rgba(148, 163, 184, 0.4)";
                } else {
                    cargoPill.innerText = isCargoActive ? "ACTIVE (AUTO-UPGRADING)" : "READY";
                    cargoPill.style.background = isCargoActive ? "rgba(168, 85, 247, 0.25)" : "rgba(16, 185, 129, 0.2)";
                    cargoPill.style.color = isCargoActive ? "#f5d0fe" : "#a7f3d0";
                    cargoPill.style.borderColor = isCargoActive ? "rgba(192, 132, 252, 0.5)" : "rgba(52, 211, 153, 0.4)";
                }
            }
        }

        // Sync cargo puzzle sequence
        renderCargoPuzzlePipeline();
    }

    function renderCargoPuzzlePipeline() {
        const container = document.getElementById("chrono-cargo-puzzle-chain");
        const totalPointsEl = document.getElementById("chrono-cargo-total-pts");
        if (!container) return;

        let html = '';

        if (cargoPipeline.length === 0) {
            container.innerHTML = '<div style="color: #94a3b8; font-size: 11.5px; font-style: italic; padding: 14px 0; text-align: center; width: 100%;">No targets in sequence. Click a button above to add a target stat block! 🧩</div>';
            if (totalPointsEl) totalPointsEl.innerText = "0 Targets";
            return;
        }

        const curPlayer = getLocalPlayer();

        cargoPipeline.forEach((block, idx) => {
            const meta = CARGO_STAT_META[block.stat] || CARGO_STAT_META.speed;
            const targetVal = parseFloat(block.target ?? block.count) || meta.defaultTarget;
            const curVal = curPlayer ? getPlayerStatValue(curPlayer, block.stat) : 0;
            const isActive = isCargoActive && (idx === cargoPipelineStep);
            const isCompleted = isCargoActive && (idx < cargoPipelineStep || curVal >= targetVal - 0.01);

            html += 
                '<div class="chrono-cargo-puzzle-piece" data-index="' + idx + '" style="' +
                    'background: ' + meta.bg + ';' +
                    'border: ' + (isActive ? '2px solid #ffffff' : '1.5px solid ' + meta.border) + ';' +
                    'border-radius: 12px;' +
                    'padding: 8px 10px;' +
                    'display: flex; flex-direction: column; gap: 6px;' +
                    'min-width: 130px; max-width: 145px; flex-shrink: 0;' +
                    'box-shadow: ' + (isActive ? '0 0 20px #ffffff, 0 4px 15px ' + meta.glow : '0 4px 12px ' + meta.glow) + ';' +
                    'position: relative; transition: all 0.2s ease;' +
                    (isCompleted ? 'opacity: 0.7; filter: grayscale(15%);' : '') +
                '">' +
                    '<!-- Header -->' +
                    '<div style="display: flex; justify-content: space-between; align-items: center; gap: 4px;">' +
                        '<span style="font-size: 11px; font-weight: 800; color: ' + meta.text + '; display: flex; align-items: center; gap: 4px;">' +
                            '<span>' + meta.icon + '</span>' +
                            '<span>' + meta.name + ' <b style="opacity:0.8; font-size:9px;">' + meta.keynum + '</b></span>' +
                        '</span>' +
                        '<button class="chrono-cargo-del-btn" data-index="' + idx + '" title="Remove Block" style="background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.2); color: #fff; font-size: 9px; border-radius: 4px; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer;">✕</button>' +
                    '</div>' +
                    '<!-- Target Value Input Controls -->' +
                    '<div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.4); padding: 3px 6px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.1);">' +
                        '<span style="font-size: 10px; font-weight: 700; color: ' + meta.text + ';">Target:</span>' +
                        '<div style="display: flex; align-items: center; gap: 3px;">' +
                            '<button class="chrono-cargo-dec-btn" data-index="' + idx + '" style="background: rgba(255,255,255,0.18); border: none; color: #fff; border-radius: 4px; width: 18px; height: 18px; font-size: 11px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;">-</button>' +
                            '<input type="number" class="chrono-cargo-pts-input" data-index="' + idx + '" min="' + meta.min + '" max="' + meta.max + '" step="' + meta.step + '" value="' + targetVal + '" style="width: 36px; background: transparent; border: none; color: #ffffff; font-weight: 900; font-size: 12px; text-align: center; outline: none;" />' +
                            '<button class="chrono-cargo-inc-btn" data-index="' + idx + '" style="background: rgba(255,255,255,0.18); border: none; color: #fff; border-radius: 4px; width: 18px; height: 18px; font-size: 11px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;">+</button>' +
                        '</div>' +
                    '</div>' +
                    '<!-- Bottom Controls: Step & Move -->' +
                    '<div style="display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: ' + meta.text + ';">' +
                        '<button class="chrono-cargo-left-btn" data-index="' + idx + '" ' + (idx === 0 ? 'disabled style="opacity: 0.3; cursor: default; background: rgba(0,0,0,0.3); border: none; color: #fff; border-radius: 3px; padding: 1px 5px; font-size: 9px;"' : 'style="cursor: pointer; background: rgba(0,0,0,0.3); border: none; color: #fff; border-radius: 3px; padding: 1px 5px; font-size: 9px;"') + '>◀</button>' +
                        '<span style="font-weight: 700; opacity: 0.9;">' + (isActive ? '⚡ RUNNING (' + (typeof curVal === 'number' && !isNaN(curVal) ? curVal : 0) + ' ➔ ' + targetVal + ')' : (isCompleted ? '✓ REACHED (' + targetVal + ')' : 'Step ' + (idx + 1) + ' (➔ ' + targetVal + ')')) + '</span>' +
                        '<button class="chrono-cargo-right-btn" data-index="' + idx + '" ' + (idx === cargoPipeline.length - 1 ? 'disabled style="opacity: 0.3; cursor: default; background: rgba(0,0,0,0.3); border: none; color: #fff; border-radius: 3px; padding: 1px 5px; font-size: 9px;"' : 'style="cursor: pointer; background: rgba(0,0,0,0.3); border: none; color: #fff; border-radius: 3px; padding: 1px 5px; font-size: 9px;"') + '>▶</button>' +
                    '</div>' +
                '</div>';

            if (idx < cargoPipeline.length - 1) {
                html += '<div style="display: flex; align-items: center; justify-content: center; font-size: 16px; color: #c084fc; font-weight: 900; user-select: none; text-shadow: 0 0 8px rgba(192, 132, 252, 0.6);">➔</div>';
            }
        });

        container.innerHTML = html;
        if (totalPointsEl) totalPointsEl.innerText = cargoPipeline.length + " Target Steps";

        container.querySelectorAll(".chrono-cargo-del-btn").forEach(b => {
            b.onclick = () => {
                const i = parseInt(b.dataset.index);
                cargoPipeline.splice(i, 1);
                saveCargoPipeline();
                renderCargoPuzzlePipeline();
            };
        });

        container.querySelectorAll(".chrono-cargo-dec-btn").forEach(b => {
            b.onclick = () => {
                const i = parseInt(b.dataset.index);
                if (cargoPipeline[i]) {
                    const meta = CARGO_STAT_META[cargoPipeline[i].stat] || CARGO_STAT_META.speed;
                    let curT = parseFloat(cargoPipeline[i].target ?? cargoPipeline[i].count) || meta.defaultTarget;
                    curT = Math.max(meta.min, Math.round((curT - meta.step) * 10) / 10);
                    cargoPipeline[i].target = curT;
                    saveCargoPipeline();
                    renderCargoPuzzlePipeline();
                }
            };
        });

        container.querySelectorAll(".chrono-cargo-inc-btn").forEach(b => {
            b.onclick = () => {
                const i = parseInt(b.dataset.index);
                if (cargoPipeline[i]) {
                    const meta = CARGO_STAT_META[cargoPipeline[i].stat] || CARGO_STAT_META.speed;
                    let curT = parseFloat(cargoPipeline[i].target ?? cargoPipeline[i].count) || meta.defaultTarget;
                    curT = Math.min(meta.max, Math.round((curT + meta.step) * 10) / 10);
                    cargoPipeline[i].target = curT;
                    saveCargoPipeline();
                    renderCargoPuzzlePipeline();
                }
            };
        });

        container.querySelectorAll(".chrono-cargo-pts-input").forEach(inp => {
            const updateVal = () => {
                const i = parseInt(inp.dataset.index);
                if (cargoPipeline[i]) {
                    const meta = CARGO_STAT_META[cargoPipeline[i].stat] || CARGO_STAT_META.speed;
                    const parsed = parseFloat(inp.value);
                    if (!isNaN(parsed)) {
                        cargoPipeline[i].target = Math.max(meta.min, Math.min(meta.max, parsed));
                        saveCargoPipeline();
                    }
                }
            };
            inp.oninput = updateVal;
            inp.onchange = updateVal;
        });

        container.querySelectorAll(".chrono-cargo-left-btn").forEach(b => {
            b.onclick = () => {
                const i = parseInt(b.dataset.index);
                if (i > 0) {
                    const temp = cargoPipeline[i];
                    cargoPipeline[i] = cargoPipeline[i - 1];
                    cargoPipeline[i - 1] = temp;
                    saveCargoPipeline();
                    renderCargoPuzzlePipeline();
                }
            };
        });

        container.querySelectorAll(".chrono-cargo-right-btn").forEach(b => {
            b.onclick = () => {
                const i = parseInt(b.dataset.index);
                if (i < cargoPipeline.length - 1) {
                    const temp = cargoPipeline[i];
                    cargoPipeline[i] = cargoPipeline[i + 1];
                    cargoPipeline[i + 1] = temp;
                    saveCargoPipeline();
                    renderCargoPuzzlePipeline();
                }
            };
        });
    }

    function toggleTournamentWindow() {
        const win = document.getElementById("chrono-tournament-window");
        if (!win) return;
        const isOpen = (win.style.display === "flex");
        win.style.display = isOpen ? "none" : "flex";
        if (!isOpen) {
            freezePlayerMovement();
            syncTournamentUi();
        }
    }


        function toggleTournamentWindow() {
            let modal = document.getElementById("chrono-tournament-window");
            if (!modal) {
                mountFreyjaUI();
                modal = document.getElementById("chrono-tournament-window");
            }
            if (!modal) return;
            if (modal.style.display === "none" || modal.style.display === "") {
                modal.style.display = "flex";
                syncTournamentUi();
            } else {
                modal.style.display = "none";
            }
        }

        function mountFreyjaUI() {
            if (!document.body) return;

            // Tournament Launcher (Orbit 🏆 Original icon)
            if (!document.getElementById("chrono-tournament-launcher")) {
                const tourBtn = document.createElement("div");
                tourBtn.id = "chrono-tournament-launcher";
                tourBtn.title = "Chrono Tournaments & Highscores (Orbit 🏆)";
                tourBtn.style.position = "fixed";
                tourBtn.style.bottom = "10px";
                tourBtn.style.right = "262px";
                tourBtn.style.width = "32px";
                tourBtn.style.height = "32px";
                tourBtn.style.cursor = "pointer";
                tourBtn.style.zIndex = "1000";
                tourBtn.style.display = "flex";
                tourBtn.style.alignItems = "center";
                tourBtn.style.justifyContent = "center";
                tourBtn.innerHTML = '<img src="data:image/png;base64,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" style="width: 28px; height: 28px; object-fit: contain;" />';
                tourBtn.onclick = () => toggleTournamentWindow();
                document.body.appendChild(tourBtn);
            }

            if (!document.getElementById("chrono-tournament-window")) {
                document.body.appendChild(tournamentWindow);
                const closeTour = document.getElementById("chrono-tournament-close-btn");
                if (closeTour) closeTour.onclick = () => toggleTournamentWindow();
                tournamentWindow.onclick = (e) => {
                    if (e.target === tournamentWindow) toggleTournamentWindow();
                };

                const tabAc = document.getElementById("chrono-tour-tab-anticheat");
                const tabTs = document.getElementById("chrono-tour-tab-ts");
                if (tabAc) tabAc.onclick = () => switchTourTab("anticheat");
                if (tabTs) tabTs.onclick = () => switchTourTab("ts");

                const chkTour = document.getElementById("chrono-tour-enable-chk");
                if (chkTour) {
                    chkTour.onchange = () => {
                        const enabled = chkTour.checked;
                        localStorage.setItem("chrono_tournament_mode", enabled ? "true" : "false");
                        applyTournamentModeSecurity(enabled);
                    };
                }

                const chkGrb = document.getElementById("chrono-ts-grb-enabled");
                if (chkGrb) {
                    chkGrb.onchange = () => {
                        applyGrbState(chkGrb.checked);
                    };
                }

                const chkCargo = document.getElementById("chrono-ts-cargo-enabled");
                if (chkCargo) {
                    chkCargo.onchange = () => {
                        applyCargoState(chkCargo.checked);
                    };
                }

                const grbCopy = document.getElementById("chrono-grb-btn-copy");
                if (grbCopy) {
                    grbCopy.onclick = () => {
                        const text = generateGRBReport ? generateGRBReport() : "";
                        if (navigator.clipboard) {
                            navigator.clipboard.writeText(text).then(() => {
                                grbCopy.innerText = "COPIED!";
                                setTimeout(() => grbCopy.innerText = "📋 COPY REPORT", 2000);
                            });
                        }
                    };
                }
            }
        }

        mountFreyjaUI();
        window.addEventListener("DOMContentLoaded", mountFreyjaUI);
        window.addEventListener("load", mountFreyjaUI);
        const mountFreyjaInterval = setInterval(() => {
            if (document.getElementById("chrono-tournament-launcher") && document.getElementById("chrono-tournament-window")) {
                clearInterval(mountFreyjaInterval);
            } else {
                mountFreyjaUI();
            }
        }, 300);

        window.Chrono.Freyja = {
            toggle: toggleTournamentWindow,
            isActive: () => (localStorage.getItem("chrono_tournament_mode") === "true"),
            window: tournamentWindow
        };

        window.toggleTournamentWindow = toggleTournamentWindow;
    } catch(err) {
        console.error("[Aesir::Freyja Error]", err);
    }
})();
