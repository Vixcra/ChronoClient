//! Input handling — raw mouse/keyboard capture, protocol conversion, cursor lock.

pub mod cursor_lock;
pub mod mouse_to_protocol;
pub mod raw_input;

use crate::net::messages::{ClientPayload, Key, KeyEvent, KeyType, MouseDown};
use glam::Vec2;
use std::collections::HashSet;
use winit::event::{ElementState, MouseButton, WindowEvent};
use winit::keyboard::{KeyCode, PhysicalKey};

#[derive(Debug, Default)]
pub struct InputState {
    pub mouse_pos: Vec2,
    pub is_mouse_down: bool,
    pub mouse_updated: bool,
    pub keys_held: HashSet<KeyType>,
    pub key_events: Vec<Key>,
    pub sequence: i32,
}

impl InputState {
    pub fn new() -> Self {
        Self::default()
    }

    /// Translates winit physical key codes to Evades KeyTypes.
    fn map_key_code(key_code: KeyCode) -> Option<KeyType> {
        match key_code {
            KeyCode::KeyW => Some(KeyType::W),
            KeyCode::ArrowUp => Some(KeyType::Up),
            KeyCode::KeyA => Some(KeyType::A),
            KeyCode::ArrowLeft => Some(KeyType::Left),
            KeyCode::KeyS => Some(KeyType::S),
            KeyCode::ArrowDown => Some(KeyType::Down),
            KeyCode::KeyD => Some(KeyType::D),
            KeyCode::ArrowRight => Some(KeyType::Right),
            KeyCode::KeyZ | KeyCode::KeyJ => Some(KeyType::AbilityOne),
            KeyCode::KeyX | KeyCode::KeyK => Some(KeyType::AbilityTwo),
            KeyCode::KeyC | KeyCode::KeyL => Some(KeyType::AbilityThree),
            KeyCode::Space => Some(KeyType::Action),
            KeyCode::ShiftLeft | KeyCode::ShiftRight => Some(KeyType::Focus),
            KeyCode::Digit1 => Some(KeyType::UpgradeSpeed),
            KeyCode::Digit2 => Some(KeyType::UpgradeMaxEnergy),
            KeyCode::Digit3 => Some(KeyType::UpgradeEnergyRegen),
            KeyCode::Digit4 => Some(KeyType::UpgradeAbilityOne),
            KeyCode::Digit5 => Some(KeyType::UpgradeAbilityTwo),
            KeyCode::Digit6 => Some(KeyType::UpgradeAbilityThree),
            _ => None,
        }
    }

    /// Handles winit window events.
    pub fn handle_event(&mut self, event: &WindowEvent) {
        match event {
            WindowEvent::CursorMoved { position, .. } => {
                self.mouse_pos = Vec2::new(position.x as f32, position.y as f32);
                self.mouse_updated = true;
            }
            WindowEvent::MouseInput {
                state,
                button: MouseButton::Left,
                ..
            } => {
                self.is_mouse_down = *state == ElementState::Pressed;
                self.mouse_updated = true;
            }
            WindowEvent::KeyboardInput { event: k_event, .. } => {
                if let PhysicalKey::Code(code) = k_event.physical_key {
                    if let Some(key_type) = Self::map_key_code(code) {
                        let is_down = k_event.state == ElementState::Pressed;
                        if is_down {
                            if self.keys_held.insert(key_type) {
                                self.key_events.push(Key {
                                    key_event: Some(KeyEvent::KeyDown),
                                    key_type: Some(key_type),
                                });
                            }
                        } else {
                            if self.keys_held.remove(&key_type) {
                                self.key_events.push(Key {
                                    key_event: Some(KeyEvent::KeyUp),
                                    key_type: Some(key_type),
                                });
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }

    /// Builds a `ClientPayload` containing recent input changes, incrementing sequence.
    pub fn build_payload(&mut self, player_screen_pos: Vec2) -> Option<ClientPayload> {
        let has_keys = !self.key_events.is_empty();
        let has_mouse = self.mouse_updated;

        if !has_keys && !has_mouse {
            return None;
        }

        self.sequence += 1;

        let mouse_down = if self.mouse_updated {
            self.mouse_updated = false;
            let (dx, dy) = mouse_to_protocol::compute_mouse_offset(
                self.mouse_pos,
                player_screen_pos,
            );
            Some(MouseDown {
                updated: Some(true),
                x: Some(dx),
                y: Some(dy),
            })
        } else {
            None
        };

        let keys = std::mem::take(&mut self.key_events);

        Some(ClientPayload {
            sequence: Some(self.sequence),
            keys,
            mouse_down,
            ..Default::default()
        })
    }
}
