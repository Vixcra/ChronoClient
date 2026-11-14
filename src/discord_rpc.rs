
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use serde::{Deserialize, Serialize};
use std::sync::mpsc::Receiver;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresenceData {
    pub in_game: bool,
    pub status: Option<String>,
    pub enabled: Option<bool>,
}

pub fn spawn_discord_rpc(app_id: Option<String>, rx: Receiver<PresenceData>) {
    std::thread::spawn(move || {
        let target_app_id = app_id
            .or_else(|| std::env::var("DISCORD_APP_ID").ok())
            .unwrap_or_else(|| "1541194924660236378".to_string());

        let start_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        let mut client: Option<DiscordIpcClient> = None;
        let mut last_connect_attempt = std::time::Instant::now()
            .checked_sub(std::time::Duration::from_secs(10))
            .unwrap_or_else(std::time::Instant::now);
        let mut last_data: Option<PresenceData> = None;
        let mut last_sent_state: Option<&'static str> = None;

        loop {
            // Wait for presence changes or periodic reconnect check when disconnected
            let wait_dur = if client.is_some() {
                std::time::Duration::from_secs(15)
            } else {
                std::time::Duration::from_secs(5)
            };

            if let Ok(first) = rx.recv_timeout(wait_dur) {
                last_data = Some(first);
                while let Ok(more) = rx.try_recv() {
                    last_data = Some(more);
                }
            }

            let is_enabled = last_data.as_ref().and_then(|d| d.enabled).unwrap_or(true);
            if !is_enabled {
                if let Some(mut c) = client.take() {
                    let _ = c.clear_activity();
                    let _ = c.close();
                }
                last_sent_state = None;
                continue;
            }

            // Ensure connected to Discord IPC
            if client.is_none() && last_connect_attempt.elapsed() >= std::time::Duration::from_secs(5) {
                last_connect_attempt = std::time::Instant::now();
                if let Ok(mut c) = DiscordIpcClient::new(&target_app_id)
                    && c.connect().is_ok()
                {
                    tracing::info!("Discord Rich Presence connected with App ID: {}", target_app_id);
                    client = Some(c);
                    last_sent_state = None;
                }
            }

            // Update Discord activity only when state actually changes
            if let Some(ref mut c) = client {
                let state_str = if let Some(ref data) = last_data {
                    if let Some(ref s) = data.status {
                        match s.as_str() {
                            "Highscore" | "highscore" => "Highscore",
                            "Tournament" | "tournament" => "Tournament",
                            "Online" | "online" => "Online",
                            "Idle" | "idle" => "Idle",
                            _ => if data.in_game { "Online" } else { "Idle" }
                        }
                    } else if data.in_game {
                        "Online"
                    } else {
                        "Idle"
                    }
                } else {
                    "Idle"
                };

                if last_sent_state != Some(state_str) {
                    let activity = activity::Activity::new()
                        .state(state_str)
                        .timestamps(activity::Timestamps::new().start(start_time));

                    if let Err(e) = c.set_activity(activity) {
                        tracing::warn!("Discord RPC connection lost: {}, retrying...", e);
                        let _ = c.close();
                        client = None;
                        last_sent_state = None;
                    } else {
                        last_sent_state = Some(state_str);
                    }
                }
            }
        }
    });
}
