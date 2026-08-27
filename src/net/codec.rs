//! Binary protocol codec for Evades.io
//! Implements custom protobuf-like binary serialization and delta compression.

use super::messages::*;
use anyhow::{bail, Result};
use byteorder::{LittleEndian, ReadBytesExt, WriteBytesExt};
use std::io::Cursor;

// ── Binary Reader ──────────────────────────────────────────────────────────────

pub struct BinaryReader<'a> {
    cursor: Cursor<&'a [u8]>,
}

impl<'a> BinaryReader<'a> {
    pub fn new(data: &'a [u8]) -> Self {
        Self {
            cursor: Cursor::new(data),
        }
    }

    pub fn remaining(&self) -> usize {
        let len = self.cursor.get_ref().len();
        let pos = self.cursor.position() as usize;
        len.saturating_sub(pos)
    }

    pub fn read_u8(&mut self) -> Result<u8> {
        Ok(self.cursor.read_u8()?)
    }

    pub fn read_u16(&mut self) -> Result<u16> {
        Ok(self.cursor.read_u16::<LittleEndian>()?)
    }

    pub fn read_u32(&mut self) -> Result<u32> {
        Ok(self.cursor.read_u32::<LittleEndian>()?)
    }

    pub fn read_i32(&mut self) -> Result<i32> {
        Ok(self.cursor.read_i32::<LittleEndian>()?)
    }

    pub fn read_f32(&mut self) -> Result<f32> {
        Ok(self.cursor.read_f32::<LittleEndian>()?)
    }

    pub fn read_bool(&mut self) -> Result<bool> {
        Ok(self.read_u8()? == 1)
    }

    pub fn read_bytes(&mut self) -> Result<Vec<u8>> {
        let len = self.read_u32()? as usize;
        let pos = self.cursor.position() as usize;
        let data = self.cursor.get_ref();
        if pos + len > data.len() {
            bail!("Unexpected EOF reading {} bytes at offset {}", len, pos);
        }
        let slice = data[pos..pos + len].to_vec();
        self.cursor.set_position((pos + len) as u64);
        Ok(slice)
    }

    pub fn read_string(&mut self) -> Result<String> {
        let bytes = self.read_bytes()?;
        Ok(String::from_utf8_lossy(&bytes).to_string())
    }
}

// ── Binary Writer ──────────────────────────────────────────────────────────────

#[derive(Default)]
pub struct BinaryWriter {
    buf: Vec<u8>,
}

impl BinaryWriter {
    pub fn new() -> Self {
        Self {
            buf: Vec::with_capacity(256),
        }
    }

    pub fn write_u8(&mut self, val: u8) {
        self.buf.push(val);
    }

    pub fn write_u16(&mut self, val: u16) {
        let _ = self.buf.write_u16::<LittleEndian>(val);
    }

    pub fn write_u32(&mut self, val: u32) {
        let _ = self.buf.write_u32::<LittleEndian>(val);
    }

    pub fn write_i32(&mut self, val: i32) {
        let _ = self.buf.write_i32::<LittleEndian>(val);
    }

    pub fn write_f32(&mut self, val: f32) {
        let _ = self.buf.write_f32::<LittleEndian>(val);
    }

    pub fn write_bool(&mut self, val: bool) {
        self.write_u8(if val { 1 } else { 0 });
    }

    pub fn write_bytes(&mut self, val: &[u8]) {
        self.write_u32(val.len() as u32);
        self.buf.extend_from_slice(val);
    }

    pub fn write_string(&mut self, val: &str) {
        self.write_bytes(val.as_bytes());
    }

    pub fn into_bytes(self) -> Vec<u8> {
        self.buf
    }
}

// ── ClientPayload Encoding ─────────────────────────────────────────────────────

pub fn encode_client_payload(payload: &ClientPayload) -> Vec<u8> {
    let mut writer = BinaryWriter::new();
    let mut present_fields = Vec::new();

    if payload.hero_selection.is_some() {
        present_fields.push(1u16);
    }
    if payload.sequence.is_some() {
        present_fields.push(2u16);
    }
    if !payload.keys.is_empty() {
        present_fields.push(3u16);
    }
    if payload.mouse_down.is_some() {
        present_fields.push(4u16);
    }
    if payload.message.is_some() {
        present_fields.push(5u16);
    }
    if payload.settings.is_some() {
        present_fields.push(6u16);
    }
    if !payload.blocked_usernames.is_empty() {
        present_fields.push(7u16);
    }
    if !payload.unblocked_usernames.is_empty() {
        present_fields.push(8u16);
    }
    if payload.ping.is_some() {
        present_fields.push(11u16);
    }

    writer.write_u16(present_fields.len() as u16);

    for field in present_fields {
        writer.write_u16(field);
        match field {
            1 => writer.write_i32(payload.hero_selection.unwrap() as i32),
            2 => writer.write_i32(payload.sequence.unwrap()),
            3 => {
                writer.write_u16(payload.keys.len() as u16);
                for key in &payload.keys {
                    let mut key_fields = 0u16;
                    if key.key_event.is_some() {
                        key_fields += 1;
                    }
                    if key.key_type.is_some() {
                        key_fields += 1;
                    }
                    writer.write_u16(key_fields);
                    if let Some(ev) = key.key_event {
                        writer.write_u16(1);
                        writer.write_i32(ev as i32);
                    }
                    if let Some(kt) = key.key_type {
                        writer.write_u16(2);
                        writer.write_i32(kt as i32);
                    }
                }
            }
            4 => {
                let md = payload.mouse_down.as_ref().unwrap();
                let mut md_fields = 0u16;
                if md.updated.is_some() {
                    md_fields += 1;
                }
                if md.x.is_some() {
                    md_fields += 1;
                }
                if md.y.is_some() {
                    md_fields += 1;
                }
                writer.write_u16(md_fields);
                if let Some(u) = md.updated {
                    writer.write_u16(1);
                    writer.write_bool(u);
                }
                if let Some(x) = md.x {
                    writer.write_u16(2);
                    writer.write_i32(x);
                }
                if let Some(y) = md.y {
                    writer.write_u16(3);
                    writer.write_i32(y);
                }
            }
            5 => writer.write_string(payload.message.as_ref().unwrap()),
            6 => {
                let s = payload.settings.as_ref().unwrap();
                let mut s_fields = Vec::new();
                if s.updated.is_some() { s_fields.push(1u16); }
                if s.profanity_filtering.is_some() { s_fields.push(2u16); }
                if s.enable_mouse_movement.is_some() { s_fields.push(3u16); }
                if s.toggle_mouse_movement.is_some() { s_fields.push(4u16); }
                if s.display_chat.is_some() { s_fields.push(6u16); }
                if s.display_leaderboard.is_some() { s_fields.push(7u16); }
                if s.display_timer.is_some() { s_fields.push(9u16); }
                if s.reconnection.is_some() { s_fields.push(11u16); }
                if s.unlock_fps.is_some() { s_fields.push(42u16); }

                writer.write_u16(s_fields.len() as u16);
                for sf in s_fields {
                    writer.write_u16(sf);
                    match sf {
                        1 => writer.write_bool(s.updated.unwrap()),
                        2 => writer.write_bool(s.profanity_filtering.unwrap()),
                        3 => writer.write_bool(s.enable_mouse_movement.unwrap()),
                        4 => writer.write_bool(s.toggle_mouse_movement.unwrap()),
                        6 => writer.write_bool(s.display_chat.unwrap()),
                        7 => writer.write_bool(s.display_leaderboard.unwrap()),
                        9 => writer.write_bool(s.display_timer.unwrap()),
                        11 => writer.write_bool(s.reconnection.unwrap()),
                        42 => writer.write_bool(s.unlock_fps.unwrap()),
                        _ => {}
                    }
                }
            }
            7 => {
                writer.write_u16(payload.blocked_usernames.len() as u16);
                for u in &payload.blocked_usernames {
                    writer.write_string(u);
                }
            }
            8 => {
                writer.write_u16(payload.unblocked_usernames.len() as u16);
                for u in &payload.unblocked_usernames {
                    writer.write_string(u);
                }
            }
            11 => writer.write_i32(payload.ping.unwrap()),
            _ => {}
        }
    }

    writer.into_bytes()
}

// ── Message Decoding Helpers ───────────────────────────────────────────────────

fn decode_settings(reader: &mut BinaryReader) -> Result<Settings> {
    let field_count = reader.read_u16()?;
    let mut settings = Settings::default();
    for _ in 0..field_count {
        let field_num = reader.read_u16()?;
        match field_num {
            1 => settings.updated = Some(reader.read_bool()?),
            2 => settings.profanity_filtering = Some(reader.read_bool()?),
            3 => settings.enable_mouse_movement = Some(reader.read_bool()?),
            4 => settings.toggle_mouse_movement = Some(reader.read_bool()?),
            6 => settings.display_chat = Some(reader.read_bool()?),
            7 => settings.display_leaderboard = Some(reader.read_bool()?),
            9 => settings.display_timer = Some(reader.read_bool()?),
            11 => settings.reconnection = Some(reader.read_bool()?),
            42 => settings.unlock_fps = Some(reader.read_bool()?),
            _ => skip_field_by_type(reader, "bool")?,
        }
    }
    Ok(settings)
}

fn decode_quest_data(reader: &mut BinaryReader) -> Result<QuestData> {
    let field_count = reader.read_u16()?;
    let mut qd = QuestData::default();
    for _ in 0..field_count {
        let field_num = reader.read_u16()?;
        match field_num {
            1 => qd.region_name = Some(reader.read_string()?),
            2 => qd.area_index = Some(reader.read_i32()?),
            3 => qd.completions = Some(reader.read_i32()?),
            4 => qd.completions_required = Some(reader.read_i32()?),
            5 => qd.completion_points = Some(reader.read_i32()?),
            6 => qd.personal_points = Some(reader.read_i32()?),
            7 => qd.extra_message = Some(reader.read_string()?),
            8 => qd.player_completion_status = Some(reader.read_bool()?),
            _ => {}
        }
    }
    Ok(qd)
}

fn decode_zone(reader: &mut BinaryReader) -> Result<ZoneMessage> {
    let field_count = reader.read_u16()?;
    let mut zone = ZoneMessage::default();
    for _ in 0..field_count {
        let field_num = reader.read_u16()?;
        match field_num {
            1 => zone.x = Some(reader.read_i32()?),
            2 => zone.y = Some(reader.read_i32()?),
            3 => zone.width = Some(reader.read_i32()?),
            4 => zone.height = Some(reader.read_i32()?),
            5 => {
                let t = reader.read_i32()?;
                zone.zone_type = match t {
                    0 => Some(ZoneType::ActiveZone),
                    1 => Some(ZoneType::DummyZone),
                    2 => Some(ZoneType::ExitZone),
                    3 => Some(ZoneType::RemovalZone),
                    4 => Some(ZoneType::SafeZone),
                    5 => Some(ZoneType::TeleportZone),
                    6 => Some(ZoneType::VictoryZone),
                    _ => None,
                };
            }
            6 => zone.background_color = Some(reader.read_u32()?),
            8 => zone.friction = Some(reader.read_f32()?),
            9 => zone.minimum_speed = Some(reader.read_f32()?),
            10 => zone.maximum_speed = Some(reader.read_f32()?),
            _ => skip_field_by_type(reader, "int32")?,
        }
    }
    Ok(zone)
}

fn decode_area(reader: &mut BinaryReader) -> Result<AreaMessage> {
    let field_count = reader.read_u16()?;
    let mut area = AreaMessage::default();
    for _ in 0..field_count {
        let field_num = reader.read_u16()?;
        match field_num {
            1 => area.index = Some(reader.read_i32()?),
            2 => area.number = Some(reader.read_i32()?),
            3 => area.name = Some(reader.read_string()?),
            4 => area.x = Some(reader.read_i32()?),
            5 => area.y = Some(reader.read_i32()?),
            6 => area.width = Some(reader.read_i32()?),
            7 => area.height = Some(reader.read_i32()?),
            8 => {
                let count = reader.read_u16()?;
                for _ in 0..count {
                    area.zones.push(decode_zone(reader)?);
                }
            }
            9 => area.region_name = Some(reader.read_string()?),
            10 => area.boss_area = Some(reader.read_bool()?),
            11 => area.victory_area = Some(reader.read_bool()?),
            12 => area.lighting = Some(reader.read_f32()?),
            13 => area.snow = Some(reader.read_f32()?),
            14 => area.sakura_leaves = Some(reader.read_f32()?),
            _ => {}
        }
    }
    Ok(area)
}

fn decode_map(reader: &mut BinaryReader) -> Result<MapMessage> {
    let field_count = reader.read_u16()?;
    let mut map = MapMessage::default();
    for _ in 0..field_count {
        let field_num = reader.read_u16()?;
        match field_num {
            1 => map.x = Some(reader.read_i32()?),
            2 => map.y = Some(reader.read_i32()?),
            3 => map.width = Some(reader.read_i32()?),
            4 => map.height = Some(reader.read_i32()?),
            5 => {
                let count = reader.read_u16()?;
                for _ in 0..count {
                    map.zones.push(decode_zone(reader)?);
                }
            }
            _ => {}
        }
    }
    Ok(map)
}

fn decode_chat(reader: &mut BinaryReader) -> Result<ChatMessage> {
    let field_count = reader.read_u16()?;
    let mut chat = ChatMessage::default();
    for _ in 0..field_count {
        let field_num = reader.read_u16()?;
        match field_num {
            1 => {
                let count = reader.read_u16()?;
                for _ in 0..count {
                    let msg_field_count = reader.read_u16()?;
                    let mut item = ChatMessageItem::default();
                    for _ in 0..msg_field_count {
                        let fn_ = reader.read_u16()?;
                        match fn_ {
                            1 => item.id = Some(reader.read_i32()?),
                            2 => item.sender = Some(reader.read_string()?),
                            3 => {
                                let style_count = reader.read_u16()?;
                                for _ in 0..style_count {
                                    let _ = reader.read_i32()?;
                                }
                            }
                            4 => item.text = Some(reader.read_string()?),
                            _ => {}
                        }
                    }
                    chat.messages.push(item);
                }
            }
            2 => {
                let count = reader.read_u16()?;
                for _ in 0..count {
                    chat.blocked_usernames.push(reader.read_string()?);
                }
            }
            3 => {
                let count = reader.read_u16()?;
                for _ in 0..count {
                    chat.unblocked_usernames.push(reader.read_string()?);
                }
            }
            4 => {
                let count = reader.read_u16()?;
                for _ in 0..count {
                    chat.removed_senders.push(reader.read_string()?);
                }
            }
            _ => {}
        }
    }
    Ok(chat)
}

fn decode_ability(reader: &mut BinaryReader) -> Result<AbilityMessage> {
    let field_count = reader.read_u16()?;
    let mut ab = AbilityMessage::default();
    for _ in 0..field_count {
        let field_num = reader.read_u16()?;
        match field_num {
            1 => ab.ability_type = Some(reader.read_i32()?),
            2 => ab.name = Some(reader.read_string()?),
            3 => ab.description = Some(reader.read_string()?),
            4 => ab.energy_cost = Some(reader.read_f32()?),
            5 => ab.total_cooldown = Some(reader.read_f32()?),
            6 => ab.cooldown = Some(reader.read_f32()?),
            7 => ab.locked = Some(reader.read_bool()?),
            8 => ab.level = Some(reader.read_i32()?),
            9 => ab.max_level = Some(reader.read_i32()?),
            10 => ab.disabled = Some(reader.read_bool()?),
            11 => ab.is_pellet_ability = Some(reader.read_bool()?),
            _ => skip_field_by_type(reader, "float")?,
        }
    }
    Ok(ab)
}

fn decode_entity(reader: &mut BinaryReader) -> Result<EntityMessage> {
    let field_count = reader.read_u16()?;
    let mut ent = EntityMessage::default();

    for _ in 0..field_count {
        let field_num = reader.read_u16()?;
        match field_num {
            1 => ent.id = Some(reader.read_i32()?),
            2 => ent.entity_type = EntityType::from_i32(reader.read_i32()?),
            3 => ent.removed = Some(reader.read_bool()?),
            4 => ent.x = Some(reader.read_f32()?),
            5 => ent.y = Some(reader.read_f32()?),
            6 => ent.radius = Some(reader.read_f32()?),
            7 => ent.width = Some(reader.read_f32()?),
            8 => ent.height = Some(reader.read_f32()?),
            14 => ent.speed = Some(reader.read_f32()?),
            15 => ent.level = Some(reader.read_i32()?),
            16 => ent.experience = Some(reader.read_f32()?),
            19 => ent.upgrade_points = Some(reader.read_i32()?),
            20 => ent.energy = Some(reader.read_f32()?),
            21 => ent.max_energy = Some(reader.read_i32()?),
            22 => ent.energy_regen = Some(reader.read_f32()?),
            23 => ent.death_timer = Some(reader.read_f32()?),
            24 => ent.death_timer_total = Some(reader.read_f32()?),
            25 => ent.hero_type = HeroType::from_i32(reader.read_i32()?),
            26 => ent.ability_one = Some(decode_ability(reader)?),
            27 => ent.ability_two = Some(decode_ability(reader)?),
            31 => ent.is_harmless = Some(reader.read_bool()?),
            37 => { let _ = reader.read_string()?; } // hat_name
            38 => { let _ = reader.read_string()?; } // body_name
            39 => { let _ = reader.read_string()?; } // gem_name
            52 => ent.area_number = Some(reader.read_i32()?),
            53 => ent.area_name = Some(reader.read_string()?),
            54 => ent.region_name = Some(reader.read_string()?),
            55 => ent.boss_area = Some(reader.read_bool()?),
            56 => ent.victory_area = Some(reader.read_bool()?),
            194 => ent.velocity_x = Some(reader.read_f32()?),
            195 => ent.velocity_y = Some(reader.read_f32()?),
            _ => skip_entity_field(reader, field_num)?,
        }
    }

    Ok(ent)
}

fn skip_field_by_type(reader: &mut BinaryReader, ftype: &str) -> Result<()> {
    match ftype {
        "bool" => { let _ = reader.read_bool()?; }
        "float" => { let _ = reader.read_f32()?; }
        "int32" | "enum" => { let _ = reader.read_i32()?; }
        "uint32" => { let _ = reader.read_u32()?; }
        "string" | "bytes" => { let _ = reader.read_bytes()?; }
        _ => {}
    }
    Ok(())
}

fn skip_entity_field(reader: &mut BinaryReader, field_num: u16) -> Result<()> {
    // Exact mapping from schema2.js for unhandled fields:
    match field_num {
        // String fields:
        12 | 95 => { let _ = reader.read_string()?; }
        // Int32 fields:
        11 | 32 | 33 | 34 | 35 | 36 | 96 | 100 | 112 | 173 | 202 => { let _ = reader.read_i32()?; }
        // Bool fields:
        29 | 40 | 43 | 46 | 47 | 48 | 49 | 51 | 57 | 58 | 60 | 61 | 62 | 63 | 66 | 68 | 69
        | 71 | 72 | 73 | 74 | 77 | 78 | 80 | 81 | 84 | 85 | 87 | 88 | 89 | 90 | 91 | 92
        | 93 | 94 | 102 | 103 | 104 | 106 | 107 | 108 | 113 | 114 | 115 | 116 | 117 | 118
        | 119 | 121 | 122 | 123 | 125 | 126 | 127 | 130 | 133 | 135 | 136 | 138 | 139
        | 142 | 144 | 147 | 148 | 163 | 170 | 171 | 176 | 179 | 185 | 187 | 188 | 193
        | 203 | 212 | 213 => { let _ = reader.read_bool()?; }
        // Repeated message Effects:
        30 => {
            let count = reader.read_u16()?;
            for _ in 0..count {
                let sub_fields = reader.read_u16()?;
                for _ in 0..sub_fields {
                    let fn_ = reader.read_u16()?;
                    match fn_ {
                        1 => { let _ = reader.read_i32()?; }
                        2 => { let _ = reader.read_bool()?; }
                        3 => { let _ = reader.read_i32()?; }
                        4..=6 => { let _ = reader.read_f32()?; }
                        _ => {}
                    }
                }
            }
        }
        // Ability message:
        28 => { let _ = decode_ability(reader)?; }
        // Enum:
        99 | 192 => { let _ = reader.read_i32()?; }
        // Default to Float32:
        _ => { let _ = reader.read_f32()?; }
    }
    Ok(())
}

// ── Public Decode Entry Points ─────────────────────────────────────────────────

pub fn decode_connection_payload(data: &[u8]) -> Result<ConnectionPayload> {
    let mut reader = BinaryReader::new(data);
    let field_count = reader.read_u16()?;
    let mut cp = ConnectionPayload::default();

    for _ in 0..field_count {
        let field_num = reader.read_u16()?;
        match field_num {
            1 => {
                let t = reader.read_i32()?;
                cp.connection_type = match t {
                    0 => Some(ConnectionType::ErroredConnection),
                    1 => Some(ConnectionType::NormalConnection),
                    2 => Some(ConnectionType::RestoredConnection),
                    _ => None,
                };
            }
            2 => cp.username = Some(reader.read_string()?),
            3 => cp.settings = Some(decode_settings(&mut reader)?),
            4 => cp.quest_data = Some(decode_quest_data(&mut reader)?),
            5 => cp.error = Some(reader.read_string()?),
            _ => {}
        }
    }

    Ok(cp)
}

pub fn decode_frame_payload(data: &[u8]) -> Result<FramePayload> {
    let mut reader = BinaryReader::new(data);
    let version = reader.read_u8()?;
    if version != 2 {
        bail!("Unsupported frame version: expected 2, got {}", version);
    }

    let flags1 = reader.read_u8()?;
    let flags2 = reader.read_u8()?;
    let flags3 = reader.read_u8()?;
    let sequence = reader.read_u32()?;

    let mut frame = FramePayload {
        sequence,
        complete: (flags1 & 1) != 0,
        complete_global: (flags1 & 2) != 0,
        reset: (flags1 & 4) != 0,
        self_id: None,
        tick_rate: None,
        pong: None,
        area: None,
        map: None,
        chat: None,
        settings: None,
        quest_data: None,
        spectating: (flags3 & 1) != 0,
        entities: Vec::new(),
        global_entities: Vec::new(),
        x_entities: Vec::new(),
        y_entities: Vec::new(),
        xy_entities: Vec::new(),
        xy_radius_entities: Vec::new(),
        debug_objects: Vec::new(),
    };

    if (flags1 & 8) != 0 {
        frame.self_id = Some(reader.read_u32()?);
    }
    if (flags1 & 16) != 0 {
        frame.tick_rate = Some(reader.read_f32()?);
    }
    if (flags1 & 32) != 0 {
        frame.pong = Some(reader.read_u32()?);
    }
    if (flags1 & 64) != 0 {
        let bytes = reader.read_bytes()?;
        frame.area = Some(decode_area(&mut BinaryReader::new(&bytes))?);
    }
    if (flags1 & 128) != 0 {
        let bytes = reader.read_bytes()?;
        frame.map = Some(decode_map(&mut BinaryReader::new(&bytes))?);
    }

    if (flags2 & 1) != 0 {
        let bytes = reader.read_bytes()?;
        frame.chat = Some(decode_chat(&mut BinaryReader::new(&bytes))?);
    }
    if (flags2 & 2) != 0 {
        let bytes = reader.read_bytes()?;
        frame.settings = Some(decode_settings(&mut BinaryReader::new(&bytes))?);
    }
    if (flags2 & 4) != 0 {
        let _ = reader.read_bytes()?; // ModToolsResponse
    }
    if (flags2 & 8) != 0 {
        let bytes = reader.read_bytes()?;
        frame.quest_data = Some(decode_quest_data(&mut BinaryReader::new(&bytes))?);
    }

    // Delta compression channels
    if (flags2 & 16) != 0 {
        let bytes = reader.read_bytes()?;
        let mut r = BinaryReader::new(&bytes);
        while r.remaining() >= 8 {
            let id = r.read_u32()?;
            let x = r.read_f32()?;
            frame.x_entities.push((id, x));
        }
    }
    if (flags2 & 32) != 0 {
        let bytes = reader.read_bytes()?;
        let mut r = BinaryReader::new(&bytes);
        while r.remaining() >= 8 {
            let id = r.read_u32()?;
            let y = r.read_f32()?;
            frame.y_entities.push((id, y));
        }
    }
    if (flags2 & 64) != 0 {
        let bytes = reader.read_bytes()?;
        let mut r = BinaryReader::new(&bytes);
        while r.remaining() >= 12 {
            let id = r.read_u32()?;
            let x = r.read_f32()?;
            let y = r.read_f32()?;
            frame.xy_entities.push((id, x, y));
        }
    }
    if (flags2 & 128) != 0 {
        let bytes = reader.read_bytes()?;
        let mut r = BinaryReader::new(&bytes);
        while r.remaining() >= 16 {
            let id = r.read_u32()?;
            let x = r.read_f32()?;
            let y = r.read_f32()?;
            let radius = r.read_f32()?;
            frame.xy_radius_entities.push((id, x, y, radius));
        }
    }

    // Entity lists
    let entity_count = reader.read_u32()? as usize;
    for _ in 0..entity_count {
        frame.entities.push(decode_entity(&mut reader)?);
    }

    let global_entity_count = reader.read_u32()? as usize;
    for _ in 0..global_entity_count {
        frame.global_entities.push(decode_entity(&mut reader)?);
    }

    let debug_count = reader.read_u32()? as usize;
    for _ in 0..debug_count {
        let field_count = reader.read_u16()?;
        let mut debug = ServerDebugObject::default();
        for _ in 0..field_count {
            let fn_ = reader.read_u16()?;
            match fn_ {
                1 => debug.x = reader.read_f32()?,
                2 => debug.y = reader.read_f32()?,
                3 => debug.color = reader.read_u32()?,
                4 => debug.text = Some(reader.read_string()?),
                _ => {}
            }
        }
        frame.debug_objects.push(debug);
    }

    Ok(frame)
}

// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_payload_roundtrip() {
        let payload = ClientPayload {
            hero_selection: Some(HeroSelection::Magmax),
            sequence: Some(42),
            keys: vec![Key {
                key_event: Some(KeyEvent::KeyDown),
                key_type: Some(KeyType::AbilityOne),
            }],
            mouse_down: Some(MouseDown {
                updated: Some(true),
                x: Some(150),
                y: Some(-80),
            }),
            message: Some("Hello Evades!".to_string()),
            settings: Some(Settings::default()),
            blocked_usernames: vec![],
            unblocked_usernames: vec![],
            ping: Some(12345),
        };

        let encoded = encode_client_payload(&payload);
        assert!(!encoded.is_empty());

        let mut reader = BinaryReader::new(&encoded);
        let field_count = reader.read_u16().unwrap();
        assert!(field_count > 0);
    }

    #[test]
    fn test_delta_compression_decoding() {
        // Frame with version 2, flags2 with xEntities (16), yEntities (32), xyEntities (64), xyRadiusEntities (128)
        let mut w = BinaryWriter::new();
        w.write_u8(2); // version
        w.write_u8(0); // flags1
        w.write_u8(16 | 32 | 64 | 128); // flags2 (all 4 delta channels)
        w.write_u8(0); // flags3
        w.write_u32(100); // sequence

        // xEntities: 1 entity (id=1, x=100.5)
        let mut x_w = BinaryWriter::new();
        x_w.write_u32(1);
        x_w.write_f32(100.5);
        w.write_bytes(&x_w.into_bytes());

        // yEntities: 1 entity (id=2, y=200.5)
        let mut y_w = BinaryWriter::new();
        y_w.write_u32(2);
        y_w.write_f32(200.5);
        w.write_bytes(&y_w.into_bytes());

        // xyEntities: 1 entity (id=3, x=10.0, y=20.0)
        let mut xy_w = BinaryWriter::new();
        xy_w.write_u32(3);
        xy_w.write_f32(10.0);
        xy_w.write_f32(20.0);
        w.write_bytes(&xy_w.into_bytes());

        // xyRadiusEntities: 1 entity (id=4, x=30.0, y=40.0, radius=15.0)
        let mut xyr_w = BinaryWriter::new();
        xyr_w.write_u32(4);
        xyr_w.write_f32(30.0);
        xyr_w.write_f32(40.0);
        xyr_w.write_f32(15.0);
        w.write_bytes(&xyr_w.into_bytes());

        // 0 entities, 0 global entities, 0 debug objects
        w.write_u32(0);
        w.write_u32(0);
        w.write_u32(0);

        let data = w.into_bytes();
        let frame = decode_frame_payload(&data).unwrap();

        assert_eq!(frame.sequence, 100);
        assert_eq!(frame.x_entities, vec![(1, 100.5)]);
        assert_eq!(frame.y_entities, vec![(2, 200.5)]);
        assert_eq!(frame.xy_entities, vec![(3, 10.0, 20.0)]);
        assert_eq!(frame.xy_radius_entities, vec![(4, 30.0, 40.0, 15.0)]);
    }
}
