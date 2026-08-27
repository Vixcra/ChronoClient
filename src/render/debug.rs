//! Debug visualization rendering.

/// DebugRenderer for hitboxes, predicted trajectories, danger fields.
pub struct DebugRenderer {
    pub enabled: bool,
}

impl DebugRenderer {
    /// Creates a new DebugRenderer.
    pub fn new() -> Self {
        Self { enabled: false }
    }

    /// Draws debug info if enabled.
    pub fn draw(&mut self) {
        if !self.enabled {
            return;
        }
        // Stub
    }
}
