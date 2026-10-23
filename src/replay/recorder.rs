//! Replay recorder.
//!
//! Records game state in .evrec/1 format (JSON lines, gzip compressed).
//!
//! Format:
//! - Header: format "evrec/1", meta (map, hero, server, timestamp)
//! - Per-tick: player state, entities, pellets

pub struct ReplayRecorder {
    // State
}

impl Default for ReplayRecorder {
    fn default() -> Self {
        Self::new()
    }
}

impl ReplayRecorder {
    pub fn new() -> Self {
        Self {}
    }
}
