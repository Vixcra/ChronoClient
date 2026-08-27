use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EntityCategory {
    Generic,
    WallHitters,
    Invisible,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Reactivity {
    Independent,
    Targeting,
    Movement,
    Stochastic,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityTypeInfo {
    pub category: EntityCategory,
    pub reactivity: Reactivity,
}
