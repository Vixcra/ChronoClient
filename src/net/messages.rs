//! Protocol messages and enums for Evades.io

use serde::{Deserialize, Serialize};

// ── Enums ──────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[repr(i32)]
pub enum HeroType {
    Aurora = 0,
    Boldrock = 1,
    Brute = 2,
    Candy = 3,
    Cent = 4,
    Chrono = 5,
    Cybot = 6,
    Demona = 7,
    Echelon = 8,
    Euclid = 9,
    Factorb = 10,
    Ghoul = 11,
    Glob = 12,
    Ignis = 13,
    Jolt = 14,
    Jotunn = 15,
    Leono = 16,
    Magmax = 17,
    Magno = 18,
    Mirage = 19,
    Morfe = 20,
    Mortuus = 21,
    Necro = 22,
    Nexus = 23,
    Rameses = 24,
    Reaper = 25,
    Rime = 26,
    Shade = 27,
    Stella = 28,
    Stheno = 29,
    Veydris = 30,
    Viola = 31,
}

impl HeroType {
    pub fn from_i32(val: i32) -> Option<Self> {
        if (0..=31).contains(&val) {
            // Safe due to #[repr(i32)] and contiguous range 0..=31
            Some(unsafe { std::mem::transmute(val) })
        } else {
            None
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[repr(i32)]
pub enum HeroSelection {
    Aurora = 0,
    Boldrock = 1,
    Brute = 2,
    Candy = 3,
    Cent = 4,
    Chrono = 5,
    Cybot = 6,
    Demona = 7,
    Echelon = 8,
    Euclid = 9,
    Factorb = 10,
    Ghoul = 11,
    Glob = 12,
    Ignis = 13,
    Jolt = 14,
    Jotunn = 15,
    Leono = 16,
    Magmax = 17,
    Magno = 18,
    Mirage = 19,
    Morfe = 20,
    Mortuus = 21,
    Necro = 22,
    Nexus = 23,
    Rameses = 24,
    Reaper = 25,
    Rime = 26,
    Shade = 27,
    Stella = 28,
    Stheno = 29,
    Veydris = 30,
    Viola = 31,
    Undefined = 32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[repr(i32)]
pub enum KeyEvent {
    KeyDown = 0,
    KeyUp = 1,
    Undefined = 2,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[repr(i32)]
pub enum KeyType {
    Undefined = 0,
    W = 1,
    A = 2,
    S = 3,
    D = 4,
    Up = 5,
    Left = 6,
    Down = 7,
    Right = 8,
    Focus = 9,
    AbilityOne = 10,
    AbilityTwo = 11,
    AbilityThree = 12,
    Action = 13,
    UpgradeSpeed = 14,
    UpgradeMaxEnergy = 15,
    UpgradeEnergyRegen = 16,
    UpgradeAbilityOne = 17,
    UpgradeAbilityTwo = 18,
    UpgradeAbilityThree = 19,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[repr(i32)]
pub enum ZoneType {
    ActiveZone = 0,
    DummyZone = 1,
    ExitZone = 2,
    RemovalZone = 3,
    SafeZone = 4,
    TeleportZone = 5,
    VictoryZone = 6,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[repr(i32)]
pub enum ConnectionType {
    ErroredConnection = 0,
    NormalConnection = 1,
    RestoredConnection = 2,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[repr(i32)]
pub enum EntityType {
    NormalEnemy = 107,
    Player = 118,
    Pellet = 113,
    Wall = 228,
    WallEnemy = 229,
    WackyWallEnemy = 227,
    ImmuneEnemy = 74,
    SuperstarEnemy = 204,
    TeleportingEnemy = 207,
    DasherEnemy = 22,
    HomingEnemy = 65,
    SlowingEnemy = 183,
    DrainingEnemy = 29,
    OscillatingEnemy = 110,
    TurningEnemy = 214,
    LiquidEnemy = 88,
    SizingEnemy = 180,
    SwitchEnemy = 206,
    FreezingEnemy = 57,
    SniperEnemy = 184,
    DisablingEnemy = 24,
    GravityEnemy = 63,
    RepellingEnemy = 142,
    WavyEnemy = 230,
    ZigzagEnemy = 236,
    ZoningEnemy = 238,
    StarEnemy = 199,
    GrassEnemy = 61,
    TreeEnemy = 211,
    LavaEnemy = 80,
    ToxicEnemy = 210,
    WitheringEnemy = 235,
    SlipperyEnemy = 182,
    CorrosiveEnemy = 12,
    ExperienceDrainEnemy = 42,
    MagneticReductionEnemy = 94,
    MagneticNullificationEnemy = 93,
    QuicksandEnemy = 131,
    RadarEnemy = 132,
    BarrierEnemy = 3,
    VoidDrainEnemy = 220,
    VoidCrawlerEnemy = 219,
    IceGhostEnemy = 68,
    PoisonGhostEnemy = 120,
    LungingEnemy = 91,
    MistEnemy = 97,
    GlowyEnemy = 60,
    FireflyEnemy = 47,
    EnlargingEnemy = 41,
    BlockingEnemy = 6,
    ForceSniperAEnemy = 53,
    ForceSniperBEnemy = 55,
    PoisonSniperEnemy = 121,
    IceSniperEnemy = 69,
    FlamingEnemy = 49,
}

impl EntityType {
    pub fn from_i32(val: i32) -> Option<Self> {
        match val {
            107 => Some(Self::NormalEnemy),
            118 => Some(Self::Player),
            113 => Some(Self::Pellet),
            228 => Some(Self::Wall),
            229 => Some(Self::WallEnemy),
            227 => Some(Self::WackyWallEnemy),
            74 => Some(Self::ImmuneEnemy),
            204 => Some(Self::SuperstarEnemy),
            207 => Some(Self::TeleportingEnemy),
            22 => Some(Self::DasherEnemy),
            65 => Some(Self::HomingEnemy),
            183 => Some(Self::SlowingEnemy),
            29 => Some(Self::DrainingEnemy),
            110 => Some(Self::OscillatingEnemy),
            214 => Some(Self::TurningEnemy),
            88 => Some(Self::LiquidEnemy),
            180 => Some(Self::SizingEnemy),
            206 => Some(Self::SwitchEnemy),
            57 => Some(Self::FreezingEnemy),
            184 => Some(Self::SniperEnemy),
            24 => Some(Self::DisablingEnemy),
            63 => Some(Self::GravityEnemy),
            142 => Some(Self::RepellingEnemy),
            230 => Some(Self::WavyEnemy),
            236 => Some(Self::ZigzagEnemy),
            238 => Some(Self::ZoningEnemy),
            199 => Some(Self::StarEnemy),
            61 => Some(Self::GrassEnemy),
            211 => Some(Self::TreeEnemy),
            80 => Some(Self::LavaEnemy),
            210 => Some(Self::ToxicEnemy),
            235 => Some(Self::WitheringEnemy),
            182 => Some(Self::SlipperyEnemy),
            12 => Some(Self::CorrosiveEnemy),
            42 => Some(Self::ExperienceDrainEnemy),
            94 => Some(Self::MagneticReductionEnemy),
            93 => Some(Self::MagneticNullificationEnemy),
            131 => Some(Self::QuicksandEnemy),
            132 => Some(Self::RadarEnemy),
            3 => Some(Self::BarrierEnemy),
            220 => Some(Self::VoidDrainEnemy),
            219 => Some(Self::VoidCrawlerEnemy),
            68 => Some(Self::IceGhostEnemy),
            120 => Some(Self::PoisonGhostEnemy),
            91 => Some(Self::LungingEnemy),
            97 => Some(Self::MistEnemy),
            60 => Some(Self::GlowyEnemy),
            47 => Some(Self::FireflyEnemy),
            41 => Some(Self::EnlargingEnemy),
            6 => Some(Self::BlockingEnemy),
            53 => Some(Self::ForceSniperAEnemy),
            55 => Some(Self::ForceSniperBEnemy),
            121 => Some(Self::PoisonSniperEnemy),
            69 => Some(Self::IceSniperEnemy),
            49 => Some(Self::FlamingEnemy),
            _ => None,
        }
    }

    pub fn to_i32(self) -> i32 {
        self as i32
    }
}

// ── Client -> Server Structures ────────────────────────────────────────────────

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Key {
    pub key_event: Option<KeyEvent>,
    pub key_type: Option<KeyType>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct MouseDown {
    pub updated: Option<bool>,
    pub x: Option<i32>,
    pub y: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub updated: Option<bool>,
    pub profanity_filtering: Option<bool>,
    pub enable_mouse_movement: Option<bool>,
    pub toggle_mouse_movement: Option<bool>,
    pub display_chat: Option<bool>,
    pub display_leaderboard: Option<bool>,
    pub display_timer: Option<bool>,
    pub reconnection: Option<bool>,
    pub unlock_fps: Option<bool>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            updated: Some(true),
            profanity_filtering: Some(true),
            enable_mouse_movement: Some(false),
            toggle_mouse_movement: Some(true),
            display_chat: Some(true),
            display_leaderboard: Some(true),
            display_timer: Some(true),
            reconnection: Some(true),
            unlock_fps: Some(true),
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ClientPayload {
    pub hero_selection: Option<HeroSelection>,
    pub sequence: Option<i32>,
    pub keys: Vec<Key>,
    pub mouse_down: Option<MouseDown>,
    pub message: Option<String>,
    pub settings: Option<Settings>,
    pub blocked_usernames: Vec<String>,
    pub unblocked_usernames: Vec<String>,
    pub ping: Option<i32>,
}

// ── Server -> Client Structures ────────────────────────────────────────────────

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct QuestData {
    pub region_name: Option<String>,
    pub area_index: Option<i32>,
    pub completions: Option<i32>,
    pub completions_required: Option<i32>,
    pub completion_points: Option<i32>,
    pub personal_points: Option<i32>,
    pub extra_message: Option<String>,
    pub player_completion_status: Option<bool>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ConnectionPayload {
    pub connection_type: Option<ConnectionType>,
    pub username: Option<String>,
    pub settings: Option<Settings>,
    pub quest_data: Option<QuestData>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AbilityMessage {
    pub ability_type: Option<i32>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub energy_cost: Option<f32>,
    pub total_cooldown: Option<f32>,
    pub cooldown: Option<f32>,
    pub locked: Option<bool>,
    pub level: Option<i32>,
    pub max_level: Option<i32>,
    pub disabled: Option<bool>,
    pub is_pellet_ability: Option<bool>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ZoneMessage {
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub zone_type: Option<ZoneType>,
    pub background_color: Option<u32>,
    pub friction: Option<f32>,
    pub minimum_speed: Option<f32>,
    pub maximum_speed: Option<f32>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AreaMessage {
    pub index: Option<i32>,
    pub number: Option<i32>,
    pub name: Option<String>,
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub zones: Vec<ZoneMessage>,
    pub region_name: Option<String>,
    pub boss_area: Option<bool>,
    pub victory_area: Option<bool>,
    pub lighting: Option<f32>,
    pub snow: Option<f32>,
    pub sakura_leaves: Option<f32>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct MapMessage {
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub zones: Vec<ZoneMessage>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ChatMessageItem {
    pub id: Option<i32>,
    pub sender: Option<String>,
    pub text: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ChatMessage {
    pub messages: Vec<ChatMessageItem>,
    pub blocked_usernames: Vec<String>,
    pub unblocked_usernames: Vec<String>,
    pub removed_senders: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EntityMessage {
    pub id: Option<i32>,
    pub entity_type: Option<EntityType>,
    pub removed: Option<bool>,
    pub x: Option<f32>,
    pub y: Option<f32>,
    pub radius: Option<f32>,
    pub width: Option<f32>,
    pub height: Option<f32>,
    pub speed: Option<f32>,
    pub level: Option<i32>,
    pub experience: Option<f32>,
    pub upgrade_points: Option<i32>,
    pub energy: Option<f32>,
    pub max_energy: Option<i32>,
    pub energy_regen: Option<f32>,
    pub death_timer: Option<f32>,
    pub death_timer_total: Option<f32>,
    pub hero_type: Option<HeroType>,
    pub ability_one: Option<AbilityMessage>,
    pub ability_two: Option<AbilityMessage>,
    pub is_harmless: Option<bool>,
    pub name: Option<String>,
    pub area_number: Option<i32>,
    pub area_name: Option<String>,
    pub region_name: Option<String>,
    pub boss_area: Option<bool>,
    pub victory_area: Option<bool>,
    pub velocity_x: Option<f32>,
    pub velocity_y: Option<f32>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ServerDebugObject {
    pub x: f32,
    pub y: f32,
    pub color: u32,
    pub text: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct FramePayload {
    pub sequence: u32,
    pub complete: bool,
    pub complete_global: bool,
    pub reset: bool,
    pub self_id: Option<u32>,
    pub tick_rate: Option<f32>,
    pub pong: Option<u32>,
    pub area: Option<AreaMessage>,
    pub map: Option<MapMessage>,
    pub chat: Option<ChatMessage>,
    pub settings: Option<Settings>,
    pub quest_data: Option<QuestData>,
    pub spectating: bool,
    pub entities: Vec<EntityMessage>,
    pub global_entities: Vec<EntityMessage>,
    pub x_entities: Vec<(u32, f32)>,
    pub y_entities: Vec<(u32, f32)>,
    pub xy_entities: Vec<(u32, f32, f32)>,
    pub xy_radius_entities: Vec<(u32, f32, f32, f32)>,
    pub debug_objects: Vec<ServerDebugObject>,
}

#[derive(Debug, Clone)]
pub enum ServerMessage {
    Connection(ConnectionPayload),
    Frame(FramePayload),
}
