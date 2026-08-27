//! WebSocket connection handler for Evades.io servers with browser headers and session cookies

use super::codec::{decode_connection_payload, decode_frame_payload, encode_client_payload};
use super::messages::{ClientPayload, ServerMessage};
use anyhow::Result;
use futures_util::{SinkExt, StreamExt};
use tokio::net::TcpStream;
use tokio_tungstenite::tungstenite::handshake::client::generate_key;
use tokio_tungstenite::tungstenite::http::Request;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{connect_async, MaybeTlsStream, WebSocketStream};
use url::Url;

pub struct ServerConnection {
    ws_stream: WebSocketStream<MaybeTlsStream<TcpStream>>,
    initial_connection_done: bool,
}

impl ServerConnection {
    /// Connects to an Evades.io game server WebSocket endpoint with browser headers (Origin, User-Agent, Cookie).
    /// URL format: `wss://<host>:<port>/api/game/connect?backend=<backend>&game=<game>&force=1`
    pub async fn connect(url: &str, cookie: Option<&str>) -> Result<Self> {
        tracing::info!("Connecting to Evades.io server: {}", url);

        let parsed_url = Url::parse(url)?;
        let host = parsed_url.host_str().unwrap_or("eu.evades.io");
        let port_str = if let Some(p) = parsed_url.port() {
            format!(":{}", p)
        } else {
            "".to_string()
        };
        let host_header = format!("{}{}", host, port_str);

        let mut builder = Request::builder()
            .uri(url)
            .header("Host", host_header)
            .header("Origin", "https://evades.io")
            .header(
                "User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            )
            .header("Sec-WebSocket-Version", "13")
            .header("Sec-WebSocket-Key", generate_key())
            .header("Connection", "Upgrade")
            .header("Upgrade", "websocket");

        if let Some(c) = cookie {
            if !c.is_empty() {
                builder = builder.header("Cookie", c);
            }
        }

        let request = builder.body(())?;

        let (ws_stream, response) = connect_async(request).await?;
        tracing::info!(
            "WebSocket handshake successful! HTTP status: {}",
            response.status()
        );

        Ok(Self {
            ws_stream,
            initial_connection_done: false,
        })
    }

    /// Sends a binary `ClientPayload` message to the server.
    pub async fn send_payload(&mut self, payload: &ClientPayload) -> Result<()> {
        let bytes = encode_client_payload(payload);
        self.ws_stream.send(Message::Binary(bytes.into())).await?;
        Ok(())
    }

    /// Sends a captcha token (Turnstile) as a plain text frame.
    pub async fn send_captcha_token(&mut self, token: &str) -> Result<()> {
        self.ws_stream
            .send(Message::Text(token.to_string().into()))
            .await?;
        Ok(())
    }

    /// Receives and decodes the next server message.
    /// The first message received after connect is a `ConnectionPayload`.
    /// All subsequent messages are `FramePayload`.
    pub async fn recv_message(&mut self) -> Result<Option<ServerMessage>> {
        while let Some(msg_result) = self.ws_stream.next().await {
            let msg = msg_result?;
            match msg {
                Message::Binary(data) => {
                    if !self.initial_connection_done {
                        let cp = decode_connection_payload(&data)?;
                        self.initial_connection_done = true;
                        return Ok(Some(ServerMessage::Connection(cp)));
                    } else {
                        let frame = decode_frame_payload(&data)?;
                        return Ok(Some(ServerMessage::Frame(frame)));
                    }
                }
                Message::Text(text) => {
                    tracing::debug!("Received text frame: {}", text);
                }
                Message::Ping(data) => {
                    self.ws_stream.send(Message::Pong(data)).await?;
                }
                Message::Close(frame) => {
                    tracing::info!("Server closed connection: {:?}", frame);
                    return Ok(None);
                }
                _ => {}
            }
        }

        Ok(None)
    }

    /// Closes the connection cleanly.
    pub async fn disconnect(&mut self) -> Result<()> {
        self.ws_stream.close(None).await?;
        Ok(())
    }
}
