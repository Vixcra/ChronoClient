//! Batching of game entities, zones, and players into GPU instance buffers.

use super::pipeline::InstanceRaw;
use crate::game::state::GameWorld;
use crate::net::messages::EntityType;
use wgpu::util::DeviceExt;

pub struct SpriteRenderer {
    instance_buffer: Option<wgpu::Buffer>,
    instances: Vec<InstanceRaw>,
}

impl Default for SpriteRenderer {
    fn default() -> Self {
        Self::new()
    }
}

impl SpriteRenderer {
    pub fn new() -> Self {
        Self {
            instance_buffer: None,
            instances: Vec::with_capacity(1024),
        }
    }

    /// Color helper for entity types.
    fn get_entity_color(entity_type: Option<EntityType>, is_harmless: bool) -> ([f32; 4], [f32; 4], f32) {
        if is_harmless {
            // Translucent cyan for harmless/ghosts
            return ([0.3, 0.8, 0.9, 0.5], [0.1, 0.5, 0.6, 0.7], 2.0);
        }

        match entity_type {
            Some(EntityType::Pellet) => {
                // Pellet: Yellow/Amber
                ([0.98, 0.85, 0.25, 0.85], [0.8, 0.65, 0.1, 0.9], 1.0)
            }
            Some(EntityType::Player) => {
                // Other Player: Vibrant Cyan/Blue
                ([0.2, 0.6, 0.95, 1.0], [0.05, 0.2, 0.5, 1.0], 3.0)
            }
            Some(EntityType::NormalEnemy) => {
                // Normal Enemy: Orange/Red
                ([0.92, 0.35, 0.25, 1.0], [0.55, 0.15, 0.1, 1.0], 2.5)
            }
            Some(EntityType::FreezingEnemy) | Some(EntityType::IceGhostEnemy) | Some(EntityType::IceSniperEnemy) => {
                // Freezing / Ice Enemy: Soft Icy Blue
                ([0.45, 0.8, 0.98, 1.0], [0.2, 0.45, 0.7, 1.0], 2.5)
            }
            Some(EntityType::PoisonGhostEnemy) | Some(EntityType::PoisonSniperEnemy) => {
                // Poison Enemy: Emerald Green
                ([0.25, 0.85, 0.4, 1.0], [0.1, 0.45, 0.2, 1.0], 2.5)
            }
            Some(EntityType::LavaEnemy) | Some(EntityType::FlamingEnemy) => {
                // Lava / Flaming: Fiery Red
                ([0.98, 0.2, 0.15, 1.0], [0.6, 0.05, 0.05, 1.0], 2.5)
            }
            _ => {
                // Default Enemy: Warm Amber/Grey
                ([0.8, 0.45, 0.35, 1.0], [0.4, 0.2, 0.15, 1.0], 2.0)
            }
        }
    }

    /// Prepares and uploads instance data for all game elements.
    pub fn prepare(&mut self, device: &wgpu::Device, world: &GameWorld) -> usize {
        self.instances.clear();

        // 1. Render Area & Zones (Rectangles)
        if let Some(area) = &world.current_area {
            // Area Background
            let area_half_w = (area.width as f32) * 0.5;
            let area_half_h = (area.height as f32) * 0.5;
            let area_center_x = (area.x as f32) + area_half_w;
            let area_center_y = (area.y as f32) + area_half_h;

            self.instances.push(InstanceRaw::rect(
                [area_center_x, area_center_y],
                [area_half_w, area_half_h],
                [0.12, 0.13, 0.18, 1.0], // Deep navy background
                [0.25, 0.28, 0.38, 1.0], // Area border
                4.0,
            ));

            // Zones
            for z in &area.zones {
                let zhw = (z.width as f32) * 0.5;
                let zhh = (z.height as f32) * 0.5;
                let zcx = (z.x as f32) + zhw;
                let zcy = (z.y as f32) + zhh;

                let (color, border_col) = match z.zone_type {
                    Some(crate::net::messages::ZoneType::SafeZone) => {
                        ([0.2, 0.7, 0.35, 0.4], [0.3, 0.85, 0.45, 0.8])
                    }
                    Some(crate::net::messages::ZoneType::VictoryZone) => {
                        ([0.9, 0.8, 0.2, 0.5], [1.0, 0.9, 0.3, 0.9])
                    }
                    Some(crate::net::messages::ZoneType::TeleportZone) => {
                        ([0.3, 0.4, 0.9, 0.4], [0.4, 0.6, 1.0, 0.8])
                    }
                    _ => ([0.16, 0.18, 0.24, 0.3], [0.22, 0.25, 0.32, 0.5]),
                };

                self.instances.push(InstanceRaw::rect(
                    [zcx, zcy],
                    [zhw, zhh],
                    color,
                    border_col,
                    2.0,
                ));
            }
        }

        // 2. Render Entities (Pellets and Enemies)
        for (&id, e) in &world.entities {
            // Skip rendering self entity here (rendered on top with hero styling)
            if world.self_id == Some(id) {
                continue;
            }

            let (color, border_col, border_w) = Self::get_entity_color(e.entity_type, e.is_harmless);

            self.instances.push(InstanceRaw::circle(
                [e.pos.x, e.pos.y],
                e.radius,
                color,
                border_col,
                border_w,
            ));
        }

        // 3. Render Local Player (on top)
        if let Some(player) = &world.local_player {
            if player.alive {
                self.instances.push(InstanceRaw::circle(
                    [player.pos.x, player.pos.y],
                    player.radius,
                    [0.98, 0.98, 1.0, 1.0],  // Bright white/pearl body
                    [0.1, 0.4, 0.9, 1.0],    // Hero blue outline
                    3.5,
                ));
            }
        }

        if self.instances.is_empty() {
            return 0;
        }

        // Update / recreate GPU instance buffer
        self.instance_buffer = Some(
            device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
                label: Some("Instance Buffer"),
                contents: bytemuck::cast_slice(&self.instances),
                usage: wgpu::BufferUsages::VERTEX,
            }),
        );

        self.instances.len()
    }

    /// Renders the batched instances into the active render pass.
    pub fn render<'a>(
        &'a self,
        render_pass: &mut wgpu::RenderPass<'a>,
        pipeline: &'a super::pipeline::RenderPipeline2D,
        count: usize,
    ) {
        if let Some(instance_buffer) = &self.instance_buffer {
            if count > 0 {
                render_pass.set_pipeline(&pipeline.pipeline);
                render_pass.set_bind_group(0, &pipeline.camera_bind_group, &[]);
                render_pass.set_vertex_buffer(0, pipeline.vertex_buffer.slice(..));
                render_pass.set_vertex_buffer(1, instance_buffer.slice(..));
                render_pass.set_index_buffer(
                    pipeline.index_buffer.slice(..),
                    wgpu::IndexFormat::Uint16,
                );
                render_pass.draw_indexed(0..6, 0, 0..count as u32);
            }
        }
    }
}
