use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ChronoConfig {
    pub server_url: String,
    pub cookie: Option<String>,
    pub debug_overlay: bool,
    pub target_hero: Option<String>,
    pub target_map: Option<String>,
}

impl Default for ChronoConfig {
    fn default() -> Self {
        Self {
            server_url: "wss://eu.evades.io".to_string(),
            cookie: None,
            debug_overlay: false,
            target_hero: None,
            target_map: None,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RenderConfig {
    pub vsync: bool,
    pub target_fps: Option<u32>,
    pub window_width: u32,
    pub window_height: u32,
}

impl Default for RenderConfig {
    fn default() -> Self {
        Self {
            vsync: true,
            target_fps: Some(60),
            window_width: 1280,
            window_height: 720,
        }
    }
}
