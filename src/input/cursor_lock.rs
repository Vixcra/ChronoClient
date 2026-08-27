//! Cursor locking for windowed and fullscreen modes.

/// CursorLock manages grabbing and hiding the system cursor.
pub struct CursorLock {
    locked: bool,
}

impl CursorLock {
    pub fn new() -> Self {
        Self { locked: false }
    }

    /// Locks the cursor to the window.
    pub fn lock(&mut self, _window: &()) {
        // Stub using winit set_cursor_grab and set_cursor_visible
        self.locked = true;
    }

    /// Unlocks the cursor.
    pub fn unlock(&mut self, _window: &()) {
        self.locked = false;
    }

    /// Returns whether the cursor is currently locked.
    pub fn is_locked(&self) -> bool {
        self.locked
    }
}
