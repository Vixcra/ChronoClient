//! Mouse position to Evades.io protocol conversion

use crate::net::messages::MouseDown;
use glam::Vec2;

/// Calculates the integer pixel offset of the cursor from the player's screen center.
///
/// In Evades.io:
/// - Direction of offset = movement direction.
/// - Distance >= 150px = 100% speed.
pub fn compute_mouse_offset(mouse_screen_pos: Vec2, player_screen_pos: Vec2) -> (i32, i32) {
    let offset = mouse_screen_pos - player_screen_pos;
    (offset.x.round() as i32, offset.y.round() as i32)
}

/// Creates a `MouseDown` protocol message from screen coordinates.
pub fn create_mouse_down_message(mouse_screen_pos: Vec2, player_screen_pos: Vec2) -> MouseDown {
    let (x, y) = compute_mouse_offset(mouse_screen_pos, player_screen_pos);
    MouseDown {
        updated: Some(true),
        x: Some(x),
        y: Some(y),
    }
}
