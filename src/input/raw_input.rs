//! Raw high-frequency mouse input.

/// Stub for high-frequency mouse input.
/// 
/// Future optimization: Use Win32 RegisterRawInputDevices for >1000Hz polling
/// instead of standard window messages.
pub struct RawMouseInput {
    // state
}

impl Default for RawMouseInput {
    fn default() -> Self {
        Self::new()
    }
}

impl RawMouseInput {
    pub fn new() -> Self {
        Self {}
    }
}
