// ============================================================================
// CHRONO CLIENT - AESIR MODULE: KVASIR (Community Leaderboard 🏆)
// ============================================================================
(function() {
    try {
        window.Chrono = window.Chrono || {};

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
        window.Chrono.HERO_COLORS = HERO_COLORS;

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
        window.Chrono.MAP_COLORS = MAP_COLORS;

        let communityHighscores = typeof __CHRONO_HIGHSCORES !== 'undefined' ? __CHRONO_HIGHSCORES : (window.Chrono.highscores || {});
        let currentLbMode = (window.Chrono && window.Chrono.currentLbMode) || "solo";
        window.Chrono.currentLbMode = currentLbMode;

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
        const frag = document.createDocumentFragment();

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
                frag.appendChild(secHeader);
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

                frag.appendChild(card);
            });
        });

        listEl.appendChild(frag);

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
        if (window.Chrono) window.Chrono.currentLbMode = mode;
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

    function toggleLeaderboardWindow() {
        let modal = document.getElementById("chrono-leaderboard-window");
        if (!modal) {
            mountKvasirUI();
            modal = document.getElementById("chrono-leaderboard-window");
        }
        if (!modal) return;
        if (modal.style.display === "none" || modal.style.display === "") {
            modal.style.display = "flex";
            if (window._chrono_freeze_player) window._chrono_freeze_player();
            populateLeaderboardMapSelect();
            renderCommunityLeaderboard();
            // Sync with Google Sheets if empty or first open
            if (!communityHighscores.solo || Object.keys(communityHighscores.solo).length === 0) {
                syncGoogleSheetsHighscores();
            }
        } else {
            modal.style.display = "none";
        }
    }

    function mountKvasirUI() {
        if (!document.body) return;

        // Leaderboard Launcher (⚔️ Original icon)
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

            const searchInput = document.getElementById("chrono-lb-search");
            if (searchInput) {
                let searchTimer;
                searchInput.oninput = () => {
                    clearTimeout(searchTimer);
                    searchTimer = setTimeout(renderCommunityLeaderboard, 200);
                };
            }

            const filterMap = document.getElementById("chrono-lb-filter-map");
            if (filterMap) filterMap.onchange = () => renderCommunityLeaderboard();

            const filterHero = document.getElementById("chrono-lb-filter-hero");
            if (filterHero) filterHero.onchange = () => renderCommunityLeaderboard();

            const lbRefresh = document.getElementById("chrono-lb-btn-refresh");
            if (lbRefresh) lbRefresh.onclick = () => syncGoogleSheetsHighscores();
        }
    }

        mountKvasirUI();
        window.addEventListener("DOMContentLoaded", mountKvasirUI);
        window.addEventListener("load", mountKvasirUI);
        const mountKvasirInterval = setInterval(() => {
            if (document.getElementById("chrono-leaderboard-launcher") && document.getElementById("chrono-leaderboard-window")) {
                clearInterval(mountKvasirInterval);
            } else {
                mountKvasirUI();
            }
        }, 300);

        window.Chrono.Kvasir = {
            toggle: toggleLeaderboardWindow,
            render: renderCommunityLeaderboard,
            window: leaderboardWindow
        };

        window.toggleLeaderboardWindow = toggleLeaderboardWindow;
    } catch(err) {
        console.error("[Aesir::Kvasir Error]", err);
    }
})();
