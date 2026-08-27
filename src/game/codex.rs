//! Codex static data loader (heroes, maps, enemies)

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AbilityData {
    pub slot: Option<i32>,
    pub class: Option<String>,
    pub base_class: Option<String>,
    pub energy_cost: Option<f32>,
    pub cooldown: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeroData {
    pub name: String,
    pub file: Option<String>,
    pub abilities: Option<Vec<AbilityData>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnemyData {
    #[serde(rename = "type")]
    pub enemy_type: Option<String>,
    pub class: Option<String>,
    pub category: Option<String>,
    pub movement: Option<String>,
    pub effect_on_player: Option<String>,
    pub lethal_on_contact: Option<bool>,
}

#[derive(Debug, Clone, Default)]
pub struct Codex {
    pub heroes: HashMap<String, HeroData>,
    pub enemies: HashMap<String, EnemyData>,
}

impl Codex {
    /// Loads static codex JSON files from a given directory.
    pub fn load<P: AsRef<Path>>(dir: P) -> Result<Self> {
        let dir = dir.as_ref();
        let mut codex = Self::default();

        let heroes_path = dir.join("heroes.json");
        if heroes_path.exists() {
            if let Ok(file) = File::open(&heroes_path) {
                let val: serde_json::Value = serde_json::from_reader(file)
                    .with_context(|| format!("Failed to parse {:?}", heroes_path))?;
                if let Some(heroes_arr) = val.get("heroes").and_then(|v| v.as_array()) {
                    for h_val in heroes_arr {
                        if let Ok(hero) = serde_json::from_value::<HeroData>(h_val.clone()) {
                            codex.heroes.insert(hero.name.to_lowercase(), hero);
                        }
                    }
                }
            }
        }

        let enemies_path = dir.join("enemies.json");
        if enemies_path.exists() {
            if let Ok(file) = File::open(&enemies_path) {
                let val: serde_json::Value = serde_json::from_reader(file)
                    .with_context(|| format!("Failed to parse {:?}", enemies_path))?;
                if let Some(cats) = val.get("categories").and_then(|v| v.as_object()) {
                    for (_cat_name, enemy_list) in cats {
                        if let Some(arr) = enemy_list.as_array() {
                            for e_val in arr {
                                if let Ok(enemy) = serde_json::from_value::<EnemyData>(e_val.clone()) {
                                    if let Some(t) = &enemy.enemy_type {
                                        codex.enemies.insert(t.to_lowercase(), enemy);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        tracing::info!(
            "Loaded Codex: {} heroes, {} enemies",
            codex.heroes.len(),
            codex.enemies.len()
        );

        Ok(codex)
    }
}
