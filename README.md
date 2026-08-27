# Chrono Evades Client

Welcome to **Chrono**, some custom native client for [Evades.io](https://evades.io/). 

Chrono is designed to provide the smoothest gameplay experience possible, breaking free from traditional web browser limitations while ensuring competitive integrity.

## 🚀 Key Features

- **Native Performance:** Hardware-accelerated rendering engine that ensures minimal input lag for ultra-precise movement.
- **Custom Flags:** Play without the limits imposed by web browsers.
- **Discord Rich Presence:** Automatically display your live game status on your Discord profile for fun.
- **Chrono Hub:** An integrated Hub menu inside the game to access all of the features below and more fun things.
- **Built-in Pages:** Check out your custom Profile page, Account management, and dedicated Run pages directly within the client.
- **Integrated Highscores:** View the community highscores natively without leaving the game.
- **Tournament Mode:** A specialized, highly secure mode built specifically for official Evades.io tournaments.

## 🛡️ Tournament Integrity (Sentinel)

Chrono integrates an advanced sentinel system to guarantee fair play during official tournaments:
- **Lockdown Mode:** When participating in official tournaments, the client certifies your runs and times.
- **Anti-Cheat:** The client detects synthetic input injections (macros, Python, C++ bots, AutoHotkey, Cheat Engine etc..) and prevents the use of unapproved scripts during tournaments to prevent any form of cheating.

## 📂 Installation & Usage

1. Go to the [Releases](https://github.com/Vixcra/ChronoClient/releases) page and download the latest **`ChronoClient-vX.X.X.zip`**.
2. Extract the zip anywhere you want (Desktop, Documents, etc.).
3. Launch **`chrono-evades.exe`** — that's it.
4. **Custom Scripts:** Place your `.js` files in the **`scripts/`** folder that gets created automatically on first launch (disabled during tournaments).

> **⚠️ Windows Defender / Antivirus:** The executable may trigger a false positive since it's unsigned. Click *"More info" → "Run anyway"* or add an exclusion for the folder.


## 🔧 Building from Source

> **Windows only.** Chrono uses platform-specific APIs (WebView2, Raw Input, WinRes) and will not compile on Linux/macOS.

### Prerequisites

1. **Install Rust** — Install via [rustup.rs](https://rustup.rs/). Make sure you have the **stable** toolchain:
   ```sh
   rustup default stable
   ```

2. **MSVC Build Tools** — Required by the Rust compiler on Windows. Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and select the **"Desktop development with C++"** workload (includes MSVC + Windows SDK).

3. **WebView2 Runtime** — Already installed on Windows 10/11. If missing, download from [Microsoft's site](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

### Compile

```sh
git clone https://github.com/Vixcra/ChronoClient.git
cd ChronoClient
cargo build --release
```

The compiled executable will be at `target\release\chrono-evades.exe`.

> **Note:** Debug builds (`cargo build`) are intentionally disabled. Release builds take ~1 minute on first compile due to heavy dependencies (wgpu, wry, egui).

## ⚠️ License and Rights

**Copyright (c) 2026 Vixcra. All Rights Reserved.**

This software is proprietary. It is strictly forbidden to use, copy, modify, distribute, or sell this software without explicit permission from its author.

For more details, please refer to the **`LICENSE`** file included in this folder.