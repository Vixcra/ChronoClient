// ============================================================================
// CHRONO CLIENT - AESIR MODULE: CORE (Bifröst Engine, Hooks & IPC 🌐)
// ============================================================================
(function() {
    try {
        window.Chrono = window.Chrono || {};

    const MONITOR_HZ = typeof __CHRONO_MONITOR_HZ !== 'undefined' ? __CHRONO_MONITOR_HZ : 60;
    const INITIAL_CONFIG = typeof __CHRONO_INITIAL_CONFIG !== 'undefined' ? __CHRONO_INITIAL_CONFIG : {};
    const INITIAL_CHRONO_SCRIPTS = typeof __CHRONO_SCRIPTS !== 'undefined' ? __CHRONO_SCRIPTS : [];
    let communityHighscores = typeof __CHRONO_HIGHSCORES !== 'undefined' ? __CHRONO_HIGHSCORES : {};
    let currentLbMode = "solo";
    let currentConfig = Object.assign({}, INITIAL_CONFIG);
    try {
        const local = JSON.parse(localStorage.getItem("chrono_config") || "null");
        if (local) Object.assign(currentConfig, local);
    } catch(e) {}

    // Early Theme CSS Injection
    function injectThemeCss() {
        if (document.getElementById("chrono-artem-theme")) return;
        const target = document.head || document.documentElement || document.body;
        if (target) {
            const customStyle = document.createElement("style");
            customStyle.id = "chrono-artem-theme";
            let __themeCss = typeof __CHRONO_THEME_CSS !== 'undefined' ? __CHRONO_THEME_CSS : "";
            const __uiC = JSON.parse(localStorage.getItem('chrono_ui_cfg') || '{}');
            if (__uiC.bg1) __themeCss = __themeCss.replace(/#0d211e/gi, __uiC.bg1);
            if (__uiC.bg2) __themeCss = __themeCss.replace(/#061210/gi, __uiC.bg2);
            if (__uiC.acc1) __themeCss = __themeCss.replace(/#059669/gi, __uiC.acc1);
            if (__uiC.acc2) __themeCss = __themeCss.replace(/#047857/gi, __uiC.acc2);
            if (__uiC.acc3) __themeCss = __themeCss.replace(/#10b981/gi, __uiC.acc3);
            customStyle.textContent = __themeCss;
            target.appendChild(customStyle);
        }
    }
    injectThemeCss();
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectThemeCss);
    }

    // 1. Intercept high-frequency IPC console warnings to prevent combat freeze
    const origWarn = console.warn;
    console.warn = function(...args) {
        if (currentConfig.flag_anti_freeze_ipc && args.length > 0 && typeof args[0] === "string" && args[0].startsWith("[pred]")) return;
        origWarn.apply(console, args);
    };
    const origDebug = console.debug;
    console.debug = function(...args) {
        if (currentConfig.flag_anti_freeze_ipc && args.length > 0 && typeof args[0] === "string" && (args[0].includes("duration:") || args[0].startsWith("[pred]"))) return;
        origDebug.apply(console, args);
    };

    // 1.5. WebSocket Zero-Latency ArrayBuffer Sync Mode
    try {
        if (typeof window !== "undefined" && typeof window.WebSocket !== "undefined") {
            const OrigWebSocket = window.WebSocket;
            window.WebSocket = function(...args) {
                const ws = new OrigWebSocket(...args);
                if (currentConfig.flag_websocket_arraybuffer) {
                    try {
                        ws.binaryType = "arraybuffer";
                    } catch(e) {}
                }
                return ws;
            };
            window.WebSocket.prototype = OrigWebSocket.prototype;
            window.WebSocket.CONNECTING = OrigWebSocket.CONNECTING;
            window.WebSocket.OPEN = OrigWebSocket.OPEN;
            window.WebSocket.CLOSING = OrigWebSocket.CLOSING;
            window.WebSocket.CLOSED = OrigWebSocket.CLOSED;
        }
    } catch(e) {}

    // 2. Pure passive HUD FPS counter
    let lastHudTime = performance.now();
    let frameCount = 0;
    
    const fpsDiv = document.createElement("div");
    fpsDiv.id = "chrono-fps-hud";
    fpsDiv.style.position = "fixed";
    fpsDiv.style.top = "8px";
    fpsDiv.style.right = "10px";
    fpsDiv.style.backgroundColor = "rgba(7, 26, 23, 0.75)";
    fpsDiv.style.border = "1px solid rgba(16, 185, 129, 0.4)";
    fpsDiv.style.borderRadius = "4px";
    fpsDiv.style.padding = "3px 8px";
    fpsDiv.style.color = "#34d399";
    fpsDiv.style.fontFamily = "monospace, sans-serif";
    fpsDiv.style.fontSize = "12px";
    fpsDiv.style.fontWeight = "bold";
    fpsDiv.style.zIndex = "9999999";
    fpsDiv.style.pointerEvents = "none";
    fpsDiv.style.boxShadow = "0 0 10px rgba(16, 185, 129, 0.3)";
    fpsDiv.innerText = "FPS: ...";
    
    function countFps(now) {
        frameCount++;
        const elapsed = now - lastHudTime;
        if (elapsed >= 350) {
            if (fpsDiv.style.display !== "none") {
                const fps = Math.round((frameCount * 1000) / elapsed);
                fpsDiv.innerText = fps + " FPS (" + MONITOR_HZ + "Hz VSync)";
                const targetCol = fps >= 120 ? "#34d399" : (fps >= 60 ? "#38bdf8" : "#f87171");
                if (fpsDiv.style.color !== targetCol) {
                    fpsDiv.style.color = targetCol;
                }
            }
            frameCount = 0;
            lastHudTime = now;
        }
        if (typeof requestAnimationFrame !== "undefined") {
            requestAnimationFrame(countFps);
        } else if (typeof window !== "undefined" && window.requestAnimationFrame) {
            window.requestAnimationFrame(countFps);
        }
    }

    // 2b. Enemy Outlines & Chroma Hook
    let enemyOutlineMode = localStorage.getItem("chrono_enemy_outline_mode") || "default";
    let enemyOutlineColor = localStorage.getItem("chrono_enemy_outline_color") || "#34d399";
    let enemyOutlineWidth = parseFloat(localStorage.getItem("chrono_enemy_outline_width") || "2");
    let enemyOutlineGlow = parseFloat(localStorage.getItem("chrono_enemy_outline_glow") || "8");

    window._chrono_set_outline_mode = function(mode, col, w, g) {
        enemyOutlineMode = mode;
        if (col) enemyOutlineColor = col;
        if (w !== undefined) enemyOutlineWidth = w;
        if (g !== undefined) enemyOutlineGlow = g;
        if (window.Chrono) {
            window.Chrono.enemyOutlineMode = enemyOutlineMode;
            window.Chrono.enemyOutlineColor = enemyOutlineColor;
            window.Chrono.enemyOutlineWidth = enemyOutlineWidth;
            window.Chrono.enemyOutlineGlow = enemyOutlineGlow;
        }
    };

    let chronoEnemyOverrides = {};
    let hasChronoEnemyOverrides = false;
    try {
        chronoEnemyOverrides = JSON.parse(localStorage.getItem("chrono_enemy_overrides") || "{}");
        hasChronoEnemyOverrides = Object.keys(chronoEnemyOverrides).length > 0;
    } catch(e) {}

    window._chrono_update_enemy_overrides = function(overrides) {
        chronoEnemyOverrides = overrides || {};
        hasChronoEnemyOverrides = Object.keys(chronoEnemyOverrides).length > 0;
        if (window.Chrono) window.Chrono.enemyOverrides = chronoEnemyOverrides;
    };

    const CHRONO_ENEMY_CATALOG = {
        generic: [
            { id: "normal", name: "Normal", color: "#939393" },
            { id: "immune", name: "Immune", color: "#000000" },
            { id: "sizing", name: "Sizing", color: "#f27743" },
            { id: "enlarging", name: "Enlarging", color: "#4d0163" },
            { id: "powered", name: "Powered", color: "#c2c2c2" },
            { id: "reducing", name: "Reducing", color: "#2d3237" },
            { id: "mutating", name: "Mutating", color: "#211513" },
            { id: "withering", name: "Withering", color: "#752656" },
            { id: "switch", name: "Switch", color: "#565656" },
            { id: "lost_soul", name: "LostSoul", color: "#bed0d1" },
            { id: "vengeful_soul", name: "VengefulSoul", color: "#96b1b3" },
            { id: "infinity", name: "Infinity", color: "#ff69c5" },
            { id: "infinity_switch", name: "InfinitySwitch", color: "#ffb4e2" },
            { id: "radar", name: "Radar", color: "#c90000" },
            { id: "electrical", name: "Electrical", color: "#2fded7" },
            { id: "enforcing", name: "Enforcing", color: "#590016" },
            { id: "growing", name: "Growing", color: "#be4db2" }
        ],
        sniper: [
            { id: "sniper", name: "Sniper", color: "#a05353" },
            { id: "corrosive_sniper", name: "CorrosiveSniper", color: "#61ff61" },
            { id: "force_sniper_a", name: "ForceSniperA", color: "#0a5557" },
            { id: "force_sniper_b", name: "ForceSniperB", color: "#914d83" },
            { id: "ice_sniper", name: "IceSniper", color: "#8300ff" },
            { id: "lead_sniper", name: "LeadSniper", color: "#788898" },
            { id: "multisniper", name: "Multisniper", color: "#8a8769" },
            { id: "negative_magnetic_sniper", name: "NegativeMagneticSniper", color: "#a496ff" },
            { id: "ninja_star_sniper", name: "NinjaStarSniper", color: "#dedede" },
            { id: "poison_sniper", name: "PoisonSniper", color: "#8c01b7" },
            { id: "positive_magnetic_sniper", name: "PositiveMagneticSniper", color: "#ff3852" },
            { id: "prediction_sniper", name: "PredictionSniper", color: "#d14f84" },
            { id: "regen_sniper", name: "RegenSniper", color: "#00cc8e" },
            { id: "ring_sniper", name: "RingSniper", color: "#b5deeb" },
            { id: "speed_sniper", name: "SpeedSniper", color: "#ff9000" },
            { id: "trisniper", name: "Trisniper", color: "#63464b" },
            { id: "void_sniper", name: "VoidSniper", color: "#40144b" },
            { id: "wind_sniper", name: "WindSniper", color: "#9de3c6" }
        ],
        pseudo_sniper: [
            { id: "radiating_bullets", name: "RadiatingBullets", color: "#d3134f" },
            { id: "stalactite", name: "Stalactite", color: "#302519" },
            { id: "tree", name: "Tree", color: "#4e2700" }
        ],
        aura: [
            { id: "barrier", name: "Barrier", color: "#29ffc6" },
            { id: "blocking", name: "Blocking", color: "#bf5213" },
            { id: "disabling", name: "Disabling", color: "#a87c86" },
            { id: "disarming", name: "Disarming", color: "#a377a3" },
            { id: "draining", name: "Draining", color: "#0000ff" },
            { id: "experience_drain", name: "ExperienceDrain", color: "#b19cd9" },
            { id: "gravity", name: "Gravity", color: "#78148c" },
            { id: "infectious", name: "Infectious", color: "#eb00eb" },
            { id: "magnetic_nullification", name: "MagneticNullification", color: "#642374" },
            { id: "magnetic_reduction", name: "MagneticReduction", color: "#bd67d2" },
            { id: "repelling", name: "Repelling", color: "#7b9db2" },
            { id: "slowing", name: "Slowing", color: "#ff0000" },
            { id: "zoning", name: "Zoning", color: "#a03811" },
            { id: "zoning_switch", name: "ZoningSwitch", color: "#b35f40" }
        ],
        ghost: [
            { id: "disabling_ghost", name: "DisablingGhost", color: "#ffbfce7f" },
            { id: "gravity_ghost", name: "GravityGhost", color: "#78148c" },
            { id: "ice_ghost", name: "IceGhost", color: "#be89ff" },
            { id: "negative_magnetic_ghost", name: "NegativeMagneticGhost", color: "#6f59ff" },
            { id: "poison_ghost", name: "PoisonGhost", color: "#590174" },
            { id: "positive_magnetic_ghost", name: "PositiveMagneticGhost", color: "#e3001e" },
            { id: "regen_ghost", name: "RegenGhost", color: "#32e3ae" },
            { id: "repelling_ghost", name: "RepellingGhost", color: "#7b9db2" },
            { id: "speed_ghost", name: "SpeedGhost", color: "#fca330" },
            { id: "wind_ghost", name: "WindGhost", color: "#9de3c6" },
            { id: "crystal_ghost", name: "CrystalGhost", color: "#c0297a" }
        ],
        altered_movement: [
            { id: "dasher", name: "Dasher", color: "#003c66" },
            { id: "dasher_switch", name: "DasherSwitch", color: "#00243d" },
            { id: "homing", name: "Homing", color: "#966e14" },
            { id: "homing_switch", name: "HomingSwitch", color: "#694d0e" },
            { id: "lunging", name: "Lunging", color: "#c88250" },
            { id: "lurching", name: "Lurching", color: "#5d4d5d" },
            { id: "stumbling", name: "Stumbling", color: "#7d487f" },
            { id: "oscillating", name: "Oscillating", color: "#869e0f" },
            { id: "oscillating_switch", name: "OscillatingSwitch", color: "#b6c46f" },
            { id: "spiral", name: "Spiral", color: "#e8b500" },
            { id: "spiral_switch", name: "SpiralSwitch", color: "#f5e199" },
            { id: "turning", name: "Turning", color: "#336600" },
            { id: "cycling", name: "Cycling", color: "#91bbff" },
            { id: "wavy", name: "Wavy", color: "#dd2606" },
            { id: "wavy_switch", name: "WavySwitch", color: "#fa5336" },
            { id: "zigzag", name: "Zigzag", color: "#b371f2" },
            { id: "zigzag_switch", name: "ZigzagSwitch", color: "#e0c6f9" },
            { id: "slasher", name: "Slasher", color: "#363636" },
            { id: "slippery", name: "Slippery", color: "#1aacbf" },
            { id: "quicksand", name: "Quicksand", color: "#6c541e" }
        ],
        blinking_movement: [
            { id: "star", name: "Star", color: "#faf46e" },
            { id: "superstar", name: "Superstar", color: "#ffffff" },
            { id: "teleporting", name: "Teleporting", color: "#ecc4ef" }
        ],
        accelerative: [
            { id: "sand", name: "Sand", color: "#d5ae7f" },
            { id: "sandrock", name: "Sandrock", color: "#a57a6d" }
        ],
        invisible: [
            { id: "firefly", name: "Firefly", color: "#f0841f" },
            { id: "glowy", name: "Glowy", color: "#ede658" },
            { id: "mist", name: "Mist", color: "#b686db" },
            { id: "phantom", name: "Phantom", color: "#86d7db" }
        ],
        wall_and_hitters: [
            { id: "wall", name: "Wall", color: "#222222" },
            { id: "wacky_wall", name: "WackyWall", color: "#332233" },
            { id: "crumbling", name: "Crumbling", color: "#bd9476" },
            { id: "snowman", name: "Snowman", color: "#ffffff" },
            { id: "crystal_giant", name: "CrystalGiant", color: "#c0297a" }
        ],
        pumpkins: [
            { id: "pumpkin", name: "Pumpkin", color: "#e26110" },
            { id: "fake_pumpkin", name: "Fake Pumpkin", color: "#939393" }
        ],
        elemental_and_flora: [
            { id: "cactus", name: "Cactus", color: "#5b8e28" },
            { id: "flower", name: "Flower", color: "#e8e584" },
            { id: "lotus_flower", name: "LotusFlower", color: "#dedede" },
            { id: "seedling", name: "Seedling", color: "#259c55" },
            { id: "grass", name: "Grass", color: "#75eb26" },
            { id: "blind", name: "Blind", color: "#96c6ec" },
            { id: "flaming", name: "Flaming", color: "#aa2f2f" },
            { id: "fire_trail", name: "FireTrail", color: "#cf5504" },
            { id: "lava", name: "Lava", color: "#f78306" },
            { id: "sparking", name: "Sparking", color: "#ffbe6e" },
            { id: "static", name: "Static", color: "#f5a462" },
            { id: "thunderbolt", name: "Thunderbolt", color: "#f4ff8c" },
            { id: "liquid", name: "Liquid", color: "#6789ef" },
            { id: "dripping", name: "Dripping", color: "#100812" },
            { id: "freezing", name: "Freezing", color: "#64c1b9" },
            { id: "icicle", name: "Icicle", color: "#adf8ff" },
            { id: "residue", name: "Residue", color: "#675327" },
            { id: "toxic", name: "Toxic", color: "#00c700" },
            { id: "corrosive", name: "Corrosive", color: "#00eb00" },
            { id: "confectioner", name: "Confectioner", color: "#8771f2" },
            { id: "confectioner_switch", name: "ConfectionerSwitch", color: "#cfc6f9" },
            { id: "dorito", name: "Dorito", color: "#05dad1" },
            { id: "dorito_switch", name: "DoritoSwitch", color: "#9bf0ec" },
            { id: "penny", name: "Penny", color: "#c38b32" },
            { id: "penny_switch", name: "PennySwitch", color: "#d9b67f" }
        ],
        bots: [
            { id: "aibot", name: "Aibot", color: "#00b585" },
            { id: "cybot", name: "Cybot", color: "#926be3" },
            { id: "dabot", name: "Dabot", color: "#3d006e" },
            { id: "eabot", name: "Eabot", color: "#b07331" },
            { id: "elbot", name: "Elbot", color: "#daff1f" },
            { id: "fibot", name: "Fibot", color: "#e88409" },
            { id: "icbot", name: "Icbot", color: "#1bc8e3" },
            { id: "libot", name: "Libot", color: "#fff9bd" },
            { id: "mebot", name: "Mebot", color: "#b55b31" },
            { id: "plbot", name: "Plbot", color: "#18ed3f" },
            { id: "wabot", name: "Wabot", color: "#319bb0" }
        ],
        void_and_summoners: [
            { id: "void_crawler", name: "VoidCrawler", color: "#1c0a2d" },
            { id: "void_drain", name: "VoidDrain", color: "#261235" },
            { id: "void_swarm", name: "VoidSwarm", color: "#393042" },
            { id: "summoner", name: "Summoner", color: "#91bbff" },
            { id: "robo_scanner_summoner_blind", name: "RoboScannerSummonerBlind", color: "#96c6ec66" },
            { id: "charging", name: "Charging", color: "#374037" },
            { id: "frost_giant", name: "FrostGiant", color: "#7e7cd6" },
            { id: "network_error", name: "NetworkError", color: "#e1e1e10c" }
        ]
    };
    const enemyToFamilyMap = {};
    const colorToEnemyMap = {};
    const ALL_EXACT_ENEMY_COLORS = {"aibot": "#00b585", "barrier": "#29ffc6", "blind": "#96c6ec", "blocking": "#bf5213", "cactus": "#5b8e28", "charging": "#374037", "confectioner": "#8771f2", "confectioner_switch": "#cfc6f9", "corrosive": "#00eb00", "corrosive_sniper": "#61ff61", "crumbling": "#bd9476", "crystal_giant": "#c0297a", "crystal_ghost": "#c0297a", "cybot": "#926be3", "cycling": "#91bbff", "dabot": "#3d006e", "dasher": "#003c66", "dasher_switch": "#00243d", "disabling": "#a87c86", "disabling_ghost": "#ffbfce", "disarming": "#a377a3", "dorito": "#05dad1", "dorito_switch": "#9bf0ec", "draining": "#0000ff", "dripping": "#100812", "eabot": "#b07331", "elbot": "#daff1f", "electrical": "#2fded7", "enforcing": "#590016", "enlarging": "#4d0163", "experience_drain": "#b19cd9", "fibot": "#e88409", "firefly": "#f0841f", "fire_trail": "#cf5504", "flaming": "#aa2f2f", "flower": "#e8e584", "force_sniper_a": "#0a5557", "force_sniper_b": "#914d83", "freezing": "#64c1b9", "frost_giant": "#7e7cd6", "glowy": "#ede658", "grass": "#75eb26", "gravity": "#78148c", "gravity_ghost": "#78148c", "growing": "#be4db2", "homing": "#966e14", "homing_switch": "#694d0e", "icbot": "#1bc8e3", "ice_ghost": "#be89ff", "ice_sniper": "#8300ff", "icicle": "#adf8ff", "immune": "#000000", "infectious": "#eb00eb", "infinity": "#ff69c5", "infinity_switch": "#ffb4e2", "lava": "#f78306", "lead_sniper": "#788898", "libot": "#fff9bd", "liquid": "#6789ef", "lost_soul": "#bed0d1", "lotus_flower": "#dedede", "lunging": "#c88250", "lurching": "#5d4d5d", "magnetic_nullification": "#642374", "magnetic_reduction": "#bd67d2", "mebot": "#b55b31", "mist": "#b686db", "multisniper": "#8a8769", "mutating": "#211513", "negative_magnetic_ghost": "#6f59ff", "negative_magnetic_sniper": "#a496ff", "network_error": "#e1e1e1", "ninja_star_sniper": "#dedede", "normal": "#939393", "oscillating": "#869e0f", "oscillating_switch": "#b6c46f", "penny": "#c38b32", "penny_switch": "#d9b67f", "phantom": "#86d7db", "plbot": "#18ed3f", "poison_ghost": "#590174", "poison_sniper": "#8c01b7", "positive_magnetic_ghost": "#e3001e", "positive_magnetic_sniper": "#ff3852", "powered": "#c2c2c2", "prediction_sniper": "#d14f84", "pumpkin": "#e26110", "quicksand": "#6c541e", "radar": "#c90000", "radiating_bullets": "#d3134f", "reducing": "#2d3237", "regen_ghost": "#32e3ae", "regen_sniper": "#00cc8e", "repelling": "#7b9db2", "repelling_ghost": "#7b9db2", "residue": "#675327", "ring_sniper": "#b5deeb", "robo_scanner_summoner_blind": "#96c6ec", "sandrock": "#a57a6d", "sand": "#d5ae7f", "seedling": "#259c55", "sizing": "#f27743", "slasher": "#363636", "slippery": "#1aacbf", "slowing": "#ff0000", "sniper": "#a05353", "snowman": "#ffffff", "sparking": "#ffbe6e", "speed_ghost": "#fca330", "speed_sniper": "#ff9000", "spiral": "#e8b500", "spiral_switch": "#f5e199", "stalactite": "#302519", "star": "#faf46e", "static": "#f5a462", "stumbling": "#7d487f", "summoner": "#91bbff", "superstar": "#ffffff", "switch": "#565656", "teleporting": "#ecc4ef", "thunderbolt": "#f4ff8c", "toxic": "#00c700", "tree": "#4e2700", "trisniper": "#63464b", "turning": "#336600", "vengeful_soul": "#96b1b3", "void_crawler": "#1c0a2d", "void_drain": "#261235", "void_sniper": "#40144b", "void_swarm": "#393042", "wabot": "#319bb0", "wacky_wall": "#332233", "wall": "#222222", "wavy": "#dd2606", "wavy_switch": "#fa5336", "wind_ghost": "#9de3c6", "wind_sniper": "#9de3c6", "withering": "#752656", "zigzag": "#b371f2", "zigzag_switch": "#e0c6f9", "zoning": "#a03811", "zoning_switch": "#b35f40"};

    for (const [fam, list] of Object.entries(CHRONO_ENEMY_CATALOG)) {
        for (const en of list) {
            enemyToFamilyMap[en.id] = fam;
        }
    }

    if (window.Chrono) {
        window.Chrono.enemyCatalog = CHRONO_ENEMY_CATALOG;
        window.Chrono.enemyToFamilyMap = enemyToFamilyMap;
        window.Chrono.allExactEnemyColors = ALL_EXACT_ENEMY_COLORS;
        window.Chrono.enemyOutlineMode = enemyOutlineMode;
        window.Chrono.enemyOutlineColor = enemyOutlineColor;
        window.Chrono.enemyOutlineWidth = enemyOutlineWidth;
        window.Chrono.enemyOutlineGlow = enemyOutlineGlow;
        window.Chrono.enemyOverrides = chronoEnemyOverrides;
        window.Chrono.currentLbMode = currentLbMode;
    }
    window.CHRONO_ENEMY_CATALOG = CHRONO_ENEMY_CATALOG;

    const colorNormCache = Object.create(null);
    function normalizeColor(str) {
        if (!str || typeof str !== "string") return "";
        const cached = colorNormCache[str];
        if (cached !== undefined) return cached;
        const s = str.trim().toLowerCase();
        let res = s;
        if (s.startsWith("#")) {
            if (s.length === 4) {
                res = "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
            } else if (s.length >= 7) {
                res = s.substring(0, 7);
            }
        } else if (s.startsWith("rgb")) {
            const m = s.match(/\d+/g);
            if (m && m.length >= 3) {
                const r = parseInt(m[0], 10).toString(16).padStart(2, '0');
                const g = parseInt(m[1], 10).toString(16).padStart(2, '0');
                const b = parseInt(m[2], 10).toString(16).padStart(2, '0');
                res = "#" + r + g + b;
            }
        }
        colorNormCache[str] = res;
        return res;
    }

    function registerEnemyColor(enemyId, rawColor) {
        if (!rawColor) return;
        const norm = normalizeColor(rawColor);
        if (norm) colorToEnemyMap[norm] = enemyId;
        colorToEnemyMap[rawColor.toLowerCase()] = enemyId;
    }

    // Sync window.pal dynamically via getter/setter interception
    if (typeof window !== "undefined") {
        let internalPal = {};
        Object.defineProperty(window, 'pal', {
            get: function() { return internalPal; },
            set: function(val) {
                internalPal = val;
                if (val && typeof val === "object") {
                    for (const [enemyName, hexColor] of Object.entries(internalPal)) {
                        registerEnemyColor(enemyName, hexColor);
                    }
                }
            }
        });
    }
    
    // Initial static mapping fallback
    for (const [enemyName, hexColor] of Object.entries(ALL_EXACT_ENEMY_COLORS)) {
        registerEnemyColor(enemyName, hexColor);
    }

    const origStroke = CanvasRenderingContext2D.prototype.stroke;
    CanvasRenderingContext2D.prototype.stroke = function(...args) {
        if (enemyOutlineMode === "default" && !hasChronoEnemyOverrides) {
            return origStroke.apply(this, args);
        }

        if (typeof this.strokeStyle !== "string") {
            return origStroke.apply(this, args);
        }

        const st = this.strokeStyle.toLowerCase().trim();
        const isOutlineStroke = (
            st === "#000000" || st === "#000" || st === "black" ||
            st === "#ffffff" || st === "#fff" || st === "white" ||
            st === "rgb(0, 0, 0)" || st === "rgb(0,0,0)" ||
            st === "rgb(255, 255, 255)" || st === "rgb(255,255,255)" ||
            st.startsWith("rgba(0, 0, 0") || st.startsWith("rgba(0,0,0") ||
            st.startsWith("rgba(255, 255, 255") || st.startsWith("rgba(255,255,255") ||
            st === "#222222" || st === "#333333" || st === "rgba(0, 0, 0, 0.8)"
        );

        if (isOutlineStroke && typeof this.fillStyle === "string") {
            const fsNorm = normalizeColor(this.fillStyle);
            const enemyId = colorToEnemyMap[fsNorm] || colorToEnemyMap[this.fillStyle.toLowerCase()];

            let customCol = null;
            let customWidth = enemyOutlineWidth || 2.0;
            let customGlow = enemyOutlineGlow || 0;

            if (enemyId) {
                const familyId = enemyToFamilyMap[enemyId];
                // Priority 1: Individual Override
                if (chronoEnemyOverrides[enemyId]) {
                    customCol = chronoEnemyOverrides[enemyId];
                    customGlow = enemyOutlineGlow > 0 ? enemyOutlineGlow : 8;
                } 
                // Priority 2: Family Override
                else if (familyId && chronoEnemyOverrides[familyId]) {
                    customCol = chronoEnemyOverrides[familyId];
                    customGlow = enemyOutlineGlow > 0 ? enemyOutlineGlow : 8;
                }
            }

            // Priority 3: Preset / Outline Mode
            if (!customCol && enemyOutlineMode !== "default" && (enemyId || this.canvas?.id === "canvas" || this.canvas?.id === "game")) {
                if (enemyOutlineMode === "chrono") {
                    customCol = "#34d399";
                    customGlow = 8;
                    customWidth = 2.5;
                } else if (enemyOutlineMode === "volcano") {
                    customCol = "#ef4444";
                    customGlow = 10;
                    customWidth = 2.5;
                } else if (enemyOutlineMode === "rainbow") {
                    const hue = Math.floor((performance.now() / 8) % 360);
                    customCol = "hsl(" + hue + ", 100%, 55%)";
                    customGlow = 8;
                    customWidth = 2.5;
                } else if (enemyOutlineMode === "smart") {
                    let r = 0, g = 0, b = 0;
                    if (fsNorm.startsWith("#") && fsNorm.length === 7) {
                        r = parseInt(fsNorm.substring(1, 3), 16);
                        g = parseInt(fsNorm.substring(3, 5), 16);
                        b = parseInt(fsNorm.substring(5, 7), 16);
                    }
                    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                    customCol = lum > 127 ? "#000000" : "#ffffff";
                    customGlow = 4;
                    customWidth = 2.5;
                } else if (enemyOutlineMode === "custom") {
                    customCol = enemyOutlineColor || "#34d399";
                    customWidth = enemyOutlineWidth || 2.0;
                    customGlow = enemyOutlineGlow || 0;
                }
            }

            if (customCol) {
                const oldColor = this.strokeStyle;
                const oldWidth = this.lineWidth;
                const oldShadow = this.shadowColor;
                const oldBlur = this.shadowBlur;

                this.strokeStyle = customCol;
                if (customWidth) {
                    this.lineWidth = customWidth;
                }
                if (customGlow > 0) {
                    this.shadowColor = customCol;
                    this.shadowBlur = customGlow;
                }

                origStroke.apply(this, args);

                this.strokeStyle = oldColor;
                this.lineWidth = oldWidth;
                this.shadowColor = oldShadow;
                this.shadowBlur = oldBlur;
                return;
            }
        }

        return origStroke.apply(this, args);
    };

    // ── Exact Evades Fading Effects & Pre-Attack Visual Engine ──
    try {
        const savedTells = localStorage.getItem("chrono_mod_visualtells");
        window._chrono_enable_visual_tells = (savedTells === null) ? true : (savedTells === "1");
    } catch(e) {
        window._chrono_enable_visual_tells = true;
    }

    if (!window._chrono_visuals_hooked && typeof CanvasRenderingContext2D !== "undefined") {
        window._chrono_visuals_hooked = true;

        let lastArcX = 0;
        let lastArcY = 0;
        let lastArcRadius = 0;
        let lastArcCtx = null;
        let hasArcData = false;

        // 1. Hook arc: Fast pass-through if visual tells not explicitly active
        const origArc = CanvasRenderingContext2D.prototype.arc;
        CanvasRenderingContext2D.prototype.arc = function(x, y, radius, startAngle, endAngle, counterclockwise) {
            if (!window._chrono_enable_visual_tells) {
                return origArc.apply(this, arguments);
            }
            if (this.canvas && (this.canvas.id === "game" || this.canvas.id === "canvas" || this.canvas.width > 300)) {
                if (radius >= 10 && Math.abs(endAngle - startAngle) >= Math.PI * 1.8) {
                    lastArcX = x;
                    lastArcY = y;
                    lastArcRadius = radius;
                    lastArcCtx = this;
                    hasArcData = true;
                } else {
                    hasArcData = false;
                }
            }
            return origArc.apply(this, arguments);
        };

        // 2. Hook fill: Fast pass-through if visual tells not active
        const origFill = CanvasRenderingContext2D.prototype.fill;
        CanvasRenderingContext2D.prototype.fill = function(...args) {
            if (!window._chrono_enable_visual_tells || !hasArcData || lastArcCtx !== this || typeof this.fillStyle !== "string") {
                return origFill.apply(this, args);
            }
            const arcX = lastArcX;
            const arcY = lastArcY;
            const arcRadius = lastArcRadius;
            hasArcData = false;
            const fs = this.fillStyle.trim();

            // ── 1. SNIPER / PROJECTILE EMITTER PRE-FIRE TELL (Evades exact: rgba(1, 1, 1, t)) ──
            if (fs.startsWith("rgba(1, 1, 1,") || fs.startsWith("rgba(1,1,1,")) {
                const m = fs.match(/[\d.]+/g);
                const t = (m && m.length >= 4) ? parseFloat(m[3]) : 0.15;
                const progress = Math.min(1.0, Math.max(0.05, (t - 0.05) / 0.20));

                this.save();
                this.fillStyle = "rgba(255, 45, 85, " + (0.15 + progress * 0.45) + ")";
                this.shadowColor = "#ff0055";
                this.shadowBlur = 14;
                origFill.apply(this, args);

                this.beginPath();
                this.arc(arcX, arcY, arcRadius + 4, 0, Math.PI * 2);
                this.lineWidth = 2.5;
                if (progress < 0.5) {
                    this.strokeStyle = "rgba(255, 170, 0, 0.85)";
                    this.shadowColor = "#ffaa00";
                    this.shadowBlur = 8;
                } else if (progress < 0.82) {
                    this.strokeStyle = "rgba(255, 70, 0, 0.95)";
                    this.shadowColor = "#ff4600";
                    this.shadowBlur = 14;
                } else {
                    const flash = (Math.floor(performance.now() / 60) % 2 === 0);
                    this.strokeStyle = flash ? "#ffffff" : "#ff0055";
                    this.shadowColor = "#ff0055";
                    this.shadowBlur = 20;
                    this.lineWidth = 3.5;
                }
                origStroke.call(this);

                this.beginPath();
                const startAngle = -Math.PI / 2;
                const endAngle = startAngle + (Math.PI * 2 * progress);
                this.arc(arcX, arcY, arcRadius + 7.5, startAngle, endAngle);
                this.lineWidth = 3.0;
                this.strokeStyle = progress > 0.82 ? "#ff0055" : (progress > 0.5 ? "#ff9f1a" : "#00f2fe");
                this.shadowColor = this.strokeStyle;
                this.shadowBlur = 10;
                origStroke.call(this);

                if (progress >= 0.75) {
                    this.beginPath();
                    this.arc(arcX, arcY, arcRadius * 0.45, 0, Math.PI * 2);
                    this.fillStyle = "rgba(255, 255, 255, 0.92)";
                    this.shadowColor = "#ff0055";
                    this.shadowBlur = 16;
                    origFill.call(this);
                }

                this.restore();
                return;
            }

            // ── 2. SWITCH ENEMY FADING TELL ──
            if (fs.startsWith("rgba(25, 25, 25,") || fs.startsWith("rgba(25,25,25,") ||
                fs.startsWith("rgba(127, 127, 127,") || fs.startsWith("rgba(127,127,127,")) {
                this.save();
                this.beginPath();
                this.arc(arcX, arcY, arcRadius + 3.5, 0, Math.PI * 2);
                this.lineWidth = 2.5;
                this.strokeStyle = "rgba(56, 189, 248, 0.85)";
                this.shadowColor = "#38bdf8";
                this.shadowBlur = 10;
                origStroke.call(this);
                this.restore();
            }

            // ── 3. SLASHER ATTACK TELL ──
            if (fs.startsWith("rgba(") || fs.startsWith("rgb(")) {
                const m = fs.match(/\d+/g);
                if (m && m.length >= 4) {
                    const r = parseInt(m[0], 10), g = parseInt(m[1], 10), b = parseInt(m[2], 10);
                    if (r === g && g === b && r >= 54 && r <= 120) {
                        const slashProg = (r - 54) / 66;
                        this.save();
                        this.beginPath();
                        this.arc(arcX, arcY, arcRadius + 4, 0, Math.PI * 2);
                        this.lineWidth = 2.5;
                        if (slashProg < 0.7) {
                            this.strokeStyle = "rgba(255, 170, 0, 0.85)";
                            this.shadowColor = "#ffaa00";
                            this.shadowBlur = 8;
                        } else {
                            const flash = (Math.floor(performance.now() / 60) % 2 === 0);
                            this.strokeStyle = flash ? "#ffffff" : "#a855f7";
                            this.shadowColor = "#a855f7";
                            this.shadowBlur = 16;
                            this.lineWidth = 3.5;
                        }
                        origStroke.call(this);

                        this.beginPath();
                        const startAngle = -Math.PI / 2;
                        const endAngle = startAngle + (Math.PI * 2 * slashProg);
                        this.arc(arcX, arcY, arcRadius + 7.5, startAngle, endAngle);
                        this.lineWidth = 3.0;
                        this.strokeStyle = slashProg > 0.7 ? "#a855f7" : "#00f2fe";
                        this.shadowColor = this.strokeStyle;
                        this.shadowBlur = 10;
                        origStroke.call(this);

                        this.restore();
                    }
                }
            }

            return origFill.apply(this, args);
        };
    }

    // Dynamic Script Protection Hook
    if (!window._chrono_elem_hooked) {
        window._chrono_elem_hooked = true;
        const origCreateElement = document.createElement.bind(document);
        document.createElement = function(tag, options) {
            const el = origCreateElement(tag, options);
            if (tag && typeof tag === "string" && tag.toLowerCase() === "script") {
                if (localStorage.getItem("chrono_tournament_mode") === "true") {
                    console.warn("[Chrono Tournament Security] Dynamic script injection blocked.");
                    Object.defineProperty(el, "src", {
                        set: function() { console.warn("[Chrono Tournament Security] Blocked external script src."); },
                        get: function() { return ""; }
                    });
                }
            }
            return el;
        };
    }

    function mountCoreUI() {
        if (!document.body) return;

        if (!document.getElementById("chrono-fps-hud")) {
            document.body.appendChild(fpsDiv);
            if (typeof requestAnimationFrame !== "undefined") {
                requestAnimationFrame(countFps);
            } else if (typeof window !== "undefined" && window.requestAnimationFrame) {
                window.requestAnimationFrame(countFps);
            }
        }
    }

    mountCoreUI();
    window.addEventListener("DOMContentLoaded", mountCoreUI);
    window.addEventListener("load", mountCoreUI);

    function getEvadesPlayerName() {
        try {
            if (typeof window.game === "object" && window.game && window.game.players && window.game.players[0] && window.game.players[0].name) {
                const n = window.game.players[0].name.trim();
                if (n && n.toLowerCase() !== "guest" && n.toLowerCase() !== "unknown") return n;
            }
        } catch(e) {}

        try {
            const allElements = document.querySelectorAll(".account-header, .logged-in-as, div, span, p, b, strong");
            for (let i = 0; i < allElements.length; i++) {
                const t = allElements[i].innerText;
                if (t && t.includes("Logged in as:")) {
                    const split = t.split("Logged in as:");
                    if (split[1]) {
                        const name = split[1].trim();
                        if (name && name.length > 0 && name.length < 30 && name.toLowerCase() !== "guest") {
                            return name;
                        }
                    }
                }
            }
        } catch(e) {}

        try {
            const profLink = document.querySelector('a[href^="/profile/"], a.profile-link');
            if (profLink) {
                const href = profLink.getAttribute("href") || "";
                if (href.startsWith("/profile/")) {
                    const slug = decodeURIComponent(href.replace("/profile/", "")).trim();
                    if (slug && !slug.includes("/") && slug.length < 30 && slug.toLowerCase() !== "guest") {
                        return slug;
                    }
                }
            }
        } catch(e) {}

        return null;
    }

    function isPlayerSpectating() {
        try {
            if (typeof window.game === "object" && window.game) {
                if (window.game.spectating || window.game.isSpectating) return true;
                if (window.game.spectatingHero || window.game.spectateTarget) return true;
                if (window.game.self) {
                    if (window.game.self.spectating || window.game.self.isSpectating) return true;
                    if (window.game.self.dead && window.game.players && window.game.players.length > 0) return true;
                }
            }
            const spectateDom = document.querySelector(".spectating-banner, .spectator-controls, .spectate-info, .spectator-bar, .spectating-ui, .spectating, [class*='spectat']");
            if (spectateDom && spectateDom.offsetParent !== null) return true;
        } catch(e) {}
        return false;
    }

    window.showStopCheatingOverlay = function(reason) {
        let el = document.getElementById("chrono-stop-cheating-modal");
        if (!el) {
            el = document.createElement("div");
            el.id = "chrono-stop-cheating-modal";
            el.style.position = "fixed";
            el.style.top = "0";
            el.style.left = "0";
            el.style.width = "100vw";
            el.style.height = "100vh";
            el.style.zIndex = "999999999";
            el.style.background = "radial-gradient(circle, rgba(185, 28, 28, 0.96) 0%, rgba(69, 10, 10, 0.98) 100%)";
            el.style.display = "flex";
            el.style.flexDirection = "column";
            el.style.alignItems = "center";
            el.style.justifyContent = "center";
            el.style.backdropFilter = "blur(14px)";
            el.style.color = "#ffffff";
            el.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
            el.style.boxShadow = "inset 0 0 120px rgba(0,0,0,0.85)";
            el.style.animation = "chronoCheaterPulse 1.2s infinite alternate ease-in-out";
            
            const style = document.createElement("style");
            style.textContent = `
                @keyframes chronoCheaterPulse {
                    0% { transform: scale(1); filter: brightness(1); }
                    100% { transform: scale(1.02); filter: brightness(1.2); }
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(el);
        }

        el.innerHTML = `
            <div style="text-align: center; max-width: 680px; padding: 40px; background: rgba(15, 3, 3, 0.85); border: 3px solid #ef4444; border-radius: 24px; box-shadow: 0 25px 60px -12px rgba(239, 68, 68, 0.6);">
                <div style="font-size: 84px; margin-bottom: 8px; line-height: 1; filter: drop-shadow(0 0 20px #ef4444);">🤡🤡</div>
                <h1 style="font-size: 46px; font-weight: 900; color: #fee2e2; margin: 0 0 14px 0; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 35px #ef4444;">
                    STOP CHEATING 🤡🤡
                </h1>
                <div style="font-size: 17px; color: #fca5a5; margin-bottom: 22px; font-weight: 600; line-height: 1.5;">
                    ${reason || "Synthetic external inputs, bot automation or injected scripts detected by Sentinel Anti-Cheat."}
                </div>
                <div style="padding: 12px 20px; background: rgba(239, 68, 68, 0.2); border-radius: 12px; border: 1px dashed rgba(254, 202, 202, 0.4); font-size: 13px; color: #fee2e2; margin-bottom: 25px;">
                    🛡️ <b>Tournament Integrity Protection:</b> Automated gameplay execution is forbidden.
                </div>
                <button id="chrono-cheater-dismiss-btn" style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); color: white; border: 1px solid rgba(254, 202, 202, 0.5); padding: 14px 34px; font-size: 15px; font-weight: 800; border-radius: 12px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 25px rgba(185, 28, 28, 0.5); transition: transform 0.15s ease;">
                    I Understand
                </button>
            </div>
        `;

        el.style.display = "flex";
        const btn = document.getElementById("chrono-cheater-dismiss-btn");
        if (btn) {
            btn.onclick = () => {
                el.style.display = "none";
            };
        }
    };

    function isAnyMenuOpen() {
        try {
            const chronoModal = document.getElementById("chrono-menu-modal");
            if (chronoModal && (chronoModal.style.display === "flex" || chronoModal.style.display === "block")) return true;
            const runsModal = document.getElementById("chrono-runs-window");
            if (runsModal && runsModal.style.display !== "none" && runsModal.style.display !== "") return true;
            const lbModal = document.getElementById("chrono-leaderboard-window");
            if (lbModal && lbModal.style.display !== "none" && lbModal.style.display !== "") return true;
            const tourModal = document.getElementById("chrono-tournament-window");
            if (tourModal && tourModal.style.display !== "none" && tourModal.style.display !== "") return true;
            const cheatModal = document.getElementById("chrono-stop-cheating-modal");
            if (cheatModal && (cheatModal.style.display === "flex" || cheatModal.style.display === "block")) return true;
            const hudEd = document.getElementById("chrono-hud-grid-overlay");
            if (hudEd && hudEd.style.display === "block") return true;
        } catch(e) {}
        return false;
    }

    function isEvadesInGame() {
        try {
            const canvas = document.getElementById("canvas");
            if (!canvas) return false;
            if (canvas.style.display === "none" || canvas.style.visibility === "hidden" || canvas.offsetParent === null) return false;
            if (isAnyMenuOpen()) return false;
            if (typeof isPlayerSpectating === "function" && isPlayerSpectating()) return false;
            const path = window.location.pathname;
            if (path.startsWith("/profile") || path.startsWith("/account")) return false;
            return true;
        } catch(e) {
            return false;
        }
    }

    function chronoTick() {
        const path = window.location.pathname;
        if (path.startsWith("/profile")) {
            if (typeof window.enhanceProfilePage === "function") window.enhanceProfilePage();
            else if (typeof enhanceProfilePage === "function") enhanceProfilePage();
        } else if (path.startsWith("/account")) {
            if (typeof window.enhanceAccountPage === "function") window.enhanceAccountPage();
            else if (typeof enhanceAccountPage === "function") enhanceAccountPage();
        }
        if (typeof window.trackCurrentUser === "function") window.trackCurrentUser();
        else if (typeof trackCurrentUser === "function") trackCurrentUser();
        if (typeof syncKeybindsFromDom === "function") syncKeybindsFromDom();
        if (!isEvadesInGame()) {
            if (typeof window.applyHudLayout === "function") window.applyHudLayout();
            else if (typeof applyHudLayout === "function") applyHudLayout();
        }
        
        const inGame = isEvadesInGame();
        const isSpectating = isPlayerSpectating();
        const isFocused = Boolean(document.hasFocus && document.hasFocus());
        if (window.ipc) {
            window.ipc.postMessage(JSON.stringify({
                action: "sync_anticheat_state",
                active: (localStorage.getItem("chrono_tournament_mode") === "true"),
                in_game: inGame,
                spectating: isSpectating,
                focused: isFocused
            }));
        }
    }
    setInterval(chronoTick, 500);

    // 10. Discord Rich Presence State Observer
    function updateDiscordRPC() {
        try {
            if (!window.ipc) return;
            const canvas = document.getElementById("canvas");
            const inGame = Boolean(canvas && canvas.style.display !== "none");
            
            let status = inGame ? "Online" : "Idle";
            if (document.querySelector(".runs-interface") || document.querySelector(".hall-of-fame-archive-page")) {
                status = "Highscore";
            }

            window.ipc.postMessage(JSON.stringify({
                in_game: inGame,
                status: status,
                enabled: currentConfig.discord_rpc_enabled
            }));
        } catch(e) {}
    }

    setInterval(updateDiscordRPC, 2000);

    // ── Synthetic DOM Event Guard (isTrusted enforcement) ──
    const blockUntrustedEvents = function(e) {
        if (window._chrono_is_internal_freeze) return;
        if (!e.isTrusted && e.type === "keydown") {
            e.stopImmediatePropagation();
            e.preventDefault();
            console.warn("[Chrono Sentinel] Blocked synthetic untrusted event:", e.type, e.key);

            if (localStorage.getItem("chrono_tournament_mode") === "true" && isEvadesInGame()) {
                window.showStopCheatingOverlay("Synthetic Keyboard Input Injected via JavaScript (isTrusted=false).");
            }
        }
    };

    window.addEventListener("keydown", blockUntrustedEvents, true);

    // Global Key Listener: ESC to toggle menu, F5 to reload, F11 for fullscreen, and freeze game inputs when in menu
    window.addEventListener("keydown", (e) => {
        // Block DevTools shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C)
        if (e.key === "F12" || (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c"))) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return;
        }

        if (e.key === "Escape") {
            if (window._chrono_is_binding_key) {
                return;
            }
            if (window._chrono_hud_editing) {
                if (typeof window.closeHudLayoutEditor === "function") window.closeHudLayoutEditor(false);
                else if (typeof closeHudLayoutEditor === "function") closeHudLayoutEditor(false);
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            const activeTag = document.activeElement ? document.activeElement.tagName : "";
            if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
                document.activeElement.blur();
            }
            if (typeof toggleChronoMenu === "function") {
                toggleChronoMenu();
            } else if (typeof window.toggleChronoMenu === "function") {
                window.toggleChronoMenu();
            } else if (window.Chrono && window.Chrono.Settings && typeof window.Chrono.Settings.toggle === "function") {
                window.Chrono.Settings.toggle();
            }
            e.preventDefault();
            e.stopPropagation();
            return;
        } else if (e.key === "F5") {
            location.reload();
            return;
        } else if (e.key === "F11") {
            e.preventDefault();
            e.stopPropagation();
            currentConfig.flag_fullscreen = !currentConfig.flag_fullscreen;
            if (window.ipc) {
                window.ipc.postMessage(JSON.stringify({ action: "save_config", config: currentConfig }));
                window.ipc.postMessage(JSON.stringify({ action: "set_fullscreen", value: currentConfig.flag_fullscreen }));
            }
            const f11Banner = document.getElementById("chrono-f11-banner");
            if (f11Banner) f11Banner.style.display = "block";
            return;
        }

        if (isAnyMenuOpen()) {
            if (window._chrono_is_binding_key) return;
            const inGameModal = document.getElementById("modal");
            if (inGameModal && inGameModal.contains(document.activeElement)) {
                return;
            }
            const activeTag = document.activeElement ? document.activeElement.tagName : "";
            if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") {
                e.stopPropagation();
                return;
            }
            if (e.key === "Tab") return;
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }, true);

    window.addEventListener("keyup", (e) => {
        if (isAnyMenuOpen()) {
            if (window._chrono_is_binding_key) return;
            const inGameModal = document.getElementById("modal");
            if (inGameModal && inGameModal.contains(document.activeElement)) {
                return;
            }
            const activeTag = document.activeElement ? document.activeElement.tagName : "";
            if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") {
                e.stopPropagation();
                return;
            }
            if (e.key === "Escape" || e.key === "F5") return;
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }, true);

    // ── Update Notification Banner (checked natively by Rust) ──
    const UPDATE_NOTICE_VER = typeof __CHRONO_UPDATE_NOTICE_VER !== 'undefined' ? __CHRONO_UPDATE_NOTICE_VER : null;
    if (UPDATE_NOTICE_VER) {
        const banner = document.createElement("div");
        banner.id = "chrono-update-notice";
        banner.style.position = "fixed";
        banner.style.top = "12px";
        banner.style.left = "50%";
        banner.style.transform = "translateX(-50%)";
        banner.style.backgroundColor = "rgba(7, 26, 23, 0.95)";
        banner.style.border = "1px solid #10b981";
        banner.style.boxShadow = "0 8px 30px rgba(16, 185, 129, 0.4)";
        banner.style.borderRadius = "8px";
        banner.style.padding = "8px 16px";
        banner.style.color = "#ffffff";
        banner.style.fontFamily = "sans-serif";
        banner.style.fontSize = "13px";
        banner.style.fontWeight = "bold";
        banner.style.display = "flex";
        banner.style.alignItems = "center";
        banner.style.gap = "12px";
        banner.style.zIndex = "99999999";
        banner.style.backdropFilter = "blur(8px)";
        banner.innerHTML = `<span>🚀 New version <b>v${UPDATE_NOTICE_VER}</b> available on GitHub!</span> <button style="background:#10b981;border:none;color:#000;padding:4px 10px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:12px;transition:0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'" onclick="window.open('https://github.com/Vixcra/ChronoClient', '_blank');">Open GitHub</button> <span style="cursor:pointer;opacity:0.6;font-size:16px;margin-left:4px;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'" onclick="this.parentElement.remove()">✕</span>`;
        
        const mount = () => {
            if (document.body) {
                document.body.appendChild(banner);
            } else {
                setTimeout(mount, 200);
            }
        };
        mount();
    }

    window.Chrono.Core = {
        fpsDiv: fpsDiv,
        isEvadesInGame: isEvadesInGame,
        isAnyMenuOpen: isAnyMenuOpen,
        isPlayerSpectating: isPlayerSpectating,
        getEvadesPlayerName: getEvadesPlayerName
    };

    window.isEvadesInGame = isEvadesInGame;
    window.isPlayerSpectating = isPlayerSpectating;
    window.getEvadesPlayerName = getEvadesPlayerName;
} catch(err) {
    console.error("[Aesir::Core Error]", err);
}
})();
