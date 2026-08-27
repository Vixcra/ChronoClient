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

impl ReplayRecorder {
    pub fn new() -> Self {
        Self {}
    }
}
