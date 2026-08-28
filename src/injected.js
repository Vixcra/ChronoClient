(function() {
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
            const fps = Math.round((frameCount * 1000) / elapsed);
            fpsDiv.innerText = fps + " FPS (" + MONITOR_HZ + "Hz VSync)";
            if (fps >= 120) {
                fpsDiv.style.color = "#34d399";
            } else if (fps >= 60) {
                fpsDiv.style.color = "#38bdf8";
            } else {
                fpsDiv.style.color = "#f87171";
            }
            frameCount = 0;
            lastHudTime = now;
        }
        requestAnimationFrame(countFps);
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
    };

    let chronoEnemyOverrides = {};
    try {
        chronoEnemyOverrides = JSON.parse(localStorage.getItem("chrono_enemy_overrides") || "{}");
    } catch(e) {}

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
            { id: "enforcing", name: "Enforcing", color: "#590016" }
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
            { id: "wind_ghost", name: "WindGhost", color: "#9de3c6" }
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
            { id: "snowman", name: "Snowman", color: "#ffffff" }
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
    };;
    const enemyToFamilyMap = {};
    const colorToEnemyMap = {};
    const ALL_EXACT_ENEMY_COLORS = {"aibot": "#00b585", "barrier": "#29ffc6", "blind": "#96c6ec", "blocking": "#bf5213", "cactus": "#5b8e28", "charging": "#374037", "confectioner": "#8771f2", "confectioner_switch": "#cfc6f9", "corrosive": "#00eb00", "corrosive_sniper": "#61ff61", "crumbling": "#bd9476", "cybot": "#926be3", "cycling": "#91bbff", "dabot": "#3d006e", "dasher": "#003c66", "dasher_switch": "#00243d", "disabling": "#a87c86", "disabling_ghost": "#ffbfce7f", "disarming": "#a377a3", "dorito": "#05dad1", "dorito_switch": "#9bf0ec", "draining": "#0000ff", "dripping": "#100812", "eabot": "#b07331", "elbot": "#daff1f", "electrical": "#2fded7", "enforcing": "#590016", "enlarging": "#4d0163", "experience_drain": "#b19cd9", "fibot": "#e88409", "firefly": "#f0841f", "fire_trail": "#cf5504", "flaming": "#aa2f2f", "flower": "#e8e584", "force_sniper_a": "#0a5557", "force_sniper_b": "#914d83", "freezing": "#64c1b9", "frost_giant": "#7e7cd6", "glowy": "#ede658", "grass": "#75eb26", "gravity": "#78148c", "gravity_ghost": "#78148c", "homing": "#966e14", "homing_switch": "#694d0e", "icbot": "#1bc8e3", "ice_ghost": "#be89ff", "ice_sniper": "#8300ff", "icicle": "#adf8ff", "immune": "#000000", "infectious": "#eb00eb", "infinity": "#ff69c5", "infinity_switch": "#ffb4e2", "lava": "#f78306", "lead_sniper": "#788898", "libot": "#fff9bd", "liquid": "#6789ef", "lost_soul": "#bed0d1", "lotus_flower": "#dedede", "lunging": "#c88250", "lurching": "#5d4d5d", "magnetic_nullification": "#642374", "magnetic_reduction": "#bd67d2", "mebot": "#b55b31", "mist": "#b686db", "multisniper": "#8a8769", "mutating": "#211513", "negative_magnetic_ghost": "#6f59ff", "negative_magnetic_sniper": "#a496ff", "network_error": "#e1e1e10c", "ninja_star_sniper": "#dedede", "normal": "#939393", "oscillating": "#869e0f", "oscillating_switch": "#b6c46f", "penny": "#c38b32", "penny_switch": "#d9b67f", "phantom": "#86d7db", "plbot": "#18ed3f", "poison_ghost": "#590174", "poison_sniper": "#8c01b7", "positive_magnetic_ghost": "#e3001e", "positive_magnetic_sniper": "#ff3852", "powered": "#c2c2c2", "prediction_sniper": "#d14f84", "pumpkin": "#e26110", "quicksand": "#6c541e", "radar": "#c90000", "radiating_bullets": "#d3134f", "reducing": "#2d3237", "regen_ghost": "#32e3ae", "regen_sniper": "#00cc8e", "repelling": "#7b9db2", "repelling_ghost": "#7b9db2", "residue": "#675327", "ring_sniper": "#b5deeb", "robo_scanner_summoner_blind": "#96c6ec66", "sandrock": "#a57a6d", "sand": "#d5ae7f", "seedling": "#259c55", "sizing": "#f27743", "slasher": "#363636", "slippery": "#1aacbf", "slowing": "#ff0000", "sniper": "#a05353", "snowman": "#ffffff", "sparking": "#ffbe6e", "speed_ghost": "#fca330", "speed_sniper": "#ff9000", "spiral": "#e8b500", "spiral_switch": "#f5e199", "stalactite": "#302519", "star": "#faf46e", "static": "#f5a462", "stumbling": "#7d487f", "summoner": "#91bbff", "superstar": "#ffffff", "switch": "#565656", "teleporting": "#ecc4ef", "thunderbolt": "#f4ff8c", "toxic": "#00c700", "tree": "#4e2700", "trisniper": "#63464b", "turning": "#336600", "vengeful_soul": "#96b1b3", "void_crawler": "#1c0a2d", "void_drain": "#261235", "void_sniper": "#40144b", "void_swarm": "#393042", "wabot": "#319bb0", "wacky_wall": "#332233", "wall": "#222222", "wavy": "#dd2606", "wavy_switch": "#fa5336", "wind_ghost": "#9de3c6", "wind_sniper": "#9de3c6", "withering": "#752656", "zigzag": "#b371f2", "zigzag_switch": "#e0c6f9", "zoning": "#a03811", "zoning_switch": "#b35f40"};

    for (const [fam, list] of Object.entries(CHRONO_ENEMY_CATALOG)) {
        for (const en of list) {
            enemyToFamilyMap[en.id] = fam;
        }
    }
    // Sync window.pal dynamically via getter/setter interception
    if (typeof window !== "undefined") {
        let internalPal = {};
        Object.defineProperty(window, 'pal', {
            get: function() { return internalPal; },
            set: function(val) {
                internalPal = val;
                for (const [enemyName, hexColor] of Object.entries(internalPal)) {
                    colorToEnemyMap[hexColor.toLowerCase()] = enemyName;
                }
            }
        });
    }
    
    // Initial static mapping fallback
    for (const [enemyName, hexColor] of Object.entries(ALL_EXACT_ENEMY_COLORS)) {
        colorToEnemyMap[hexColor.toLowerCase()] = enemyName;
    }

    const origStroke = CanvasRenderingContext2D.prototype.stroke;
    CanvasRenderingContext2D.prototype.stroke = function() {
        if (enemyOutlineMode !== "default" && this.lineWidth === enemyOutlineWidth && typeof this.strokeStyle === "string") {
            const ss = this.strokeStyle.toLowerCase();
            const enemyId = colorToEnemyMap[ss];
            if (enemyId) {
                const familyId = enemyToFamilyMap[enemyId];
                let customCol = null;
                
                // Priority 1: Individual Override
                if (chronoEnemyOverrides[enemyId]) {
                    customCol = chronoEnemyOverrides[enemyId];
                } 
                // Priority 2: Family Override
                else if (familyId && chronoEnemyOverrides[familyId]) {
                    customCol = chronoEnemyOverrides[familyId];
                }
                // Priority 3: Global Outline Color (if chroma)
                else if (enemyOutlineMode === "chroma") {
                    customCol = enemyOutlineColor;
                }

                if (customCol) {
                    const oldColor = this.strokeStyle;
                    const oldShadow = this.shadowColor;
                    const oldBlur = this.shadowBlur;
                    
                    this.strokeStyle = customCol;
                    this.shadowColor = customCol;
                    this.shadowBlur = enemyOutlineGlow;
                    
                    origStroke.apply(this, arguments);
                    
                    this.strokeStyle = oldColor;
                    this.shadowColor = oldShadow;
                    this.shadowBlur = oldBlur;
                    return;
                }
            }
        }
        origStroke.apply(this, arguments);
    };


    // ── Exact Evades Fading Effects & Pre-Attack Visual Engine ──
    if (!window._chrono_visuals_hooked && typeof CanvasRenderingContext2D !== "undefined") {
        window._chrono_visuals_hooked = true;

        let lastArcData = null;

        // 1. Hook arc: Track all circular enemy paths
        const origArc = CanvasRenderingContext2D.prototype.arc;
        CanvasRenderingContext2D.prototype.arc = function(x, y, radius, startAngle, endAngle, counterclockwise) {
            if (this.canvas && (this.canvas.id === "game" || this.canvas.id === "canvas" || this.canvas.width > 300)) {
                if (radius >= 10 && Math.abs(endAngle - startAngle) >= Math.PI * 1.8) {
                    lastArcData = { x, y, radius, ctx: this };
                } else {
                    lastArcData = null;
                }
            }
            return origArc.apply(this, arguments);
        };

        // 2. Hook fill: Target the exact Evades fadingEffects & releaseTime tell calls
        const origFill = CanvasRenderingContext2D.prototype.fill;
        CanvasRenderingContext2D.prototype.fill = function(...args) {
            if (lastArcData && lastArcData.ctx === this && typeof this.fillStyle === "string") {
                const arc = lastArcData;
                const fs = this.fillStyle.trim();

                // ── 1. SNIPER / PROJECTILE EMITTER PRE-FIRE TELL (Evades exact: rgba(1, 1, 1, t)) ──
                if (fs.startsWith("rgba(1, 1, 1,") || fs.startsWith("rgba(1,1,1,")) {
                    // Extract t: ranges from 0.05 (500ms left) to 0.25 (0ms left / firing!)
                    const m = fs.match(/[\d.]+/g);
                    const t = (m && m.length >= 4) ? parseFloat(m[3]) : 0.15;
                    const progress = Math.min(1.0, Math.max(0.05, (t - 0.05) / 0.20));

                    this.save();

                    // Fill with vibrant charging color instead of invisible black
                    this.fillStyle = "rgba(255, 45, 85, " + (0.15 + progress * 0.45) + ")";
                    this.shadowColor = "#ff0055";
                    this.shadowBlur = 14;
                    origFill.apply(this, args);

                    // A. Outer Pulsing Warning Ring
                    this.beginPath();
                    this.arc(arc.x, arc.y, arc.radius + 4, 0, Math.PI * 2);
                    this.lineWidth = 2.5;
                    if (progress < 0.5) {
                        this.strokeStyle = "rgba(255, 170, 0, 0.85)"; // Amber (500-250ms)
                        this.shadowColor = "#ffaa00";
                        this.shadowBlur = 8;
                    } else if (progress < 0.82) {
                        this.strokeStyle = "rgba(255, 70, 0, 0.95)"; // Electric Orange (250-90ms)
                        this.shadowColor = "#ff4600";
                        this.shadowBlur = 14;
                    } else {
                        // IMMINENT SHOT (Rapid Flashing White / Red Strobe in final 90ms!)
                        const flash = (Math.floor(performance.now() / 60) % 2 === 0);
                        this.strokeStyle = flash ? "#ffffff" : "#ff0055";
                        this.shadowColor = "#ff0055";
                        this.shadowBlur = 20;
                        this.lineWidth = 3.5;
                    }
                    origStroke.call(this);

                    // B. 360° Clockwise Countdown Progress Arc
                    this.beginPath();
                    const startAngle = -Math.PI / 2; // 12 o'clock
                    const endAngle = startAngle + (Math.PI * 2 * progress);
                    this.arc(arc.x, arc.y, arc.radius + 7.5, startAngle, endAngle);
                    this.lineWidth = 3.0;
                    this.strokeStyle = progress > 0.82 ? "#ff0055" : (progress > 0.5 ? "#ff9f1a" : "#00f2fe");
                    this.shadowColor = this.strokeStyle;
                    this.shadowBlur = 10;
                    origStroke.call(this);

                    // C. Core Flash in final 150ms
                    if (progress >= 0.75) {
                        this.beginPath();
                        this.arc(arc.x, arc.y, arc.radius * 0.45, 0, Math.PI * 2);
                        this.fillStyle = "rgba(255, 255, 255, 0.92)";
                        this.shadowColor = "#ff0055";
                        this.shadowBlur = 16;
                        origFill.call(this);
                    }

                    this.restore();
                    return;
                }

                // ── 2. SWITCH ENEMY FADING TELL (Evades exact: rgba(25, 25, 25, t) & rgba(127, 127, 127, t)) ──
                if (fs.startsWith("rgba(25, 25, 25,") || fs.startsWith("rgba(25,25,25,") ||
                    fs.startsWith("rgba(127, 127, 127,") || fs.startsWith("rgba(127,127,127,")) {
                    this.save();
                    this.beginPath();
                    this.arc(arc.x, arc.y, arc.radius + 3.5, 0, Math.PI * 2);
                    this.lineWidth = 2.5;
                    this.strokeStyle = "rgba(56, 189, 248, 0.85)"; // Electric Cyan
                    this.shadowColor = "#38bdf8";
                    this.shadowBlur = 10;
                    origStroke.call(this);
                    this.restore();
                }

                // ── 3. SLASHER ATTACK TELL (Evades exact: rgba(i, i, i, r) with i between 54 and 120) ──
                const m = fs.match(/\d+/g);
                if (m && m.length >= 4) {
                    const r = parseInt(m[0]), g = parseInt(m[1]), b = parseInt(m[2]);
                    if (r === g && g === b && r >= 54 && r <= 120) {
                        const slashProg = (r - 54) / 66; // 0.0 to 1.0
                        this.save();

                        this.beginPath();
                        this.arc(arc.x, arc.y, arc.radius + 4, 0, Math.PI * 2);
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

                        // 360° Countdown Arc
                        this.beginPath();
                        const startAngle = -Math.PI / 2;
                        const endAngle = startAngle + (Math.PI * 2 * slashProg);
                        this.arc(arc.x, arc.y, arc.radius + 7.5, startAngle, endAngle);
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

        // 3. Hook stroke for Enemy Outlines & High-Visibility Edges
        const origStroke = CanvasRenderingContext2D.prototype.stroke;
        CanvasRenderingContext2D.prototype.stroke = function(...args) {
            if (enemyOutlineMode !== "default" && typeof this.strokeStyle === "string") {
                const st = this.strokeStyle.toLowerCase().trim();
                const isStandardOutline = (st === "#000000" || st === "#000" || st === "black" ||
                    st === "#ffffff" || st === "#fff" || st === "white" ||
                    st === "rgb(0, 0, 0)" || st === "rgb(0,0,0)" ||
                    st === "rgb(255, 255, 255)" || st === "rgb(255,255,255)" ||
                    st.startsWith("rgba(0, 0, 0") || st.startsWith("rgba(0,0,0") ||
                    st.startsWith("rgba(255, 255, 255") || st.startsWith("rgba(255,255,255"));

                if (isStandardOutline) {
                    const prevStyle = this.strokeStyle;
                    const prevWidth = this.lineWidth;
                    const prevShadowColor = this.shadowColor;
                    const prevShadowBlur = this.shadowBlur;

                    if (enemyOutlineMode === "chrono") {
                        this.strokeStyle = "#34d399";
                        this.shadowColor = "#10b981";
                        this.shadowBlur = 8;
                        this.lineWidth = Math.max(prevWidth || 1.5, 2.5);
                    } else if (enemyOutlineMode === "volcano") {
                        this.strokeStyle = "#ef4444";
                        this.shadowColor = "#f97316";
                        this.shadowBlur = 10;
                        this.lineWidth = Math.max(prevWidth || 1.5, 2.5);
                    } else if (enemyOutlineMode === "rainbow") {
                        const hue = Math.floor((performance.now() / 8) % 360);
                        this.strokeStyle = "hsl(" + hue + ", 100%, 55%)";
                        this.shadowColor = "hsl(" + hue + ", 100%, 50%)";
                        this.shadowBlur = 8;
                        this.lineWidth = Math.max(prevWidth || 1.5, 2.5);
                    } else if (enemyOutlineMode === "smart") {
                        let r=0, g=0, b=0;
                        let f = this.fillStyle;
                        if (typeof f === 'string') {
                            if (f.startsWith('#')) {
                                if (f.length === 4) {
                                    r = parseInt(f[1]+f[1], 16);
                                    g = parseInt(f[2]+f[2], 16);
                                    b = parseInt(f[3]+f[3], 16);
                                } else {
                                    r = parseInt(f.substring(1,3), 16);
                                    g = parseInt(f.substring(3,5), 16);
                                    b = parseInt(f.substring(5,7), 16);
                                }
                            } else if (f.startsWith('rgb')) {
                                let parts = f.match(/\\d+/g);
                                if (parts && parts.length >= 3) {
                                    r = parseInt(parts[0]);
                                    g = parseInt(parts[1]);
                                    b = parseInt(parts[2]);
                                }
                            }
                        }
                        let lum = 0.299*r + 0.587*g + 0.114*b;
                        this.strokeStyle = lum > 127 ? "#000000" : "#ffffff";
                        this.shadowBlur = 0;
                        this.lineWidth = Math.max(prevWidth || 1.5, 2.5);
                    } else if (enemyOutlineMode === "custom") {
                        this.strokeStyle = enemyOutlineColor || "#34d399";
                        if (enemyOutlineGlow > 0) {
                            this.shadowColor = enemyOutlineColor || "#34d399";
                            this.shadowBlur = enemyOutlineGlow;
                        }
                        this.lineWidth = Math.max(prevWidth || 1.5, enemyOutlineWidth || 2.0);
                    }

                    origStroke.apply(this, args);

                    this.strokeStyle = prevStyle;
                    this.lineWidth = prevWidth;
                    this.shadowColor = prevShadowColor;
                    this.shadowBlur = prevShadowBlur;
                    return;
                }
            }
            return origStroke.apply(this, args);
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

    // 3. Remove Floating Trigger Button (Clean UI, ESC / ⏳ used instead)

    // 4. Pop-up Modal Container with Nordic Emerald Style (Hub / Settings)
    const menuContainer = document.createElement("div");
    menuContainer.id = "chrono-menu-modal";
    menuContainer.style.display = "none";
    menuContainer.style.position = "fixed";
    menuContainer.style.top = "0";
    menuContainer.style.left = "0";
    menuContainer.style.width = "100vw";
    menuContainer.style.height = "100vh";
    menuContainer.style.backgroundColor = "rgba(2, 10, 8, 0.75)";
    menuContainer.style.backdropFilter = "blur(12px)";
    menuContainer.style.webkitBackdropFilter = "blur(12px)";
    menuContainer.style.zIndex = "10000000";
    menuContainer.style.justifyContent = "center";
    menuContainer.style.alignItems = "center";
    menuContainer.style.fontFamily = "system-ui, -apple-system, sans-serif";

    menuContainer.innerHTML = 
        '<div id="chrono-modal-card" style="' +
            'width: 660px; max-width: 95vw; max-height: 90vh;' +
            'background: linear-gradient(145deg, #071311 0%, #0d2824 45%, #051815 100%);' +
            'border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 16px;' +
            'box-shadow: 0 25px 60px rgba(2, 8, 7, 0.95), 0 0 35px rgba(16, 185, 129, 0.25);' +
            'display: flex; flex-direction: column; overflow: hidden; color: #f8fafc;' +
        '">' +
            '<!-- Modal Header -->' +
            '<div style="' +
                'padding: 14px 22px; background: linear-gradient(90deg, rgba(5, 150, 105, 0.5) 0%, rgba(6, 78, 59, 0.3) 100%);' +
                'border-bottom: 1px solid rgba(16, 185, 129, 0.25); display: flex; align-items: center; justify-content: space-between;' +
            '">' +
                '<div style="display: flex; align-items: center; gap: 10px;">' +
                    '<span style="font-size: 22px;">⏳</span>' +
                    '<div>' +
                        '<div style="font-weight: 800; font-size: 16px; letter-spacing: 0.5px; background: linear-gradient(90deg, #6ee7b7, #34d399, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">CHRONO CLIENT HUB</div>' +
                        '<div style="font-size: 11px; color: #a7f3d0;">Nordic Engine • <span style="color: #34d399; font-weight: bold;">v1.0.0</span></div>' +
                    '</div>' +
                '</div>' +
                '<button id="chrono-close-btn" style="' +
                    'background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15);' +
                    'color: #cbd5e1; width: 28px; height: 28px; border-radius: 50%; cursor: pointer;' +
                    'display: flex; align-items: center; justify-content: center; font-size: 14px;' +
                '">✕</button>' +
            '</div>' +

            '<!-- Restart Alert Banner -->' +
            '<div id="chrono-restart-banner" style="display: none; background: rgba(234, 179, 8, 0.2); border-bottom: 1px solid rgba(234, 179, 8, 0.5); color: #fde047; padding: 6px 16px; font-size: 11px; font-weight: 600; text-align: center;">' +
                '⚠️ Settings saved! Please restart Chrono client to apply startup flags & rendering backend.' +
            '</div>' +
            '<div id="chrono-f11-banner" style="display: none; background: rgba(52, 211, 153, 0.2); border-bottom: 1px solid rgba(52, 211, 153, 0.5); color: #6ee7b7; padding: 6px 16px; font-size: 11px; font-weight: 600; text-align: center;">' +
                '✅ You can also press <b>F11</b> in-game to toggle Fullscreen at any time!' +
            '</div>' +

            '<!-- Tabs Navigation -->' +
            '<div style="display: flex; background: rgba(5, 20, 18, 0.7); padding: 6px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); gap: 6px; flex-wrap: wrap;">' +
                '<button id="chrono-tab-client" style="' +
                    'background: linear-gradient(135deg, #059669, #10b981); border: 1px solid rgba(110, 231, 183, 0.4);' +
                    'color: #ffffff; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer;' +
                '">🛡️ Client Info</button>' +
                '<button id="chrono-tab-flags" style="' +
                    'background: transparent; border: 1px solid transparent; color: #94a3b8;' +
                    'padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer;' +
                '">🚩 Flags Engine</button>' +
                '<button id="chrono-tab-experimental" style="' +
                    'background: transparent; border: 1px solid transparent; color: #c084fc;' +
                    'padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer;' +
                '">🧪 Experimental</button>' +
                '<button id="chrono-tab-alts" style="' +
                    'background: transparent; border: 1px solid transparent; color: #94a3b8;' +
                    'padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer;' +
                '">👥 Alt Switcher</button>' +
                '<button id="chrono-tab-modes" style="' +
                    'background: transparent; border: 1px solid transparent; color: #94a3b8;' +
                    'padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer;' +
                '">⏳ Chrono Hub</button>' +
                '<button id="chrono-tab-discord" style="' +
                    'background: transparent; border: 1px solid transparent; color: #94a3b8;' +
                    'padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer;' +
                '">🟣 Discord RPC</button>' +
                '<button id="chrono-tab-ui" style="' +
                    'background: transparent; border: 1px solid transparent; color: #94a3b8;' +
                    'padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer;' +
                '">🎨 UI Theme</button>' +
            '</div>' +

            '<!-- Content Area -->' +
            '<div style="padding: 16px 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 12px;">' +
                '<!-- TAB 1: CLIENT OVERVIEW -->' +
                '<div id="chrono-view-client" style="display: flex; flex-direction: column; gap: 12px;">' +
                    '<div style="background: rgba(7, 26, 23, 0.65); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 12px 14px;">' +
                        '<div style="font-weight: 700; font-size: 12px; color: #34d399; margin-bottom: 8px;">🛡️ ACTIVE ENGINE OPTIMIZATIONS (Hover for details)</div>' +
                        '<div id="chrono-active-flags-grid" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>' +
                    '</div>' +
                    '<div style="background: rgba(7, 26, 23, 0.65); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 12px 14px;">' +
                        '<div style="font-weight: 700; font-size: 12px; color: #34d399; margin-bottom: 8px;">📊 SYSTEM SPECS & RENDERING BACKEND</div>' +
                        '<div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px; color: #cbd5e1;">' +
                            '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                                '<span>Rendering Engine (Backend) :</span>' +
                                '<select id="chrono-select-engine" style="background: rgba(3, 15, 13, 0.9); border: 1px solid rgba(52, 211, 153, 0.5); color: #34d399; font-weight: bold; border-radius: 6px; padding: 4px 8px; font-size: 11px; outline: none; cursor: pointer;">' +
                                    '<option value="d3d11">DirectX 11 (D3D11 - Recommended)</option>' +
                                    '<option value="d3d11on12">DirectX 12 (D3D11on12 - Windows 10/11)</option>' +
                                    '<option value="d3d9">DirectX 9 (D3D9 - Legacy GPU)</option>' +
                                    '<option value="gl">OpenGL (Desktop GL)</option>' +
                                    '<option value="vulkan">Vulkan (Next-Gen Pipeline)</option>' +
                                    '<option value="warp">Software WARP (CPU Fallback)</option>' +
                                '</select>' +
                            '</div>' +
                            '<div style="display: flex; justify-content: space-between;"><span>Physical Display Clock :</span><span style="font-weight: bold; color: #34d399;">' + MONITOR_HZ + ' Hz</span></div>' +
                            '<div style="display: flex; justify-content: space-between;"><span>Client Architecture :</span><span style="font-weight: bold; color: #38bdf8;">Native Rust x86_64 + Wry / WebView2</span></div>' +
                        '</div>' +
                    '</div>' +
                    '<div style="background: rgba(7, 26, 23, 0.65); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 12px 14px;">' +
                        '<div style="font-weight: 700; font-size: 12px; color: #34d399; margin-bottom: 8px;">⌨️ CLIENT SHORTCUTS</div>' +
                        '<div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px; color: #cbd5e1;">' +
                            '<div style="display: flex; justify-content: space-between;"><span>Toggle Chrono Hub :</span><kbd style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #f8fafc;">Escape (ESC) / ⏳ Hourglass</kbd></div>' +
                            '<div style="display: flex; justify-content: space-between;"><span>Developer Console :</span><kbd style="background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.4); padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #7dd3fc;">F12 / Ctrl+Shift+I / Right-Click Inspect</kbd></div>' +
                            '<div style="display: flex; justify-content: space-between;"><span>Runs & Replays :</span><kbd style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #f8fafc;">⏪ Rewind Launcher</kbd></div>' +
                            '<div style="display: flex; justify-content: space-between;"><span>Community Leaderboard :</span><kbd style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #f8fafc;">⚔️ Vengeance Launcher</kbd></div>' +
                            '<div style="display: flex; justify-content: space-between;"><span>Quick Reload :</span><kbd style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #f8fafc;">F5</kbd></div>' +
                            '<div style="display: flex; justify-content: space-between;"><span>Toggle Fullscreen :</span><kbd style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #f8fafc;">F11</kbd></div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                '<!-- TAB 2: FLAGS ENGINE -->' +
                '<div id="chrono-view-flags" style="display: none; flex-direction: column; gap: 12px;">' +
                    '<!-- RESTART REQUIRED SECTION -->' +
                    '<div style="background: rgba(7, 26, 23, 0.65); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 12px 14px;">' +
                        '<div style="font-weight: 700; font-size: 12px; color: #4ade80; margin-bottom: 8px;">⭐ RESTART REQUIRED (Recommended Chromium Flags)</div>' +
                        '<div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px; color: #cbd5e1;">' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">' +
                                '<div><code style="color: #86efac;">--enable-highres-timer</code> : Windows sub-millisecond multimedia clock</div>' +
                                '<input type="checkbox" id="cfg-flag-highres-timer" style="accent-color: #10b981; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">' +
                                '<div><code style="color: #86efac;">--disable-background-timer-throttling</code> : Prevents timer throttling when backgrounded</div>' +
                                '<input type="checkbox" id="cfg-flag-anti-throttle" style="accent-color: #10b981; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">' +
                                '<div><code style="color: #86efac;">--disable-features=AudioServiceOutOfProcess</code> : In-process low-latency audio</div>' +
                                '<input type="checkbox" id="cfg-flag-audio-in-process" style="accent-color: #10b981; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">' +
                                '<div><code style="color: #86efac;">--enable-features=ResamplingScrollEvents</code> : Smooth hardware event pacing</div>' +
                                '<input type="checkbox" id="cfg-flag-resample-scroll" style="accent-color: #10b981; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">' +
                                '<div><code style="color: #86efac;">--enable-accelerated-2d-canvas</code> : Hardware 2D drawing pipeline</div>' +
                                '<input type="checkbox" id="cfg-flag-accelerated-canvas" style="accent-color: #10b981; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">' +
                                '<div><code style="color: #86efac;">--enable-gpu-rasterization</code> : Direct GPU tile rasterization</div>' +
                                '<input type="checkbox" id="cfg-flag-gpu-rasterization" style="accent-color: #10b981; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                        '</div>' +
                    '</div>' +

                    '<!-- IMMEDIATE REALTIME SECTION -->' +
                    '<div style="background: rgba(7, 26, 23, 0.65); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 12px 14px;">' +
                        '<div style="font-weight: 700; font-size: 12px; color: #38bdf8; margin-bottom: 8px;">⭐ IMMEDIATE / REALTIME (Live Runtime Hooks)</div>' +
                        '<div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px; color: #cbd5e1;">' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">' +
                                '<div><b style="color: #7dd3fc;">Anti-Freeze IPC Filter :</b> Live console log suppression in combat</div>' +
                                '<input type="checkbox" id="cfg-flag-anti-freeze-ipc" style="accent-color: #38bdf8; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">' +
                                '<div><b style="color: #7dd3fc;">Hardware VSync Frame Lock :</b> Real-time display refresh sync (' + MONITOR_HZ + ' FPS)</div>' +
                                '<input type="checkbox" id="cfg-flag-vsync-locked" style="accent-color: #38bdf8; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">' +
                                '<div><b style="color: #7dd3fc;">Nordic Emerald Custom Theme :</b> Live CSS stylesheet injection</div>' +
                                '<input type="checkbox" id="cfg-flag-custom-theme" style="accent-color: #38bdf8; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                        '</div>' +
                    '</div>' +

                    '<!-- HAZARDOUS FLAGS SECTION -->' +
                    '<div style="background: rgba(7, 26, 23, 0.65); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 12px 14px;">' +
                        '<div style="font-weight: 700; font-size: 12px; color: #f87171; margin-bottom: 8px;">⭐ QUIT CLIENT / HAZARDOUS (Black Screen & Destructive Flags)</div>' +
                        '<div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px; color: #cbd5e1;">' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">' +
                                '<div><code style="color: #fca5a5;">--single-process</code> : Single-process mode (prone to memory leaks)</div>' +
                                '<input type="checkbox" id="cfg-flag-single-process" style="accent-color: #f87171; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">' +
                                '<div><code style="color: #fca5a5;">--disable-gpu</code> : Software fallback (extreme lag)</div>' +
                                '<input type="checkbox" id="cfg-flag-disable-gpu" style="accent-color: #f87171; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">' +
                                '<div><code style="color: #fca5a5;">--in-process-gpu</code> : In-process GPU driver (causes black screen)</div>' +
                                '<input type="checkbox" id="cfg-flag-in-process-gpu" style="accent-color: #f87171; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">' +
                                '<div><code style="color: #fca5a5;">--no-sandbox</code> : Disable sandbox protection (hazardous)</div>' +
                                '<input type="checkbox" id="cfg-flag-no-sandbox" style="accent-color: #f87171; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                '<!-- TAB 2.5: EXPERIMENTAL & NETWORK OPTIMIZATIONS -->' +
                '<div id="chrono-view-experimental" style="display: none; flex-direction: column; gap: 12px;">' +
                    '<!-- SECTION 1: ULTRA-LOW INPUT LATENCY & SCHEDULER -->' +
                    '<div style="background: rgba(7, 26, 23, 0.65); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 12px; padding: 12px 14px;">' +
                        '<div style="font-weight: 700; font-size: 12px; color: #c084fc; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">' +
                            '<span>⚡ ULTRA-LOW INPUT LATENCY & SCHEDULER (Experimental)</span>' +
                        '</div>' +
                        '<div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px; color: #cbd5e1;">' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">' +
                                '<div><code style="color: #e9d5ff;">--disable-features=ResamplingInputEvents</code> : Instant raw mouse events (bypasses browser input resampling)</div>' +
                                '<input type="checkbox" id="cfg-flag-raw-input-no-resample" style="accent-color: #a855f7; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">' +
                                '<div><b style="color: #e9d5ff;">NtSetTimerResolution (0.5ms Clock) :</b> Forces Windows OS scheduler to 0.5ms (2000Hz) for zero-stutter VSync</div>' +
                                '<input type="checkbox" id="cfg-flag-windows-timer-resolution" style="accent-color: #a855f7; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">' +
                                '<div><code style="color: #e9d5ff;">--disable-frame-rate-limit</code> & <code style="color: #e9d5ff;">--disable-gpu-vsync</code> : Uncapped compositor rendering (ultra low presentation lag)</div>' +
                                '<input type="checkbox" id="cfg-flag-disable-frame-rate-limit" style="accent-color: #a855f7; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">' +
                                '<div><code style="color: #e9d5ff;">--enable-zero-copy</code> & <code style="color: #e9d5ff;">CanvasOopRasterization</code> : Zero-copy VRAM direct pipeline for 2D canvas</div>' +
                                '<input type="checkbox" id="cfg-flag-zero-copy-raster" style="accent-color: #a855f7; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                        '</div>' +
                    '</div>' +

                    '<!-- SECTION 2: WEBSOCKET & NETWORK LATENCY OPTIMIZATIONS (WITH WARNING BADGE ⚠️) -->' +
                    '<div style="background: rgba(7, 26, 23, 0.65); border: 1px solid rgba(234, 179, 8, 0.35); border-radius: 12px; padding: 12px 14px;">' +
                        '<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">' +
                            '<div style="font-weight: 700; font-size: 12px; color: #facc15; display: flex; align-items: center; gap: 6px;">' +
                                '<span>🌐 WEBSOCKET & NETWORK OPTIMIZATIONS</span>' +
                            '</div>' +
                            '<span style="background: rgba(234, 179, 8, 0.2); border: 1px solid rgba(234, 179, 8, 0.4); color: #fef08a; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">⚠️ NETWORK CAUTION</span>' +
                        '</div>' +

                        '<!-- Warning Notice -->' +
                        '<div style="background: rgba(234, 179, 8, 0.1); border-left: 3px solid #eab308; border-radius: 4px; padding: 8px 10px; margin-bottom: 10px; font-size: 11px; color: #fef08a; line-height: 1.4;">' +
                            '<b>⚠️ Network Caution Notice:</b> These options reduce jitter and TCP/WebSocket transit latency by enforcing immediate packet acknowledgement. Recommended for stable Ethernet or Wi-Fi 6 connections to prevent packet drops.' +
                        '</div>' +

                        '<div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px; color: #cbd5e1;">' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">' +
                                '<div><b style="color: #fef08a;">WebSocket ArrayBuffer Sync Mode :</b> Forces direct synchronous memory decoding without Blob async delay (0ms packet parse)</div>' +
                                '<input type="checkbox" id="cfg-flag-websocket-arraybuffer" style="accent-color: #eab308; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">' +
                                '<div><b style="color: #fef08a;">TCP_NODELAY & Delayed ACK Bypass :</b> Disables Nagle buffering and suppresses Windows 40-200ms Delayed ACK mechanism</div>' +
                                '<input type="checkbox" id="cfg-flag-tcp-nodelay-tuning" style="accent-color: #eab308; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                '<!-- TAB 3: ALT SWITCHER -->' +
                '<div id="chrono-view-alts" style="display: none; flex-direction: column; gap: 12px;">' +
                    '<div id="chrono-status-msg" style="display: none; padding: 8px 12px; border-radius: 8px; font-size: 12px; text-align: center; font-weight: 600;"></div>' +
                    '<div style="' +
                        'background: rgba(7, 26, 23, 0.65); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px;' +
                        'padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;' +
                    '">' +
                        '<div style="font-size: 11px; font-weight: 700; color: #6ee7b7; display: flex; justify-content: space-between; align-items: center;">' +
                            '<span>➕ ADD NEW ACCOUNT</span>' +
                            '<span style="font-size: 10px; color: #64748b;">100% Local encrypted storage</span>' +
                        '</div>' +
                        '<div style="display: flex; gap: 8px; flex-wrap: wrap;">' +
                            '<input id="chrono-input-user" type="text" placeholder="Username" style="flex: 1; min-width: 120px; background: rgba(3, 15, 13, 0.7); border: 1px solid rgba(52, 211, 153, 0.2); border-radius: 6px; color: #f8fafc; padding: 6px 10px; font-size: 12px; outline: none;"/>' +
                            '<input id="chrono-input-pass" type="password" placeholder="Password" style="flex: 1; min-width: 120px; background: rgba(3, 15, 13, 0.7); border: 1px solid rgba(52, 211, 153, 0.2); border-radius: 6px; color: #f8fafc; padding: 6px 10px; font-size: 12px; outline: none;"/>' +
                            '<input id="chrono-input-tag" type="text" placeholder="Tag (Main, Smurf)" style="width: 110px; background: rgba(3, 15, 13, 0.7); border: 1px solid rgba(52, 211, 153, 0.2); border-radius: 6px; color: #f8fafc; padding: 6px 10px; font-size: 12px; outline: none;"/>' +
                        '</div>' +
                        '<button id="chrono-btn-save-alt" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); border: 1px solid rgba(110, 231, 183, 0.3); color: #ffffff; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">💾 Save Account</button>' +
                    '</div>' +
                    '<div>' +
                        '<div style="font-size: 11px; font-weight: 700; color: #cbd5e1; margin-bottom: 6px; display: flex; justify-content: space-between;">' +
                            '<span>SAVED ACCOUNTS (<span id="chrono-alts-count">0</span>)</span>' +
                            '<button id="chrono-btn-guest" style="background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.15); color: #94a3b8; font-size: 10px; padding: 2px 8px; border-radius: 4px; cursor: pointer;">🎭 Guest Mode (Log Out)</button>' +
                        '</div>' +
                        '<div id="chrono-alts-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto; padding-right: 4px;"></div>' +
                    '</div>' +
                '</div>' +

                '<!-- TAB 4: CHRONO HUB -->' +
                '<div id="chrono-view-modes" style="display: none; flex-direction: column; gap: 12px;">' +
                    '<!-- CATEGORY 1: CUSTOM CURSOR -->' +
                    '<div style="background: rgba(7, 26, 23, 0.65); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">' +
                        '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                            '<span style="font-weight: 800; font-size: 13px; color: #34d399; display: flex; align-items: center; gap: 6px;">🎨 CUSTOM CURSOR</span>' +
                        '</div>' +
                        '<div style="font-size: 11px; color: #94a3b8;">Choose a pre-installed gaming crosshair or enter any image URL:</div>' +
                        '<div id="chrono-cursor-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px;"></div>' +
                        
                        '<!-- Custom Cursor Builder -->' +
                        '<div style="background: rgba(3, 15, 13, 0.75); border: 1px solid rgba(52, 211, 153, 0.25); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">' +
                            '<div style="font-weight: 700; font-size: 11px; color: #6ee7b7; display: flex; justify-content: space-between; align-items: center;">' +
                                '<span>🛠️ CURSOR BUILDER (Custom Shape & RGB)</span>' +
                                '<span id="chrono-cb-preview-host" style="width: 28px; height: 28px; background: rgba(0,0,0,0.5); border: 1px solid rgba(52,211,153,0.4); border-radius: 6px; display: flex; align-items: center; justify-content: center;"></span>' +
                            '</div>' +
                            '<div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">' +
                                '<select id="chrono-cb-shape" style="background: rgba(7, 26, 23, 0.9); border: 1px solid rgba(52, 211, 153, 0.4); color: #34d399; font-weight: bold; border-radius: 6px; padding: 4px 8px; font-size: 11px; outline: none;">' +
                                    '<option value="crosshair">➕ Crosshair (+)</option>' +
                                    '<option value="dot">● Precision Dot</option>' +
                                    '<option value="laser">⚡ Laser Beam</option>' +
                                    '<option value="ring">◎ Circle Reticle</option>' +
                                    '<option value="box">□ Tactical Box</option>' +
                                    '<option value="arrow">🏹 Arrow Pointer</option>' +
                                '</select>' +
                                '<div style="display: flex; align-items: center; gap: 4px;">' +
                                    '<span style="font-size: 10px; color: #94a3b8;">RGB Color:</span>' +
                                    '<input id="chrono-cb-color" type="color" value="#10b981" style="background: transparent; border: none; width: 28px; height: 24px; cursor: pointer;" />' +
                                '</div>' +
                                '<div style="display: flex; align-items: center; gap: 4px;">' +
                                    '<span style="font-size: 10px; color: #94a3b8;">Size:</span>' +
                                    '<input id="chrono-cb-size" type="range" min="16" max="44" value="28" style="width: 70px; accent-color: #10b981; cursor: pointer;" />' +
                                '</div>' +
                                '<button id="chrono-btn-apply-builder" style="background: linear-gradient(135deg, #059669, #10b981); border: 1px solid rgba(110, 231, 183, 0.4); color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; margin-left: auto;">✨ Apply Built</button>' +
                            '</div>' +
                        '</div>' +

                        '<div style="display: flex; gap: 8px; margin-top: 2px;">' +
                            '<input id="chrono-cursor-url-input" type="text" placeholder="Paste custom cursor URL (.png / .cur / .svg)..." style="flex: 1; background: rgba(3, 15, 13, 0.8); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 6px; color: #f8fafc; padding: 6px 10px; font-size: 11px; outline: none;" />' +
                            '<button id="chrono-btn-apply-cursor" style="background: linear-gradient(135deg, #059669, #10b981); border: 1px solid rgba(110, 231, 183, 0.3); color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">Apply URL</button>' +
                            '<button id="chrono-btn-reset-cursor" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); color: #cbd5e1; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">Default</button>' +
                        '</div>' +
                    '</div>' +

                    '<!-- CATEGORY 2: ENEMY OUTLINES & CHROMA -->' +
                    '<div style="background: rgba(7, 26, 23, 0.65); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">' +
                        '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                            '<span style="font-weight: 800; font-size: 13px; color: #f87171; display: flex; align-items: center; gap: 6px;">👾 ENEMY OUTLINES & CHROMA</span>' +
                            '<span style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; font-size: 9.5px; font-weight: 800; padding: 2px 7px; border-radius: 4px;">CANVAS 2D HOOK</span>' +
                        '</div>' +
                        '<div style="font-size: 11px; color: #94a3b8;">Customize enemy outline borders, colors, and neon glows in-game:</div>' +
                        '<div id="chrono-enemy-outline-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px;"></div>' +
                        
                        '<!-- Enemy Outline Builder -->' +
                        '<div style="background: rgba(3, 15, 13, 0.75); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">' +
                            '<div style="font-weight: 700; font-size: 11px; color: #fca5a5; display: flex; justify-content: space-between; align-items: center;">' +
                                '<span>🛠️ OUTLINE BUILDER (Custom Color, Width & Glow)</span>' +
                                '<span id="chrono-outline-preview-host" style="width: 32px; height: 32px; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; display: flex; align-items: center; justify-content: center;"></span>' +
                            '</div>' +
                            '<div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">' +
                                '<div style="display: flex; align-items: center; gap: 4px;">' +
                                    '<span style="font-size: 10px; color: #94a3b8;">Color:</span>' +
                                    '<input id="chrono-outline-color" type="color" value="#34d399" style="background: transparent; border: none; width: 28px; height: 24px; cursor: pointer;" />' +
                                '</div>' +
                                '<div style="display: flex; align-items: center; gap: 4px;">' +
                                    '<span style="font-size: 10px; color: #94a3b8;">Stroke Width:</span>' +
                                    '<input id="chrono-outline-width" type="range" min="1" max="6" step="0.5" value="2" style="width: 60px; accent-color: #ef4444; cursor: pointer;" />' +
                                '</div>' +
                                '<div style="display: flex; align-items: center; gap: 4px;">' +
                                    '<span style="font-size: 10px; color: #94a3b8;">Glow:</span>' +
                                    '<input id="chrono-outline-glow" type="range" min="0" max="20" step="1" value="8" style="width: 60px; accent-color: #ef4444; cursor: pointer;" />' +
                                '</div>' +
                                '<button id="chrono-btn-apply-outline" style="background: linear-gradient(135deg, #dc2626, #ef4444); border: 1px solid rgba(248, 113, 113, 0.4); color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; margin-left: auto;">✨ Apply Built</button>' +
                            '</div>' +
                        '</div>' +

                        '<!-- 2. Family Outline -->' +
                        '<div style="background: rgba(3, 15, 13, 0.75); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px;">' +
                            '<div style="font-weight: 700; font-size: 11px; color: #93c5fd; display: flex; justify-content: space-between; align-items: center;">' +
                                '<span>👥 2. OUTLINE BY ENEMY FAMILY (Priority 2)</span>' +
                            '</div>' +
                            '<div style="display: flex; gap: 8px; align-items: center;">' +
                                '<select id="chrono-fam-sel" style="flex: 1; padding: 5px 8px; background: #061815; color: #fff; border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 6px; font-size: 11px; outline: none;">' +
                                    '<option value="generic">Generic</option>' +
                                    '<option value="sniper">Sniper</option>' +
                                    '<option value="bot">Bot</option>' +
                                    '<option value="boss">Boss</option>' +
                                    '<option value="region1">Region 1</option>' +
                                    '<option value="region2">Region 2</option>' +
                                    '<option value="region3">Region 3</option>' +
                                    '<option value="region4">Region 4</option>' +
                                    '<option value="region5">Region 5</option>' +
                                    '<option value="region6">Region 6</option>' +
                                '</select>' +
                                '<input type="color" id="chrono-fam-col" value="#3b82f6" style="width: 32px; height: 28px; padding: 0; border: 1px solid #444; border-radius: 4px; cursor: pointer;" title="Set Family Override Color" />' +
                                '<button id="chrono-fam-reset" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #cbd5e1; padding: 4px 8px; border-radius: 6px; font-size: 10px; cursor: pointer;">Reset</button>' +
                            '</div>' +
                            '<div id="chrono-fam-preview" style="background: rgba(0,0,0,0.35); border-radius: 6px; padding: 6px 8px; font-size: 11px; min-height: 24px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">' +
                            '</div>' +
                        '</div>' +

                        '<!-- 3. Individual Enemy Outline with Search -->' +
                        '<div style="background: rgba(3, 15, 13, 0.75); border: 1px solid rgba(167, 139, 250, 0.3); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px;">' +
                            '<div style="font-weight: 700; font-size: 11px; color: #c4b5fd; display: flex; justify-content: space-between; align-items: center;">' +
                                '<span>🎯 3. OUTLINE BY INDIVIDUAL ENEMY (Priority 1)</span>' +
                            '</div>' +
                            '<div style="display: flex; gap: 8px; align-items: center;">' +
                                '<input id="chrono-ind-search" type="text" placeholder="🔍 Type enemy name (e.g. wall, flower, icicle)..." style="flex: 1; padding: 5px 8px; background: #061815; color: #fff; border: 1px solid rgba(167, 139, 250, 0.4); border-radius: 6px; font-size: 11px; outline: none;" />' +
                            '</div>' +
                            '<div style="display: flex; gap: 8px; align-items: center;">' +
                                '<select id="chrono-ind-sel" style="flex: 1; padding: 5px 8px; background: #061815; color: #fff; border: 1px solid rgba(167, 139, 250, 0.4); border-radius: 6px; font-size: 11px; outline: none;">' +
                                '</select>' +
                                '<input type="color" id="chrono-ind-col" value="#a78bfa" style="width: 32px; height: 28px; padding: 0; border: 1px solid #444; border-radius: 4px; cursor: pointer;" title="Set Individual Override Color" />' +
                                '<button id="chrono-ind-reset" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #cbd5e1; padding: 4px 8px; border-radius: 6px; font-size: 10px; cursor: pointer;">Reset</button>' +
                            '</div>' +
                            '<div id="chrono-ind-preview" style="background: rgba(0,0,0,0.35); border-radius: 6px; padding: 6px 8px; font-size: 11px; min-height: 24px; display: flex; align-items: center;">' +
                                '<span style="color: #888; font-style: italic;">Select or search an enemy above</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +

                    '<!-- CATEGORY 3: SCRIPT LAUNCHER -->' +
                    '<div style="background: rgba(7, 26, 23, 0.65); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 12px;">' +
                        '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                            '<span style="font-weight: 800; font-size: 13px; color: #38bdf8; display: flex; align-items: center; gap: 6px;">⚡ SCRIPT LAUNCHER & HUD ENGINE</span>' +
                            '<span style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; font-size: 9.5px; font-weight: 800; padding: 2px 7px; border-radius: 4px;">JAVASCRIPT / SCRIPTS FOLDER</span>' +
                        '</div>' +
                        '<div style="font-size: 11px; color: #cbd5e1; font-weight: 700;">📦 Built-in Community Mods :</div>' +
                        '<div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px; color: #cbd5e1;">' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; background: rgba(3, 15, 13, 0.6); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.06); cursor: pointer;">' +
                                '<div><b style="color: #6ee7b7;">⌨️ Live Keystrokes HUD :</b> Dynamic keys synced with game keybinds & loadouts</div>' +
                                '<input type="checkbox" id="chrono-mod-keystrokes" style="accent-color: #10b981; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                            '<button id="chrono-btn-open-hud-editor" style="background: linear-gradient(135deg, #059669, #10b981); border: 1px solid rgba(110, 231, 183, 0.4); color: #fff; padding: 9px 14px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; margin: 2px 0;">🎛️ OPEN HUD LAYOUT EDITOR (Opaque Grid & Resizing)</button>' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; background: rgba(3, 15, 13, 0.6); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.06); cursor: pointer;">' +
                                '<div><b style="color: #6ee7b7;">💬 Quick Chat Macro :</b> Press G for "gg", Keys 1-4 for instant chat calls</div>' +
                                '<input type="checkbox" id="chrono-mod-chatmacro" style="accent-color: #10b981; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                            '<label style="display: flex; align-items: center; justify-content: space-between; background: rgba(3, 15, 13, 0.6); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.06); cursor: pointer;">' +
                                '<div><b style="color: #6ee7b7;">🎯 Canvas Pixel-Sharp Mode :</b> Disables image blur for crisp pixels</div>' +
                                '<input type="checkbox" id="chrono-mod-pixelsharp" style="accent-color: #10b981; width: 16px; height: 16px; cursor: pointer;" />' +
                            '</label>' +
                        '</div>' +
                        '<div style="margin-top: 4px; display: flex; flex-direction: column; gap: 8px;">' +
                        '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                            '<div style="font-weight: 700; font-size: 11.5px; color: #94a3b8; display: flex; align-items: center; gap: 6px;">' +
                            '<span>📁 SCRIPTS FOLDER :</span>' +
                                '<span id="chrono-scripts-count-badge" style="background: rgba(52, 211, 153, 0.15); color: #34d399; font-size: 9.5px; padding: 1px 6px; border-radius: 4px;">...</span>' +
                            '</div>' +
                            '<button id="chrono-btn-open-scripts-dir" style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); color: #38bdf8; padding: 4px 10px; border-radius: 6px; font-size: 10.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">📂 Open scripts/ Folder</button>' +
                        '</div>' +
                        '<div style="font-size: 10px; color: #64748b;">Drop your <code>.js</code> mods into the <code>scripts/</code> folder. Toggle ON/OFF at any time without reloading!</div>' +
                    '</div>' +
                    '<div id="chrono-user-scripts-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto;"></div>' +
                '</div>' +
            '</div>' +

            '<!-- TAB 5: DISCORD RPC -->' +
            '<div id="chrono-view-ui" style="display: none; flex-direction: column; gap: 12px;">' +
                '<div style="background: rgba(7, 26, 23, 0.65); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 12px 14px;">' +
                    '<div style="font-weight: 700; font-size: 12px; color: #34d399; margin-bottom: 12px;">🎨 UI COLORS &amp; LOGO CUSTOMIZATION</div>' +
                    '<div style="display: flex; flex-direction: column; gap: 10px; font-size: 11px; color: #cbd5e1;">' +
                        '<div style="display: flex; align-items: center; justify-content: space-between;"><span>Main Background (Dark):</span> <input type="color" id="chrono-ui-bg1" style="width:60px;height:24px;border:none;border-radius:4px;cursor:pointer;"></div>' +
                        '<div style="display: flex; align-items: center; justify-content: space-between;"><span>Secondary Background:</span> <input type="color" id="chrono-ui-bg2" style="width:60px;height:24px;border:none;border-radius:4px;cursor:pointer;"></div>' +
                        '<div style="display: flex; align-items: center; justify-content: space-between;"><span>Primary Accent:</span> <input type="color" id="chrono-ui-acc1" style="width:60px;height:24px;border:none;border-radius:4px;cursor:pointer;"></div>' +
                        '<div style="display: flex; align-items: center; justify-content: space-between;"><span>Secondary Accent:</span> <input type="color" id="chrono-ui-acc2" style="width:60px;height:24px;border:none;border-radius:4px;cursor:pointer;"></div>' +
                        '<div style="display: flex; align-items: center; justify-content: space-between;"><span>Highlight/Hover:</span> <input type="color" id="chrono-ui-acc3" style="width:60px;height:24px;border:none;border-radius:4px;cursor:pointer;"></div>' +
                        '<div style="display: flex; align-items: center; justify-content: space-between; margin-top:8px;"><span style="flex:1;">Custom Logo Image URL:</span> <input type="text" id="chrono-ui-logo" placeholder="https://.../logo.png" style="flex:2;background:rgba(0,0,0,0.5);border:1px solid #34d399;color:#fff;border-radius:4px;padding:4px 8px;outline:none;"></div>' +
                        '<button id="chrono-ui-btn-save" style="margin-top:10px;background: linear-gradient(135deg, #059669, #10b981);border:none;color:#fff;font-weight:bold;border-radius:8px;padding:8px;cursor:pointer;">💾 Save &amp; Apply Theme</button>' +
                        '<button id="chrono-ui-btn-reset" style="margin-top:4px;background: transparent;border:1px solid #ef4444;color:#ef4444;font-weight:bold;border-radius:8px;padding:6px;cursor:pointer;">🔄 Reset to Defaults</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div id="chrono-view-discord" style="display: none; flex-direction: column; gap: 10px;">' +
                '<div style="background: rgba(7, 26, 23, 0.65); border: 1px solid rgba(129, 140, 248, 0.25); border-radius: 12px; padding: 14px;">' +
                    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">' +
                        '<span style="font-weight: 700; font-size: 13px; color: #a5b4fc;">🟣 DISCORD RICH PRESENCE</span>' +
                        '<span id="chrono-discord-status-badge" style="background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.5); color: #86efac; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 4px;">CONNECTED</span>' +
                    '</div>' +
                    '<div style="display: flex; flex-direction: column; gap: 10px; font-size: 11px; color: #cbd5e1;">' +
                        '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; background: rgba(3, 15, 13, 0.6); padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(129, 140, 248, 0.2);">' +
                            '<div><b style="color: #e0e7ff;">Enable Discord Rich Presence Activity :</b><br><span style="font-size: 10px; color: #94a3b8;">Show clean Online / Idle status on Discord profile</span></div>' +
                            '<input type="checkbox" id="cfg-discord-rpc-enabled" style="accent-color: #818cf8; width: 18px; height: 18px; cursor: pointer;" />' +
                        '</label>' +
                        '<div style="display: flex; justify-content: space-between;"><span>Supported States :</span><span style="color: #93c5fd; font-weight: 600;">Online, Idle, Highscore, Tournament</span></div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +

            '<!-- Footer -->' +
            '<div style="' +
                'padding: 8px 20px; background: rgba(3, 15, 13, 0.6); border-top: 1px solid rgba(255, 255, 255, 0.05);' +
                'display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b;' +
            '">' +
                '<span>Press <b style="color: #94a3b8;">ESC</b> or click ⏳ to close</span>' +
                '<span style="color: #34d399; font-weight: 600;">Chrono Client • Nordic Engine</span>' +
            '</div>' +
        '</div>';

    // === RUNS PAGE CUSTOM WINDOW (Rewind ⏪) ===
    let liveRunsData = [];
    let currentRunsPage = 1;

    const runsWindow = document.createElement("div");
    runsWindow.id = "chrono-runs-window";
    runsWindow.style.display = "none";
    runsWindow.style.position = "fixed";
    runsWindow.style.top = "0";
    runsWindow.style.left = "0";
    runsWindow.style.width = "100vw";
    runsWindow.style.height = "100vh";
    runsWindow.style.backgroundColor = "rgba(2, 10, 8, 0.75)";
    runsWindow.style.backdropFilter = "blur(12px)";
    runsWindow.style.webkitBackdropFilter = "blur(12px)";
    runsWindow.style.zIndex = "10000001";
    runsWindow.style.justifyContent = "center";
    runsWindow.style.alignItems = "center";
    runsWindow.style.fontFamily = "system-ui, -apple-system, sans-serif";

    runsWindow.innerHTML = 
        '<div style="' +
            'width: 860px; max-width: 95vw; height: 620px; max-height: 92vh;' +
            'background: linear-gradient(145deg, #071513 0%, #0c2b26 50%, #051614 100%);' +
            'border: 1px solid rgba(52, 211, 153, 0.45); border-radius: 16px;' +
            'box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 35px rgba(16, 185, 129, 0.25);' +
            'display: flex; flex-direction: column; overflow: hidden; color: #f8fafc;' +
        '">' +
            '<!-- Runs Header -->' +
            '<div style="' +
                'padding: 14px 22px; background: linear-gradient(90deg, rgba(6, 95, 70, 0.7) 0%, rgba(4, 120, 87, 0.4) 100%);' +
                'border-bottom: 1px solid rgba(52, 211, 153, 0.3); display: flex; align-items: center; justify-content: space-between;' +
            '">' +
                '<div style="display: flex; align-items: center; gap: 12px;">' +
                    '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABAElEQVR4nO1VMQ7CMBBLgQEQ7JWQeEl/wl9g4xO8jAcggWArKkVKGyYqUi6J71KVgXrrYJ/jc1KlBgwQ4HDTRsrdlLnFHcXbkQ8XGaBEYngTicC5eEYPhg1IT4zCuwLXcDOdQ+KI+V5LSAHuAAectTkT8IkkZdHJcKWIBLq+ZiFYCaAiq8VMMotEk8D+aozKQdbY9snitiC6Baf7QzaNQJPA9niBSbv10vrmcNtoEtBZmkhFYrjWClAhqoRSE18d6DsJsoQhIV8JuSZ+/i9wGvCdJPQQ6SxN0CS8CbhE0HcAMRFcAec0EhNwBz6FuP8CnwlWCd9CVV2zDIRMDPhvvAAXT3AMTFrefQAAAABJRU5ErkJggg==" style="width: 28px; height: 28px; filter: drop-shadow(0 0 6px #34d399);" />' +
                    '<div style="font-weight: 800; font-size: 16px; letter-spacing: 0.5px; color: #a7f3d0;">CHRONO RUNS</div>' +
                '</div>' +
                '<button id="chrono-runs-close-btn" style="' +
                    'background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15);' +
                    'color: #cbd5e1; width: 28px; height: 28px; border-radius: 50%; cursor: pointer;' +
                    'display: flex; align-items: center; justify-content: center; font-size: 14px;' +
                '">✕</button>' +
            '</div>' +

            '<!-- Runs Filter Toolbar -->' +
            '<div style="display: flex; background: rgba(3, 15, 13, 0.7); padding: 10px 18px; border-bottom: 1px solid rgba(52, 211, 153, 0.15); gap: 10px; flex-wrap: wrap; align-items: center;">' +
                '<input id="chrono-runs-search" type="text" placeholder="🔍 Search player, map, or hero..." style="flex: 1; min-width: 160px; background: rgba(7, 26, 23, 0.8); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 8px; color: #f8fafc; padding: 6px 12px; font-size: 12px; outline: none;"/>' +
                '<select id="chrono-runs-filter-map" style="background: rgba(7, 26, 23, 0.9); border: 1.5px solid rgba(52, 211, 153, 0.4); color: #6ee7b7; font-weight: bold; border-radius: 8px; padding: 6px 10px; font-size: 11px; outline: none; cursor: pointer;">' +
                    '<option value="all" style="color: #6ee7b7; background: #061815; font-weight: 800;">🗺️ All Maps (60)</option>' +
                    '<option value="Ancient Abyss" style="color: #9363b1; background: #061815; font-weight: 700;">● Ancient Abyss</option>' +
                    '<option value="Assorted Alcove" style="color: #c19762; background: #061815; font-weight: 700;">● Assorted Alcove</option>' +
                    '<option value="Assorted Alcove Hard" style="color: #d08e29; background: #061815; font-weight: 700;">● Assorted Alcove Hard</option>' +
                    '<option value="Burning Bunker" style="color: #ef4444; background: #061815; font-weight: 700;">● Burning Bunker</option>' +
                    '<option value="Burning Bunker Hard" style="color: #ff5252; background: #061815; font-weight: 700;">● Burning Bunker Hard</option>' +
                    '<option value="Catastrophic Core" style="color: #84cc16; background: #061815; font-weight: 700;">● Catastrophic Core</option>' +
                    '<option value="Central Core" style="color: #84cc16; background: #061815; font-weight: 700;">● Central Core</option>' +
                    '<option value="Central Core Hard" style="color: #65a30d; background: #061815; font-weight: 700;">● Central Core Hard</option>' +
                    '<option value="Coupled Corridors" style="color: #f0e87a; background: #061815; font-weight: 700;">● Coupled Corridors</option>' +
                    '<option value="Cyber Castle" style="color: #21bad9; background: #061815; font-weight: 700;">● Cyber Castle</option>' +
                    '<option value="Cyber Castle Hard" style="color: #53c8e0; background: #061815; font-weight: 700;">● Cyber Castle Hard</option>' +
                    '<option value="Dangerous District" style="color: #f43f5e; background: #061815; font-weight: 700;">● Dangerous District</option>' +
                    '<option value="Dangerous District Hard" style="color: #f3b9b9; background: #061815; font-weight: 700;">● Dangerous District Hard</option>' +
                    '<option value="Dusty Depths" style="color: #d19264; background: #061815; font-weight: 700;">● Dusty Depths</option>' +
                    '<option value="Elite Expanse" style="color: #60a5fa; background: #061815; font-weight: 700;">● Elite Expanse</option>' +
                    '<option value="Elite Expanse Hard" style="color: #3b82f6; background: #061815; font-weight: 700;">● Elite Expanse Hard</option>' +
                    '<option value="Endless Echo" style="color: #9ac2ff; background: #061815; font-weight: 700;">● Endless Echo</option>' +
                    '<option value="Frozen Fjord" style="color: #a5bfda; background: #061815; font-weight: 700;">● Frozen Fjord</option>' +
                    '<option value="Frozen Fjord Hard" style="color: #a5bfda; background: #061815; font-weight: 700;">● Frozen Fjord Hard</option>' +
                    '<option value="Glacial Gorge" style="color: #a7d1d6; background: #061815; font-weight: 700;">● Glacial Gorge</option>' +
                    '<option value="Glacial Gorge Hard" style="color: #b3e0de; background: #061815; font-weight: 700;">● Glacial Gorge Hard</option>' +
                    '<option value="Grand Garden" style="color: #83c05b; background: #061815; font-weight: 700;">● Grand Garden</option>' +
                    '<option value="Grand Garden Hard" style="color: #83c05b; background: #061815; font-weight: 700;">● Grand Garden Hard</option>' +
                    '<option value="Haunted Halls" style="color: #f37250; background: #061815; font-weight: 700;">● Haunted Halls</option>' +
                    '<option value="Haunted Halls Hard" style="color: #854d0e; background: #061815; font-weight: 700;">● Haunted Halls Hard</option>' +
                    '<option value="Humongous Hollow" style="color: #b45309; background: #061815; font-weight: 700;">● Humongous Hollow</option>' +
                    '<option value="Humongous Hollow Hard" style="color: #92400e; background: #061815; font-weight: 700;">● Humongous Hollow Hard</option>' +
                    '<option value="Infinite Inferno" style="color: #b33e50; background: #061815; font-weight: 700;">● Infinite Inferno</option>' +
                    '<option value="Infinite Inferno Hard" style="color: #ff4b6e; background: #061815; font-weight: 700;">● Infinite Inferno Hard</option>' +
                    '<option value="Lonely Laboratory" style="color: #21bad9; background: #061815; font-weight: 700;">● Lonely Laboratory</option>' +
                    '<option value="Magnetic Monopole" style="color: #d043ff; background: #061815; font-weight: 700;">● Magnetic Monopole</option>' +
                    '<option value="Magnetic Monopole Hard" style="color: #cb30ff; background: #061815; font-weight: 700;">● Magnetic Monopole Hard</option>' +
                    '<option value="Monumental Migration" style="color: #c084fc; background: #061815; font-weight: 700;">● Monumental Migration</option>' +
                    '<option value="Monumental Migration Hard" style="color: #a855f7; background: #061815; font-weight: 700;">● Monumental Migration Hard</option>' +
                    '<option value="Mysterious Mansion" style="color: #c446eb; background: #061815; font-weight: 700;">● Mysterious Mansion</option>' +
                    '<option value="Ominous Occult" style="color: #8fb2c2; background: #061815; font-weight: 700;">● Ominous Occult</option>' +
                    '<option value="Ominous Occult Hard" style="color: #8fb2c2; background: #061815; font-weight: 700;">● Ominous Occult Hard</option>' +
                    '<option value="Peculiar Pyramid" style="color: #eab308; background: #061815; font-weight: 700;">● Peculiar Pyramid</option>' +
                    '<option value="Peculiar Pyramid Hard" style="color: #ca8a04; background: #061815; font-weight: 700;">● Peculiar Pyramid Hard</option>' +
                    '<option value="Pristine Purgatory" style="color: #c472c2; background: #061815; font-weight: 700;">● Pristine Purgatory</option>' +
                    '<option value="Quiet Quarry" style="color: #b2b6b9; background: #061815; font-weight: 700;">● Quiet Quarry</option>' +
                    '<option value="Quiet Quarry Hard" style="color: #b2b6b9; background: #061815; font-weight: 700;">● Quiet Quarry Hard</option>' +
                    '<option value="Restless Ridge" style="color: #d4af7f; background: #061815; font-weight: 700;">● Restless Ridge</option>' +
                    '<option value="Restless Ridge Hard" style="color: #d4af7f; background: #061815; font-weight: 700;">● Restless Ridge Hard</option>' +
                    '<option value="Shifting Sands" style="color: #eda764; background: #061815; font-weight: 700;">● Shifting Sands</option>' +
                    '<option value="Sparkling Shrine" style="color: #4c25cb; background: #061815; font-weight: 700;">● Sparkling Shrine</option>' +
                    '<option value="Sparkling Shrine Hard" style="color: #4520bd; background: #061815; font-weight: 700;">● Sparkling Shrine Hard</option>' +
                    '<option value="Stellar Square" style="color: #d6d2a7; background: #061815; font-weight: 700;">● Stellar Square</option>' +
                    '<option value="Terrifying Temple" style="color: #ff7381; background: #061815; font-weight: 700;">● Terrifying Temple</option>' +
                    '<option value="Terrifying Temple Hard" style="color: #ff91b9; background: #061815; font-weight: 700;">● Terrifying Temple Hard</option>' +
                    '<option value="Toxic Territory" style="color: #bcbcbc; background: #061815; font-weight: 700;">● Toxic Territory</option>' +
                    '<option value="Toxic Territory Hard" style="color: #848484; background: #061815; font-weight: 700;">● Toxic Territory Hard</option>' +
                    '<option value="Unholy Underpass" style="color: #f43f5e; background: #061815; font-weight: 700;">● Unholy Underpass</option>' +
                    '<option value="Vast Void" style="color: #825a94; background: #061815; font-weight: 700;">● Vast Void</option>' +
                    '<option value="Vicious Valley" style="color: #4ade80; background: #061815; font-weight: 700;">● Vicious Valley</option>' +
                    '<option value="Vicious Valley Hard" style="color: #22c55e; background: #061815; font-weight: 700;">● Vicious Valley Hard</option>' +
                    '<option value="Voidborne" style="color: #752656; background: #061815; font-weight: 700;">● Voidborne</option>' +
                    '<option value="Wacky Wonderland" style="color: #ec4899; background: #061815; font-weight: 700;">● Wacky Wonderland</option>' +
                    '<option value="Wacky Wonderland Hard" style="color: #db2777; background: #061815; font-weight: 700;">● Wacky Wonderland Hard</option>' +
                    '<option value="Withering Wasteland" style="color: #cc452d; background: #061815; font-weight: 700;">● Withering Wasteland</option>' +
                '</select>' +
                '<select id="chrono-runs-filter-hero" style="background: rgba(7, 26, 23, 0.9); border: 1.5px solid rgba(52, 211, 153, 0.4); color: #6ee7b7; font-weight: bold; border-radius: 8px; padding: 6px 10px; font-size: 11px; outline: none; cursor: pointer;">' +
                    '<option value="all" style="color: #6ee7b7; background: #061815; font-weight: 800;">🧙 All Heroes (32)</option>' +
                    '<option value="Magmax" style="color: #ff0000; background: #061815; font-weight: 700;">● Magmax</option>' +
                    '<option value="Rime" style="color: #3333ff; background: #061815; font-weight: 700;">● Rime</option>' +
                    '<option value="Morfe" style="color: #00dd00; background: #061815; font-weight: 700;">● Morfe</option>' +
                    '<option value="Aurora" style="color: #ff7f00; background: #061815; font-weight: 700;">● Aurora</option>' +
                    '<option value="Necro" style="color: #ff00ff; background: #061815; font-weight: 700;">● Necro</option>' +
                    '<option value="Brute" style="color: #9b5800; background: #061815; font-weight: 700;">● Brute</option>' +
                    '<option value="Nexus" style="color: #29ffc6; background: #061815; font-weight: 700;">● Nexus</option>' +
                    '<option value="Shade" style="color: #826565; background: #061815; font-weight: 700;">● Shade</option>' +
                    '<option value="Euclid" style="color: #5e4d66; background: #061815; font-weight: 700;">● Euclid</option>' +
                    '<option value="Chrono" style="color: #00b270; background: #061815; font-weight: 700;">● Chrono</option>' +
                    '<option value="Reaper" style="color: #424a59; background: #061815; font-weight: 700;">● Reaper</option>' +
                    '<option value="Rameses" style="color: #989b4a; background: #061815; font-weight: 700;">● Rameses</option>' +
                    '<option value="Jolt" style="color: #e1e100; background: #061815; font-weight: 700;">● Jolt</option>' +
                    '<option value="Ghoul" style="color: #bad7d8; background: #061815; font-weight: 700;">● Ghoul</option>' +
                    '<option value="Cent" style="color: #727272; background: #061815; font-weight: 700;">● Cent</option>' +
                    '<option value="Jötunn" style="color: #5cacff; background: #061815; font-weight: 700;">● Jötunn</option>' +
                    '<option value="Candy" style="color: #ff80bd; background: #061815; font-weight: 700;">● Candy</option>' +
                    '<option value="Mirage" style="color: #020fa2; background: #061815; font-weight: 700;">● Mirage</option>' +
                    '<option value="Boldrock" style="color: #a18446; background: #061815; font-weight: 700;">● Boldrock</option>' +
                    '<option value="Glob" style="color: #14a300; background: #061815; font-weight: 700;">● Glob</option>' +
                    '<option value="Magno" style="color: #ff005d; background: #061815; font-weight: 700;">● Magno</option>' +
                    '<option value="Ignis" style="color: #cd501f; background: #061815; font-weight: 700;">● Ignis</option>' +
                    '<option value="Stella" style="color: #fffa86; background: #061815; font-weight: 700;">● Stella</option>' +
                    '<option value="Viola" style="color: #d9b130; background: #061815; font-weight: 700;">● Viola</option>' +
                    '<option value="Mortuus" style="color: #7fb332; background: #061815; font-weight: 700;">● Mortuus</option>' +
                    '<option value="Cybot" style="color: #926be3; background: #061815; font-weight: 700;">● Cybot</option>' +
                    '<option value="Echelon" style="color: #5786de; background: #061815; font-weight: 700;">● Echelon</option>' +
                    '<option value="Demona" style="color: #7d3c9e; background: #061815; font-weight: 700;">● Demona</option>' +
                    '<option value="Stheno" style="color: #cfa6ec; background: #061815; font-weight: 700;">● Stheno</option>' +
                    '<option value="Factorb" style="color: #6e391e; background: #061815; font-weight: 700;">● Factorb</option>' +
                    '<option value="Leono" style="color: #820b0d; background: #061815; font-weight: 700;">● Leono</option>' +
                    '<option value="Veydris" style="color: #752656; background: #061815; font-weight: 700;">● Veydris</option>' +
                '</select>' +
                '<select id="chrono-runs-filter-date" style="background: rgba(7, 26, 23, 0.9); border: 1.5px solid rgba(52, 211, 153, 0.4); color: #6ee7b7; font-weight: bold; border-radius: 8px; padding: 6px 10px; font-size: 11px; outline: none; cursor: pointer;">' +
                    '<option value="all" style="color: #6ee7b7; background: #061815; font-weight: 800;">🗓️ All Dates / Seasons</option>' +
                    '<optgroup label="🌱 Seasons" style="background: #041210; color: #a7f3d0; font-weight: bold;">' +
                        '<option value="spring" style="color: #34d399; background: #061815;">🌸 Spring (Mar - May)</option>' +
                        '<option value="summer" style="color: #f59e0b; background: #061815;">☀️ Summer (Jun - Aug)</option>' +
                        '<option value="autumn" style="color: #fb923c; background: #061815;">🍂 Autumn (Sep - Nov)</option>' +
                        '<option value="winter" style="color: #38bdf8; background: #061815;">❄️ Winter (Dec - Feb)</option>' +
                    '</optgroup>' +
                    '<optgroup label="📅 Years (Since Launch)" style="background: #041210; color: #a7f3d0; font-weight: bold;">' +
                        '<option value="2026" style="color: #e2e8f0; background: #061815;">📅 2026</option>' +
                        '<option value="2025" style="color: #e2e8f0; background: #061815;">📅 2025</option>' +
                        '<option value="2024" style="color: #e2e8f0; background: #061815;">📅 2024</option>' +
                        '<option value="2023" style="color: #e2e8f0; background: #061815;">📅 2023 (Launch • 12 Feb 2023)</option>' +
                    '</optgroup>' +
                '</select>' +
                '<select id="chrono-runs-sort" style="background: rgba(7, 26, 23, 0.8); border: 1px solid rgba(52, 211, 153, 0.3); color: #38bdf8; font-weight: bold; border-radius: 8px; padding: 6px 10px; font-size: 11px; outline: none; cursor: pointer;">' +
                    '<option value="newest" style="color: #38bdf8; background: #061815; font-weight: 700;">📅 Newest First</option>' +
                    '<option value="time" style="color: #34d399; background: #061815; font-weight: 700;">⏱️ Survival Time</option>' +
                    '<option value="area_time" style="color: #f59e0b; background: #061815; font-weight: 700;">🚩 Highest Area & Survival Time</option>' +
                '</select>' +
                '<button id="chrono-runs-btn-refresh" style="background: linear-gradient(135deg, #059669, #10b981); border: 1px solid rgba(110, 231, 183, 0.4); color: #ffffff; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer;">🔄 Refresh</button>' +
            '</div>' +

            '<!-- Runs List Area -->' +
            '<div id="chrono-runs-list" style="padding: 14px 18px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 8px;">' +
                '<div style="text-align: center; color: #94a3b8; padding: 30px; font-size: 13px;">⏳ Loading runs...</div>' +
            '</div>' +

            '<!-- Runs Footer with Pagination -->' +
            '<div style="' +
                'padding: 10px 20px; background: rgba(3, 15, 13, 0.7); border-top: 1px solid rgba(255, 255, 255, 0.05);' +
                'display: flex; justify-content: flex-start; align-items: center; font-size: 11px; color: #64748b;' +
            '">' +
                '<div style="display: flex; gap: 8px; align-items: center;">' +
                    '<button id="chrono-runs-prev-btn" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer;">◀ Prev</button>' +
                    '<span id="chrono-runs-page-info" style="color: #cbd5e1; font-weight: bold;">Page 1</span>' +
                    '<button id="chrono-runs-next-btn" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer;">Next ▶</button>' +
                '</div>' +
            '</div>' +
        '</div>';

    // Color Codex for all 32 Official Heroes & Maps
    const HERO_COLORS = {
        "Magmax": "#ff0000",
        "Rime": "#3333ff",
        "Morfe": "#00dd00",
        "Morphi": "#00dd00",
        "Aurora": "#ff7f00",
        "Necro": "#ff00ff",
        "Brute": "#9b5800",
        "Nexus": "#29ffc6",
        "Shade": "#826565",
        "Euclid": "#5e4d66",
        "Chrono": "#00b270",
        "Reaper": "#424a59",
        "Rameses": "#989b4a",
        "Jolt": "#e1e100",
        "Ghoul": "#bad7d8",
        "Cent": "#727272",
        "Jötunn": "#5cacff",
        "Candy": "#ff80bd",
        "Mirage": "#020fa2",
        "Boldrock": "#a18446",
        "Glob": "#14a300",
        "Magno": "#ff005d",
        "Ignis": "#cd501f",
        "Stella": "#fffa86",
        "Viola": "#d9b130",
        "Mortuus": "#7fb332",
        "Cybot": "#926be3",
        "Echelon": "#5786de",
        "Demona": "#7d3c9e",
        "Stheno": "#cfa6ec",
        "Factorb": "#6e391e",
        "Leono": "#820b0d",
        "Veydris": "#752656"
    };

    const MAP_COLORS = {
        "Ancient Abyss": "#9363b1",
        "Assorted Alcove": "#c19762",
        "Assorted Alcove Hard": "#d08e29",
        "Burning Bunker": "#ef4444",
        "Burning Bunker Hard": "#ff5252",
        "Catastrophic Core": "#84cc16",
        "Central Core": "#84cc16",
        "Central Core Hard": "#65a30d",
        "Coupled Corridors": "#f0e87a",
        "Cyber Castle": "#21bad9",
        "Cyber Castle Hard": "#53c8e0",
        "Dangerous District": "#f43f5e",
        "Dangerous District Hard": "#f3b9b9",
        "Dusty Depths": "#d19264",
        "Elite Expanse": "#60a5fa",
        "Elite Expanse Hard": "#3b82f6",
        "Endless Echo": "#9ac2ff",
        "Endless Echo 999": "#9ac2ff",
        "Frozen Fjord": "#a5bfda",
        "Frozen Fjord Hard": "#a5bfda",
        "Glacial Gorge": "#a7d1d6",
        "Glacial Gorge Hard": "#b3e0de",
        "Glacier": "#a7d1d6",
        "Glacier Hard": "#b3e0de",
        "Grand Garden": "#83c05b",
        "Grand Garden Hard": "#83c05b",
        "Haunted Halls": "#f37250",
        "Haunted Halls Hard": "#854d0e",
        "Haunted Halls: Deep Woods 25": "#8b5cf6",
        "Humongous Hollow": "#b45309",
        "Humongous Hollow Hard": "#92400e",
        "Infinite Inferno": "#b33e50",
        "Infinite Inferno Hard": "#ff4b6e",
        "Lonely Laboratory": "#21bad9",
        "Magnetic Monopole": "#d043ff",
        "Magnetic Monopole Hard": "#cb30ff",
        "Magnetic Monopole: Dipole": "#ec4899",
        "Magnetic Monopole: Dipole Hard": "#db2777",
        "Monumental Migration": "#c084fc",
        "Monumental Migration Hard": "#a855f7",
        "Monumental Migration 120": "#f59e0b",
        "Monumental Migration 480": "#d97706",
        "Mysterious Mansion": "#c446eb",
        "Mysterious Mansion Hedge (59) (Hat)": "#c446eb",
        "Mysterious Mansion Liminal (60)": "#c446eb",
        "Mysterious Mansion Attic (61)": "#c446eb",
        "Mysterious Mansion Cryptic (62) (Hero)": "#c446eb",
        "Ominous Occult": "#8fb2c2",
        "Ominous Occult Hard": "#8fb2c2",
        "Peculiar Pyramid": "#eab308",
        "Peculiar Pyramid Hard": "#ca8a04",
        "Peculiar Pyramid Inner": "#eab308",
        "Peculiar Pyramid Inner Hard": "#ca8a04",
        "Peculiar Pyramid Perimeter": "#eab308",
        "Peculiar Pyramid Perimeter Hard": "#ca8a04",
        "Powered Plains": "#b9d026",
        "Pristine Purgatory": "#c472c2",
        "Quiet Quarry": "#b2b6b9",
        "Quiet Quarry Hard": "#b2b6b9",
        "Research Lab": "#21bad9",
        "Restless Ridge": "#d4af7f",
        "Restless Ridge Hard": "#d4af7f",
        "Shifting Sands": "#eda764",
        "Sparkling Shrine": "#4c25cb",
        "Sparkling Shrine Hard": "#4520bd",
        "Stellar Square": "#d6d2a7",
        "Terrifying Temple": "#ff7381",
        "Terrifying Temple Hard": "#ff91b9",
        "Toxic Terraces": "#bcbcbc",
        "Toxic Territory": "#bcbcbc",
        "Toxic Territory Hard": "#848484",
        "Transforming Turbidity": "#c4c8cc",
        "Unholy Underpass": "#f43f5e",
        "Vast Void": "#825a94",
        "Vast Void 50": "#825a94",
        "Vicious Valley": "#4ade80",
        "Vicious Valley Hard": "#22c55e",
        "Voidborne": "#752656",
        "Wacky Wonderland": "#ec4899",
        "Wacky Wonderland Hard": "#db2777",
        "Withering Wasteland": "#cc452d"
    };

    // Update Select Dropdown visual colors
    function updateSelectColors() {
        const heroSel = document.getElementById("chrono-runs-filter-hero");
        if (heroSel) {
            const val = heroSel.value;
            const col = (val === "all") ? "#6ee7b7" : (HERO_COLORS[val] || "#6ee7b7");
            heroSel.style.color = col;
            heroSel.style.borderColor = (val === "all") ? "rgba(52, 211, 153, 0.3)" : col;
        }
        const mapSel = document.getElementById("chrono-runs-filter-map");
        if (mapSel) {
            const val = mapSel.value;
            const col = (val === "all") ? "#6ee7b7" : (MAP_COLORS[val] || "#6ee7b7");
            mapSel.style.color = col;
            mapSel.style.borderColor = (val === "all") ? "rgba(52, 211, 153, 0.3)" : col;
        }
    }

    // Format Survival Seconds into MM:SS or HH:MM:SS
    function formatSurvivalTime(sec) {
        if (!sec || isNaN(sec)) return "0s";
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        if (h > 0) {
            return h + "h " + (m < 10 ? "0" : "") + m + "m " + (s < 10 ? "0" : "") + s + "s";
        }
        return m + "m " + (s < 10 ? "0" : "") + s + "s (" + sec + "s)";
    }

    // Format Relative Time (e.g. "5m ago" or Date)
    function formatRelativeTime(ts) {
        if (!ts) return "";
        const diff = Math.floor((Date.now() / 1000) - ts);
        if (diff < 0 || diff < 60) return "Just now";
        if (diff < 3600) return Math.floor(diff / 60) + "m ago";
        if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
        if (diff < 2592000) return Math.floor(diff / 86400) + "d ago";
        const d = new Date(ts * 1000);
        return d.toLocaleDateString();
    }

    const YEAR_OFFSETS = {
        "2026": 0,
        "2025": 38200,
        "2024": 124500,
        "2023": 198000,
        "spring": 14000,
        "summer": 0,
        "autumn": 45000,
        "winter": 30000,
        "all": 0
    };

    // Live Runs Renderer
    function renderLiveRuns() {
        const listEl = document.getElementById("chrono-runs-list");
        if (!listEl) return;
        updateSelectColors();

        if (!Array.isArray(liveRunsData) || liveRunsData.length === 0) {
            listEl.innerHTML = '<div style="text-align: center; color: #64748b; padding: 40px; font-size: 13px;">No runs found matching your current filters.</div>';
            return;
        }

        listEl.innerHTML = "";
        liveRunsData.forEach((run, idx) => {
            const card = document.createElement("div");
            card.style.background = "linear-gradient(135deg, rgba(7, 26, 23, 0.85) 0%, rgba(4, 18, 16, 0.95) 100%)";
            card.style.border = "1px solid rgba(52, 211, 153, 0.22)";
            card.style.borderRadius = "12px";
            card.style.padding = "12px 16px";
            card.style.display = "flex";
            card.style.alignItems = "center";
            card.style.justifyContent = "space-between";
            card.style.gap = "14px";
            card.style.transition = "all 0.15s ease";
            card.onmouseover = () => {
                card.style.borderColor = "rgba(52, 211, 153, 0.45)";
                card.style.boxShadow = "0 4px 18px rgba(0, 0, 0, 0.5)";
            };
            card.onmouseout = () => {
                card.style.borderColor = "rgba(52, 211, 153, 0.22)";
                card.style.boxShadow = "none";
            };

            const rankBadge = '<span style="color: #64748b; font-weight: 700; font-size: 13px;">#' + (idx + 1) + '</span>';

            const heroName = run.hero || "Unknown";
            const heroColor = HERO_COLORS[heroName] || "#6ee7b7";
            const mapName = run.region_name || "Unknown Area";
            const mapColor = MAP_COLORS[mapName] || "#34d399";
            const areaIndex = run.area_index != null ? run.area_index : "?";
            const user = run.username || "Guest";
            const userInitial = user.charAt(0).toUpperCase();
            const timeStr = formatSurvivalTime(run.survival_time);
            const relTime = formatRelativeTime(run.created_at);

            const partners = Array.isArray(run.interactions) && run.interactions.length > 0 ? run.interactions.join(", ") : "";

            card.innerHTML = 
                '<div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">' +
                    '<div style="min-width: 36px; display: flex; align-items: center; justify-content: center;">' + rankBadge + '</div>' +
                    '<div style="flex: 1; min-width: 0;">' +
                        '<!-- Top Row: Map + Area + Hero + Duo -->' +
                        '<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">' +
                            '<span style="color: ' + mapColor + '; font-weight: 800; font-size: 14px; text-shadow: 0 0 12px ' + mapColor + '55;">' + mapName + '</span>' +
                            '<span style="background: rgba(16, 185, 129, 0.18); color: #a7f3d0; border: 1px solid rgba(52, 211, 153, 0.35); font-size: 10px; padding: 1px 7px; border-radius: 5px; font-weight: 800;">Area ' + areaIndex + '</span>' +
                            '<span style="background: ' + heroColor + '18; color: ' + heroColor + '; border: 1px solid ' + heroColor + '66; font-size: 11px; padding: 2px 8px; border-radius: 6px; font-weight: 800; text-shadow: 0 0 8px ' + heroColor + '66;">' + heroName + '</span>' +
                            (partners ? ('<span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); font-size: 10px; padding: 1px 7px; border-radius: 5px; font-weight: 700;">👥 Duo w/ ' + partners + '</span>') : '') +
                        '</div>' +
                        '<!-- Bottom Row: Player + Survival Time + Timestamp -->' +
                        '<div style="font-size: 12px; color: #94a3b8; margin-top: 5px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">' +
                            '<div style="display: flex; align-items: center; gap: 6px;">' +
                                '<div style="width: 18px; height: 18px; border-radius: 50%; background: linear-gradient(135deg, #059669, #10b981); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; color: #fff;">' + userInitial + '</div>' +
                                '<span style="color: #f1f5f9; font-weight: 600;">' + user + '</span>' +
                            '</div>' +
                            '<span>⏱️ <b style="color: #34d399; font-weight: 700;">' + timeStr + '</b></span>' +
                            (relTime ? ('<span style="color: #64748b; font-size: 11px;">• ' + relTime + '</span>') : '') +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div style="display: flex; gap: 6px;">' +
                    '<button class="chrono-btn-run-link" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.18); color: #e2e8f0; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.15s ease;" onmouseover="this.style.background=\'rgba(16, 185, 129, 0.25)\'; this.style.borderColor=\'#34d399\';" onmouseout="this.style.background=\'rgba(255,255,255,0.06)\'; this.style.borderColor=\'rgba(255,255,255,0.18)\';">📋 Run #' + run.id + '</button>' +
                '</div>';

            card.querySelector(".chrono-btn-run-link").onclick = () => {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText("https://evades.io/runs?id=" + run.id);
                    alert("✅ Run link copied: https://evades.io/runs?id=" + run.id);
                }
            };

            listEl.appendChild(card);
        });
    }

    // Scrape Live Runs from /api/runs with backend query parameters
    async function fetchLiveRuns(page) {
        currentRunsPage = page || 1;
        const listEl = document.getElementById("chrono-runs-list");
        const pageInfo = document.getElementById("chrono-runs-page-info");
        if (pageInfo) pageInfo.innerText = "Page " + currentRunsPage;
        if (listEl) listEl.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 40px; font-size: 13px;">⏳ Loading runs (Page ' + currentRunsPage + ')...</div>';

        updateSelectColors();

        const searchVal = (document.getElementById("chrono-runs-search") ? document.getElementById("chrono-runs-search").value : "").trim();
        const mapVal = document.getElementById("chrono-runs-filter-map") ? document.getElementById("chrono-runs-filter-map").value : "all";
        const heroVal = document.getElementById("chrono-runs-filter-hero") ? document.getElementById("chrono-runs-filter-hero").value : "all";
        const dateVal = document.getElementById("chrono-runs-filter-date") ? document.getElementById("chrono-runs-filter-date").value : "all";
        const sortVal = document.getElementById("chrono-runs-sort") ? document.getElementById("chrono-runs-sort").value : "newest";

        const baseOffset = YEAR_OFFSETS[dateVal] || 0;
        const finalOffset = baseOffset + 50 * (currentRunsPage - 1);

        const params = new URLSearchParams();
        params.set("offset", finalOffset);
        if (heroVal && heroVal !== "all") params.set("hero", heroVal);
        if (mapVal && mapVal !== "all") params.set("region", mapVal);
        if (searchVal) {
            if (HERO_COLORS[searchVal]) params.set("hero", searchVal);
            else if (MAP_COLORS[searchVal]) params.set("region", searchVal);
            else params.set("username", searchVal);
        }

        if (sortVal === "time") {
            params.set("order", "survival_time");
        } else if (sortVal === "area_time") {
            params.set("order", "area_index_survival_time");
        }

        try {
            const res = await fetch("/api/runs?" + params.toString());
            const data = await res.json();
            if (Array.isArray(data)) {
                liveRunsData = data;
                renderLiveRuns();
            } else {
                if (listEl) listEl.innerHTML = '<div style="text-align: center; color: #f87171; padding: 40px; font-size: 12px;">Failed to load runs format.</div>';
            }
        } catch(e) {
            if (listEl) listEl.innerHTML = '<div style="text-align: center; color: #f87171; padding: 40px; font-size: 12px;">Error loading runs: ' + e.message + '</div>';
        }
    }

    // === COMMUNITY LEADERBOARD CUSTOM WINDOW (Vengeance ⚔️) ===
    const leaderboardWindow = document.createElement("div");
    leaderboardWindow.id = "chrono-leaderboard-window";
    leaderboardWindow.style.display = "none";
    leaderboardWindow.style.position = "fixed";
    leaderboardWindow.style.top = "0";
    leaderboardWindow.style.left = "0";
    leaderboardWindow.style.width = "100vw";
    leaderboardWindow.style.height = "100vh";
    leaderboardWindow.style.backgroundColor = "rgba(2, 10, 8, 0.75)";
    leaderboardWindow.style.backdropFilter = "blur(12px)";
    leaderboardWindow.style.webkitBackdropFilter = "blur(12px)";
    leaderboardWindow.style.zIndex = "10000002";
    leaderboardWindow.style.justifyContent = "center";
    leaderboardWindow.style.alignItems = "center";
    leaderboardWindow.style.fontFamily = "system-ui, -apple-system, sans-serif";

    leaderboardWindow.innerHTML = 
        '<div style="' +
            'width: 890px; max-width: 95vw; height: 640px; max-height: 92vh;' +
            'background: linear-gradient(145deg, #180a08 0%, #2e120f 50%, #150807 100%);' +
            'border: 1px solid rgba(239, 68, 68, 0.45); border-radius: 16px;' +
            'box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 35px rgba(239, 68, 68, 0.25);' +
            'display: flex; flex-direction: column; overflow: hidden; color: #f8fafc;' +
        '">' +
            '<!-- Leaderboard Header -->' +
            '<div style="' +
                'padding: 14px 22px; background: linear-gradient(90deg, rgba(153, 27, 27, 0.7) 0%, rgba(185, 28, 28, 0.4) 100%);' +
                'border-bottom: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; justify-content: space-between;' +
            '">' +
                '<div style="display: flex; align-items: center; gap: 12px;">' +
                    '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABr0lEQVR4nO2Wy0rDQBSG/+nNNN4QRMxCcKEtTSgS3OY9uivZ5X3cdZtd3qOI1hQFUdBF8QYKCi6qTaum40Jq1UymMyHQhf12SU7O/+fMmcwBZvx3iOwLvmNTACBKEYNcHt1eDwCgKgrU8B27ew2pnMLBvmNTqPM4OTpA+NplxsytrmNL02C5nnDenKh42z8EhiE3bvD8CGiaqPZkA75j0/NOB+3WvlAyQsYf3jBLlBQU6OUKtyIZnvjF7Q2CpwchcQCg9M/1Wx8A0KzXKCOcbwAAXu7vhMUBgGSi6c5Oj7kmmAZ8x6btdktKnMfIhLCBfhAA4Ye0EJ3QpKwqcJdAmjDewOX1VapSqRHZHr5jU9Ftx8KomrBcjzTMUqTco2c/70WWoB8EicWTkGoPZBR1ugbocDhdA0lgGiAFZXoGLNcjermSLBtNcwmI9KwysQdYpyLTgOV6hCQwwMOomsz7sRXQjR0sbW6nJh43E8QasFyPbCwuoLgmN+H8IpvligOCM2GzXqO8I3UsmIOhV6VmQqH/gOV6xKiaX+vI6Y388oqo7jfSncYbrwB2p8+YweMTpzGHYPbOwEIAAAAASUVORK5CYII=" style="width: 28px; height: 28px; filter: drop-shadow(0 0 6px #ef4444);" />' +
                    '<div>' +
                        '<div style="font-weight: 800; font-size: 16px; letter-spacing: 0.5px; color: #fca5a5;">CHRONO COMMUNITY HIGHSCORES</div>' +
                        '<div style="font-size: 11px; color: #f87171;">Official Evades Speedrun Records Archive • 59 Maps</div>' +
                    '</div>' +
                '</div>' +
                '<button id="chrono-leaderboard-close-btn" style="' +
                    'background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15);' +
                    'color: #cbd5e1; width: 28px; height: 28px; border-radius: 50%; cursor: pointer;' +
                    'display: flex; align-items: center; justify-content: center; font-size: 14px;' +
                '">✕</button>' +
            '</div>' +

            '<!-- Leaderboard Toolbar -->' +
            '<div style="display: flex; background: rgba(20, 7, 6, 0.7); padding: 10px 18px; border-bottom: 1px solid rgba(239, 68, 68, 0.15); gap: 10px; flex-wrap: wrap; align-items: center;">' +
                '<!-- Mode Switcher -->' +
                '<div style="display: flex; background: rgba(0, 0, 0, 0.45); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 8px; overflow: hidden; padding: 2px;">' +
                    '<button id="chrono-lb-btn-solo" style="background: linear-gradient(135deg, #b91c1c, #dc2626); border: 1px solid #f87171; color: #ffffff; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">👤 Solo Records</button>' +
                    '<button id="chrono-lb-btn-duo" style="background: transparent; border: 1px solid transparent; color: #fca5a5; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">👥 Duo Records</button>' +
                '</div>' +

                '<input id="chrono-lb-search" type="text" placeholder="🔍 Search player, map, or hero..." style="flex: 1; min-width: 170px; background: rgba(36, 12, 10, 0.8); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; color: #f8fafc; padding: 6px 12px; font-size: 12px; outline: none;"/>' +

                '<select id="chrono-lb-filter-map" style="background: rgba(36, 12, 10, 0.8); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; font-weight: bold; border-radius: 8px; padding: 6px 10px; font-size: 11px; outline: none; cursor: pointer; max-width: 170px;">' +
                    '<option value="all">🗺️ All Maps (59)</option>' +
                '</select>' +

                '<select id="chrono-lb-filter-hero" style="background: rgba(36, 12, 10, 0.8); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; font-weight: bold; border-radius: 8px; padding: 6px 10px; font-size: 11px; outline: none; cursor: pointer; max-width: 140px;">' +
                    '<option value="all" style="color: #fca5a5; background: #1a0806; font-weight: 800;">🦸 All Heroes (32)</option>' +
                    '<option value="Magmax" style="color: #ff0000; background: #1a0806; font-weight: 700;">● Magmax</option>' +
                    '<option value="Rime" style="color: #3333ff; background: #1a0806; font-weight: 700;">● Rime</option>' +
                    '<option value="Morfe" style="color: #00dd00; background: #1a0806; font-weight: 700;">● Morfe</option>' +
                    '<option value="Aurora" style="color: #ff7f00; background: #1a0806; font-weight: 700;">● Aurora</option>' +
                    '<option value="Necro" style="color: #ff00ff; background: #1a0806; font-weight: 700;">● Necro</option>' +
                    '<option value="Brute" style="color: #9b5800; background: #1a0806; font-weight: 700;">● Brute</option>' +
                    '<option value="Nexus" style="color: #29ffc6; background: #1a0806; font-weight: 700;">● Nexus</option>' +
                    '<option value="Shade" style="color: #826565; background: #1a0806; font-weight: 700;">● Shade</option>' +
                    '<option value="Euclid" style="color: #5e4d66; background: #1a0806; font-weight: 700;">● Euclid</option>' +
                    '<option value="Chrono" style="color: #00b270; background: #1a0806; font-weight: 700;">● Chrono</option>' +
                    '<option value="Reaper" style="color: #424a59; background: #1a0806; font-weight: 700;">● Reaper</option>' +
                    '<option value="Rameses" style="color: #989b4a; background: #1a0806; font-weight: 700;">● Rameses</option>' +
                    '<option value="Jolt" style="color: #e1e100; background: #1a0806; font-weight: 700;">● Jolt</option>' +
                    '<option value="Ghoul" style="color: #bad7d8; background: #1a0806; font-weight: 700;">● Ghoul</option>' +
                    '<option value="Cent" style="color: #727272; background: #1a0806; font-weight: 700;">● Cent</option>' +
                    '<option value="Jötunn" style="color: #5cacff; background: #1a0806; font-weight: 700;">● Jötunn</option>' +
                    '<option value="Candy" style="color: #ff80bd; background: #1a0806; font-weight: 700;">● Candy</option>' +
                    '<option value="Mirage" style="color: #020fa2; background: #1a0806; font-weight: 700;">● Mirage</option>' +
                    '<option value="Boldrock" style="color: #a18446; background: #1a0806; font-weight: 700;">● Boldrock</option>' +
                    '<option value="Glob" style="color: #14a300; background: #1a0806; font-weight: 700;">● Glob</option>' +
                    '<option value="Magno" style="color: #ff005d; background: #1a0806; font-weight: 700;">● Magno</option>' +
                    '<option value="Ignis" style="color: #cd501f; background: #1a0806; font-weight: 700;">● Ignis</option>' +
                    '<option value="Stella" style="color: #fffa86; background: #1a0806; font-weight: 700;">● Stella</option>' +
                    '<option value="Viola" style="color: #d9b130; background: #1a0806; font-weight: 700;">● Viola</option>' +
                    '<option value="Mortuus" style="color: #7fb332; background: #1a0806; font-weight: 700;">● Mortuus</option>' +
                    '<option value="Cybot" style="color: #926be3; background: #1a0806; font-weight: 700;">● Cybot</option>' +
                    '<option value="Echelon" style="color: #5786de; background: #1a0806; font-weight: 700;">● Echelon</option>' +
                    '<option value="Demona" style="color: #7d3c9e; background: #1a0806; font-weight: 700;">● Demona</option>' +
                    '<option value="Stheno" style="color: #cfa6ec; background: #1a0806; font-weight: 700;">● Stheno</option>' +
                    '<option value="Factorb" style="color: #6e391e; background: #1a0806; font-weight: 700;">● Factorb</option>' +
                    '<option value="Leono" style="color: #820b0d; background: #1a0806; font-weight: 700;">● Leono</option>' +
                    '<option value="Veydris" style="color: #752656; background: #1a0806; font-weight: 700;">● Veydris</option>' +
                '</select>' +

                '<button id="chrono-lb-btn-refresh" style="background: linear-gradient(135deg, #b91c1c, #dc2626); border: 1px solid rgba(248, 113, 113, 0.4); color: #ffffff; padding: 6px 14px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer;">🔄 Live Sync</button>' +
            '</div>' +

            '<!-- Community Link Banner -->' +
            '<div style="background: rgba(239, 68, 68, 0.15); border-bottom: 1px solid rgba(239, 68, 68, 0.3); padding: 8px 18px; font-size: 11px; color: #fca5a5; display: flex; align-items: center; justify-content: space-between;">' +
                '<span id="chrono-lb-sync-status">🔗 <b>Community Sync :</b> Synchronized with Official Evades Highscores Google Sheets.</span>' +
                '<a id="chrono-lb-ext-link" href="https://docs.google.com/spreadsheets/d/1iNQsgPGu0xtSNyKEBDt8jr9EQfjD4Djn4e-qL7ljrRc/edit?gid=951285843" target="_blank" style="color: #fca5a5; text-decoration: underline; font-weight: 600;">Open Google Sheet ↗</a>' +
            '</div>' +

            '<!-- Leaderboard List Area -->' +
            '<div id="chrono-lb-list" style="padding: 14px 18px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 8px;">' +
                '<div style="text-align: center; color: #94a3b8; padding: 40px; font-size: 13px;">⏳ Loading highscores...</div>' +
            '</div>' +
        '</div>';

    function sortMapNames(mapList) {
        return mapList.slice().sort((a, b) => {
            if (a.startsWith("Mysterious Mansion") && b.startsWith("Mysterious Mansion")) {
                const numA = (a.match(/\((\d+)\)/) || [0, 999])[1];
                const numB = (b.match(/\((\d+)\)/) || [0, 999])[1];
                return parseInt(numA) - parseInt(numB);
            }
            return a.localeCompare(b);
        });
    }

    function populateLeaderboardMapSelect() {
        const sel = document.getElementById("chrono-lb-filter-map");
        if (!sel) return;
        const currentVal = sel.value || "all";
        const source = (currentLbMode === "duo") ? (communityHighscores.duo || {}) : (communityHighscores.solo || {});
        let mapList = Object.keys(source);

        // Filter out removed maps
        mapList = mapList.filter(m => m !== "Endless Echo Hard" && m !== "Endless Echo 999 Hard");
        const sortedMaps = sortMapNames(mapList);

        sel.innerHTML = '<option value="all" style="color: #fca5a5; background: #1a0806; font-weight: 800;">🗺️ All Maps (' + sortedMaps.length + ')</option>';
        sortedMaps.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m;
            const color = MAP_COLORS[m] || "#fca5a5";
            opt.innerText = "● " + m;
            opt.style.color = color;
            opt.style.background = "#1a0806";
            opt.style.fontWeight = "700";
            sel.appendChild(opt);
        });
        sel.value = (sortedMaps.includes(currentVal)) ? currentVal : "all";
    }

    function renderCommunityLeaderboard() {
        const listEl = document.getElementById("chrono-lb-list");
        if (!listEl) return;

        const searchVal = (document.getElementById("chrono-lb-search") ? document.getElementById("chrono-lb-search").value : "").trim().toLowerCase();
        const mapVal = document.getElementById("chrono-lb-filter-map") ? document.getElementById("chrono-lb-filter-map").value : "all";
        const heroVal = document.getElementById("chrono-lb-filter-hero") ? document.getElementById("chrono-lb-filter-hero").value : "all";

        const source = (currentLbMode === "duo") ? (communityHighscores.duo || {}) : (communityHighscores.solo || {});
        let rawMapNames = (mapVal === "all") ? Object.keys(source) : (source[mapVal] ? [mapVal] : []);
        rawMapNames = rawMapNames.filter(m => m !== "Endless Echo Hard" && m !== "Endless Echo 999 Hard");
        const mapNames = sortMapNames(rawMapNames);

        let totalRecordsFound = 0;
        listEl.innerHTML = "";

        mapNames.forEach(mapName => {
            const records = source[mapName] || [];
            const filteredRecords = records.filter(r => {
                if (heroVal !== "all" && r.hero && !r.hero.toLowerCase().includes(heroVal.toLowerCase())) return false;
                if (searchVal) {
                    const matchMap = mapName.toLowerCase().includes(searchVal);
                    const matchPlayer = (r.player || "").toLowerCase().includes(searchVal);
                    const matchHero = (r.hero || "").toLowerCase().includes(searchVal);
                    if (!matchMap && !matchPlayer && !matchHero) return false;
                }
                return true;
            });

            if (filteredRecords.length === 0) return;
            totalRecordsFound += filteredRecords.length;

            const mapColor = MAP_COLORS[mapName] || "#fca5a5";

            // Map Section Header if viewing All Maps
            if (mapVal === "all") {
                const secHeader = document.createElement("div");
                secHeader.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; margin-top: 6px; background: rgba(239, 68, 68, 0.08); border-left: 3px solid " + mapColor + "; border-radius: 4px;";
                secHeader.innerHTML = '<span style="font-weight: 800; font-size: 13px; color: ' + mapColor + ';">' + mapName + '</span>' +
                                      '<span style="font-size: 10px; color: #94a3b8; font-weight: 600;">' + filteredRecords.length + ' records</span>';
                listEl.appendChild(secHeader);
            }

            filteredRecords.forEach((rec, idx) => {
                const card = document.createElement("div");
                card.style.cssText = "background: linear-gradient(135deg, rgba(36, 12, 10, 0.8) 0%, rgba(20, 7, 6, 0.9) 100%); border: 1px solid rgba(239, 68, 68, 0.22); border-radius: 10px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; transition: all 0.15s ease;";
                card.onmouseover = () => { card.style.borderColor = "rgba(239, 68, 68, 0.5)"; card.style.boxShadow = "0 4px 18px rgba(0,0,0,0.6)"; };
                card.onmouseout = () => { card.style.borderColor = "rgba(239, 68, 68, 0.22)"; card.style.boxShadow = "none"; };

                const placeStr = rec.place || "#" + (idx + 1);
                const rankBadge = (placeStr === "1st" || placeStr === "1" || (!rec.place && idx === 0)) ? '<span style="color: #fde047; font-weight: 900; font-size: 14px; text-shadow: 0 0 8px rgba(253,224,71,0.5);">🥇 ' + placeStr + '</span>' :
                                  (placeStr === "2nd" || placeStr === "2" || (!rec.place && idx === 1)) ? '<span style="color: #e2e8f0; font-weight: 900; font-size: 14px; text-shadow: 0 0 8px rgba(226,232,240,0.5);">🥈 ' + placeStr + '</span>' :
                                  (placeStr === "3rd" || placeStr === "3" || (!rec.place && idx === 2)) ? '<span style="color: #fb923c; font-weight: 900; font-size: 14px; text-shadow: 0 0 8px rgba(251,146,60,0.5);">🥉 ' + placeStr + '</span>' :
                                  ('<span style="color: #94a3b8; font-weight: 700; font-size: 12px;">' + placeStr + '</span>');

                const heroName = rec.hero || "Unknown";
                const heroColor = HERO_COLORS[heroName] || "#fca5a5";
                const playerName = rec.player || "Unknown";
                const playerInitial = playerName.charAt(0).toUpperCase();
                const timeStr = rec.time || "--";

                card.innerHTML = 
                    '<div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">' +
                        '<div style="min-width: 42px; display: flex; align-items: center; justify-content: center;">' + rankBadge + '</div>' +
                        '<div style="flex: 1; min-width: 0;">' +
                            '<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">' +
                                '<span style="color: ' + mapColor + '; font-weight: 800; font-size: 13px;">' + mapName + '</span>' +
                                '<span style="background: ' + heroColor + '18; color: ' + heroColor + '; border: 1px solid ' + heroColor + '55; font-size: 10px; padding: 1px 7px; border-radius: 5px; font-weight: 800;">' + heroName + '</span>' +
                            '</div>' +
                            '<div style="font-size: 12px; color: #cbd5e1; margin-top: 4px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">' +
                                '<div style="display: flex; align-items: center; gap: 6px;">' +
                                    '<div style="width: 18px; height: 18px; border-radius: 50%; background: linear-gradient(135deg, #b91c1c, #dc2626); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; color: #fff;">' + playerInitial + '</div>' +
                                    '<span style="color: #f8fafc; font-weight: 700;">' + playerName + '</span>' +
                                '</div>' +
                                '<span>⏱️ Time: <b style="color: #34d399; font-weight: 800; font-size: 13px;">' + timeStr + '</b></span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div style="display: flex; gap: 6px;">' +
                        '<a href="' + (currentLbMode === "duo" ? "https://docs.google.com/spreadsheets/d/1iNQsgPGu0xtSNyKEBDt8jr9EQfjD4Djn4e-qL7ljrRc/edit?gid=759130778" : "https://docs.google.com/spreadsheets/d/1iNQsgPGu0xtSNyKEBDt8jr9EQfjD4Djn4e-qL7ljrRc/edit?gid=951285843") + '" target="_blank" style="text-decoration: none; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fca5a5; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 600; cursor: pointer;">🔗 Sheet</a>' +
                    '</div>';

                listEl.appendChild(card);
            });
        });

        if (totalRecordsFound === 0) {
            listEl.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 40px; font-size: 13px;">No community records found matching your filters.</div>';
        }
    }

    function parseCSVTable(csvText, isDuo) {
        const lines = csvText.split(/\r?\n/).map(l => {
            const cells = [];
            let curr = "", inQuote = false;
            for (let i = 0; i < l.length; i++) {
                const c = l[i];
                if (c === '"') inQuote = !inQuote;
                else if (c === ',' && !inQuote) { cells.push(curr); curr = ""; }
                else curr += c;
            }
            cells.push(curr);
            return cells;
        });

        const dataByMap = {};
        for (let r = 0; r < lines.length; r++) {
            const row = lines[r];
            for (let c = 0; c < row.length; c++) {
                if ((row[c] || "").trim().toLowerCase() === "place") {
                    let mapName = "";
                    if (r > 0 && lines[r-1][c] && lines[r-1][c].trim()) mapName = lines[r-1][c].trim();
                    else if (r > 1 && lines[r-2][c] && lines[r-2][c].trim()) mapName = lines[r-2][c].trim();

                    if (!mapName || ["place", "time", "player", "players", "hero", "heroes", "template"].includes(mapName.toLowerCase())) continue;
                    mapName = mapName.split('\n')[0].trim();
                    if (!mapName) continue;

                    // Normalize names
                    if (mapName.startsWith("Pristine Purgatory")) mapName = "Pristine Purgatory";
                    if (mapName === "Endless Echo Hard" || mapName === "Endless Echo 999 Hard") continue;
                    if (isDuo && mapName === "Endless Echo") mapName = "Endless Echo 999";

                    const records = [];
                    for (let d = r + 1; d < lines.length; d++) {
                        const dRow = lines[d];
                        if (!dRow || dRow.length <= c) break;
                        const place = (dRow[c] || "").trim();
                        if (!place || ["place", "template"].includes(place.toLowerCase())) break;
                        const timeVal = (dRow[c+1] || "").trim();
                        const playerVal = (dRow[c+2] || "").trim();
                        const heroVal = (dRow[c+3] || "").trim();
                        if (timeVal || playerVal) {
                            records.push({ place, time: timeVal, player: playerVal, hero: heroVal });
                        }
                    }
                    if (records.length > 0) {
                        if (!dataByMap[mapName]) dataByMap[mapName] = records;
                        else dataByMap[mapName].push(...records);
                    }
                }
            }
        }
        return dataByMap;
    }

    async function syncGoogleSheetsHighscores() {
        const syncStatus = document.getElementById("chrono-lb-sync-status");
        if (syncStatus) syncStatus.innerText = "⏳ Synchronizing live records with Google Sheets...";

        try {
            const soloUrl = "https://docs.google.com/spreadsheets/d/1iNQsgPGu0xtSNyKEBDt8jr9EQfjD4Djn4e-qL7ljrRc/export?format=csv&gid=951285843";
            const duoUrl = "https://docs.google.com/spreadsheets/d/1iNQsgPGu0xtSNyKEBDt8jr9EQfjD4Djn4e-qL7ljrRc/export?format=csv&gid=759130778";

            const [soloSvg, duoSvg] = await Promise.all([
                fetch(soloUrl).then(r => r.text()),
                fetch(duoUrl).then(r => r.text())
            ]);

            const soloParsed = parseCSVTable(soloSvg, false);
            const duoParsed = parseCSVTable(duoSvg, true);

            if (Object.keys(soloParsed).length > 0) communityHighscores.solo = soloParsed;
            if (Object.keys(duoParsed).length > 0) communityHighscores.duo = duoParsed;

            populateLeaderboardMapSelect();
            renderCommunityLeaderboard();
            if (syncStatus) syncStatus.innerHTML = "✅ <b>Live Synchronized:</b> " + Object.keys(communityHighscores.solo).length + " Solo maps, " + Object.keys(communityHighscores.duo).length + " Duo maps loaded directly from Google Sheets.";
        } catch(e) {
            console.error("Live Google Sheet sync error:", e);
            if (syncStatus) syncStatus.innerHTML = "⚠️ <b>Cached Synchronized:</b> Using official archived records (" + e.message + ").";
            renderCommunityLeaderboard();
        }
    }

    function setLeaderboardMode(mode) {
        currentLbMode = mode;
        const btnSolo = document.getElementById("chrono-lb-btn-solo");
        const btnDuo = document.getElementById("chrono-lb-btn-duo");
        const extLink = document.getElementById("chrono-lb-ext-link");
        if (btnSolo && btnDuo) {
            if (mode === "solo") {
                btnSolo.style.background = "linear-gradient(135deg, #b91c1c, #dc2626)";
                btnSolo.style.color = "#ffffff";
                btnSolo.style.borderColor = "#f87171";
                btnDuo.style.background = "transparent";
                btnDuo.style.color = "#fca5a5";
                btnDuo.style.borderColor = "transparent";
                if (extLink) extLink.href = "https://docs.google.com/spreadsheets/d/1iNQsgPGu0xtSNyKEBDt8jr9EQfjD4Djn4e-qL7ljrRc/edit?gid=951285843";
            } else {
                btnDuo.style.background = "linear-gradient(135deg, #b91c1c, #dc2626)";
                btnDuo.style.color = "#ffffff";
                btnDuo.style.borderColor = "#f87171";
                btnSolo.style.background = "transparent";
                btnSolo.style.color = "#fca5a5";
                btnSolo.style.borderColor = "transparent";
                if (extLink) extLink.href = "https://docs.google.com/spreadsheets/d/1iNQsgPGu0xtSNyKEBDt8jr9EQfjD4Djn4e-qL7ljrRc/edit?gid=759130778";
            }
        }
        populateLeaderboardMapSelect();
        renderCommunityLeaderboard();
    }

    function toggleRunsWindow() {
        const win = document.getElementById("chrono-runs-window");
        if (!win) return;
        const isOpen = (win.style.display === "flex");
        win.style.display = isOpen ? "none" : "flex";
        if (!isOpen && liveRunsData.length === 0) {
            fetchLiveRuns(1);
        }
    }

    function toggleLeaderboardWindow() {
        const win = document.getElementById("chrono-leaderboard-window");
        if (!win) return;
        const isOpen = (win.style.display === "flex");
        win.style.display = isOpen ? "none" : "flex";
        if (!isOpen) {
            freezePlayerMovement();
            populateLeaderboardMapSelect();
            renderCommunityLeaderboard();
        }
    }

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
                watermark.innerHTML = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAHyklEQVR4nO1WbUyTWRY+9962Lx8VpDgoUBCFBXVhRiGVgDraUFcdSVQ+1BWrE2LoEiGwG6kS5Wsd3SEkkhJHKLJIlvUDoyWAcQDdFjBUoOq6qYiYieJ2cXAChYqApeW9+0Nft6Blsr92f8xJ3h/3fe+55znPc865L8Av9j82NO9HhAAhBCzLAgCAn58fKSoqSgkLC1s7MDBg9PDwEDEM4+bu7u51//7926Ojo+bnz5//69mzZ8OdnZ2vCSFAKf3g/7MAMMaAEPrIKTMz8wtCCJZKpV9lZWUVDwwM2Ht6emqGh4f/qVAoikwm08ytW7eKJyYmxnp7e+9FRERE3759u6msrOwfXCKU0v+OAR6PB76+vmTPnj2RL168+DEwMHCJTCbbYTQauyQSiayrq6u5oaGhMy8v7wiPxxOMjo6+MhgMneXl5fdCQkJcqqurz4+Pjw8rlcoTBoNhghACMzMz8wMIDw93iYyM9F+2bJnY398/UCwW/8rb21usVCr/sGXLlrVTU1NTjx8/fqbT6V6OjY1RlmWBYRgQCoVoZGSESqVSr2PHjuUIBAJXPz+/VSkpKQkXLlz46+HDh7/u6OiwYIznlQPa29vLioqKpPn5+V/GxcWJAACCg4P5g4ODD9LS0lZ+hB59mkCMMVRVVR2Mj49fHBAQQFpbW791dXWd1wcAAPR6fSUhBBYsWIBiYmIWcACuXr36ewAAhmEAYwwYYxAIBLMern74fD4ghMDT0xPV1tb+TqvVnunv728pKCiY6OHhgTDGs8E6Lmpra1X37t270t3d3fTo0aM3oaGhAowx+Pj4BPn5+RGr1fqhK6anp2c9LMsCQghsNhsAAFgsFiqXyyssFstP6enpe9++fWvNzs7eMK8EAADXr1/PiYuLEy1dupQ3NDRkFIvFJCsra7VcLl/OoY+KinKrrq5OrampOVRTU3OosrJSHhYWJnCUhs/nAwDAvn37gq5cuZKFMYbLly9nRkdHCx3j8RwXMplMRAjh6fV6c35+/ha73W61Wq3UZDL9JJFIIliWfRYeHu6iVqvVKpWqwGQymd9rjk6cOJFqt9ttCoXiz9PT02C324EQAnV1dQOpqanidevWeVJKKcMwxGn2R44ckRQUFGwEANBoNEc59GlpaSsDAwN5K1euZMrLy3/r6+uL5/oihKCwsHBTTU3NIYFAAAghIORdrM2bN3u/fPny73V1ddmnT5/+jVMALS0tp1esWCHIyMj4XK1W7xcKhSg1NTU0ICCAYIxBp9OVhoeHuwAAEEI+FKRjZTc2Np7gOogDIBQKUVNTUz4AwJ07d75zCqC9vb0MAKC7u7s6MDBwljw7d+70raioSOGynWsYYyCEgEwmE1VWVsoBAASCd2UhEomQXq+vBABoa2tTzfKbQyPGGMObN2/MFotlBiEEbm5ugDGGxMTEHbW1tU1zM3a0mZkZsNlsLMMwro7vzWYzra+vr8rNzY0xm80vnQJgWXaGUgqUUooxBkop2O12YFkW6Pth7mymOyQBlNKPes1ms9mSk5Mzh4aGXjgF4OLiIqSUgoeHx2eurq74PSgAANDpdNpdu3ZtfA/wk8F5PB6wLEtZlmX5fP6HoeTl5YWSkpLSZDJZSkhIyGqnAJ4+fdojEAjAaDS2y+VyiSPVDQ0NP0RGRkoXLVqEKaUfFSHLsmC320GhUOzXarU6m80GExMTQCkFm80Gk5OTFrPZTD09PX2c0peSkhKkUChWubu7Q0tLy2kA+JAFAMDq1atdVSpVwpIlSz5qQwCAwsLCTdeuXTuycOFCdPbs2d319fXHQkNDBVKp1MtkMvVoNJqjVVVVB2ex5riYmpqajo2NjZ6cnHzs7e0dEBER4dLb2/uWu0ofPnw41dfX96SxsbFapVIVDg4OjgEAEEJwRkZGGkIIJScn/yk7O3vtwMDA8xs3bmjb2tq6e3p6rhYXFx9KSEj4Oj09vcQpA0KhEGk0mqM+Pj5469ati7Ra7RlOW8fBsnz5cr5ard7vOIrj4uJEHFMlJSXxiYmJ/gghsFqt4xKJxJ3P54NGoznqjL1ZMjQ3N59yc3ODmzdv/vHkyZNx77MEQsi81yknV0ZGxudKpTIaIQQdHR1nt23b9llBQcFG7iynxmWo0+lKZTKZCODddDx16tRmxyCfuo4JIcAwDBBCIDY2dkFxcfFXDMNAbm5uTGdnZ4XBYPiLTqcrvXTpUoZTAFx2mzZtWvjkyZPv16xZ4woA0Nra+m1dXV02t/45y8nJWTsyMvLD3LsfAODu3bvnZ8Wcu4H7bZLJZKJz585d2bt3784HDx5MHjhwIDgvL0+t1+uv5ufnV4+Pj89wgCml4OXlxdu+ffuqhISE1NHR0R9LSkq+i4+Pj1m8eLG/v79/CKWURQjh169fD+/evbvUKQCOZpvNBlKp1KukpKTs4sWLpaWlpQ8AAJKSksSZmZnK6enpKR6PJwB4N0F5PJ6gq6ur+fjx4zftdjusX7/e4/z585ezs7MP9vX1jXF/xq9evbJbrVbnDHDGtV5QUBAvJycnMSQk5AuDwaA9c+bM38xms9N5rFQqo6OiomIAAL755psKo9H41tneeQEA/EcOAIANGzZ47tix48vg4OBfe3t7izlKHfdTStn+/n6DRqP5vrm5edjxDEe5frH/K/s3pa9dMCwtpVIAAAAASUVORK5CYII=" style="width: 18px; height: 18px; object-fit: contain;" /><span>TOURNY • MODE</span>';
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
                    '<img id="chrono-tour-header-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAHyklEQVR4nO1WbUyTWRY+9962Lx8VpDgoUBCFBXVhRiGVgDraUFcdSVQ+1BWrE2LoEiGwG6kS5Wsd3SEkkhJHKLJIlvUDoyWAcQDdFjBUoOq6qYiYieJ2cXAChYqApeW9+0Nft6Blsr92f8xJ3h/3fe+55znPc865L8Av9j82NO9HhAAhBCzLAgCAn58fKSoqSgkLC1s7MDBg9PDwEDEM4+bu7u51//7926Ojo+bnz5//69mzZ8OdnZ2vCSFAKf3g/7MAMMaAEPrIKTMz8wtCCJZKpV9lZWUVDwwM2Ht6emqGh4f/qVAoikwm08ytW7eKJyYmxnp7e+9FRERE3759u6msrOwfXCKU0v+OAR6PB76+vmTPnj2RL168+DEwMHCJTCbbYTQauyQSiayrq6u5oaGhMy8v7wiPxxOMjo6+MhgMneXl5fdCQkJcqqurz4+Pjw8rlcoTBoNhghACMzMz8wMIDw93iYyM9F+2bJnY398/UCwW/8rb21usVCr/sGXLlrVTU1NTjx8/fqbT6V6OjY1RlmWBYRgQCoVoZGSESqVSr2PHjuUIBAJXPz+/VSkpKQkXLlz46+HDh7/u6OiwYIznlQPa29vLioqKpPn5+V/GxcWJAACCg4P5g4ODD9LS0lZ+hB59mkCMMVRVVR2Mj49fHBAQQFpbW791dXWd1wcAAPR6fSUhBBYsWIBiYmIWcACuXr36ewAAhmEAYwwYYxAIBLMern74fD4ghMDT0xPV1tb+TqvVnunv728pKCiY6OHhgTDGs8E6Lmpra1X37t270t3d3fTo0aM3oaGhAowx+Pj4BPn5+RGr1fqhK6anp2c9LMsCQghsNhsAAFgsFiqXyyssFstP6enpe9++fWvNzs7eMK8EAADXr1/PiYuLEy1dupQ3NDRkFIvFJCsra7VcLl/OoY+KinKrrq5OrampOVRTU3OosrJSHhYWJnCUhs/nAwDAvn37gq5cuZKFMYbLly9nRkdHCx3j8RwXMplMRAjh6fV6c35+/ha73W61Wq3UZDL9JJFIIliWfRYeHu6iVqvVKpWqwGQymd9rjk6cOJFqt9ttCoXiz9PT02C324EQAnV1dQOpqanidevWeVJKKcMwxGn2R44ckRQUFGwEANBoNEc59GlpaSsDAwN5K1euZMrLy3/r6+uL5/oihKCwsHBTTU3NIYFAAAghIORdrM2bN3u/fPny73V1ddmnT5/+jVMALS0tp1esWCHIyMj4XK1W7xcKhSg1NTU0ICCAYIxBp9OVhoeHuwAAEEI+FKRjZTc2Np7gOogDIBQKUVNTUz4AwJ07d75zCqC9vb0MAKC7u7s6MDBwljw7d+70raioSOGynWsYYyCEgEwmE1VWVsoBAASCd2UhEomQXq+vBABoa2tTzfKbQyPGGMObN2/MFotlBiEEbm5ugDGGxMTEHbW1tU1zM3a0mZkZsNlsLMMwro7vzWYzra+vr8rNzY0xm80vnQJgWXaGUgqUUooxBkop2O12YFkW6Pth7mymOyQBlNKPes1ms9mSk5Mzh4aGXjgF4OLiIqSUgoeHx2eurq74PSgAANDpdNpdu3ZtfA/wk8F5PB6wLEtZlmX5fP6HoeTl5YWSkpLSZDJZSkhIyGqnAJ4+fdojEAjAaDS2y+VyiSPVDQ0NP0RGRkoXLVqEKaUfFSHLsmC320GhUOzXarU6m80GExMTQCkFm80Gk5OTFrPZTD09PX2c0peSkhKkUChWubu7Q0tLy2kA+JAFAMDq1atdVSpVwpIlSz5qQwCAwsLCTdeuXTuycOFCdPbs2d319fXHQkNDBVKp1MtkMvVoNJqjVVVVB2ex5riYmpqajo2NjZ6cnHzs7e0dEBER4dLb2/uWu0ofPnw41dfX96SxsbFapVIVDg4OjgEAEEJwRkZGGkIIJScn/yk7O3vtwMDA8xs3bmjb2tq6e3p6rhYXFx9KSEj4Oj09vcQpA0KhEGk0mqM+Pj5469ati7Ra7RlOW8fBsnz5cr5ard7vOIrj4uJEHFMlJSXxiYmJ/gghsFqt4xKJxJ3P54NGoznqjL1ZMjQ3N59yc3ODmzdv/vHkyZNx77MEQsi81yknV0ZGxudKpTIaIQQdHR1nt23b9llBQcFG7iynxmWo0+lKZTKZCODddDx16tRmxyCfuo4JIcAwDBBCIDY2dkFxcfFXDMNAbm5uTGdnZ4XBYPiLTqcrvXTpUoZTAFx2mzZtWvjkyZPv16xZ4woA0Nra+m1dXV02t/45y8nJWTsyMvLD3LsfAODu3bvnZ8Wcu4H7bZLJZKJz585d2bt3784HDx5MHjhwIDgvL0+t1+uv5ufnV4+Pj89wgCml4OXlxdu+ffuqhISE1NHR0R9LSkq+i4+Pj1m8eLG/v79/CKWURQjh169fD+/evbvUKQCOZpvNBlKp1KukpKTs4sWLpaWlpQ8AAJKSksSZmZnK6enpKR6PJwB4N0F5PJ6gq6ur+fjx4zftdjusX7/e4/z585ezs7MP9vX1jXF/xq9evbJbrVbnDHDGtV5QUBAvJycnMSQk5AuDwaA9c+bM38xms9N5rFQqo6OiomIAAL755psKo9H41tneeQEA/EcOAIANGzZ47tix48vg4OBfe3t7izlKHfdTStn+/n6DRqP5vrm5edjxDEe5frH/K/s3pa9dMCwtpVIAAAAASUVORK5CYII=" style="width: 32px; height: 32px; filter: drop-shadow(0 0 10px #c084fc);" />' +
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

    // 5. Config Management and Synchronization
    function syncUiFromConfig() {
        const engineSelect = document.getElementById("chrono-select-engine");
        if (engineSelect) engineSelect.value = currentConfig.rendering_engine || "d3d11";

        const checkboxes = [
            { id: "cfg-flag-highres-timer", key: "flag_highres_timer" },
            { id: "cfg-flag-anti-throttle", key: "flag_anti_throttle" },
            { id: "cfg-flag-audio-in-process", key: "flag_audio_in_process" },
            { id: "cfg-flag-resample-scroll", key: "flag_resample_scroll" },
            { id: "cfg-flag-accelerated-canvas", key: "flag_accelerated_canvas" },
            { id: "cfg-flag-gpu-rasterization", key: "flag_gpu_rasterization" },
            { id: "cfg-flag-anti-freeze-ipc", key: "flag_anti_freeze_ipc" },
            { id: "cfg-flag-vsync-locked", key: "flag_vsync_locked" },
            { id: "cfg-flag-custom-theme", key: "flag_custom_theme" },
            { id: "cfg-flag-single-process", key: "flag_single_process" },
            { id: "cfg-flag-disable-gpu", key: "flag_disable_gpu" },
            { id: "cfg-flag-in-process-gpu", key: "flag_in_process_gpu" },
            { id: "cfg-flag-no-sandbox", key: "flag_no_sandbox" },
            { id: "cfg-discord-rpc-enabled", key: "discord_rpc_enabled" },
            { id: "cfg-flag-raw-input-no-resample", key: "flag_raw_input_no_resample" },
            { id: "cfg-flag-windows-timer-resolution", key: "flag_windows_timer_resolution" },
            { id: "cfg-flag-disable-frame-rate-limit", key: "flag_disable_frame_rate_limit" },
            { id: "cfg-flag-zero-copy-raster", key: "flag_zero_copy_raster" },
            { id: "cfg-flag-websocket-arraybuffer", key: "flag_websocket_arraybuffer" },
            { id: "cfg-flag-tcp-nodelay-tuning", key: "flag_tcp_nodelay_tuning" }
        ];

        checkboxes.forEach(c => {
            const el = document.getElementById(c.id);
            if (el) el.checked = Boolean(currentConfig[c.key]);
        });

        updateDiscordBadge();
    }

    function updateDiscordBadge() {
        const badge = document.getElementById("chrono-discord-status-badge");
        if (!badge) return;
        if (currentConfig.discord_rpc_enabled) {
            badge.innerText = "CONNECTED";
            badge.style.background = "rgba(34, 197, 94, 0.2)";
            badge.style.borderColor = "rgba(34, 197, 94, 0.5)";
            badge.style.color = "#86efac";
        } else {
            badge.innerText = "DISABLED";
            badge.style.background = "rgba(148, 163, 184, 0.2)";
            badge.style.borderColor = "rgba(148, 163, 184, 0.4)";
            badge.style.color = "#94a3b8";
        }
    }

    function saveConfig(triggerRestartBanner) {
        localStorage.setItem("chrono_config", JSON.stringify(currentConfig));
        if (window.ipc) {
            window.ipc.postMessage(JSON.stringify({
                action: "save_config",
                config: currentConfig
            }));
        }
        if (triggerRestartBanner) {
            const banner = document.getElementById("chrono-restart-banner");
            if (banner) banner.style.display = "block";
        }
        updateDiscordBadge();
    }

    // 6. Alt Storage & Fast Switch Functions
    function getStoredAlts() {
        try {
            return JSON.parse(localStorage.getItem("chrono_alts") || "[]");
        } catch(e) {
            return [];
        }
    }

    function saveStoredAlts(alts) {
        localStorage.setItem("chrono_alts", JSON.stringify(alts));
        renderAltsList();
    }

    function showStatus(msg, isError) {
        const el = document.getElementById("chrono-status-msg");
        if (!el) return;
        el.style.display = "block";
        el.innerText = msg;
        if (isError) {
            el.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
            el.style.border = "1px solid rgba(239, 68, 68, 0.5)";
            el.style.color = "#fca5a5";
        } else {
            el.style.backgroundColor = "rgba(34, 197, 94, 0.2)";
            el.style.border = "1px solid rgba(34, 197, 94, 0.5)";
            el.style.color = "#86efac";
        }
    }

    function getCookie(name) {
        const value = "; " + document.cookie;
        const parts = value.split("; " + name + "=");
        if (parts.length === 2) return parts.pop().split(";").shift();
        return null;
    }

    async function loginWithAlt(username, password) {
        showStatus("Connecting to " + username + "...");
        try {
            const csrf = getCookie("csrf_token");
            const headers = {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            };
            if (csrf) headers["X-CSRF-Token"] = csrf;

            // 1. Logout current session
            await fetch("/api/auth/logout", {
                method: "POST",
                headers: headers,
                body: JSON.stringify({}),
                credentials: "same-origin"
            });

            // 2. Login to target alt
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: headers,
                body: JSON.stringify({ username: username, password: password }),
                credentials: "same-origin"
            });

            const data = await res.json();
            if (data && (data.success || data.username || data.user || res.ok)) {
                showStatus("✅ Connected as " + username + "! Reloading...");
                setTimeout(() => location.reload(), 350);
            } else {
                showStatus("❌ Error: " + (data.error || data.message || "Invalid credentials"), true);
            }
        } catch(err) {
            showStatus("❌ Network error: " + err.message, true);
        }
    }

    async function logoutGuest() {
        showStatus("Switching to guest mode...");
        try {
            const csrf = getCookie("csrf_token");
            const headers = {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            };
            if (csrf) headers["X-CSRF-Token"] = csrf;

            await fetch("/api/auth/logout", {
                method: "POST",
                headers: headers,
                body: JSON.stringify({}),
                credentials: "same-origin"
            });
            showStatus("✅ Guest mode enabled! Reloading...");
            setTimeout(() => location.reload(), 300);
        } catch(e) {
            location.reload();
        }
    }

    // Scripts Folder Management & Renderer (Global Closure Scope)
    function getEnabledScriptMap() {
        try {
            return JSON.parse(localStorage.getItem("chrono_enabled_scripts") || "{}");
        } catch(e) { return {}; }
    }
    function saveEnabledScriptMap(map) {
        localStorage.setItem("chrono_enabled_scripts", JSON.stringify(map));
    }

    function executeScript(scriptObj) {
        if (localStorage.getItem("chrono_tournament_mode") === "true") {
            console.warn("[Chrono Tournament Lockdown] Script execution blocked:", scriptObj ? scriptObj.filename : "unknown");
            return;
        }
        if (!scriptObj || !scriptObj.code) return;
        try {
            (new Function(scriptObj.code))();
            console.log("[Chrono] Executed script:", scriptObj.filename);
        } catch(err) {
            console.error("[Chrono Script Error (" + scriptObj.filename + ")]", err);
        }
    }

    function renderCustomScriptsList() {
        const listEl = document.getElementById("chrono-user-scripts-list");
        const countBadge = document.getElementById("chrono-scripts-count-badge");
        if (!listEl) return;
        const isTourActive = (localStorage.getItem("chrono_tournament_mode") === "true");
        const enabledMap = getEnabledScriptMap();
        const scripts = window._chrono_loaded_scripts || INITIAL_CHRONO_SCRIPTS || [];

        if (countBadge) {
            countBadge.textContent = scripts.length + " script" + (scripts.length > 1 ? "s" : "");
        }

        listEl.innerHTML = "";

        if (isTourActive) {
            const tourNotice = document.createElement("div");
            tourNotice.style.background = "linear-gradient(135deg, rgba(88, 28, 135, 0.4) 0%, rgba(59, 7, 100, 0.6) 100%)";
            tourNotice.style.border = "1px solid rgba(168, 85, 247, 0.4)";
            tourNotice.style.borderRadius = "8px";
            tourNotice.style.padding = "10px 14px";
            tourNotice.style.color = "#f5d0fe";
            tourNotice.style.fontSize = "11.5px";
            tourNotice.style.display = "flex";
            tourNotice.style.alignItems = "center";
            tourNotice.style.gap = "8px";
            tourNotice.style.marginBottom = "8px";
            tourNotice.innerHTML = '<span style="font-size: 16px;">🏆</span><span><b>Tournament Mode Active:</b> All custom scripts and dynamic execution are strictly locked and forbidden.</span>';
            listEl.appendChild(tourNotice);
        }

        if (scripts.length === 0) {
            const emptyEl = document.createElement("div");
            emptyEl.style.color = "#64748b";
            emptyEl.style.fontSize = "11px";
            emptyEl.style.textAlign = "center";
            emptyEl.style.padding = "12px";
            emptyEl.style.background = "rgba(3,15,13,0.5)";
            emptyEl.style.borderRadius = "8px";
            emptyEl.innerHTML = "No scripts found in <code>scripts/</code> folder. Click <b>📂 Open scripts/ Folder</b> to add scripts!";
            listEl.appendChild(emptyEl);
            return;
        }

        scripts.forEach((s) => {
            const isEnabled = Boolean(enabledMap[s.filename]) && !isTourActive;
            const row = document.createElement("div");
            row.style.background = "rgba(3, 15, 13, 0.75)";
            row.style.border = isEnabled ? "1px solid rgba(52, 211, 153, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)";
            row.style.borderRadius = "8px";
            row.style.padding = "8px 12px";
            row.style.display = "flex";
            row.style.justifyContent = "space-between";
            row.style.alignItems = "center";
            row.style.fontSize = "11.5px";
            row.style.transition = "all 0.2s ease";
            if (isTourActive) row.style.opacity = "0.6";

            row.innerHTML = 
                '<div style="display: flex; align-items: center; gap: 8px;">' +
                    '<span style="font-size: 14px;">📜</span>' +
                    '<div>' +
                        '<b style="color: ' + (isEnabled ? '#34d399' : '#e2e8f0') + ';">' + s.filename + '</b>' +
                        '<div style="color: #64748b; font-size: 10px;">' + (s.code ? s.code.length : 0) + ' bytes • ' + (isTourActive ? '🔒 Locked (Tourny)' : (isEnabled ? '🟢 Active' : '⚪ Inactive')) + '</div>' +
                    '</div>' +
                '</div>' +
                '<div style="display: flex; gap: 10px; align-items: center;">' +
                    '<button class="chrono-btn-run-once" ' + (isTourActive ? 'disabled style="opacity: 0.4; cursor: not-allowed; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.2); color: #94a3b8; padding: 4px 10px; border-radius: 6px; font-size: 10.5px;"' : 'style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); color: #38bdf8; padding: 4px 10px; border-radius: 6px; font-size: 10.5px; font-weight: 700; cursor: pointer;"') + '>▶️ Run</button>' +
                    '<label style="display: flex; align-items: center; gap: 6px; ' + (isTourActive ? 'cursor: not-allowed; opacity: 0.5;' : 'cursor: pointer;') + ' font-weight: 700; color: ' + (isEnabled ? '#34d399' : '#94a3b8') + ';">' +
                        '<span>' + (isEnabled ? 'ON' : 'OFF') + '</span>' +
                        '<input type="checkbox" ' + (isTourActive ? 'disabled' : '') + ' ' + (isEnabled ? 'checked' : '') + ' style="accent-color: #10b981; width: 16px; height: 16px;' + (isTourActive ? 'cursor: not-allowed;' : 'cursor: pointer;') + '" />' +
                    '</label>' +
                '</div>';

            const chk = row.querySelector("input[type='checkbox']");
            const runBtn = row.querySelector(".chrono-btn-run-once");

            if (chk && !isTourActive) {
                chk.onchange = () => {
                    enabledMap[s.filename] = chk.checked;
                    saveEnabledScriptMap(enabledMap);
                    if (chk.checked) {
                        executeScript(s);
                    }
                    renderCustomScriptsList();
                };
            }
            if (runBtn && !isTourActive) {
                runBtn.onclick = () => {
                    executeScript(s);
                };
            }

            listEl.appendChild(row);
        });
    }

    function renderAltsList() {
        const alts = getStoredAlts();
        const listEl = document.getElementById("chrono-alts-list");
        const countEl = document.getElementById("chrono-alts-count");
        if (countEl) countEl.innerText = alts.length;
        if (!listEl) return;

        if (alts.length === 0) {
            listEl.innerHTML = 
                '<div style="padding: 20px; text-align: center; color: #64748b; font-size: 12px; background: rgba(7, 26, 23, 0.4); border-radius: 8px; border: 1px dashed rgba(52,211,153,0.15);">' +
                    'No accounts saved yet.<br>Add your accounts above to switch in 1 click!' +
                '</div>';
            return;
        }

        listEl.innerHTML = "";
        alts.forEach((alt, index) => {
            const card = document.createElement("div");
            card.style.background = "linear-gradient(90deg, rgba(5, 150, 105, 0.2) 0%, rgba(7, 26, 23, 0.6) 100%)";
            card.style.border = "1px solid rgba(52, 211, 153, 0.25)";
            card.style.borderRadius = "8px";
            card.style.padding = "8px 12px";
            card.style.display = "flex";
            card.style.alignItems = "center";
            card.style.justifyContent = "space-between";
            card.style.gap = "8px";

            const initial = (alt.username || "?").charAt(0).toUpperCase();
            const tagBadge = alt.tag ? ('<span style="background: rgba(5, 150, 105, 0.3); color: #6ee7b7; border: 1px solid rgba(52, 211, 153, 0.4); font-size: 9px; padding: 1px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase;">' + alt.tag + '</span>') : "";

            card.innerHTML = 
                '<div style="display: flex; align-items: center; gap: 10px;">' +
                    '<div style="width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #059669, #10b981); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; color: #ffffff; box-shadow: 0 0 8px rgba(16, 185, 129, 0.35);">' + initial + '</div>' +
                    '<div>' +
                        '<div style="font-weight: 700; font-size: 12px; color: #f8fafc; display: flex; align-items: center; gap: 6px;">' +
                            alt.username + ' ' + tagBadge +
                        '</div>' +
                        '<div style="font-size: 10px; color: #64748b;">••••••••</div>' +
                    '</div>' +
                '</div>' +
                '<div style="display: flex; gap: 6px;">' +
                    '<button class="chrono-btn-switch" style="' +
                        'background: linear-gradient(135deg, #059669, #047857);' +
                        'border: 1px solid rgba(110, 231, 183, 0.4);' +
                        'color: #ffffff; padding: 5px 12px; border-radius: 6px;' +
                        'font-size: 11px; font-weight: 700; cursor: pointer;' +
                    '">⚡ Switch</button>' +
                    '<button class="chrono-btn-del" style="' +
                        'background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3);' +
                        'color: #fca5a5; padding: 5px 8px; border-radius: 6px;' +
                        'font-size: 11px; cursor: pointer;' +
                    '">🗑️</button>' +
                '</div>';

            card.querySelector(".chrono-btn-switch").onclick = () => loginWithAlt(alt.username, alt.password);
            card.querySelector(".chrono-btn-del").onclick = () => {
                if (confirm("Delete account \"" + alt.username + "\" from list?")) {
                    const current = getStoredAlts();
                    current.splice(index, 1);
                    saveStoredAlts(current);
                }
            };

            listEl.appendChild(card);
        });
    }

    function isAnyMenuOpen() {
        if (window._chrono_hud_editing) return true;
        const modal = document.getElementById("chrono-menu-modal");
        if (modal && modal.style.display !== "none" && modal.style.display !== "") return true;
        const runsWin = document.getElementById("chrono-runs-window");
        if (runsWin && runsWin.style.display !== "none" && runsWin.style.display !== "") return true;
        const lbWin = document.getElementById("chrono-leaderboard-window");
        if (lbWin && lbWin.style.display !== "none" && lbWin.style.display !== "") return true;
        const tourWin = document.getElementById("chrono-tournament-window");
        if (tourWin && tourWin.style.display !== "none" && tourWin.style.display !== "") return true;
        const inGameModal = document.getElementById("modal");
        if (inGameModal && inGameModal.style.display !== "none" && inGameModal.children.length > 0) return true;
        const questsWin = document.getElementById("quests-window");
        if (questsWin && questsWin.style.display !== "none" && questsWin.style.display !== "") return true;
        return false;
    }

    function freezePlayerMovement() {
        window._chrono_is_internal_freeze = true;
        const movementKeys = ["w", "a", "s", "d", "W", "A", "S", "D", "z", "x", "c", "Z", "X", "C", "1", "2", "3", "4", "5", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "];
        movementKeys.forEach(k => {
            try {
                window.dispatchEvent(new KeyboardEvent("keyup", { key: k, code: k.toUpperCase(), bubbles: true }));
            } catch(e) {}
        });
        const canvas = document.getElementById("canvas");
        if (canvas) {
            try {
                canvas.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
            } catch(e) {}
        }
        setTimeout(() => {
            window._chrono_is_internal_freeze = false;
        }, 100);
    }

    function toggleChronoMenu() {
        const modal = document.getElementById("chrono-menu-modal");
        if (!modal) return;
        if (modal.style.display === "none" || modal.style.display === "") {
            freezePlayerMovement();
            modal.style.display = "flex";
            syncUiFromConfig();
            renderAltsList();
            renderCustomScriptsList();
        } else {
            modal.style.display = "none";
        }
    }

    // 7. Setup Modal Events & Listeners
    function attachChronoUI() {
        // Inject Custom Nordic Emerald Chronos Theme CSS (Universal across all pages & in-game HUD)
        if (!document.getElementById("chrono-artem-theme")) {
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

        if (!document.body) return;

        if (!document.getElementById("chrono-fps-hud")) {
            document.body.appendChild(fpsDiv);
            requestAnimationFrame(countFps);
        }

        // 1. Hourglass Launcher (Settings & Client Hub)
        if (!document.getElementById("chrono-hourglass-launcher")) {
            const hourglassBtn = document.createElement("div");
            hourglassBtn.id = "chrono-hourglass-launcher";
            hourglassBtn.title = "Chrono Client Hub & Settings (ESC)";
            hourglassBtn.style.position = "fixed";
            hourglassBtn.style.bottom = "10px";
            hourglassBtn.style.right = "136px";
            hourglassBtn.style.width = "32px";
            hourglassBtn.style.height = "32px";
            hourglassBtn.style.cursor = "pointer";
            hourglassBtn.style.zIndex = "1000";
            hourglassBtn.style.display = "flex";
            hourglassBtn.style.alignItems = "center";
            hourglassBtn.style.justifyContent = "center";
            hourglassBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="transition: all 0.2s ease;"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>';
            hourglassBtn.onmouseover = () => {
                const svg = hourglassBtn.querySelector("svg");
                if (svg) {
                    svg.style.stroke = "#34d399";
                    svg.style.filter = "drop-shadow(0 0 8px #10b981)";
                }
            };
            hourglassBtn.onmouseout = () => {
                const svg = hourglassBtn.querySelector("svg");
                if (svg) {
                    svg.style.stroke = "#94a3b8";
                    svg.style.filter = "none";
                }
            };
            hourglassBtn.onclick = () => toggleChronoMenu();
            document.body.appendChild(hourglassBtn);
        }

        // 2. Rewind Launcher (Runs & Replays)
        if (!document.getElementById("chrono-runs-launcher")) {
            const runsBtn = document.createElement("div");
            runsBtn.id = "chrono-runs-launcher";
            runsBtn.title = "Chrono Runs Archive & Replay Explorer (⏪)";
            runsBtn.style.position = "fixed";
            runsBtn.style.bottom = "10px";
            runsBtn.style.right = "178px";
            runsBtn.style.width = "32px";
            runsBtn.style.height = "32px";
            runsBtn.style.cursor = "pointer";
            runsBtn.style.zIndex = "1000";
            runsBtn.style.display = "flex";
            runsBtn.style.alignItems = "center";
            runsBtn.style.justifyContent = "center";
            runsBtn.innerHTML = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABAElEQVR4nO1VMQ7CMBBLgQEQ7JWQeEl/wl9g4xO8jAcggWArKkVKGyYqUi6J71KVgXrrYJ/jc1KlBgwQ4HDTRsrdlLnFHcXbkQ8XGaBEYngTicC5eEYPhg1IT4zCuwLXcDOdQ+KI+V5LSAHuAAectTkT8IkkZdHJcKWIBLq+ZiFYCaAiq8VMMotEk8D+aozKQdbY9snitiC6Baf7QzaNQJPA9niBSbv10vrmcNtoEtBZmkhFYrjWClAhqoRSE18d6DsJsoQhIV8JuSZ+/i9wGvCdJPQQ6SxN0CS8CbhE0HcAMRFcAec0EhNwBz6FuP8CnwlWCd9CVV2zDIRMDPhvvAAXT3AMTFrefQAAAABJRU5ErkJggg==" style="width: 28px; height: 28px; object-fit: contain;" />';
            runsBtn.onclick = () => toggleRunsWindow();
            document.body.appendChild(runsBtn);
        }

        // 3. Community Leaderboard Launcher (⚔️)
        if (!document.getElementById("chrono-leaderboard-launcher")) {
            const lbBtn = document.createElement("div");
            lbBtn.id = "chrono-leaderboard-launcher";
            lbBtn.title = "Chrono Community Leaderboard & Highscores (⚔️)";
            lbBtn.style.position = "fixed";
            lbBtn.style.bottom = "10px";
            lbBtn.style.right = "220px";
            lbBtn.style.width = "32px";
            lbBtn.style.height = "32px";
            lbBtn.style.cursor = "pointer";
            lbBtn.style.zIndex = "1000";
            lbBtn.style.display = "flex";
            lbBtn.style.alignItems = "center";
            lbBtn.style.justifyContent = "center";
            lbBtn.innerHTML = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABr0lEQVR4nO2Wy0rDQBSG/+nNNN4QRMxCcKEtTSgS3OY9uivZ5X3cdZtd3qOI1hQFUdBF8QYKCi6qTaum40Jq1UymMyHQhf12SU7O/+fMmcwBZvx3iOwLvmNTACBKEYNcHt1eDwCgKgrU8B27ew2pnMLBvmNTqPM4OTpA+NplxsytrmNL02C5nnDenKh42z8EhiE3bvD8CGiaqPZkA75j0/NOB+3WvlAyQsYf3jBLlBQU6OUKtyIZnvjF7Q2CpwchcQCg9M/1Wx8A0KzXKCOcbwAAXu7vhMUBgGSi6c5Oj7kmmAZ8x6btdktKnMfIhLCBfhAA4Ye0EJ3QpKwqcJdAmjDewOX1VapSqRHZHr5jU9Ftx8KomrBcjzTMUqTco2c/70WWoB8EicWTkGoPZBR1ugbocDhdA0lgGiAFZXoGLNcjermSLBtNcwmI9KwysQdYpyLTgOV6hCQwwMOomsz7sRXQjR0sbW6nJh43E8QasFyPbCwuoLgmN+H8IpvligOCM2GzXqO8I3UsmIOhV6VmQqH/gOV6xKiaX+vI6Y388oqo7jfSncYbrwB2p8+YweMTpzGHYPbOwEIAAAAASUVORK5CYII=" style="width: 28px; height: 28px; object-fit: contain;" />';
            lbBtn.onclick = () => toggleLeaderboardWindow();
            document.body.appendChild(lbBtn);
        }

        // 4. Tournament / Highscores Launcher (Orbit Icon 🏆) - Placed to the left of the community leaderboard
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
            tourBtn.innerHTML = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAHyklEQVR4nO1WbUyTWRY+9962Lx8VpDgoUBCFBXVhRiGVgDraUFcdSVQ+1BWrE2LoEiGwG6kS5Wsd3SEkkhJHKLJIlvUDoyWAcQDdFjBUoOq6qYiYieJ2cXAChYqApeW9+0Nft6Blsr92f8xJ3h/3fe+55znPc865L8Av9j82NO9HhAAhBCzLAgCAn58fKSoqSgkLC1s7MDBg9PDwEDEM4+bu7u51//7926Ojo+bnz5//69mzZ8OdnZ2vCSFAKf3g/7MAMMaAEPrIKTMz8wtCCJZKpV9lZWUVDwwM2Ht6emqGh4f/qVAoikwm08ytW7eKJyYmxnp7e+9FRERE3759u6msrOwfXCKU0v+OAR6PB76+vmTPnj2RL168+DEwMHCJTCbbYTQauyQSiayrq6u5oaGhMy8v7wiPxxOMjo6+MhgMneXl5fdCQkJcqqurz4+Pjw8rlcoTBoNhghACMzMz8wMIDw93iYyM9F+2bJnY398/UCwW/8rb21usVCr/sGXLlrVTU1NTjx8/fqbT6V6OjY1RlmWBYRgQCoVoZGSESqVSr2PHjuUIBAJXPz+/VSkpKQkXLlz46+HDh7/u6OiwYIznlQPa29vLioqKpPn5+V/GxcWJAACCg4P5g4ODD9LS0lZ+hB59mkCMMVRVVR2Mj49fHBAQQFpbW791dXWd1wcAAPR6fSUhBBYsWIBiYmIWcACuXr36ewAAhmEAYwwYYxAIBLMern74fD4ghMDT0xPV1tb+TqvVnunv728pKCjY6OHhgTDGs8E6Lmpra1X37t270t3d3fTo0aM3oaGhAowx+Pj4BPn5+RGr1fqhK6anp2c9LMsCQghsNhsAAFgsFiqXyyssFstP6enpe9++fWvNzs7eMK8EAADXr1/PiYuLEy1dupQ3NDRkFIvFJCsra7VcLl/OoY+KinKrrq5OrampOVRTU3OosrJSHhYWJnCUhs/nAwDAvn37gq5cuZKFMYbLly9nRkdHCx3j8RwXMplMRAjh6fV6c35+/ha73W61Wq3UZDL9JJFIIliWfRYeHu6iVqvVKpWqwGQymd9rjk6cOJFqt9ttCoXiz9PT02C324EQAnV1dQOpqanidevWeVJKKcMwxGn2R44ckRQUFGwEANBoNEc59GlpaSsDAwN5K1euZMrLy3/r6+uL5/oihKCwsHBTTU3NIYFAAAghIORdrM2bN3u/fPny73V1ddmnT5/+jVMALS0tp1esWCHIyMj4XK1W7xcKhSg1NTU0ICCAYIxBp9OVhoeHuwAAEEI+FKRjZTc2Np7gOogDIBQKUVNTUz4AwJ07d75zCqC9vb0MAKC7u7s6MDBwljw7d+70raioSOGynWsYYyCEgEwmE1VWVsoBAASCd2UhEomQXq+vBABoa2tTzfKbQyPGGMObN2/MFotlBiEEbm5ugDGGxMTEHbW1tU1zM3a0mZkZsNlsLMMwro7vzWYzra+vr8rNzY0xm80vnQJgWXaGUgqUUooxBkop2O12YFkW6Pth7mymOyQBlNKPes1ms9mSk5Mzh4aGXjgF4OLiIqSUgoeHx2eurq74PSgAANDpdNpdu3ZtfA/wk8F5PB6wLEtZlmX5fP6HoeTl5YWSkpLSZDJZSkhIyGqnAJ4+fdojEAjAaDS2y+VyiSPVDQ0NP0RGRkoXLVqEKaUfFSHLsmC320GhUOzXarU6m80GExMTQCkFm80Gk5OTFrPZTD09PX2c0peSkhKkUChWubu7Q0tLy2kA+JAFAMDq1atdVSpVwpIlSz5qQwCAwsLCTdeuXTuycOFCdPbs2d319fXHQkNDBVKp1MtkMvVoNJqjVVVVB2ex5riYmpqajo2NjZ6cnHzs7e0dEBER4dLb2/uWu0ofPnw41dfX96SxsbFapVIVDg4OjgEAEEJwRkZGGkIIJScn/yk7O3vtwMDA8xs3bmjb2tq6e3p6rhYXFx9KSEj4Oj09vcQpA0KhEGk0mqM+Pj5469ati7Ra7RlOW8fBsnz5cr5ard7vOIrj4uJEHFMlJSXxiYmJ/gghsFqt4xKJxJ3P54NGoznqjL1ZMjQ3N59yc3ODmzdv/vHkyZNx77MEQsi81yknV0ZGxudKpTIaIQQdHR1nt23b9llBQcFG7iynxmWo0+lKZTKZCODddDx16tRmxyCfuo4JIcAwDBBCIDY2dkFxcfFXDMNAbm5uTGdnZ4XBYPiLTqcrvXTpUoZTAFx2mzZtWvjkyZPv16xZ4woA0Nra+m1dXV02t/45y8nJWTsyMvLD3LsfAODu3bvnZ8Wcu4H7bZLJZKJz585d2bt3784HDx5MHjhwIDgvL0+t1+uv5ufnV4+Pj89wgCml4OXlxdu+ffuqhISE1NHR0R9LSkq+i4+Pj1m8eLG/v79/CKWURQjh169fD+/evbvUKQCOZpvNBlKp1KukpKTs4sWLpaWlpQ8AAJKSksSZmZnK6enpKR6PJwB4N0F5PJ6gq6ur+fjx4zftdjusX7/e4/z585ezs7MP9vX1jXF/xq9evbJbrVbnDHDGtV5QUBAvJycnMSQk5AuDwaA9c+bM38xms9N5rFQqo6OiomIAAL755psKo9H41tneeQEA/EcOAIANGzZ47tix48vg4OBfe3t7izlKHfdTStn+/n6DRqP5vrm5edjxDEe5frH/K/s3pa9dMCwtpVIAAAAASUVORK5CYII=" style="width: 28px; height: 28px; object-fit: contain;" />';
            tourBtn.onclick = () => toggleTournamentWindow();
            document.body.appendChild(tourBtn);
        }

        // 5. Attach Runs Window, Leaderboard Window & Tournament Window
        if (!document.getElementById("chrono-runs-window")) {
            document.body.appendChild(runsWindow);
            const closeRuns = document.getElementById("chrono-runs-close-btn");
            if (closeRuns) closeRuns.onclick = () => toggleRunsWindow();
            runsWindow.onclick = (e) => {
                if (e.target === runsWindow) toggleRunsWindow();
            };

            // Runs event listeners (Query backend with filters)
            const runsSearch = document.getElementById("chrono-runs-search");
            let searchTimeout = null;
            if (runsSearch) {
                runsSearch.oninput = () => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => fetchLiveRuns(1), 350);
                };
                runsSearch.onkeydown = (e) => {
                    if (e.key === "Enter") {
                        clearTimeout(searchTimeout);
                        fetchLiveRuns(1);
                    }
                };
            }

            const runsFilterMap = document.getElementById("chrono-runs-filter-map");
            if (runsFilterMap) runsFilterMap.onchange = () => fetchLiveRuns(1);

            const runsFilterHero = document.getElementById("chrono-runs-filter-hero");
            if (runsFilterHero) runsFilterHero.onchange = () => fetchLiveRuns(1);

            const runsFilterDate = document.getElementById("chrono-runs-filter-date");
            if (runsFilterDate) runsFilterDate.onchange = () => fetchLiveRuns(1);

            const runsSort = document.getElementById("chrono-runs-sort");
            if (runsSort) runsSort.onchange = () => fetchLiveRuns(1);

            const runsRefresh = document.getElementById("chrono-runs-btn-refresh");
            if (runsRefresh) runsRefresh.onclick = () => fetchLiveRuns(currentRunsPage);

            const runsPrev = document.getElementById("chrono-runs-prev-btn");
            if (runsPrev) runsPrev.onclick = () => {
                if (currentRunsPage > 1) fetchLiveRuns(currentRunsPage - 1);
            };

            const runsNext = document.getElementById("chrono-runs-next-btn");
            if (runsNext) runsNext.onclick = () => {
                fetchLiveRuns(currentRunsPage + 1);
            };
        }

        if (!document.getElementById("chrono-leaderboard-window")) {
            document.body.appendChild(leaderboardWindow);
            const closeLb = document.getElementById("chrono-leaderboard-close-btn");
            if (closeLb) closeLb.onclick = () => toggleLeaderboardWindow();
            leaderboardWindow.onclick = (e) => {
                if (e.target === leaderboardWindow) toggleLeaderboardWindow();
            };

            const btnSolo = document.getElementById("chrono-lb-btn-solo");
            if (btnSolo) btnSolo.onclick = () => setLeaderboardMode("solo");

            const btnDuo = document.getElementById("chrono-lb-btn-duo");
            if (btnDuo) btnDuo.onclick = () => setLeaderboardMode("duo");

            const lbSearch = document.getElementById("chrono-lb-search");
            if (lbSearch) {
                lbSearch.oninput = () => renderCommunityLeaderboard();
            }

            const lbMap = document.getElementById("chrono-lb-filter-map");
            if (lbMap) lbMap.onchange = () => renderCommunityLeaderboard();

            const lbHero = document.getElementById("chrono-lb-filter-hero");
            if (lbHero) lbHero.onchange = () => renderCommunityLeaderboard();

            const lbRefresh = document.getElementById("chrono-lb-btn-refresh");
            if (lbRefresh) lbRefresh.onclick = () => syncGoogleSheetsHighscores();

            populateLeaderboardMapSelect();
            renderCommunityLeaderboard();
        }

        if (!document.getElementById("chrono-tournament-window")) {
            document.body.appendChild(tournamentWindow);
            const closeTour = document.getElementById("chrono-tournament-close-btn");
            if (closeTour) closeTour.onclick = () => toggleTournamentWindow();
            tournamentWindow.onclick = (e) => {
                if (e.target === tournamentWindow) toggleTournamentWindow();
            };

            // Tabs Switchers
            const tabAc = document.getElementById("chrono-tour-tab-anticheat");
            const tabTs = document.getElementById("chrono-tour-tab-ts");
            if (tabAc) tabAc.onclick = () => switchTourTab("anticheat");
            if (tabTs) tabTs.onclick = () => switchTourTab("ts");

            // Anti-Cheat Toggle
            const tourToggle = document.getElementById("chrono-tour-toggle-btn");
            if (tourToggle) {
                tourToggle.onchange = () => {
                    const willBeActive = tourToggle.checked;
                    applyTournamentModeSecurity(willBeActive);
                    if (willBeActive) {
                        applyGrbState(false);
                        applyCargoState(false);
                    }
                    syncTournamentUi();
                    location.reload();
                };
            }

            // TS: GRB Toggle
            const grbToggle = document.getElementById("chrono-ts-grb-toggle");
            if (grbToggle) {
                grbToggle.onchange = () => {
                    applyGrbState(grbToggle.checked);
                };
            }

            // TS: Cargo Toggle
            const cargoToggle = document.getElementById("chrono-ts-cargo-toggle");
            if (cargoToggle) {
                cargoToggle.onchange = () => {
                    applyCargoState(cargoToggle.checked);
                };
            }

            // TS: Cargo Preset "Mango"
            const preMango = document.getElementById("chrono-cargo-preset-mango");
            if (preMango) {
                preMango.onclick = () => {
                    cargoPipeline = [
                        { stat: "speed", target: 17 },
                        { stat: "abi1", target: 5 },
                        { stat: "regen", target: 7 },
                        { stat: "energy", target: 100 }
                    ];
                    saveCargoPipeline();
                    renderCargoPuzzlePipeline();
                };
            }

            // TS: Cargo Add Target Buttons (Order: Speed, Abi1, Regen, Energy, Abi2, Abi3)
            const addSpd = document.getElementById("chrono-cargo-add-spd");
            if (addSpd) addSpd.onclick = () => { cargoPipeline.push({ stat: "speed", target: 17 }); saveCargoPipeline(); renderCargoPuzzlePipeline(); };
            const addAb1 = document.getElementById("chrono-cargo-add-ab1");
            if (addAb1) addAb1.onclick = () => { cargoPipeline.push({ stat: "abi1", target: 5 }); saveCargoPipeline(); renderCargoPuzzlePipeline(); };
            const addReg = document.getElementById("chrono-cargo-add-reg");
            if (addReg) addReg.onclick = () => { cargoPipeline.push({ stat: "regen", target: 7 }); saveCargoPipeline(); renderCargoPuzzlePipeline(); };
            const addEne = document.getElementById("chrono-cargo-add-ene");
            if (addEne) addEne.onclick = () => { cargoPipeline.push({ stat: "energy", target: 100 }); saveCargoPipeline(); renderCargoPuzzlePipeline(); };
            const addAb2 = document.getElementById("chrono-cargo-add-ab2");
            if (addAb2) addAb2.onclick = () => { cargoPipeline.push({ stat: "abi2", target: 5 }); saveCargoPipeline(); renderCargoPuzzlePipeline(); };
            const addAb3 = document.getElementById("chrono-cargo-add-ab3");
            if (addAb3) addAb3.onclick = () => { cargoPipeline.push({ stat: "abi3", target: 5 }); saveCargoPipeline(); renderCargoPuzzlePipeline(); };
            const clearPipe = document.getElementById("chrono-cargo-clear-pipe");
            if (clearPipe) clearPipe.onclick = () => { cargoPipeline = []; saveCargoPipeline(); renderCargoPuzzlePipeline(); };

            // Sync initial state on load
            applyTournamentModeSecurity(localStorage.getItem("chrono_tournament_mode") === "true");
            updateGrbBadge();
            syncTournamentUi();
        }

        if (!document.getElementById("chrono-menu-modal")) {
            document.body.appendChild(menuContainer);

            // Close button
            const closeBtn = document.getElementById("chrono-close-btn");
            if (closeBtn) closeBtn.onclick = () => toggleChronoMenu();

            // Background click to close
            menuContainer.onclick = (e) => {
                if (e.target === menuContainer) toggleChronoMenu();
            };

            // 6-Tabs Management (Nordic Emerald Theme)
            const tabDefs = [
                { tab: "chrono-tab-client", view: "chrono-view-client" },
                { tab: "chrono-tab-flags", view: "chrono-view-flags" },
                { tab: "chrono-tab-experimental", view: "chrono-view-experimental" },
                { tab: "chrono-tab-alts", view: "chrono-view-alts" },
                { tab: "chrono-tab-modes", view: "chrono-view-modes" },
                { tab: "chrono-tab-discord", view: "chrono-view-discord" },
                { tab: "chrono-tab-ui", view: "chrono-view-ui" }
            ];

            tabDefs.forEach(({ tab, view }) => {
                const tabEl = document.getElementById(tab);
                if (!tabEl) return;
                tabEl.onclick = () => {
                    tabDefs.forEach(t => {
                        const tBtn = document.getElementById(t.tab);
                        const tView = document.getElementById(t.view);
                        if (tBtn && tView) {
                            if (t.tab === tab) {
                                tView.style.display = "flex";
                                if (tab === "chrono-tab-experimental") {
                                    tBtn.style.background = "linear-gradient(135deg, #7e22ce, #a855f7)";
                                    tBtn.style.border = "1px solid rgba(192, 132, 252, 0.5)";
                                } else {
                                    tBtn.style.background = "linear-gradient(135deg, #059669, #10b981)";
                                    tBtn.style.border = "1px solid rgba(110, 231, 183, 0.4)";
                                }
                                tBtn.style.color = "#ffffff";
                            } else {
                                tView.style.display = "none";
                                tBtn.style.background = "transparent";
                                tBtn.style.color = (t.tab === "chrono-tab-experimental") ? "#c084fc" : "#94a3b8";
                                tBtn.style.border = "1px solid transparent";
                            }
                        }
                    });
                };
            });

            // 1. Rendering Engine selector change
            const engineSel = document.getElementById("chrono-select-engine");
            if (engineSel) {
                engineSel.onchange = () => {
                    currentConfig.rendering_engine = engineSel.value;
                    saveConfig(true);
                };
            }

            // 2. Setup Flag Checkbox Listeners
            const flagMap = [
                { id: "cfg-flag-highres-timer", key: "flag_highres_timer", restart: true },
                { id: "cfg-flag-anti-throttle", key: "flag_anti_throttle", restart: true },
                { id: "cfg-flag-audio-in-process", key: "flag_audio_in_process", restart: true },
                { id: "cfg-flag-resample-scroll", key: "flag_resample_scroll", restart: true },
                { id: "cfg-flag-accelerated-canvas", key: "flag_accelerated_canvas", restart: true },
                { id: "cfg-flag-gpu-rasterization", key: "flag_gpu_rasterization", restart: true },
                { id: "cfg-flag-anti-freeze-ipc", key: "flag_anti_freeze_ipc", restart: false },
                { id: "cfg-flag-vsync-locked", key: "flag_vsync_locked", restart: false },
                { id: "cfg-flag-custom-theme", key: "flag_custom_theme", restart: false },
                { id: "cfg-flag-single-process", key: "flag_single_process", restart: true, hazard: true },
                { id: "cfg-flag-disable-gpu", key: "flag_disable_gpu", restart: true, hazard: true },
                { id: "cfg-flag-in-process-gpu", key: "flag_in_process_gpu", restart: true, hazard: true },
                { id: "cfg-flag-no-sandbox", key: "flag_no_sandbox", restart: true, hazard: true },
                { id: "cfg-discord-rpc-enabled", key: "discord_rpc_enabled", restart: false },

                // Experimental & Low-Latency Network
                { id: "cfg-flag-raw-input-no-resample", key: "flag_raw_input_no_resample", restart: true },
                { id: "cfg-flag-windows-timer-resolution", key: "flag_windows_timer_resolution", restart: true },
                { id: "cfg-flag-disable-frame-rate-limit", key: "flag_disable_frame_rate_limit", restart: true },
                { id: "cfg-flag-zero-copy-raster", key: "flag_zero_copy_raster", restart: true },
                { id: "cfg-flag-websocket-arraybuffer", key: "flag_websocket_arraybuffer", restart: false },
                { id: "cfg-flag-tcp-nodelay-tuning", key: "flag_tcp_nodelay_tuning", restart: true }
            ];

            flagMap.forEach(item => {
                const el = document.getElementById(item.id);
                if (!el) return;
                el.onchange = () => {
                    if (item.hazard && el.checked) {
                        const ok = confirm("WARNING: Enabling this flag is hazardous and may cause sudden crashes or black screens. Continue?");
                        if (!ok) {
                            el.checked = false;
                            return;
                        }
                    }
                    currentConfig[item.key] = el.checked;
                    saveConfig(item.restart);

                    // Realtime theme toggle handler
                    if (item.key === "flag_custom_theme") {
                        const themeTag = document.getElementById("chrono-artem-theme");
                        if (themeTag) themeTag.disabled = !el.checked;
                    }
                };
            });

            // Add Alt Form
            const saveAltBtn = document.getElementById("chrono-btn-save-alt");
            const inUser = document.getElementById("chrono-input-user");
            const inPass = document.getElementById("chrono-input-pass");
            const inTag = document.getElementById("chrono-input-tag");

            if (saveAltBtn && inUser && inPass) {
                saveAltBtn.onclick = () => {
                    const u = (inUser.value || "").trim();
                    const p = (inPass.value || "").trim();
                    const t = (inTag.value || "").trim();

                    if (!u || !p) {
                        showStatus("Please provide a username and password.", true);
                        return;
                    }

                    const current = getStoredAlts();
                    const existingIdx = current.findIndex(a => a.username.toLowerCase() === u.toLowerCase());
                    if (existingIdx >= 0) {
                        current[existingIdx] = { username: u, password: p, tag: t };
                    } else {
                        current.push({ username: u, password: p, tag: t });
                    }
                    saveStoredAlts(current);
                    inUser.value = "";
                    inPass.value = "";
                    inTag.value = "";
                    showStatus("Account \"" + u + "\" saved successfully!");
                };
            }

            const guestBtn = document.getElementById("chrono-btn-guest");
            if (guestBtn) guestBtn.onclick = () => logoutGuest();

            // === 1. ACTIVE OPTIMIZATIONS BADGES (TAB 1) ===
            function renderActiveFlagsBadges() {
                const grid = document.getElementById("chrono-active-flags-grid");
                if (!grid) return;
                const flagMeta = [
                    { key: "flag_vsync_locked", label: "🟢 Hardware VSync (" + MONITOR_HZ + " FPS)", tip: "Direct3D 11 hardware swapchain frame synchronization (" + MONITOR_HZ + "Hz) with zero tearing." },
                    { key: "flag_anti_freeze_ipc", label: "🟢 Combat Anti-Freeze IPC", tip: "Suppresses high-frequency combat log spam to completely eliminate combat stutter." },
                    { key: "flag_raw_input_no_resample", label: "⚡ Raw Mouse Input", tip: "Bypasses browser input resampling for instant 1:1 cursor response." },
                    { key: "flag_windows_timer_resolution", label: "⚡ 0.5ms Windows Timer (2000Hz)", tip: "Sub-millisecond OS scheduler for zero-stutter VSync and instant packet handling." },
                    { key: "flag_websocket_arraybuffer", label: "🌐 WS ArrayBuffer Sync", tip: "Direct binary memory WebSocket decoding with 0ms async lag." },
                    { key: "flag_zero_copy_raster", label: "🟢 Zero-Copy VRAM Canvas", tip: "Direct GPU tile rasterization bypassing intermediate RAM copies." },
                    { key: "flag_accelerated_canvas", label: "🟢 Direct3D 11 GPU Canvas", tip: "Hardware GPU-accelerated 2D canvas, particle, and map rasterization." },
                    { key: "flag_highres_timer", label: "🟢 High-Precision Timer", tip: "Sub-millisecond Windows kernel clock for ultra-low latency inputs." },
                    { key: "flag_anti_throttle", label: "🟢 Anti-Throttling Core", tip: "Prevents Chromium frame rate drop or throttling when the window is in background." },
                    { key: "discord_rpc_enabled", label: "🟢 Discord Rich Presence", tip: "Real-time Discord status with full account and map privacy." },
                    { key: "flag_resample_scroll", label: "🟢 Resampling Scroll", tip: "Hardware event pacing for smooth input." },
                    { key: "flag_gpu_rasterization", label: "🟢 GPU Rasterization", tip: "Direct GPU tile rasterization for crisp gameplay textures." },
                    { key: "flag_audio_in_process", label: "🟢 In-Process Audio", tip: "Low-latency audio pipeline." },
                    { key: "flag_custom_theme", label: "🟢 Nordic Emerald Theme", tip: "Live dark emerald glass-morphism styling for all UI." }
                ];

                let html = "";
                flagMeta.forEach(f => {
                    if (currentConfig[f.key] !== false) {
                        html += '<div class="chrono-active-badge" title="' + f.tip + '" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(52, 211, 153, 0.4); color: #6ee7b7; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 8px; cursor: help; display: flex; align-items: center; gap: 4px; transition: all 0.15s ease;">' + f.label + '</div>';
                    }
                });
                grid.innerHTML = html || '<div style="color: #64748b; font-size: 11px;">No active optimizations.</div>';
            }

            // === 4. CUSTOM CURSOR & LASER PICKER SETUP ===
            const PRESET_CURSORS = [
                { id: "default", name: "Default", icon: "🖱️", url: "default", x: 0, y: 0 },
                { id: "emerald_crosshair", name: "Emerald Reticle", icon: "🟢", url: "data:image/svg+xml;base64," + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="3" fill="#10b981"/><path d="M16 2v7M16 23v7M2 16h7M23 16h7" stroke="#34d399" stroke-width="2.5" stroke-linecap="round"/></svg>'), x: 16, y: 16 },
                { id: "ruby_crosshair", name: "Ruby Tactical", icon: "🔴", url: "data:image/svg+xml;base64," + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="2.5" fill="#ef4444"/><path d="M16 4v7M16 21v7M4 16h7M21 16h7" stroke="#f87171" stroke-width="2" stroke-linecap="round"/></svg>'), x: 16, y: 16 },
                { id: "red_laser", name: "Red Laser Beam", icon: "⚡", url: "data:image/svg+xml;base64," + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="3.5" fill="#ef4444"/><circle cx="16" cy="16" r="7" fill="none" stroke="#f87171" stroke-width="1.5" stroke-dasharray="2 2"/><path d="M16 2v6M16 24v6M2 16h6M24 16h6" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round"/></svg>'), x: 16, y: 16 },
                { id: "blue_laser", name: "Blue Cyber Laser", icon: "🔷", url: "data:image/svg+xml;base64," + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="3.5" fill="#38bdf8"/><path d="M16 4l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="none" stroke="#0ea5e9" stroke-width="1.5"/><circle cx="16" cy="16" r="1.5" fill="#ffffff"/></svg>'), x: 16, y: 16 },
                { id: "green_plasma", name: "Green Plasma Laser", icon: "❇️", url: "data:image/svg+xml;base64," + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="3.5" fill="#22c55e"/><circle cx="16" cy="16" r="8" fill="none" stroke="#4ade80" stroke-width="1.5"/><path d="M16 1v8M16 23v8M1 16h8M23 16h8" stroke="#22c55e" stroke-width="2" stroke-linecap="round"/></svg>'), x: 16, y: 16 },
                { id: "golden_crown", name: "Gold Pointer", icon: "👑", url: "data:image/svg+xml;base64," + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M4 4l8 20 4-7 7 4 3-4-7-4 7-4-20-5z" fill="#f59e0b" stroke="#78350f" stroke-width="1.5"/></svg>'), x: 4, y: 4 },
                { id: "valorant_circle", name: "Pro Circle Ring", icon: "🎯", url: "data:image/svg+xml;base64," + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="6" fill="none" stroke="#22c55e" stroke-width="2"/><circle cx="16" cy="16" r="1.5" fill="#22c55e"/><path d="M16 6v3M16 23v3M6 16h3M23 16h3" stroke="#22c55e" stroke-width="2"/></svg>'), x: 16, y: 16 }
            ];

            function applyCustomCursor(cursorUrl, hx = 16, hy = 16) {
                let tag = document.getElementById("chrono-custom-cursor-style");
                if (!tag) {
                    tag = document.createElement("style");
                    tag.id = "chrono-custom-cursor-style";
                    document.head.appendChild(tag);
                }
                if (!cursorUrl || cursorUrl === "default") {
                    tag.innerHTML = "";
                    localStorage.removeItem("chrono_custom_cursor");
                } else {
                    let finalUrl = cursorUrl;
                    if (cursorUrl.startsWith("<svg")) {
                        finalUrl = "data:image/svg+xml;base64," + btoa(cursorUrl);
                    } else if (cursorUrl.startsWith("data:image/svg+xml;utf8,")) {
                        const raw = cursorUrl.replace("data:image/svg+xml;utf8,", "");
                        finalUrl = "data:image/svg+xml;base64," + btoa(raw);
                    }
                    tag.innerHTML = "html, body, canvas, div, span, a, input, button, table, label, select, * { cursor: url('" + finalUrl + "') " + hx + " " + hy + ", auto !important; }";
                    localStorage.setItem("chrono_custom_cursor", JSON.stringify({ url: finalUrl, x: hx, y: hy }));
                }
                renderCursorGrid();
            }

            function renderCursorGrid() {
                const grid = document.getElementById("chrono-cursor-grid");
                if (!grid) return;
                let activeUrl = "default";
                try {
                    const saved = JSON.parse(localStorage.getItem("chrono_custom_cursor") || "null");
                    if (saved && saved.url) activeUrl = saved.url;
                } catch(e) {}

                grid.innerHTML = "";
                PRESET_CURSORS.forEach(c => {
                    const isSel = (c.url === activeUrl || (c.id === "default" && activeUrl === "default"));
                    const card = document.createElement("div");
                    card.style.background = isSel ? "rgba(16, 185, 129, 0.25)" : "rgba(3, 15, 13, 0.7)";
                    card.style.border = isSel ? "1.5px solid #34d399" : "1px solid rgba(255, 255, 255, 0.08)";
                    card.style.borderRadius = "8px";
                    card.style.padding = "8px 6px";
                    card.style.display = "flex";
                    card.style.flexDirection = "column";
                    card.style.alignItems = "center";
                    card.style.gap = "4px";
                    card.style.cursor = "pointer";
                    card.style.transition = "all 0.15s ease";

                    let previewEl = '<div style="font-size: 20px;">' + c.icon + '</div>';
                    if (c.url !== "default") {
                        previewEl = '<img src="' + c.url + '" style="width: 24px; height: 24px; object-fit: contain;" />';
                    }

                    card.innerHTML = previewEl + '<span style="font-size: 10px; font-weight: 700; color: ' + (isSel ? '#6ee7b7' : '#cbd5e1') + '; text-align: center;">' + c.name + '</span>';
                    card.onclick = () => applyCustomCursor(c.url, c.x, c.y);
                    grid.appendChild(card);
                });
            }

            // Cursor Builder Logic
            function generateBuilderSvg() {
                const shape = (document.getElementById("chrono-cb-shape") || {}).value || "crosshair";
                const color = (document.getElementById("chrono-cb-color") || {}).value || "#10b981";
                const size = parseInt((document.getElementById("chrono-cb-size") || {}).value || "28", 10);
                const mid = size / 2;
                let svg = "";

                if (shape === "crosshair") {
                    svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
                        '<circle cx="' + mid + '" cy="' + mid + '" r="2" fill="' + color + '"/>' +
                        '<path d="M' + mid + ' 2v' + (mid - 3) + 'M' + mid + ' ' + (mid + 3) + 'v' + (mid - 5) + 'M2 ' + mid + 'h' + (mid - 3) + 'M' + (mid + 3) + ' ' + mid + 'h' + (mid - 5) + '" stroke="' + color + '" stroke-width="2" stroke-linecap="round"/>' +
                        '</svg>';
                } else if (shape === "dot") {
                    svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
                        '<circle cx="' + mid + '" cy="' + mid + '" r="' + Math.max(3, mid - 4) + '" fill="' + color + '" stroke="#ffffff" stroke-width="1.5"/>' +
                        '</svg>';
                } else if (shape === "laser") {
                    svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
                        '<circle cx="' + mid + '" cy="' + mid + '" r="3" fill="' + color + '"/>' +
                        '<circle cx="' + mid + '" cy="' + mid + '" r="' + (mid - 4) + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-dasharray="2 2"/>' +
                        '<path d="M' + mid + ' 0v' + size + 'M0 ' + mid + 'h' + size + '" stroke="' + color + '" stroke-width="1" opacity="0.6"/>' +
                        '</svg>';
                } else if (shape === "ring") {
                    svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
                        '<circle cx="' + mid + '" cy="' + mid + '" r="' + (mid - 4) + '" fill="none" stroke="' + color + '" stroke-width="2"/>' +
                        '<circle cx="' + mid + '" cy="' + mid + '" r="1.5" fill="' + color + '"/>' +
                        '</svg>';
                } else if (shape === "box") {
                    const bSize = size - 8;
                    svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
                        '<rect x="4" y="4" width="' + bSize + '" height="' + bSize + '" fill="none" stroke="' + color + '" stroke-width="2" rx="3"/>' +
                        '<circle cx="' + mid + '" cy="' + mid + '" r="1.5" fill="' + color + '"/>' +
                        '</svg>';
                } else if (shape === "arrow") {
                    svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
                        '<path d="M3 3l' + (size*0.7) + ' ' + (size*0.4) + ' -' + (size*0.3) + ' 0 ' + (size*0.35) + ' ' + (size*0.45) + ' -' + (size*0.15) + ' ' + (size*0.1) + ' -' + (size*0.35) + ' -' + (size*0.45) + ' 0 ' + (size*0.3) + 'z" fill="' + color + '" stroke="#000000" stroke-width="1"/>' +
                        '</svg>';
                }

                const host = document.getElementById("chrono-cb-preview-host");
                if (host) host.innerHTML = svg;
                return { svg: svg, mid: (shape === "arrow" ? 3 : Math.floor(mid)) };
            }

            const cbShape = document.getElementById("chrono-cb-shape");
            const cbColor = document.getElementById("chrono-cb-color");
            const cbSize = document.getElementById("chrono-cb-size");
            const cbApply = document.getElementById("chrono-btn-apply-builder");

            if (cbShape) cbShape.onchange = () => generateBuilderSvg();
            if (cbColor) cbColor.oninput = () => generateBuilderSvg();
            if (cbSize) cbSize.oninput = () => generateBuilderSvg();
            if (cbApply) {
                cbApply.onclick = () => {
                    const res = generateBuilderSvg();
                    if (res && res.svg) {
                        const b64 = "data:image/svg+xml;base64," + btoa(res.svg);
                        applyCustomCursor(b64, res.mid, res.mid);
                    }
                };
            }
            generateBuilderSvg();

            const applyCurBtn = document.getElementById("chrono-btn-apply-cursor");
            const resetCurBtn = document.getElementById("chrono-btn-reset-cursor");
            const curInput = document.getElementById("chrono-cursor-url-input");

            if (applyCurBtn && curInput) {
                applyCurBtn.onclick = () => {
                    const url = (curInput.value || "").trim();
                    if (url) applyCustomCursor(url, 16, 16);
                };
            }
            if (resetCurBtn) {
                resetCurBtn.onclick = () => {
                    if (curInput) curInput.value = "";
                    applyCustomCursor("default");
                };
            }

            // Initial load of saved cursor
            try {
                const saved = JSON.parse(localStorage.getItem("chrono_custom_cursor") || "null");
                if (saved && saved.url) applyCustomCursor(saved.url, saved.x || 16, saved.y || 16);
            } catch(e) {}

            // === 4b. ENEMY OUTLINES ENGINE & BUILDER ===
            const ENEMY_OUTLINE_PRESETS = [
                { id: "default", name: "🎮 Default", desc: "Game standard outline", color: "#64748b", border: "rgba(255,255,255,0.2)" },
                { id: "chrono", name: "🟢 Chrono Emerald", desc: "Emerald neon glow", color: "#34d399", border: "#10b981", glow: "#10b981" },
                { id: "volcano", name: "🌋 Volcano Red", desc: "Molten magma red", color: "#ef4444", border: "#f97316", glow: "#f97316" },
                { id: "rainbow", name: "🌈 Rainbow RGB", desc: "Dynamic rainbow chroma", color: "linear-gradient(90deg, #f43f5e, #eab308, #10b981, #06b6d4, #8b5cf6)", border: "#a855f7" },
                { id: "smart", name: "🧠 Smart Dynamic", desc: "Black on light, White on dark", color: "#888888", border: "#ffffff" }
            ];

            function setEnemyOutlineMode(mode, customColor, customWidth, customGlow) {
                enemyOutlineMode = mode;
                localStorage.setItem("chrono_enemy_outline_mode", mode);
                if (customColor) {
                    enemyOutlineColor = customColor;
                    localStorage.setItem("chrono_enemy_outline_color", customColor);
                }
                if (customWidth) {
                    enemyOutlineWidth = customWidth;
                    localStorage.setItem("chrono_enemy_outline_width", customWidth);
                }
                if (customGlow !== undefined) {
                    enemyOutlineGlow = customGlow;
                    localStorage.setItem("chrono_enemy_outline_glow", customGlow);
                }
                if (window._chrono_set_outline_mode) {
                    window._chrono_set_outline_mode(enemyOutlineMode, enemyOutlineColor, enemyOutlineWidth, enemyOutlineGlow);
                }
                renderEnemyOutlineGrid();
                updateEnemyOutlinePreview();
            }

            function renderEnemyOutlineGrid() {
                const grid = document.getElementById("chrono-enemy-outline-grid");
                if (!grid) return;
                grid.innerHTML = "";
                ENEMY_OUTLINE_PRESETS.forEach(p => {
                    const isSel = (enemyOutlineMode === p.id);
                    const btn = document.createElement("button");
                    btn.style.background = isSel ? "rgba(239, 68, 68, 0.25)" : "rgba(3, 15, 13, 0.7)";
                    btn.style.border = isSel ? "1.5px solid #f87171" : "1px solid rgba(255, 255, 255, 0.08)";
                    btn.style.borderRadius = "8px";
                    btn.style.padding = "8px 10px";
                    btn.style.display = "flex";
                    btn.style.flexDirection = "column";
                    btn.style.alignItems = "center";
                    btn.style.gap = "4px";
                    btn.style.cursor = "pointer";
                    btn.style.color = isSel ? "#fca5a5" : "#cbd5e1";
                    btn.style.transition = "all 0.15s ease";

                    btn.innerHTML = 
                        '<div style="width: 22px; height: 22px; border-radius: 50%; background: ' + (p.color.startsWith("linear") ? p.color : p.color) + '; box-shadow: ' + (p.glow ? '0 0 10px ' + p.glow : 'none') + ';"></div>' +
                        '<span style="font-weight: 700; font-size: 11px;">' + p.name + '</span>' +
                        '<span style="font-size: 9.5px; color: #64748b;">' + p.desc + '</span>';

                    btn.onclick = () => setEnemyOutlineMode(p.id);
                    grid.appendChild(btn);
                });
            }

            function updateEnemyOutlinePreview() {
                const host = document.getElementById("chrono-outline-preview-host");
                if (!host) return;
                const col = (document.getElementById("chrono-outline-color") || {}).value || enemyOutlineColor || "#34d399";
                const w = (document.getElementById("chrono-outline-width") || {}).value || enemyOutlineWidth || 2;
                const g = (document.getElementById("chrono-outline-glow") || {}).value || enemyOutlineGlow || 8;
                host.innerHTML = '<div style="width: 18px; height: 18px; border-radius: 50%; background: #991b1b; border: ' + w + 'px solid ' + col + '; box-shadow: 0 0 ' + g + 'px ' + col + ';"></div>';
            }

            const outlineColorInput = document.getElementById("chrono-outline-color");
            const outlineWidthInput = document.getElementById("chrono-outline-width");
            const outlineGlowInput = document.getElementById("chrono-outline-glow");
            const applyOutlineBtn = document.getElementById("chrono-btn-apply-outline");

            if (outlineColorInput) outlineColorInput.oninput = () => updateEnemyOutlinePreview();
            if (outlineWidthInput) outlineWidthInput.oninput = () => updateEnemyOutlinePreview();
            if (outlineGlowInput) outlineGlowInput.oninput = () => updateEnemyOutlinePreview();
            if (applyOutlineBtn) {
                applyOutlineBtn.onclick = () => {
                    const col = outlineColorInput ? outlineColorInput.value : "#34d399";
                    const w = outlineWidthInput ? parseFloat(outlineWidthInput.value) : 2;
                    const g = outlineGlowInput ? parseFloat(outlineGlowInput.value) : 8;
                    setEnemyOutlineMode("custom", col, w, g);
                };
            }
            renderEnemyOutlineGrid();
            updateEnemyOutlinePreview();

            // ── Section 2: Family Outline UI & Preview ──
            function renderFamilyPreview() {
                const famSel = document.getElementById('chrono-fam-sel');
                const prev = document.getElementById('chrono-fam-preview');
                const colPicker = document.getElementById('chrono-fam-col');
                if (!famSel || !prev) return;
                const fam = famSel.value;
                if (colPicker) colPicker.value = chronoEnemyOverrides[fam] || '#3b82f6';
                prev.innerHTML = '';
                if (CHRONO_ENEMY_CATALOG[fam]) {
                    CHRONO_ENEMY_CATALOG[fam].forEach(en => {
                        const badge = document.createElement('span');
                        badge.style.display = 'inline-flex';
                        badge.style.alignItems = 'center';
                        badge.style.padding = '2px 6px';
                        badge.style.borderRadius = '4px';
                        badge.style.background = 'rgba(255,255,255,0.08)';
                        badge.style.border = '1px solid rgba(255,255,255,0.1)';
                        badge.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${en.color}; margin-right:5px; box-shadow:0 0 4px ${en.color};"></span><span style="color:${en.color}; font-weight:bold;">${en.name}</span>`;
                        prev.appendChild(badge);
                    });
                }
            }

            // ── Section 3: Individual Enemy UI & Search ──
            function populateIndividualDropdown(filterText = "") {
                const sel = document.getElementById('chrono-ind-sel');
                if (!sel) return;
                const prevVal = sel.value;
                sel.innerHTML = '<option value="">-- Select Enemy --</option>';
                const filter = filterText.toLowerCase().trim();

                Object.keys(CHRONO_ENEMY_CATALOG).forEach(fam => {
                    const matchedEnemies = CHRONO_ENEMY_CATALOG[fam].filter(en => 
                        !filter || en.name.toLowerCase().includes(filter) || en.id.toLowerCase().includes(filter)
                    );
                    if (matchedEnemies.length > 0) {
                        const optgroup = document.createElement('optgroup');
                        optgroup.label = fam.toUpperCase();
                        matchedEnemies.forEach(en => {
                            const opt = document.createElement('option');
                            opt.value = en.id;
                            opt.textContent = en.name;
                            if (chronoEnemyOverrides[en.id]) {
                                opt.textContent += ' [Custom]';
                            }
                            optgroup.appendChild(opt);
                        });
                        sel.appendChild(optgroup);
                    }
                });

                if (prevVal && sel.querySelector(`option[value="${prevVal}"]`)) {
                    sel.value = prevVal;
                } else if (filter && sel.options.length > 1) {
                    sel.selectedIndex = 1;
                }
                renderIndividualPreview();
            }

            function renderIndividualPreview() {
                const sel = document.getElementById('chrono-ind-sel');
                const prev = document.getElementById('chrono-ind-preview');
                const colPicker = document.getElementById('chrono-ind-col');
                if (!sel || !prev) return;
                const val = sel.value;
                if (!val) {
                    prev.innerHTML = '<span style="color: #888; font-style: italic;">Select or search an enemy above</span>';
                    return;
                }
                let found = null;
                for (const fam of Object.values(CHRONO_ENEMY_CATALOG)) {
                    const match = fam.find(e => e.id === val);
                    if (match) { found = match; break; }
                }
                if (found) {
                    if (colPicker) colPicker.value = chronoEnemyOverrides[found.id] || found.color || '#a78bfa';
                    const customBadge = chronoEnemyOverrides[found.id] 
                        ? `<span style="margin-left:8px; background:rgba(167, 139, 250, 0.2); border:1px solid #a78bfa; color:#c4b5fd; padding:1px 6px; border-radius:4px; font-size:10px;">Custom: ${chronoEnemyOverrides[found.id]}</span>`
                        : '';
                    prev.innerHTML = `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${found.color}; margin-right:8px; box-shadow: 0 0 6px ${found.color};"></span><span style="color:${found.color}; font-weight:bold; font-size:12px;">${found.name}</span>${customBadge}`;
                }
            }

            const famSel = document.getElementById('chrono-fam-sel');
            const famCol = document.getElementById('chrono-fam-col');
            const famReset = document.getElementById('chrono-fam-reset');
            if (famSel) famSel.onchange = () => renderFamilyPreview();
            if (famCol && famSel) {
                famCol.onchange = (e) => {
                    const fam = famSel.value;
                    chronoEnemyOverrides[fam] = e.target.value;
                    localStorage.setItem("chrono_enemy_overrides", JSON.stringify(chronoEnemyOverrides));
                    renderFamilyPreview();
                };
            }
            if (famReset && famSel) {
                famReset.onclick = () => {
                    const fam = famSel.value;
                    delete chronoEnemyOverrides[fam];
                    localStorage.setItem("chrono_enemy_overrides", JSON.stringify(chronoEnemyOverrides));
                    renderFamilyPreview();
                };
            }

            const indSearch = document.getElementById('chrono-ind-search');
            const indSel = document.getElementById('chrono-ind-sel');
            const indCol = document.getElementById('chrono-ind-col');
            const indReset = document.getElementById('chrono-ind-reset');

            if (indSearch) {
                indSearch.oninput = () => populateIndividualDropdown(indSearch.value);
            }
            if (indSel) {
                indSel.onchange = () => renderIndividualPreview();
            }
            if (indCol && indSel) {
                indCol.onchange = (e) => {
                    const id = indSel.value;
                    if (!id) return;
                    chronoEnemyOverrides[id] = e.target.value;
                    localStorage.setItem("chrono_enemy_overrides", JSON.stringify(chronoEnemyOverrides));
                    renderIndividualPreview();
                };
            }
            if (indReset && indSel) {
                indReset.onclick = () => {
                    const id = indSel.value;
                    if (!id) return;
                    delete chronoEnemyOverrides[id];
                    localStorage.setItem("chrono_enemy_overrides", JSON.stringify(chronoEnemyOverrides));
                    renderIndividualPreview();
                };
            }

            // Isolate all inputs, selects, and textareas from bubbling to the game
            document.querySelectorAll("#chrono-menu-modal input, #chrono-menu-modal select, #chrono-menu-modal textarea").forEach(el => {
                ["keydown", "keyup", "keypress"].forEach(evtName => {
                    el.addEventListener(evtName, (e) => {
                        e.stopPropagation();
                    });
                });
            });

            renderFamilyPreview();
            populateIndividualDropdown();

            // === 5. CUSTOM IN-HUD KEYMAPPER ENGINE & LIVE KEYSTROKES HUD ===
            let customKeyMap = {
                "chrono-k-w": { type: "key", key: "Z", code: "KeyW", name: "Z" },
                "chrono-k-a": { type: "key", key: "Q", code: "KeyA", name: "Q" },
                "chrono-k-s": { type: "key", key: "S", code: "KeyS", name: "S" },
                "chrono-k-d": { type: "key", key: "D", code: "KeyD", name: "D" },
                "chrono-k-z": { type: "key", key: "A", code: "KeyQ", name: "A" },
                "chrono-k-x": { type: "mouse", button: 1, name: "Mouse 3" },
                "chrono-k-c": { type: "key", key: "C", code: "KeyC", name: "C" },
                "chrono-k-1": { type: "key", key: "1", code: "Digit1", name: "1" },
                "chrono-k-2": { type: "key", key: "2", code: "Digit2", name: "2" },
                "chrono-k-3": { type: "key", key: "3", code: "Digit3", name: "3" },
                "chrono-k-4": { type: "key", key: "4", code: "Digit4", name: "4" },
                "chrono-k-5": { type: "key", key: "5", code: "Digit5", name: "5" }
            };

            function loadCustomKeyMap() {
                try {
                    const saved = JSON.parse(localStorage.getItem("chrono_custom_keystrokes_mapping") || "null");
                    if (saved && typeof saved === "object") {
                        Object.assign(customKeyMap, saved);
                    }
                } catch(e) {}
            }
            loadCustomKeyMap();

            function saveCustomKeyMap() {
                try {
                    localStorage.setItem("chrono_custom_keystrokes_mapping", JSON.stringify(customKeyMap));
                } catch(e) {}
            }

            let activeListeningBox = null;
            let bindingListenerActive = false;

            function getMatchingBoxForKey(e) {
                const k = (e.key || "").toUpperCase();
                const c = e.code || "";
                for (const [boxId, binding] of Object.entries(customKeyMap)) {
                    if (binding && binding.type === "key") {
                        if (binding.key && binding.key.toUpperCase() === k) return boxId;
                        if (binding.code && binding.code === c) return boxId;
                        if (binding.key === "↑" && c === "ArrowUp") return boxId;
                        if (binding.key === "↓" && c === "ArrowDown") return boxId;
                        if (binding.key === "←" && c === "ArrowLeft") return boxId;
                        if (binding.key === "→" && c === "ArrowRight") return boxId;
                        if (binding.key === "Space" && c === "Space") return boxId;
                        if (binding.key === "Shift" && (c === "ShiftLeft" || c === "ShiftRight")) return boxId;
                    }
                }
                return null;
            }

            function getMatchingBoxForMouse(button) {
                for (const [boxId, binding] of Object.entries(customKeyMap)) {
                    if (binding && binding.type === "mouse" && binding.button === button) {
                        return boxId;
                    }
                }
                return null;
            }

            let keystrokesHudActive = false;
            let keystrokesDiv = null;

            function setKeyVisual(id, active) {
                if (!id) return;
                const el = document.getElementById(id);
                if (!el) return;
                if (active) {
                    el.style.background = "linear-gradient(135deg, #059669, #10b981)";
                    el.style.color = "#ffffff";
                    el.style.boxShadow = "0 0 12px rgba(16, 185, 129, 0.7)";
                } else {
                    el.style.background = "rgba(3,15,13,0.85)";
                    el.style.color = (id.startsWith("chrono-k-z") || id.startsWith("chrono-k-x") || id.startsWith("chrono-k-c")) ? "#93c5fd" : (id.startsWith("chrono-k-1") || id.startsWith("chrono-k-2") || id.startsWith("chrono-k-3") || id.startsWith("chrono-k-4") || id.startsWith("chrono-k-5")) ? "#94a3b8" : "#cbd5e1";
                    el.style.boxShadow = "none";
                }
            }

            function startRemappingBox(boxId) {
                activeListeningBox = boxId;
                bindingListenerActive = true;
                const box = document.getElementById(boxId);
                if (box) {
                    box.dataset.origText = box.textContent;
                    box.textContent = "...";
                    box.style.border = "2px solid #38bdf8";
                    box.style.boxShadow = "0 0 15px #38bdf8";
                }
                const topBarSub = document.getElementById("chrono-hud-editor-subtext");
                if (topBarSub) topBarSub.innerHTML = '<span style="color:#38bdf8; font-weight:800;">Press any Keyboard key or Mouse button to bind (ESC to cancel)</span>';
            }

            function finishRemapping(boundName) {
                if (!activeListeningBox) return;
                const box = document.getElementById(activeListeningBox);
                if (box) {
                    box.textContent = box.dataset.origText || box.textContent;
                    box.style.border = "";
                    box.style.boxShadow = "";
                    box.title = "Bound to: " + boundName + " (Click to remap)";
                }
                const savedBox = activeListeningBox;
                activeListeningBox = null;
                bindingListenerActive = false;
                const topBarSub = document.getElementById("chrono-hud-editor-subtext");
                if (topBarSub) topBarSub.innerHTML = '<span style="color:#34d399; font-weight:700;">Bound [' + (box ? box.textContent : savedBox) + '] to ' + boundName + '!</span>';
                setTimeout(() => {
                    if (topBarSub && !bindingListenerActive) topBarSub.textContent = "Drag any element to reposition • Click keys to remap • Use [-] / [+] to scale";
                }, 2000);
            }

            function cancelRemapping() {
                if (!activeListeningBox) return;
                const box = document.getElementById(activeListeningBox);
                if (box) {
                    box.textContent = box.dataset.origText || box.textContent;
                    box.style.border = "";
                    box.style.boxShadow = "";
                }
                activeListeningBox = null;
                bindingListenerActive = false;
                const topBarSub = document.getElementById("chrono-hud-editor-subtext");
                if (topBarSub) topBarSub.textContent = "Drag any element to reposition • Click keys to remap • Use [-] / [+] to scale";
            }

            function toggleKeystrokesHud(enable) {
                keystrokesHudActive = enable;
                localStorage.setItem("chrono_mod_keystrokes", enable ? "1" : "0");
                if (enable) {
                    if (!keystrokesDiv) {
                        keystrokesDiv = document.createElement("div");
                        keystrokesDiv.id = "chrono-keystrokes-hud";
                        keystrokesDiv.style.position = "fixed";
                        keystrokesDiv.style.bottom = "20px";
                        keystrokesDiv.style.right = "20px";
                        keystrokesDiv.style.zIndex = "999999";
                        keystrokesDiv.style.display = "flex";
                        keystrokesDiv.style.flexDirection = "column";
                        keystrokesDiv.style.alignItems = "center";
                        keystrokesDiv.style.gap = "4px";
                        keystrokesDiv.style.fontFamily = "monospace";
                        keystrokesDiv.style.fontWeight = "800";
                        keystrokesDiv.style.userSelect = "none";
                        keystrokesDiv.innerHTML = 
                            '<div style="display:flex; gap:3px; justify-content:center;">' +
                                '<div class="chrono-key-box" id="chrono-k-1" style="width:24px; height:24px; background:rgba(3,15,13,0.85); border:1px solid rgba(52,211,153,0.3); border-radius:4px; color:#94a3b8; display:flex; align-items:center; justify-content:center; font-size:11px; cursor:pointer;" title="1">1</div>' +
                                '<div class="chrono-key-box" id="chrono-k-2" style="width:24px; height:24px; background:rgba(3,15,13,0.85); border:1px solid rgba(52,211,153,0.3); border-radius:4px; color:#94a3b8; display:flex; align-items:center; justify-content:center; font-size:11px; cursor:pointer;" title="2">2</div>' +
                                '<div class="chrono-key-box" id="chrono-k-3" style="width:24px; height:24px; background:rgba(3,15,13,0.85); border:1px solid rgba(52,211,153,0.3); border-radius:4px; color:#94a3b8; display:flex; align-items:center; justify-content:center; font-size:11px; cursor:pointer;" title="3">3</div>' +
                                '<div class="chrono-key-box" id="chrono-k-4" style="width:24px; height:24px; background:rgba(3,15,13,0.85); border:1px solid rgba(52,211,153,0.3); border-radius:4px; color:#94a3b8; display:flex; align-items:center; justify-content:center; font-size:11px; cursor:pointer;" title="4">4</div>' +
                                '<div class="chrono-key-box" id="chrono-k-5" style="width:24px; height:24px; background:rgba(3,15,13,0.85); border:1px solid rgba(52,211,153,0.3); border-radius:4px; color:#94a3b8; display:flex; align-items:center; justify-content:center; font-size:11px; cursor:pointer;" title="5">5</div>' +
                            '</div>' +
                            '<div style="display:flex; justify-content:center;">' +
                                '<div class="chrono-key-box" id="chrono-k-w" style="width:34px; height:34px; background:rgba(3,15,13,0.85); border:1.5px solid rgba(52,211,153,0.3); border-radius:6px; color:#cbd5e1; display:flex; align-items:center; justify-content:center; font-size:13px; cursor:pointer;" title="Move Up">W</div>' +
                            '</div>' +
                            '<div style="display:flex; gap:4px;">' +
                                '<div class="chrono-key-box" id="chrono-k-a" style="width:34px; height:34px; background:rgba(3,15,13,0.85); border:1.5px solid rgba(52,211,153,0.3); border-radius:6px; color:#cbd5e1; display:flex; align-items:center; justify-content:center; font-size:13px; cursor:pointer;" title="Move Left">A</div>' +
                                '<div class="chrono-key-box" id="chrono-k-s" style="width:34px; height:34px; background:rgba(3,15,13,0.85); border:1.5px solid rgba(52,211,153,0.3); border-radius:6px; color:#cbd5e1; display:flex; align-items:center; justify-content:center; font-size:13px; cursor:pointer;" title="Move Down">S</div>' +
                                '<div class="chrono-key-box" id="chrono-k-d" style="width:34px; height:34px; background:rgba(3,15,13,0.85); border:1.5px solid rgba(52,211,153,0.3); border-radius:6px; color:#cbd5e1; display:flex; align-items:center; justify-content:center; font-size:13px; cursor:pointer;" title="Move Right">D</div>' +
                            '</div>' +
                            '<div style="display:flex; gap:4px; justify-content:center; margin-top:1px;">' +
                                '<div class="chrono-key-box" id="chrono-k-z" style="width:30px; height:28px; background:rgba(3,15,13,0.85); border:1px solid rgba(56,189,248,0.3); border-radius:5px; color:#93c5fd; display:flex; align-items:center; justify-content:center; font-size:12px; cursor:pointer;" title="Ability 1">Z</div>' +
                                '<div class="chrono-key-box" id="chrono-k-x" style="width:30px; height:28px; background:rgba(3,15,13,0.85); border:1px solid rgba(56,189,248,0.3); border-radius:5px; color:#93c5fd; display:flex; align-items:center; justify-content:center; font-size:12px; cursor:pointer;" title="Ability 2">X</div>' +
                                '<div class="chrono-key-box" id="chrono-k-c" style="width:30px; height:28px; background:rgba(3,15,13,0.85); border:1px solid rgba(56,189,248,0.3); border-radius:5px; color:#93c5fd; display:flex; align-items:center; justify-content:center; font-size:12px; cursor:pointer;" title="Ability 3">C</div>' +
                            '</div>';
                        document.body.appendChild(keystrokesDiv);

                        keystrokesDiv.querySelectorAll(".chrono-key-box").forEach(box => {
                            box.onclick = (e) => {
                                if (!window._chrono_hud_editing) return;
                                e.stopPropagation();
                                startRemappingBox(box.id);
                            };
                        });

                        window.addEventListener("keydown", e => {
                            if (bindingListenerActive) {
                                e.preventDefault();
                                e.stopPropagation();
                                if (e.key === "Escape") {
                                    cancelRemapping();
                                    return;
                                }
                                const keyName = e.key.length === 1 ? e.key.toUpperCase() : e.key;
                                customKeyMap[activeListeningBox] = {
                                    type: "key",
                                    key: keyName,
                                    code: e.code,
                                    name: keyName
                                };
                                saveCustomKeyMap();
                                finishRemapping(keyName);
                                return;
                            }

                            if (!keystrokesHudActive) return;
                            const id = getMatchingBoxForKey(e);
                            if (id) setKeyVisual(id, true);
                        }, true);

                        window.addEventListener("keyup", e => {
                            if (bindingListenerActive) return;
                            if (!keystrokesHudActive) return;
                            const id = getMatchingBoxForKey(e);
                            if (id) setKeyVisual(id, false);
                        }, true);

                        window.addEventListener("mousedown", e => {
                            if (bindingListenerActive) {
                                e.preventDefault();
                                e.stopPropagation();
                                const btn = e.button;
                                const btnName = btn === 0 ? "Mouse 1" : btn === 1 ? "Mouse 3" : btn === 2 ? "Mouse 2" : "Mouse " + (btn + 1);
                                customKeyMap[activeListeningBox] = {
                                    type: "mouse",
                                    button: btn,
                                    name: btnName
                                };
                                saveCustomKeyMap();
                                finishRemapping(btnName);
                                return;
                            }

                            if (!keystrokesHudActive) return;
                            const id = getMatchingBoxForMouse(e.button);
                            if (id) setKeyVisual(id, true);
                        }, true);

                        window.addEventListener("mouseup", e => {
                            if (bindingListenerActive) return;
                            if (!keystrokesHudActive) return;
                            const id = getMatchingBoxForMouse(e.button);
                            if (id) setKeyVisual(id, false);
                        }, true);
                    } else {
                        keystrokesDiv.style.display = "flex";
                    }
                } else {
                    if (keystrokesDiv) keystrokesDiv.style.display = "none";
                }
            }

            // === 6. HUD LAYOUT ENGINE & OPAQUE GRID EDITOR ===
            function getStoredHudLayout() {
                try {
                    return JSON.parse(localStorage.getItem("chrono_hud_layout") || "{}");
                } catch(e) { return {}; }
            }
            function saveStoredHudLayout(layout) {
                localStorage.setItem("chrono_hud_layout", JSON.stringify(layout));
                applyHudLayout();
            }

            const HUD_TARGETS = [
                { key: "fps", name: "⚡ FPS Counter", sel: "#chrono-fps-hud" },
                { key: "keystrokes", name: "⌨️ Keystrokes HUD", sel: "#chrono-keystrokes-hud" },
                { key: "leaderboard", name: "🏆 In-Game Leaderboard", sel: "#leaderboard" },
                { key: "chat", name: "💬 In-Game Chat Box", sel: "#chat" }
            ];

            function applyHudLayout() {
                if (window._chrono_hud_editing) return;
                const layout = getStoredHudLayout();
                HUD_TARGETS.forEach(t => {
                    const el = document.querySelector(t.sel);
                    if (!el) return;
                    const cfg = layout[t.key];
                    if (cfg && cfg.left && cfg.top) {
                        el.style.setProperty("position", "fixed", "important");
                        el.style.setProperty("left", cfg.left, "important");
                        el.style.setProperty("top", cfg.top, "important");
                        el.style.setProperty("right", "auto", "important");
                        el.style.setProperty("bottom", "auto", "important");
                        el.style.setProperty("z-index", "99999", "important");
                    }
                    if (cfg && cfg.scale) {
                        el.style.setProperty("transform", "scale(" + cfg.scale + ")", "important");
                        el.style.setProperty("transform-origin", "top left", "important");
                    }
                });
            }

            setInterval(applyHudLayout, 600);

            function cleanupStrayElements() {
                document.querySelectorAll("body > .leaderboard, body > .chat, body > #leaderboard, body > #chat").forEach(el => {
                    if (el.innerText && (el.innerText.includes("🏆 Leaderboard") || el.innerText.includes("💬 Chat Box") || el.innerText.includes("💬 In-Game"))) {
                        el.remove();
                    }
                });
            }
            cleanupStrayElements();

            function openHudLayoutEditor() {
                cleanupStrayElements();
                window._chrono_hud_editing = true;
                const menuModal = document.getElementById("chrono-menu-modal");
                if (menuModal) menuModal.style.display = "none";

                let overlay = document.getElementById("chrono-hud-grid-overlay");
                if (!overlay) {
                    overlay = document.createElement("div");
                    overlay.id = "chrono-hud-grid-overlay";
                    overlay.style.position = "fixed";
                    overlay.style.top = "0";
                    overlay.style.left = "0";
                    overlay.style.width = "100vw";
                    overlay.style.height = "100vh";
                    overlay.style.background = "rgba(4, 15, 13, 0.88)";
                    overlay.style.backgroundImage = "linear-gradient(rgba(52, 211, 153, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(52, 211, 153, 0.12) 1px, transparent 1px)";
                    overlay.style.backgroundSize = "32px 32px";
                    overlay.style.zIndex = "999990";
                    overlay.style.pointerEvents = "none";
                    document.body.appendChild(overlay);
                }
                overlay.style.display = "block";

                let topBar = document.getElementById("chrono-hud-editor-bar");
                if (!topBar) {
                    topBar = document.createElement("div");
                    topBar.id = "chrono-hud-editor-bar";
                    topBar.style.position = "fixed";
                    topBar.style.top = "18px";
                    topBar.style.left = "50%";
                    topBar.style.transform = "translateX(-50%)";
                    topBar.style.background = "linear-gradient(135deg, rgba(7, 26, 23, 0.98), rgba(13, 40, 36, 0.98))";
                    topBar.style.border = "1.5px solid rgba(52, 211, 153, 0.5)";
                    topBar.style.borderRadius = "12px";
                    topBar.style.boxShadow = "0 15px 40px rgba(0,0,0,0.8), 0 0 25px rgba(16, 185, 129, 0.4)";
                    topBar.style.padding = "10px 20px";
                    topBar.style.display = "flex";
                    topBar.style.alignItems = "center";
                    topBar.style.gap = "16px";
                    topBar.style.zIndex = "999999";
                    topBar.style.fontFamily = "sans-serif";
                    topBar.innerHTML = 
                        '<div style="display:flex; align-items:center; gap:8px;">' +
                            '<span style="font-size:16px;">🎛️</span>' +
                            '<div>' +
                                '<b style="color:#34d399; font-size:13px; letter-spacing:0.5px;">CHRONO HUD LAYOUT EDITOR</b>' +
                                '<div id="chrono-hud-editor-subtext" style="color:#94a3b8; font-size:10.5px;">Drag any element directly to move it • Click keys on HUD to remap • Use [-] / [+] to scale</div>' +
                            '</div>' +
                        '</div>' +
                        '<div style="display:flex; gap:8px; margin-left:auto;">' +
                            '<button id="chrono-btn-save-hud-layout" style="background:linear-gradient(135deg, #059669, #10b981); border:1px solid rgba(110,231,183,0.4); color:#fff; padding:6px 16px; border-radius:6px; font-size:11.5px; font-weight:800; cursor:pointer;">💾 Save & Exit</button>' +
                            '<button id="chrono-btn-reset-hud-layout" style="background:rgba(239, 68, 68, 0.2); border:1px solid rgba(239,68,68,0.4); color:#fca5a5; padding:6px 12px; border-radius:6px; font-size:11.5px; font-weight:700; cursor:pointer;">🔄 Reset Defaults</button>' +
                            '<button id="chrono-btn-exit-hud-layout" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#cbd5e1; padding:6px 12px; border-radius:6px; font-size:11.5px; font-weight:600; cursor:pointer;">❌ Cancel</button>' +
                        '</div>';
                    document.body.appendChild(topBar);

                    document.getElementById("chrono-btn-save-hud-layout").onclick = () => closeHudLayoutEditor(true);
                    document.getElementById("chrono-btn-reset-hud-layout").onclick = () => {
                        localStorage.removeItem("chrono_hud_layout");
                        HUD_TARGETS.forEach(t => {
                            const el = document.querySelector(t.sel);
                            if (el) {
                                el.style.removeProperty("position");
                                el.style.removeProperty("left");
                                el.style.removeProperty("top");
                                el.style.removeProperty("right");
                                el.style.removeProperty("bottom");
                                el.style.removeProperty("transform");
                                el.style.removeProperty("transform-origin");
                            }
                        });
                        closeHudLayoutEditor(false);
                    };
                    document.getElementById("chrono-btn-exit-hud-layout").onclick = () => closeHudLayoutEditor(false);
                }
                topBar.style.display = "flex";

                const currentLayout = getStoredHudLayout();
                HUD_TARGETS.forEach(t => {
                    let el = document.querySelector(t.sel);
                    if (!el) return;

                    el.style.setProperty("z-index", "999995", "important");
                    el.style.setProperty("outline", "2px dashed #34d399", "important");
                    el.style.setProperty("outline-offset", "4px", "important");
                    el.style.setProperty("cursor", "grab", "important");
                    el.style.setProperty("user-select", "none", "important");
                    el.style.setProperty("pointer-events", "auto", "important");

                    let scale = (currentLayout[t.key] && currentLayout[t.key].scale) ? currentLayout[t.key].scale : 1.0;
                    let posLeft = (currentLayout[t.key] && currentLayout[t.key].left) ? currentLayout[t.key].left : "";
                    let posTop = (currentLayout[t.key] && currentLayout[t.key].top) ? currentLayout[t.key].top : "";

                    const r = el.getBoundingClientRect();
                    if (!posLeft || !posTop) {
                        posLeft = r.left + "px";
                        posTop = r.top + "px";
                    }

                    el.style.setProperty("position", "fixed", "important");
                    el.style.setProperty("left", posLeft, "important");
                    el.style.setProperty("top", posTop, "important");
                    el.style.setProperty("right", "auto", "important");
                    el.style.setProperty("bottom", "auto", "important");
                    el.style.setProperty("transform", "scale(" + scale + ")", "important");
                    el.style.setProperty("transform-origin", "top left", "important");

                    const updateHandlePosition = () => {
                        const elRect = el.getBoundingClientRect();
                        const isNearTop = (elRect.top < 45);
                        handleBar.style.left = elRect.left + "px";
                        if (isNearTop) {
                            handleBar.style.top = (elRect.bottom + 6) + "px";
                        } else {
                            handleBar.style.top = (elRect.top - 30) + "px";
                        }
                    };

                    let handleBar = document.getElementById("chrono-handle-" + t.key);
                    if (!handleBar) {
                        handleBar = document.createElement("div");
                        handleBar.id = "chrono-handle-" + t.key;
                        handleBar.className = "chrono-editor-handle";
                        handleBar.style.position = "fixed";
                        handleBar.style.background = "rgba(16, 185, 129, 0.95)";
                        handleBar.style.color = "#031511";
                        handleBar.style.padding = "3px 8px";
                        handleBar.style.borderRadius = "4px";
                        handleBar.style.fontSize = "10.5px";
                        handleBar.style.fontWeight = "800";
                        handleBar.style.cursor = "grab";
                        handleBar.style.display = "flex";
                        handleBar.style.alignItems = "center";
                        handleBar.style.gap = "6px";
                        handleBar.style.userSelect = "none";
                        handleBar.style.pointerEvents = "auto";
                        handleBar.style.zIndex = "999996";
                        handleBar.innerHTML = 
                            '<span>⠿ ' + t.name + '</span>' +
                            '<div style="display:flex; gap:4px; align-items:center; margin-left:8px;">' +
                                '<button class="chrono-btn-scale-down" style="background:#031511; color:#fff; border:none; border-radius:3px; width:16px; height:16px; cursor:pointer; font-weight:bold; font-size:10px;">-</button>' +
                                '<span class="chrono-scale-val" style="font-size:9.5px;">' + Math.round(scale * 100) + '%</span>' +
                                '<button class="chrono-btn-scale-up" style="background:#031511; color:#fff; border:none; border-radius:3px; width:16px; height:16px; cursor:pointer; font-weight:bold; font-size:10px;">+</button>' +
                            '</div>';
                        
                        const overlay = document.getElementById("chrono-hud-grid-overlay");
                        if (overlay) overlay.appendChild(handleBar);
                        else document.body.appendChild(handleBar);

                        const scaleDown = handleBar.querySelector(".chrono-btn-scale-down");
                        const scaleUp = handleBar.querySelector(".chrono-btn-scale-up");
                        const scaleVal = handleBar.querySelector(".chrono-scale-val");

                        scaleDown.onclick = (e) => {
                            e.stopPropagation();
                            scale = Math.max(0.4, Math.round((scale - 0.1) * 10) / 10);
                            el.style.setProperty("transform", "scale(" + scale + ")", "important");
                            scaleVal.textContent = Math.round(scale * 100) + "%";
                            currentLayout[t.key] = currentLayout[t.key] || {};
                            currentLayout[t.key].scale = scale;
                            updateHandlePosition();
                        };
                        scaleUp.onclick = (e) => {
                            e.stopPropagation();
                            scale = Math.min(2.5, Math.round((scale + 0.1) * 10) / 10);
                            el.style.setProperty("transform", "scale(" + scale + ")", "important");
                            scaleVal.textContent = Math.round(scale * 100) + "%";
                            currentLayout[t.key] = currentLayout[t.key] || {};
                            currentLayout[t.key].scale = scale;
                            updateHandlePosition();
                        };

                        let isDragging = false;
                        let startX = 0, startY = 0;
                        let origLeft = 0, origTop = 0;

                        const startDrag = (e) => {
                            if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
                            if (e.target.closest && e.target.closest(".chrono-key-box")) return;
                            isDragging = true;
                            startX = e.clientX;
                            startY = e.clientY;
                            const r = el.getBoundingClientRect();
                            origLeft = r.left;
                            origTop = r.top;
                            el.style.setProperty("position", "fixed", "important");
                            el.style.setProperty("left", origLeft + "px", "important");
                            el.style.setProperty("top", origTop + "px", "important");
                            el.style.setProperty("right", "auto", "important");
                            el.style.setProperty("bottom", "auto", "important");
                            el.style.setProperty("cursor", "grabbing", "important");
                            if (handleBar) handleBar.style.setProperty("cursor", "grabbing", "important");
                            document.body.style.cursor = "grabbing";
                            e.preventDefault();
                            e.stopPropagation();
                        };

                        handleBar.onmousedown = startDrag;
                        el.onmousedown = startDrag;

                        window.addEventListener("mousemove", e => {
                            if (!isDragging) return;
                            const dx = e.clientX - startX;
                            const dy = e.clientY - startY;
                            const finalL = (origLeft + dx) + "px";
                            const finalT = (origTop + dy) + "px";
                            el.style.setProperty("left", finalL, "important");
                            el.style.setProperty("top", finalT, "important");
                            updateHandlePosition();

                            currentLayout[t.key] = currentLayout[t.key] || {};
                            currentLayout[t.key].left = finalL;
                            currentLayout[t.key].top = finalT;
                            currentLayout[t.key].scale = scale;
                        });

                        window.addEventListener("mouseup", () => {
                            if (isDragging) {
                                isDragging = false;
                                el.style.setProperty("cursor", "grab", "important");
                                if (handleBar) handleBar.style.setProperty("cursor", "grab", "important");
                                document.body.style.cursor = "";
                            }
                        });
                    }
                    handleBar.style.display = "flex";
                    updateHandlePosition();
                });

                window._chrono_active_editing_layout = currentLayout;
            }

            function closeHudLayoutEditor(save) {
                if (bindingListenerActive) cancelRemapping();
                window._chrono_hud_editing = false;
                const overlay = document.getElementById("chrono-hud-grid-overlay");
                if (overlay) overlay.style.display = "none";
                const topBar = document.getElementById("chrono-hud-editor-bar");
                if (topBar) topBar.style.display = "none";

                document.querySelectorAll(".chrono-editor-handle").forEach(h => h.style.display = "none");
                HUD_TARGETS.forEach(t => {
                    const el = document.querySelector(t.sel);
                    if (el) {
                        el.style.removeProperty("outline");
                        el.style.removeProperty("outline-offset");
                        el.style.removeProperty("cursor");
                        el.onmousedown = null;
                        if (t.key === "fps") {
                            el.style.setProperty("pointer-events", "none", "important");
                        }
                    }
                });

                if (save) {
                    saveCustomKeyMap();
                    if (window._chrono_active_editing_layout) {
                        saveStoredHudLayout(window._chrono_active_editing_layout);
                    }
                }
            }

            window._chrono_open_hud_editor = openHudLayoutEditor;

            let chatMacroActive = false;
            function toggleChatMacro(enable) {
                chatMacroActive = enable;
                localStorage.setItem("chrono_mod_chatmacro", enable ? "1" : "0");
                if (!window._chrono_chatmacro_bound) {
                    window._chrono_chatmacro_bound = true;
                    window.addEventListener("keydown", e => {
                        if (!chatMacroActive) return;
                        const tag = document.activeElement ? document.activeElement.tagName : "";
                        if (tag === "INPUT" || tag === "TEXTAREA") return;
                        if (e.key === "g" || e.key === "G") {
                            const chatInput = document.getElementById("chat-input") || document.querySelector("input.chat-input");
                            if (chatInput) {
                                chatInput.value = "gg";
                                chatInput.dispatchEvent(new Event("input", { bubbles: true }));
                                chatInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
                            }
                        }
                    });
                }
            }

            function togglePixelSharp(enable) {
                localStorage.setItem("chrono_mod_pixelsharp", enable ? "1" : "0");
                const canvas = document.getElementById("canvas");
                if (canvas) {
                    canvas.style.imageRendering = enable ? "pixelated" : "auto";
                    const ctx = canvas.getContext("2d");
                    if (ctx) ctx.imageSmoothingEnabled = !enable;
                }
            }

            const modKs = document.getElementById("chrono-mod-keystrokes");
            const btnOpenHudEd = document.getElementById("chrono-btn-open-hud-editor");
            const modChat = document.getElementById("chrono-mod-chatmacro");
            const modPixel = document.getElementById("chrono-mod-pixelsharp");

            if (modKs) {
                modKs.checked = (localStorage.getItem("chrono_mod_keystrokes") === "1");
                toggleKeystrokesHud(modKs.checked);
                modKs.onchange = () => toggleKeystrokesHud(modKs.checked);
            }
            if (btnOpenHudEd) {
                btnOpenHudEd.onclick = () => openHudLayoutEditor();
            }
            if (modChat) {
                modChat.checked = (localStorage.getItem("chrono_mod_chatmacro") === "1");
                toggleChatMacro(modChat.checked);
                modChat.onchange = () => toggleChatMacro(modChat.checked);
            }
            if (modPixel) {
                modPixel.checked = (localStorage.getItem("chrono_mod_pixelsharp") === "1");
                togglePixelSharp(modPixel.checked);
                modPixel.onchange = () => togglePixelSharp(modPixel.checked);
            }

            const openScriptsDirBtn = document.getElementById("chrono-btn-open-scripts-dir");
            if (openScriptsDirBtn) {
                openScriptsDirBtn.onclick = () => {
                    if (window.ipc) {
                        window.ipc.postMessage(JSON.stringify({ action: "open_scripts_folder" }));
                    }
                };
            }

            // Auto-run enabled scripts on boot
            const initialMap = getEnabledScriptMap();
            (window._chrono_loaded_scripts || INITIAL_CHRONO_SCRIPTS || []).forEach(s => {
                if (initialMap[s.filename] && s.code) {
                    executeScript(s);
                }
            });

            syncUiFromConfig();
            renderAltsList();
            renderActiveFlagsBadges();
            renderCursorGrid();
            renderCustomScriptsList();
            applyHudLayout();

            // --- CUSTOM UI THEME APPLY ---
            const __uiCfg = JSON.parse(localStorage.getItem('chrono_ui_cfg') || '{}');
            if (__uiCfg.logoUrl) {
                const __logoTarget = document.querySelector('.title');
                if (__logoTarget && !__logoTarget.hasAttribute('data-chrono-logo')) {
                    __logoTarget.setAttribute('data-chrono-logo', '1');
                    __logoTarget.innerHTML = '<img src="' + __uiCfg.logoUrl + '" style="max-height:85px; margin-bottom:10px;" />';
                }
            }
            const __btnSave = document.getElementById('chrono-ui-btn-save');
            if (__btnSave && !__btnSave.hasAttribute('data-bound')) {
                __btnSave.setAttribute('data-bound', '1');
                const __iBg1 = document.getElementById('chrono-ui-bg1');
                const __iBg2 = document.getElementById('chrono-ui-bg2');
                const __iAc1 = document.getElementById('chrono-ui-acc1');
                const __iAc2 = document.getElementById('chrono-ui-acc2');
                const __iAc3 = document.getElementById('chrono-ui-acc3');
                const __iLogo = document.getElementById('chrono-ui-logo');
                if (__iBg1) __iBg1.value = __uiCfg.bg1 || '#0d211e';
                if (__iBg2) __iBg2.value = __uiCfg.bg2 || '#061210';
                if (__iAc1) __iAc1.value = __uiCfg.acc1 || '#059669';
                if (__iAc2) __iAc2.value = __uiCfg.acc2 || '#047857';
                if (__iAc3) __iAc3.value = __uiCfg.acc3 || '#10b981';
                if (__iLogo) __iLogo.value = __uiCfg.logoUrl || '';
                __btnSave.onclick = function() {
                    var nc = {
                        bg1: __iBg1 ? __iBg1.value : '',
                        bg2: __iBg2 ? __iBg2.value : '',
                        acc1: __iAc1 ? __iAc1.value : '',
                        acc2: __iAc2 ? __iAc2.value : '',
                        acc3: __iAc3 ? __iAc3.value : '',
                        logoUrl: __iLogo ? __iLogo.value : ''
                    };
                    localStorage.setItem('chrono_ui_cfg', JSON.stringify(nc));
                    window.location.reload();
                };
                var __btnReset = document.getElementById('chrono-ui-btn-reset');
                if (__btnReset) {
                    __btnReset.onclick = function() {
                        localStorage.removeItem('chrono_ui_cfg');
                        window.location.reload();
                    };
                }
            }
            // --- END CUSTOM UI ---
        }
    }

    attachChronoUI();
    if (document.readyState !== "complete" && document.readyState !== "interactive") {
        window.addEventListener("DOMContentLoaded", attachChronoUI);
    }
    window.addEventListener("load", attachChronoUI);
    setInterval(attachChronoUI, 350);

    // 8. Account & Customization Enhancer (2-Col Top Layout, Live Preview & 3-Col Categories)
    function enhanceAccountPage() {
        const accountEl = document.querySelector(".account");
        if (!accountEl) return;

        // 1. Blur Email with click-to-reveal toggle
        const walker = document.createTreeWalker(accountEl, NodeFilter.SHOW_TEXT, null, false);
        let node;
        const textNodes = [];
        while (node = walker.nextNode()) {
            if (node.nodeValue && (node.nodeValue.includes("Verified email:") || node.nodeValue.includes("Email not yet verified:") || (node.nodeValue.includes("@") && node.nodeValue.includes(".")))) {
                textNodes.push(node);
            }
        }

        textNodes.forEach(tNode => {
            if (tNode.parentNode && tNode.parentNode.classList && tNode.parentNode.classList.contains("chrono-blurred-email")) return;
            const text = tNode.nodeValue;
            const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (emailMatch) {
                const span = document.createElement("span");
                const prefix = text.substring(0, emailMatch.index);
                const email = emailMatch[0];
                const suffix = text.substring(emailMatch.index + email.length);
                
                span.innerHTML = prefix + '<span class="chrono-blurred-email" title="Click to toggle reveal (Privacy Protected)">' + email + '</span>' + suffix;
                const emailSpan = span.querySelector(".chrono-blurred-email");
                if (emailSpan) {
                    emailSpan.onclick = () => emailSpan.classList.toggle("revealed");
                }
                tNode.parentNode.replaceChild(span, tNode);
            }
        });

        // 2. Wrap Account Details in .chrono-account-top-grid (Left: Account Card, Right: Preview Display)
        if (!accountEl.querySelector(".chrono-account-top-grid")) {
            const titleEl = accountEl.querySelector(".account-title");
            const resetBtn = accountEl.querySelector(".reset-password-button, .resend-verification-email-button");
            const stateInfo = accountEl.querySelector(".account-state-info");
            const clearBtn = accountEl.querySelector(".clear-state-button");

            if (titleEl && titleEl.parentNode) {
                const topGrid = document.createElement("div");
                topGrid.className = "chrono-account-top-grid";

                const leftCard = document.createElement("div");
                leftCard.className = "chrono-account-card";

                titleEl.parentNode.insertBefore(topGrid, titleEl);
                topGrid.appendChild(leftCard);
                leftCard.appendChild(titleEl);

                let curr = topGrid.nextSibling;
                while (curr && curr !== resetBtn && curr !== stateInfo && curr !== clearBtn && !curr.classList?.contains("account-accessories") && !curr.classList?.contains("back-text")) {
                    const next = curr.nextSibling;
                    leftCard.appendChild(curr);
                    curr = next;
                }

                if (resetBtn) leftCard.appendChild(resetBtn);
                if (stateInfo) leftCard.appendChild(stateInfo);
                if (clearBtn) leftCard.appendChild(clearBtn);

                // Create Right Card: Live Character Preview Display
                const rightCard = document.createElement("div");
                rightCard.className = "chrono-preview-card";
                rightCard.innerHTML = 
                    '<div style="width: 100%; display: flex; align-items: center; justify-content: space-between;">' +
                        '<span style="font-weight: 800; font-size: 13px; color: #34d399; display: flex; align-items: center; gap: 6px;">✨ Character Preview</span>' +
                        '<span style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(52, 211, 153, 0.4); color: #6ee7b7; font-size: 9px; padding: 1px 7px; border-radius: 4px; font-weight: 700;">LIVE</span>' +
                    '</div>' +
                    '<div class="chrono-preview-stage">' +
                        '<div id="chrono-prev-name" style="font-size: 12px; font-weight: 800; color: #f8fafc; margin-bottom: 6px;">Player</div>' +
                        '<div class="chrono-preview-avatar-box">' +
                            '<div id="chrono-prev-hero" class="chrono-preview-hero-circle"></div>' +
                            '<img id="chrono-prev-body" class="chrono-preview-layer-body" style="display: none;" />' +
                            '<img id="chrono-prev-hat" class="chrono-preview-layer-hat" style="display: none;" />' +
                            '<img id="chrono-prev-gem" class="chrono-preview-layer-gem" style="display: none;" />' +
                        '</div>' +
                    '</div>' +
                    '<div class="chrono-preview-equipped-list">' +
                        '<div class="chrono-equipped-badge">🎩 <span id="chrono-lbl-hat" style="color: #6ee7b7; font-weight: bold;">None</span></div>' +
                        '<div class="chrono-equipped-badge">👕 <span id="chrono-lbl-body" style="color: #6ee7b7; font-weight: bold;">None</span></div>' +
                        '<div class="chrono-equipped-badge">💎 <span id="chrono-lbl-gem" style="color: #6ee7b7; font-weight: bold;">None</span></div>' +
                    '</div>';

                topGrid.appendChild(rightCard);
            }
        }

        // 3. Reorganize Hats, Body, and Gems side-by-side in 3 columns
        const accContainer = accountEl.querySelector(".account-accessories");
        if (accContainer && !accContainer.querySelector(".chrono-accessories-grid")) {
            const collections = accContainer.querySelectorAll(".collection");
            const titles = accContainer.querySelectorAll(".collection-title");

            if (collections.length >= 2) {
                const accGrid = document.createElement("div");
                accGrid.className = "chrono-accessories-grid";

                const colDefs = [
                    { name: "🎩 Hats", colIdx: 0 },
                    { name: "👕 Body", colIdx: 1 },
                    { name: "💎 Crown Gems", colIdx: 2 }
                ];

                colDefs.forEach(def => {
                    if (collections[def.colIdx]) {
                        const colBox = document.createElement("div");
                        colBox.className = "chrono-acc-column";
                        const count = collections[def.colIdx].querySelectorAll(".accessory").length;

                        colBox.innerHTML = '<div class="chrono-acc-column-header"><span>' + def.name + '</span><span style="font-size: 11px; color: #94a3b8; font-weight: 600;">(' + count + ')</span></div>';
                        colBox.appendChild(collections[def.colIdx]);
                        accGrid.appendChild(colBox);
                    }
                });

                titles.forEach(t => t.style.display = "none");
                accContainer.appendChild(accGrid);
            }
        }

        // 4. Update Live Preview Display values dynamically
        const prevName = document.getElementById("chrono-prev-name");
        const titleEl = accountEl.querySelector(".account-title");
        if (prevName && titleEl) {
            const match = titleEl.innerText.match(/logged in as\s+(.+)$/i);
            if (match) prevName.innerText = match[1];
        }

        const hatCol = accountEl.querySelectorAll(".chrono-acc-column")[0];
        const bodyCol = accountEl.querySelectorAll(".chrono-acc-column")[1];
        const gemCol = accountEl.querySelectorAll(".chrono-acc-column")[2];

        let equippedHatName = "";

        // Hats
        if (hatCol) {
            const selHat = hatCol.querySelector(".accessory.accessory-selected");
            const lblHat = document.getElementById("chrono-lbl-hat");
            const imgHat = document.getElementById("chrono-prev-hat");
            if (selHat) {
                equippedHatName = (selHat.querySelector(".accessory-name")?.innerText || "").trim();
                const img = selHat.querySelector("img");
                if (lblHat) lblHat.innerText = equippedHatName || "None";
                if (imgHat) {
                    if (equippedHatName && equippedHatName.toLowerCase() !== "none" && img && img.src && !img.src.includes("data:image/gif")) {
                        imgHat.src = img.src;
                        imgHat.style.display = "block";
                    } else {
                        imgHat.style.display = "none";
                    }
                }
            }
        }

        // Body
        if (bodyCol) {
            const selBody = bodyCol.querySelector(".accessory.accessory-selected");
            const lblBody = document.getElementById("chrono-lbl-body");
            const imgBody = document.getElementById("chrono-prev-body");
            if (selBody) {
                const name = (selBody.querySelector(".accessory-name")?.innerText || "").trim();
                const img = selBody.querySelector("img");
                if (lblBody) lblBody.innerText = name || "None";
                if (imgBody) {
                    if (name && name.toLowerCase() !== "none" && img && img.src && !img.src.includes("data:image/gif")) {
                        imgBody.src = img.src;
                        imgBody.style.display = "block";
                    } else {
                        imgBody.style.display = "none";
                    }
                }
            }
        }

        // Gem (Only visible if wearing Bronze/Silver/Gold Crown)
        const isWearingCrown = Boolean(equippedHatName && /crown/i.test(equippedHatName));
        if (gemCol) {
            const selGem = gemCol.querySelector(".accessory.accessory-selected");
            const lblGem = document.getElementById("chrono-lbl-gem");
            const imgGem = document.getElementById("chrono-prev-gem");
            if (selGem) {
                const name = (selGem.querySelector(".accessory-name")?.innerText || "").trim();
                const img = selGem.querySelector("img");
                if (lblGem) {
                    lblGem.innerText = (name && name.toLowerCase() !== "none" && name.toLowerCase() !== "off") 
                        ? (isWearingCrown ? name : name + " (Needs Crown)") 
                        : "None";
                }
                if (imgGem) {
                    if (isWearingCrown && name && name.toLowerCase() !== "none" && name.toLowerCase() !== "off" && img && img.src && !img.src.includes("data:image/gif")) {
                        imgGem.src = img.src;
                        imgGem.style.display = "block";
                    } else {
                        imgGem.style.display = "none";
                    }
                }
            }
        }
    }

        // Track logged in user across pages for automatic profile resolution
        function trackCurrentUser() {
            const nameFromHome = document.querySelector(".logged-in-name")?.innerText;
            const nameFromAccount = document.querySelector(".account-title")?.innerText?.match(/logged in as\s+(.+)$/i)?.[1];
            const storedAlt = getStoredAlts()?.[0]?.username;
            const name = (nameFromHome || nameFromAccount || storedAlt || "").trim();
            if (name && name !== "Player" && name !== "undefined") {
                localStorage.setItem("chrono_current_user", name);
            }
        }

    // Safe one-time redirect if accessing root /profile without username
    if ((window.location.pathname === "/profile" || window.location.pathname === "/profile/") && !window._chrono_profile_redirected) {
        window._chrono_profile_redirected = true;
        const myUser = localStorage.getItem("chrono_current_user");
        if (myUser && myUser !== "Player" && myUser !== "undefined") {
            window.location.replace("/profile/" + encodeURIComponent(myUser));
        }
    }

    // 9. Profile Page Enhancer (Sleek Artemesik Theme, Direct API Fetch, No Preview, @artem_on Credits)
    function enhanceProfilePage() {
        const subProfile = document.querySelector(".subtitle-profile");
        const profStats = document.querySelector(".profile-stats");
        if (!subProfile || !profStats) {
            document.body.classList.remove("chrono-profile-active");
            const existing = document.getElementById("chrono-custom-profile");
            if (existing) existing.style.display = "none";
            return;
        }

        document.body.classList.add("chrono-profile-active");

        const mainParent = subProfile.parentElement;
        if (!mainParent) return;

        let rawUser = (location.pathname.split("/profile/")[1] || "").trim();
        if (rawUser) rawUser = decodeURIComponent(rawUser);
        if (!rawUser) {
            const uEl = subProfile.querySelector(".username");
            rawUser = (uEl?.innerText || "Player").trim();
        }
        const cleanUsername = rawUser.replace(/[\n\r\t]/g, " ").trim();
        const onlineMarker = subProfile.querySelector(".profile-onlineMarker");
        const isOnline = Boolean(onlineMarker && onlineMarker.classList.contains("online"));

        let customRoot = document.getElementById("chrono-custom-profile");
        if (!customRoot) {
            customRoot = document.createElement("div");
            customRoot.id = "chrono-custom-profile";
            customRoot.className = "chrono-artem-profile";
            mainParent.insertBefore(customRoot, subProfile);
        }
        customRoot.style.display = "flex";

        if (customRoot.dataset.loadedUser !== cleanUsername) {
            customRoot.dataset.loadedUser = cleanUsername;
            customRoot.innerHTML = 
                '<div class="chrono-ap-header">' +
                    '<button class="chrono-ap-back-btn" onclick="location.href=\'/\'" title="Back to Home">←</button>' +
                    '<div class="chrono-ap-title">Player Profile</div>' +
                    '<input type="text" class="chrono-ap-search" id="chrono-ap-search-input" placeholder="🔍 Search username..." value="' + cleanUsername + '" />' +
                '</div>' +
                '<div class="chrono-ap-top-grid">' +
                    '<div class="chrono-ap-card">' +
                        '<div class="chrono-ap-user-header">' +
                            '<div class="chrono-ap-username">👤 ' + cleanUsername + '</div>' +
                            '<div class="chrono-ap-status-pill ' + (isOnline ? 'chrono-ap-status-online' : 'chrono-ap-status-offline') + '">' + (isOnline ? '● Online' : '○ Offline') + '</div>' +
                        '</div>' +
                        '<div class="chrono-ap-roles">' +
                            '<span class="chrono-ap-role-badge">Player</span>' +
                            '<span class="chrono-ap-role-badge" style="border-color:#38bdf8; color:#38bdf8;">Chrono Client ⚡</span>' +
                        '</div>' +
                        '<div class="chrono-ap-stat-row"><span class="chrono-ap-stat-label">Career VP:</span><span class="chrono-ap-stat-val" id="chrono-ap-career-vp" style="color:#f59e0b;">...</span></div>' +
                        '<div class="chrono-ap-stat-row"><span class="chrono-ap-stat-label">Quest Points:</span><span class="chrono-ap-stat-val" id="chrono-ap-quest-pts" style="color:#10b981;">...</span></div>' +
                        '<div class="chrono-ap-stat-row"><span class="chrono-ap-stat-label">Achievements:</span><span class="chrono-ap-stat-val">20 / 37</span></div>' +
                        '<div class="chrono-ap-stat-row"><span class="chrono-ap-stat-label">Rank Status:</span><span class="chrono-ap-stat-val" style="color:#38bdf8;">Active Explorer</span></div>' +
                        '<div class="chrono-ap-actions">' +
                            '<button class="chrono-ap-act-btn chrono-btn-blue" title="Add Friend">👤 Add Friend</button>' +
                            '<button class="chrono-ap-act-btn chrono-btn-blue" title="Message">💬 Message</button>' +
                            '<button class="chrono-ap-act-btn chrono-btn-red" title="Report">⚠️ Report</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="chrono-ap-card">' +
                        '<div class="chrono-ap-card-title"><span>📈 VP Graph & Performance</span></div>' +
                        '<div id="chrono-ap-graph-host" style="width:100%; min-height:160px; display:flex; align-items:center; justify-content:center;">' +
                            '<canvas id="chrono-ap-vp-canvas" style="width:100%; height:160px;"></canvas>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="chrono-ap-bottom-grid">' +
                    '<div style="display:flex; flex-direction:column; gap:16px;">' +
                        '<div class="chrono-ap-card">' +
                            '<div class="chrono-ap-card-title"><span>🏆 Highest Area Achieved</span></div>' +
                            '<div class="chrono-ap-areas-grid" id="chrono-ap-areas-grid">' +
                                '<div style="color:#64748b; font-size:11px; padding:6px;">Loading areas...</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="chrono-ap-card">' +
                            '<div class="chrono-ap-card-title"><span>🏛️ Hall of Fame Weekly Scores</span></div>' +
                            '<div class="chrono-ap-hof-list" id="chrono-ap-hof-list">' +
                                '<div style="color:#64748b; font-size:11px; padding:6px;">Loading weekly scores...</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="chrono-ap-card">' +
                        '<div class="chrono-ap-card-title">' +
                            '<span>🏃 Recent Runs</span>' +
                            '<span style="font-size:11px; color:#38bdf8; cursor:pointer; text-decoration:underline;" onclick="toggleRunsWindow()">Open Runs Page ⏳</span>' +
                        '</div>' +
                        '<div id="chrono-ap-runs-box" style="overflow-x:auto;">' +
                            '<div style="color:#64748b; font-size:11px; text-align:center; padding:16px 0;">Loading runs...</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="chrono-ap-footer">' +
                    '<div class="chrono-ap-credits">✨ UI Concept by <b style="color:#38bdf8;">@artem_on</b></div>' +
                    '<div>Click <a href="/" class="bold-link">here</a> to return to the home page.</div>' +
                '</div>';

            const searchInput = document.getElementById("chrono-ap-search-input");
            if (searchInput) {
                searchInput.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        const q = (searchInput.value || "").trim();
                        if (q) location.href = "/profile/" + encodeURIComponent(q);
                    }
                });
            }

            // 1. Fetch Account Data from /api/account/
            (async () => {
                try {
                    const res = await fetch("/api/account/" + encodeURIComponent(cleanUsername));
                    const data = await res.json();
                    if (!data) return;

                    const stats = data.stats || {};
                    const careerVpEl = document.getElementById("chrono-ap-career-vp");
                    const questPtsEl = document.getElementById("chrono-ap-quest-pts");
                    if (careerVpEl) careerVpEl.innerText = stats.highest_area_achieved_counter || 0;
                    if (questPtsEl) questPtsEl.innerText = stats.quest_points || 0;

                    // Populate Areas (Excluding Transforming Turbidity & Powered Plains)
                    const areasGrid = document.getElementById("chrono-ap-areas-grid");
                    if (areasGrid && stats.highest_area_achieved) {
                        const entries = Object.entries(stats.highest_area_achieved);
                        if (entries.length === 0) {
                            areasGrid.innerHTML = '<div style="color:#64748b; font-size:11px;">No maps recorded yet.</div>';
                        } else {
                            let html = "";
                            entries.forEach(([mapName, val]) => {
                                if (mapName === "Transforming Turbidity" || mapName === "Powered Plains") return;
                                const color = MAP_COLORS[mapName] || "#38bdf8";
                                html += '<div class="chrono-ap-area-row" style="color:' + color + ';">' +
                                    '<span>' + mapName + '</span>' +
                                    '<span style="color:#ffffff;">Area ' + val + '</span>' +
                                '</div>';
                            });
                            areasGrid.innerHTML = html;
                        }
                    }

                    // Populate HoF from stats.week_record
                    const hofList = document.getElementById("chrono-ap-hof-list");
                    if (hofList && stats.week_record) {
                        const weekNums = Object.keys(stats.week_record).map(Number).sort((a, b) => b - a);
                        let html = "";
                        weekNums.forEach(wk => {
                            const item = stats.week_record[wk] || {};
                            const wins = item.wins || 0;
                            const finish = item.finish || "";
                            if (wins > 0 || finish) {
                                const isGold = (finish === "gold");
                                const isSilver = (finish === "silver");
                                const isBronze = (finish === "bronze");
                                const finishLabel = isGold ? "Top 3" : isSilver ? "Top 10" : isBronze ? "Top 30" : "";
                                html += '<div class="chrono-ap-hof-row' + (isGold ? ' gold' : '') + '">' +
                                    '<span><b>Week ' + wk + '</b> ' + (finish ? '<span style="color:' + (isGold ? '#f59e0b' : isSilver ? '#cbd5e1' : '#d97706') + '; font-weight:700;">(' + finishLabel + ')</span>' : '') + '</span>' +
                                    '<span style="color:#34d399; font-weight:700;">' + wins + ' VP</span>' +
                                '</div>';
                            }
                        });
                        hofList.innerHTML = html || '<div style="color:#64748b; font-size:11px; padding:6px;">No weekly scores recorded yet.</div>';
                    }

                    // Draw VP Graph on Canvas
                    const vpCanvas = document.getElementById("chrono-ap-vp-canvas");
                    if (vpCanvas && stats.week_record) {
                        window._chrono_cached_week_record = stats.week_record;
                        drawVpGraph(vpCanvas, stats.week_record);
                    }
                } catch(e) {}
            })();

            // 2. Fetch Runs from /api/runs?username=
            (async () => {
                try {
                    const res = await fetch("/api/runs?username=" + encodeURIComponent(cleanUsername));
                    const data = await res.json();
                    const runsBox = document.getElementById("chrono-ap-runs-box");
                    if (!runsBox) return;
                    const runsList = Array.isArray(data) ? data : (data?.runs || []);
                    if (runsList.length === 0) {
                        runsBox.innerHTML = '<div style="padding:14px; color:#64748b; text-align:center;">No recent runs recorded.</div>';
                        return;
                    }
                    let html = '<table class="chrono-ap-runs-table"><thead><tr><th>Map</th><th>Hero</th><th>Level</th><th>Survival Time</th><th>Date</th></tr></thead><tbody>';
                    runsList.slice(0, 10).forEach(r => {
                        const map = r.region_name || r.region || "Unknown";
                        if (map === "Transforming Turbidity" || map === "Powered Plains") return;
                        const color = MAP_COLORS[map] || "#38bdf8";
                        const hero = r.hero || r.hero_name || "Unknown";
                        const lvl = r.exp_level || r.level || 1;
                        const timeStr = r.survival_time ? (Math.floor(r.survival_time / 60) + "m " + (r.survival_time % 60) + "s") : "-";
                        const ts = r.created_at || r.timestamp || r.time || 0;
                        const dateStr = ts ? new Date(ts * 1000).toLocaleDateString() : "-";
                        html += '<tr>' +
                            '<td><b style="color:' + color + ';">' + map + '</b> <span style="color:#64748b; font-size:9.5px;">(' + (r.area_index || r.area_number || 1) + ')</span></td>' +
                            '<td>' + hero + '</td>' +
                            '<td>Lvl ' + lvl + '</td>' +
                            '<td style="color:#34d399; font-weight:700;">' + timeStr + '</td>' +
                            '<td style="color:#94a3b8;">' + dateStr + '</td>' +
                        '</tr>';
                    });
                    html += '</tbody></table>';
                    runsBox.innerHTML = html;
                } catch(e) {}
            })();
        }

        // 3. Sync HoF Weekly Scores from React DOM
        const weeksContainer = profStats.querySelector(".profile-weeks-container");
        const hofList = document.getElementById("chrono-ap-hof-list");
        if (weeksContainer && hofList) {
            const weekDivs = weeksContainer.querySelectorAll(".profile-rectangle");
            if (weekDivs.length > 0 && (!hofList.dataset.loadedCount || hofList.dataset.loadedCount != weekDivs.length)) {
                hofList.dataset.loadedCount = weekDivs.length;
                let html = "";
                weekDivs.forEach(wd => {
                    const isGold = wd.classList.contains("profile-rectangle-gold");
                    const isSilver = wd.classList.contains("profile-rectangle-silver");
                    const isBronze = wd.classList.contains("profile-rectangle-bronze");
                    const weekNum = wd.querySelector(".profile-week-number")?.innerText || "";
                    const weekName = wd.querySelector(".profile-week-name")?.innerText || "";
                    const weekText = wd.querySelector(".profile-week-text")?.innerText || "";
                    const winsText = wd.querySelector(".profile-wins-text")?.innerText || "";
                    const rankLabel = isGold ? "Top 3" : isSilver ? "Top 10" : isBronze ? "Top 30" : "";
                    html += '<div class="chrono-ap-hof-row' + (isGold ? ' gold' : '') + '">' +
                        '<span><b>' + weekNum + '</b> ' + (rankLabel ? '<span style="color:' + (isGold ? '#f59e0b' : isSilver ? '#cbd5e1' : '#d97706') + '; font-weight:700;">(' + rankLabel + ')</span> ' : '') + '<span style="color:#94a3b8; font-size:10px;">' + weekName + '</span></span>' +
                        '<span style="color:#34d399; font-weight:700;">' + weekText + '</span>' +
                        (winsText ? '<span style="color:#f59e0b; font-weight:700;">' + winsText + '</span>' : '') +
                    '</div>';
                });
                hofList.innerHTML = html;
            }
        }
    }

    // Canvas VP Chart Drawing Function
    function drawVpGraph(canvas, weekRecord) {
        if (!canvas || !weekRecord) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const w = rect.width || 420;
        const h = rect.height || 160;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, w, h);

        const weeks = Object.keys(weekRecord).map(Number).sort((a, b) => a - b);
        if (weeks.length === 0) {
            ctx.fillStyle = "#64748b";
            ctx.font = "12px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("No VP history recorded yet", w / 2, h / 2);
            return;
        }

        const minX = Math.min(...weeks);
        const maxX = Math.max(...weeks);
        let maxY = 0;
        const points = [];
        weeks.forEach(wk => {
            const item = weekRecord[wk] || {};
            const val = Number(item.wins || 0);
            if (val > maxY) maxY = val;
            points.push({ x: wk, y: val, finish: item.finish || "" });
        });
        if (maxY === 0) maxY = 10;
        maxY = Math.ceil(maxY * 1.25);

        const padL = 36, padR = 16, padT = 22, padB = 22;
        const graphW = w - padL - padR;
        const graphH = h - padT - padB;

        const getX = (wk) => padL + ((wk - minX) / Math.max(1, (maxX - minX))) * graphW;
        const getY = (val) => padT + graphH - (val / maxY) * graphH;

        // Grid lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= 3; i++) {
            const yVal = Math.round((maxY / 3) * i);
            const yPos = getY(yVal);
            ctx.beginPath();
            ctx.moveTo(padL, yPos);
            ctx.lineTo(w - padR, yPos);
            ctx.stroke();

            ctx.fillStyle = "#64748b";
            ctx.font = "9px sans-serif";
            ctx.textAlign = "right";
            ctx.fillText(yVal.toString(), padL - 5, yPos + 3);
        }

        // X Axis labels
        ctx.fillStyle = "#64748b";
        ctx.font = "9px sans-serif";
        ctx.textAlign = "center";
        const step = Math.max(1, Math.floor((maxX - minX) / 5));
        for (let xVal = minX; xVal <= maxX; xVal += step) {
            ctx.fillText("W" + xVal, getX(xVal), h - 6);
        }

        // Plot Area & Line (All VP)
        if (points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(getX(points[0].x), getY(points[0].y));
            points.forEach(p => {
                ctx.lineTo(getX(p.x), getY(p.y));
            });
            ctx.strokeStyle = "#e8c1a0";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.lineTo(getX(points[points.length - 1].x), padT + graphH);
            ctx.lineTo(getX(points[0].x), padT + graphH);
            ctx.closePath();
            const grad = ctx.createLinearGradient(0, padT, 0, padT + graphH);
            grad.addColorStop(0, "rgba(232, 193, 160, 0.25)");
            grad.addColorStop(1, "rgba(232, 193, 160, 0.0)");
            ctx.fillStyle = grad;
            ctx.fill();
        }

        // Points
        points.forEach(p => {
            if (p.y <= 0 && !p.finish) return;
            const px = getX(p.x);
            const py = getY(p.y);

            ctx.beginPath();
            ctx.arc(px, py, p.finish ? 4 : 2, 0, Math.PI * 2);
            if (p.finish === "gold") ctx.fillStyle = "#FFD700";
            else if (p.finish === "silver") ctx.fillStyle = "#C0C0C0";
            else if (p.finish === "bronze") ctx.fillStyle = "#CD7F32";
            else ctx.fillStyle = "#e8c1a0";
            ctx.fill();

            if (p.finish) {
                ctx.strokeStyle = "#000";
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });

        // Legend Top Right
        ctx.textAlign = "left";
        ctx.font = "9px sans-serif";
        const legends = [
            { label: "All VP", color: "#e8c1a0" },
            { label: "Gold", color: "#FFD700" },
            { label: "Silver", color: "#C0C0C0" },
            { label: "Bronze", color: "#CD7F32" }
        ];
        let legX = w - padR - 170;
        legends.forEach(l => {
            ctx.fillStyle = l.color;
            ctx.fillRect(legX, 6, 7, 7);
            ctx.fillStyle = "#94a3b8";
            ctx.fillText(l.label, legX + 10, 13);
            legX += 42;
        });
    }

    window.addEventListener("resize", () => {
        const vpCanvas = document.getElementById("chrono-ap-vp-canvas");
        if (vpCanvas && window._chrono_cached_week_record) {
            drawVpGraph(vpCanvas, window._chrono_cached_week_record);
        }
    });

    // Helper to get connected in-game player/account name (returns null if not logged in)
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
            const spectateDom = document.querySelector(".spectating-banner, .spectator-controls, .spectate-info, .spectator-bar, .spectating-ui");
            if (spectateDom && spectateDom.offsetParent !== null) return true;

            const bodyText = document.body ? document.body.innerText : "";
            if (bodyText.includes("Spectating ") || bodyText.includes("Spectating:") || bodyText.includes("Click to spectate")) {
                return true;
            }
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
            if (typeof enhanceProfilePage === "function") enhanceProfilePage();
        } else if (path.startsWith("/account")) {
            if (typeof enhanceAccountPage === "function") enhanceAccountPage();
        }
        if (typeof trackCurrentUser === "function") trackCurrentUser();
        if (typeof syncKeybindsFromDom === "function") syncKeybindsFromDom();
        if (typeof applyHudLayout === "function") applyHudLayout();
        
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

    // Global Key Listener: ESC to toggle menu, F5 to reload, and freeze game inputs when in menu
    window.addEventListener("keydown", (e) => {
        // Block DevTools shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C)
        if (e.key === "F12" || (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c"))) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return;
        }

        if (e.key === "Escape") {
            if (window._chrono_hud_editing) {
                if (typeof closeHudLayoutEditor === "function") closeHudLayoutEditor(false);
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            const activeTag = document.activeElement ? document.activeElement.tagName : "";
            if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
                document.activeElement.blur();
            }
            toggleChronoMenu();
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
})();
