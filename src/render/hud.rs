//! In-game HUD overlay using egui for performance stats and player state.

use crate::game::state::GameWorld;
use egui::{Color32, Context, RichText, Stroke};

#[derive(Default)]
pub struct HudRenderer {
    pub show_debug: bool,
}

impl HudRenderer {
    pub fn new() -> Self {
        Self { show_debug: false }
    }

    /// Renders HUD overlay on top of the game screen.
    pub fn draw(&mut self, ctx: &Context, world: &GameWorld, fps: f32, ping_ms: f32) {
        egui::Area::new(egui::Id::new("stats_overlay"))
            .fixed_pos([16.0, 16.0])
            .show(ctx, |ui| {
                egui::Frame::NONE
                    .fill(Color32::from_black_alpha(160))
                    .corner_radius(6.0)
                    .inner_margin(8.0)
                    .stroke(Stroke::new(1.0_f32, Color32::from_rgb(60, 70, 90)))
                    .show(ui, |ui| {
                        ui.horizontal(|ui| {
                            ui.label(
                                RichText::new("CHRONO")
                                    .color(Color32::from_rgb(100, 200, 255))
                                    .strong(),
                            );
                            ui.label(
                                RichText::new(format!("FPS: {:.0}", fps))
                                    .color(if fps >= 55.0 {
                                        Color32::from_rgb(100, 255, 120)
                                    } else {
                                        Color32::from_rgb(255, 100, 100)
                                    }),
                            );
                            if ping_ms > 0.0 {
                                ui.label(
                                    RichText::new(format!("Ping: {:.0}ms", ping_ms))
                                        .color(Color32::from_rgb(220, 220, 220)),
                                );
                            }
                        });

                        if let Some(area) = &world.current_area {
                            ui.label(
                                RichText::new(format!("Area: {} (#{})", area.name, area.number))
                                    .color(Color32::from_rgb(200, 210, 230)),
                            );
                        }

                        if let Some(player) = &world.local_player {
                            ui.horizontal(|ui| {
                                ui.label(format!("Speed: {:.1}", player.speed));
                                ui.label(format!("Energy: {:.0}/{:.0}", player.energy, player.max_energy));
                            });
                        }
                    });
            });
    }
}
