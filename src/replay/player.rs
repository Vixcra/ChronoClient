//! Replay player.
//!
//! Loads and plays back .evrec files.

pub struct ReplayFrame {
    // Frame data
}

pub struct ReplayPlayer {
    // State
}

impl ReplayPlayer {
    pub fn new() -> Self {
        Self {}
    }

    pub fn load(&mut self, _path: &str) {
        // Stub
    }

    pub fn tick(&mut self) -> Option<ReplayFrame> {
        // Stub
        None
    }

    pub fn seek(&mut self, _tick: u64) {
        // Stub
    }

    pub fn total_ticks(&self) -> u64 {
        // Stub
        0
    }
}
