//! Motion observer — measures velocity, heading, and turn rate from server assertions.
//! Provides constant-turn-rate forward extrapolation for render prediction and client interpolation.

use super::state::{Area, Entity};
use crate::net::messages::EntityType;
use glam::Vec2;
use std::collections::HashMap;
use std::f32::consts::PI;

const TWO_PI: f32 = PI * 2.0;

/// Shortest angular arc between two angles in radians.
pub fn shortest_arc(diff: f32) -> f32 {
    let mut d = diff % TWO_PI;
    if d > PI {
        d -= TWO_PI;
    } else if d < -PI {
        d += TWO_PI;
    }
    d
}

#[derive(Debug, Clone)]
pub struct ObservedEntity {
    pub id: u32,
    pub anchor_pos: Vec2,
    pub current_pos: Vec2,
    pub velocity: Vec2,
    pub heading: f32,
    pub turn_rate: f32,
    pub speed: f32,
    pub radius: f32,
    pub entity_type: Option<EntityType>,
    pub have_heading: bool,
    pub last_move_tick: u64,
    pub last_seen_tick: u64,
}

#[derive(Debug, Clone)]
pub struct Observer {
    pub turn_alpha: f32,
    pub min_step: f32,
    pub shadow: HashMap<u32, ObservedEntity>,
}

impl Default for Observer {
    fn default() -> Self {
        Self {
            turn_alpha: 0.35,
            min_step: 0.05,
            shadow: HashMap::new(),
        }
    }
}

impl Observer {
    pub fn new() -> Self {
        Self::default()
    }

    /// Updates observed trajectories for all active entities.
    pub fn observe(&mut self, entities: &HashMap<u32, Entity>, now_tick: u64) {
        let mut seen = std::collections::HashSet::new();

        for (&id, e) in entities {
            seen.insert(id);

            let rec = match self.shadow.get_mut(&id) {
                Some(r) => r,
                None => {
                    self.shadow.insert(
                        id,
                        ObservedEntity {
                            id,
                            anchor_pos: e.pos,
                            current_pos: e.pos,
                            velocity: Vec2::ZERO,
                            heading: 0.0,
                            turn_rate: 0.0,
                            speed: 0.0,
                            radius: e.radius,
                            entity_type: e.entity_type,
                            have_heading: false,
                            last_move_tick: now_tick,
                            last_seen_tick: now_tick,
                        },
                    );
                    continue;
                }
            };

            rec.radius = e.radius;
            rec.last_seen_tick = now_tick;
            rec.current_pos = e.pos;

            let delta = e.pos - rec.anchor_pos;
            let step = delta.length();
            if step < self.min_step {
                continue; // No significant displacement
            }

            let dt = (now_tick.saturating_sub(rec.last_move_tick)).max(1) as f32;
            let heading = delta.y.atan2(delta.x);

            if rec.have_heading {
                let raw_turn = shortest_arc(heading - rec.heading) / dt;
                rec.turn_rate += self.turn_alpha * (raw_turn - rec.turn_rate);
            } else {
                rec.have_heading = true;
            }

            rec.heading = heading;
            rec.speed = step / dt;
            rec.velocity = delta / dt;
            rec.anchor_pos = e.pos;
            rec.last_move_tick = now_tick;
        }

        // Clean up entities no longer visible
        self.shadow.retain(|id, _| seen.contains(id));
    }

    /// Extrapolates an entity's trajectory forward `ticks` ticks, bouncing off area walls.
    pub fn step_record(
        rec: &ObservedEntity,
        area: Option<&Area>,
        ticks: u32,
        decay: f32,
    ) -> (Vec2, f32, f32) {
        let mut x = rec.anchor_pos.x;
        let mut y = rec.anchor_pos.y;
        let mut heading = rec.heading;
        let mut turn = rec.turn_rate;
        let speed = rec.speed;
        let r = rec.radius;

        let bounded = area.map_or(false, |a| a.width > 0 && a.height > 0);
        let (lx, rx, ty, by) = if let Some(a) = area {
            (
                a.x as f32 + r,
                (a.x + a.width) as f32 - r,
                a.y as f32 + r,
                (a.y + a.height) as f32 - r,
            )
        } else {
            (0.0, 0.0, 0.0, 0.0)
        };

        for _ in 0..ticks {
            heading += turn;
            turn *= decay;
            x += heading.cos() * speed;
            y += heading.sin() * speed;

            if bounded {
                if x < lx {
                    x = 2.0 * lx - x;
                    heading = PI - heading;
                    turn = -turn;
                } else if x > rx {
                    x = 2.0 * rx - x;
                    heading = PI - heading;
                    turn = -turn;
                }

                if y < ty {
                    y = 2.0 * ty - y;
                    heading = -heading;
                    turn = -turn;
                } else if y > by {
                    y = 2.0 * by - y;
                    heading = -heading;
                    turn = -turn;
                }
            }
        }

        (Vec2::new(x, y), heading, turn)
    }
}
