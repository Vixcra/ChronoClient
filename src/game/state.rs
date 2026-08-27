//! Game world state and entity management

use crate::net::messages::{AreaMessage, EntityType, FramePayload, HeroType, ZoneMessage, ZoneType};
use glam::Vec2;
use std::collections::HashMap;

#[derive(Debug, Clone, Default)]
pub struct Zone {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub zone_type: Option<ZoneType>,
    pub background_color: Option<u32>,
    pub friction: f32,
    pub min_speed: f32,
    pub max_speed: f32,
}

impl From<ZoneMessage> for Zone {
    fn from(msg: ZoneMessage) -> Self {
        Self {
            x: msg.x.unwrap_or(0),
            y: msg.y.unwrap_or(0),
            width: msg.width.unwrap_or(0),
            height: msg.height.unwrap_or(0),
            zone_type: msg.zone_type,
            background_color: msg.background_color,
            friction: msg.friction.unwrap_or(0.0),
            min_speed: msg.minimum_speed.unwrap_or(0.0),
            max_speed: msg.maximum_speed.unwrap_or(0.0),
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct Area {
    pub index: i32,
    pub number: i32,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub region_name: String,
    pub boss_area: bool,
    pub victory_area: bool,
    pub zones: Vec<Zone>,
}

impl From<AreaMessage> for Area {
    fn from(msg: AreaMessage) -> Self {
        Self {
            index: msg.index.unwrap_or(0),
            number: msg.number.unwrap_or(0),
            name: msg.name.unwrap_or_default(),
            x: msg.x.unwrap_or(0),
            y: msg.y.unwrap_or(0),
            width: msg.width.unwrap_or(0),
            height: msg.height.unwrap_or(0),
            region_name: msg.region_name.unwrap_or_default(),
            boss_area: msg.boss_area.unwrap_or(false),
            victory_area: msg.victory_area.unwrap_or(false),
            zones: msg.zones.into_iter().map(Zone::from).collect(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct Entity {
    pub id: u32,
    pub pos: Vec2,
    pub prev_pos: Vec2,
    pub velocity: Vec2,
    pub radius: f32,
    pub width: f32,
    pub height: f32,
    pub entity_type: Option<EntityType>,
    pub is_harmless: bool,
    pub name: Option<String>,
}

impl Default for Entity {
    fn default() -> Self {
        Self {
            id: 0,
            pos: Vec2::ZERO,
            prev_pos: Vec2::ZERO,
            velocity: Vec2::ZERO,
            radius: 15.0,
            width: 0.0,
            height: 0.0,
            entity_type: None,
            is_harmless: false,
            name: None,
        }
    }
}

impl Entity {
    pub fn is_pellet(&self) -> bool {
        self.entity_type == Some(EntityType::Pellet)
    }

    pub fn is_player(&self) -> bool {
        self.entity_type == Some(EntityType::Player)
    }

    pub fn is_enemy(&self) -> bool {
        match self.entity_type {
            Some(EntityType::Pellet) | Some(EntityType::Player) => false,
            _ => true,
        }
    }
}

#[derive(Debug, Clone)]
pub struct Player {
    pub id: u32,
    pub pos: Vec2,
    pub prev_pos: Vec2,
    pub radius: f32,
    pub speed: f32,
    pub energy: f32,
    pub max_energy: f32,
    pub regen: f32,
    pub level: u32,
    pub hero_type: Option<HeroType>,
    pub name: String,
    pub alive: bool,
}

impl Default for Player {
    fn default() -> Self {
        Self {
            id: 0,
            pos: Vec2::ZERO,
            prev_pos: Vec2::ZERO,
            radius: 15.0,
            speed: 5.0,
            energy: 30.0,
            max_energy: 30.0,
            regen: 1.0,
            level: 1,
            hero_type: None,
            name: "Player".to_string(),
            alive: true,
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct GameWorld {
    pub self_id: Option<u32>,
    pub local_player: Option<Player>,
    pub entities: HashMap<u32, Entity>,
    pub current_area: Option<Area>,
    pub tick_rate: f32,
    pub server_sequence: u32,
    pub total_frames_received: u64,
}

impl GameWorld {
    pub fn new() -> Self {
        Self {
            self_id: None,
            local_player: None,
            entities: HashMap::new(),
            current_area: None,
            tick_rate: 60.0,
            server_sequence: 0,
            total_frames_received: 0,
        }
    }

    pub fn reset(&mut self) {
        self.entities.clear();
        self.local_player = None;
    }

    /// Applies a server `FramePayload` snapshot to update the world state.
    pub fn apply_frame(&mut self, frame: &FramePayload) {
        self.total_frames_received += 1;
        self.server_sequence = frame.sequence;

        if frame.reset || frame.complete {
            self.reset();
        }

        if let Some(sid) = frame.self_id {
            self.self_id = Some(sid);
        }

        if let Some(tr) = frame.tick_rate {
            self.tick_rate = tr;
        }

        if let Some(area_msg) = &frame.area {
            self.current_area = Some(Area::from(area_msg.clone()));
        }

        // 1. Process full entity updates
        for msg in &frame.entities {
            let id = match msg.id {
                Some(id) if id >= 0 => id as u32,
                _ => continue,
            };

            if msg.removed.unwrap_or(false) {
                self.entities.remove(&id);
                if self.self_id == Some(id) {
                    if let Some(p) = &mut self.local_player {
                        p.alive = false;
                    }
                }
                continue;
            }

            let ent = self.entities.entry(id).or_insert_with(|| Entity {
                id,
                ..Default::default()
            });

            ent.prev_pos = ent.pos;

            if let Some(x) = msg.x { ent.pos.x = x; }
            if let Some(y) = msg.y { ent.pos.y = y; }
            if let Some(r) = msg.radius { ent.radius = r; }
            if let Some(w) = msg.width { ent.width = w; }
            if let Some(h) = msg.height { ent.height = h; }
            if let Some(et) = msg.entity_type { ent.entity_type = Some(et); }
            if let Some(h) = msg.is_harmless { ent.is_harmless = h; }
            if let Some(name) = &msg.name { ent.name = Some(name.clone()); }
            if let (Some(vx), Some(vy)) = (msg.velocity_x, msg.velocity_y) {
                ent.velocity = Vec2::new(vx, vy);
            }

            // If this entity is the local player, update Player stats
            if self.self_id == Some(id) {
                let player = self.local_player.get_or_insert_with(Player::default);
                player.id = id;
                player.prev_pos = player.pos;
                player.pos = ent.pos;
                player.radius = ent.radius;
                player.alive = true;

                if let Some(s) = msg.speed { player.speed = s; }
                if let Some(e) = msg.energy { player.energy = e; }
                if let Some(me) = msg.max_energy { player.max_energy = me as f32; }
                if let Some(r) = msg.energy_regen { player.regen = r; }
                if let Some(lvl) = msg.level { player.level = lvl as u32; }
                if let Some(ht) = msg.hero_type { player.hero_type = Some(ht); }
                if let Some(name) = &msg.name { player.name = name.clone(); }
            }
        }

        // 2. Process delta channels
        for &(id, x) in &frame.x_entities {
            if let Some(e) = self.entities.get_mut(&id) {
                e.prev_pos.x = e.pos.x;
                e.pos.x = x;
                if self.self_id == Some(id) {
                    if let Some(p) = &mut self.local_player {
                        p.prev_pos.x = p.pos.x;
                        p.pos.x = x;
                    }
                }
            }
        }

        for &(id, y) in &frame.y_entities {
            if let Some(e) = self.entities.get_mut(&id) {
                e.prev_pos.y = e.pos.y;
                e.pos.y = y;
                if self.self_id == Some(id) {
                    if let Some(p) = &mut self.local_player {
                        p.prev_pos.y = p.pos.y;
                        p.pos.y = y;
                    }
                }
            }
        }

        for &(id, x, y) in &frame.xy_entities {
            if let Some(e) = self.entities.get_mut(&id) {
                e.prev_pos = e.pos;
                e.pos = Vec2::new(x, y);
                if self.self_id == Some(id) {
                    if let Some(p) = &mut self.local_player {
                        p.prev_pos = p.pos;
                        p.pos = Vec2::new(x, y);
                    }
                }
            }
        }

        for &(id, x, y, r) in &frame.xy_radius_entities {
            if let Some(e) = self.entities.get_mut(&id) {
                e.prev_pos = e.pos;
                e.pos = Vec2::new(x, y);
                e.radius = r;
                if self.self_id == Some(id) {
                    if let Some(p) = &mut self.local_player {
                        p.prev_pos = p.pos;
                        p.pos = Vec2::new(x, y);
                        p.radius = r;
                    }
                }
            }
        }
    }
}
