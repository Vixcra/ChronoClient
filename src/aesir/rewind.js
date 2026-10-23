// ============================================================================
// CHRONO CLIENT - AESIR MODULE: REWIND (Live Runs & Speedrun Archive ⏱️)
// ============================================================================
(function() {
    try {
        window.Chrono = window.Chrono || {};

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
                '<select id="chrono-runs-filter-mode" style="background: rgba(7, 26, 23, 0.9); border: 1.5px solid rgba(52, 211, 153, 0.4); color: #6ee7b7; font-weight: bold; border-radius: 8px; padding: 6px 10px; font-size: 11px; outline: none; cursor: pointer;">' +
                    '<option value="all" style="color: #6ee7b7; background: #061815; font-weight: 800;">👥 All Types (Solo & Duo)</option>' +
                    '<option value="0" style="color: #38bdf8; background: #061815; font-weight: 700;">👤 Solo Only</option>' +
                    '<option value="1" style="color: #f59e0b; background: #061815; font-weight: 700;">👥 Duo / Co-op Only</option>' +
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
    const HERO_COLORS = (window.Chrono && window.Chrono.HERO_COLORS) || {
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

    const MAP_COLORS = (window.Chrono && window.Chrono.MAP_COLORS) || {
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
        const modeSel = document.getElementById("chrono-runs-filter-mode");
        if (modeSel) {
            const val = modeSel.value;
            const col = (val === "all") ? "#6ee7b7" : (val === "0" ? "#38bdf8" : "#f59e0b");
            modeSel.style.color = col;
            modeSel.style.borderColor = (val === "all") ? "rgba(52, 211, 153, 0.3)" : col;
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
        const frag = document.createDocumentFragment();
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

            // Relics detection: Dark Crystal (♦) and Ghost Amulet (⏣)
            const flags = Array.isArray(run.flags) ? run.flags : (typeof run.flags === "string" ? [run.flags] : []);
            const hasCrystal = flags.includes("obtained_crystal") || run.obtained_crystal === true;
            const hasAmulet = flags.includes("obtained_amulet") || run.obtained_amulet === true;

            const crystalBadge = hasCrystal 
                ? '<span title="Dark Crystal" style="color: #ce82ea; font-size: 13px; font-weight: 900; margin-left: 4px; text-shadow: 0 0 8px #ce82ea88; cursor: help;">♦</span>' 
                : '';
            const amuletBadge = hasAmulet 
                ? '<span title="Ghost Amulet" style="color: #90ee90; font-size: 13px; font-weight: 900; margin-left: 4px; text-shadow: 0 0 8px #90ee9088; cursor: help;">⏣</span>' 
                : '';

            card.innerHTML = 
                '<div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">' +
                    '<div style="min-width: 36px; display: flex; align-items: center; justify-content: center;">' + rankBadge + '</div>' +
                    '<div style="flex: 1; min-width: 0;">' +
                        '<!-- Top Row: Map + Area + Hero + Relics + Duo -->' +
                        '<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">' +
                            '<span style="color: ' + mapColor + '; font-weight: 800; font-size: 14px; text-shadow: 0 0 12px ' + mapColor + '55;">' + mapName + '</span>' +
                            '<span style="background: rgba(16, 185, 129, 0.18); color: #a7f3d0; border: 1px solid rgba(52, 211, 153, 0.35); font-size: 10px; padding: 1px 7px; border-radius: 5px; font-weight: 800;">Area ' + areaIndex + '</span>' +
                            '<span style="background: ' + heroColor + '18; color: ' + heroColor + '; border: 1px solid ' + heroColor + '66; font-size: 11px; padding: 2px 8px; border-radius: 6px; font-weight: 800; text-shadow: 0 0 8px ' + heroColor + '66; display: inline-flex; align-items: center;">' + heroName + crystalBadge + amuletBadge + '</span>' +
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

            frag.appendChild(card);
        });
        listEl.appendChild(frag);
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
        const modeVal = document.getElementById("chrono-runs-filter-mode") ? document.getElementById("chrono-runs-filter-mode").value : "all";
        const dateVal = document.getElementById("chrono-runs-filter-date") ? document.getElementById("chrono-runs-filter-date").value : "all";
        const sortVal = document.getElementById("chrono-runs-sort") ? document.getElementById("chrono-runs-sort").value : "newest";

        const baseOffset = YEAR_OFFSETS[dateVal] || 0;
        const finalOffset = baseOffset + 50 * (currentRunsPage - 1);

        const params = new URLSearchParams();
        params.set("offset", finalOffset);
        if (heroVal && heroVal !== "all") params.set("hero", heroVal);
        if (mapVal && mapVal !== "all") params.set("region", mapVal);
        if (modeVal && modeVal !== "all") params.set("interactions", modeVal);
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
                let filtered = data;
                // Double safety client-side filtering for Solo / Duo
                if (modeVal === "0") {
                    filtered = filtered.filter(r => !r.interactions || r.interactions.length === 0);
                } else if (modeVal === "1") {
                    filtered = filtered.filter(r => Array.isArray(r.interactions) && r.interactions.length > 0);
                }
                liveRunsData = filtered;
                renderLiveRuns();
            } else {
                if (listEl) listEl.innerHTML = '<div style="text-align: center; color: #f87171; padding: 40px; font-size: 12px;">Failed to load runs format.</div>';
            }
        } catch(e) {
            if (listEl) listEl.innerHTML = '<div style="text-align: center; color: #f87171; padding: 40px; font-size: 12px;">Error loading runs: ' + e.message + '</div>';
        }
    }

    function toggleRunsWindow() {
        let modal = document.getElementById("chrono-runs-window");
        if (!modal) {
            mountRewindUI();
            modal = document.getElementById("chrono-runs-window");
        }
        if (!modal) return;
        if (modal.style.display === "none" || modal.style.display === "") {
            modal.style.display = "flex";
            if (window._chrono_freeze_player) window._chrono_freeze_player();
            fetchLiveRuns(currentRunsPage || 1);
        } else {
            modal.style.display = "none";
        }
    }

    function mountRewindUI() {
        if (!document.body) return;

        // Runs Launcher (⏱️ Rewind original icon)
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

        if (!document.getElementById("chrono-runs-window")) {
            document.body.appendChild(runsWindow);
            const closeRuns = document.getElementById("chrono-runs-close-btn");
            if (closeRuns) closeRuns.onclick = () => toggleRunsWindow();
            runsWindow.onclick = (e) => {
                if (e.target === runsWindow) toggleRunsWindow();
            };

            const runsSearch = document.getElementById("chrono-runs-search");
            const runsMap = document.getElementById("chrono-runs-filter-map");
            const runsHero = document.getElementById("chrono-runs-filter-hero");
            const runsMode = document.getElementById("chrono-runs-filter-mode");
            const runsDate = document.getElementById("chrono-runs-filter-date");
            const runsSort = document.getElementById("chrono-runs-sort");

            const applyFilters = () => {
                fetchLiveRuns(1);
            };

            if (runsMap) runsMap.onchange = applyFilters;
            if (runsHero) runsHero.onchange = applyFilters;
            if (runsMode) runsMode.onchange = applyFilters;
            if (runsDate) runsDate.onchange = applyFilters;
            if (runsSort) runsSort.onchange = applyFilters;

            if (runsSearch) {
                let searchTimer;
                runsSearch.oninput = () => {
                    clearTimeout(searchTimer);
                    searchTimer = setTimeout(applyFilters, 350);
                };
                runsSearch.onkeydown = (e) => {
                    if (e.key === "Enter") {
                        clearTimeout(searchTimer);
                        applyFilters();
                    }
                };
            }

            const runsRefresh = document.getElementById("chrono-runs-btn-refresh");
            if (runsRefresh) runsRefresh.onclick = () => fetchLiveRuns(currentRunsPage || 1);

            const runsPrev = document.getElementById("chrono-runs-prev-btn");
            if (runsPrev) runsPrev.onclick = () => {
                if (currentRunsPage > 1) fetchLiveRuns(currentRunsPage - 1);
            };

            const runsNext = document.getElementById("chrono-runs-next-btn");
            if (runsNext) runsNext.onclick = () => {
                fetchLiveRuns(currentRunsPage + 1);
            };
        }
    }

    mountRewindUI();
    window.addEventListener("DOMContentLoaded", mountRewindUI);
    window.addEventListener("load", mountRewindUI);
    const mountRewindInterval = setInterval(() => {
        if (document.getElementById("chrono-runs-launcher") && document.getElementById("chrono-runs-window")) {
            clearInterval(mountRewindInterval);
        } else {
            mountRewindUI();
        }
    }, 300);

    window.Chrono.Rewind = {
        toggle: toggleRunsWindow,
        fetchRuns: fetchLiveRuns,
        window: runsWindow
    };

    window.toggleRunsWindow = toggleRunsWindow;
    } catch(err) {
        console.error("[Aesir::Rewind Error]", err);
    }
})();
