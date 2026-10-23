// ==========================================
// Chrono Mod: Hide All UI
// ==========================================
// Hides all Chrono client UI elements (custom theme, special launcher buttons, HUDs)
// while keeping ESC fully active to toggle Chrono Hub.

(function() {
    if (typeof window.toggleHideAllUi === "function") {
        window.toggleHideAllUi(true);
    } else {
        localStorage.setItem("chrono_mod_hideui", "1");
        const theme = document.getElementById("chrono-artem-theme");
        if (theme) theme.disabled = true;
        const fps = document.getElementById("chrono-fps-hud");
        if (fps) fps.style.display = "none";
        let s = document.getElementById("chrono-hide-all-ui-style");
        if (!s) {
            s = document.createElement("style");
            s.id = "chrono-hide-all-ui-style";
            s.textContent = 
                "#chrono-fps-hud, " +
                "#chrono-hourglass-launcher, " +
                "#chrono-tournament-launcher, " +
                "#chrono-leaderboard-launcher, " +
                "#chrono-runs-launcher, " +
                "#chrono-keystrokes-hud, " +
                "#chrono-tournament-watermark, " +
                "#chrono-leaderboard-window, " +
                "#chrono-runs-window, " +
                "#chrono-tournament-window, " +
                ".title[data-chrono-logo] img { display: none !important; }";
            (document.head || document.documentElement || document.body).appendChild(s);
        }
    }
    console.log("[Chrono Mod] Hide All UI active (ESC key remains active for Chrono Hub)");
})();
