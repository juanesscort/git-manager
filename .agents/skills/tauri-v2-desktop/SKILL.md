---
name: tauri-v2-desktop
description: Procedures and best practices for developing, configuring IPC, and building Tauri v2 desktop applications with Rust and Linux webviews. Use when setting up Tauri, registering commands, debugging WebKitGTK, or managing desktop window lifecycles.
---

# Tauri v2 Desktop Workflow Guide

This skill provides step-by-step procedures for managing the Tauri v2 desktop environment in Linux, ensuring high performance, safe IPC patterns, and clean separation between Rust and the webview.

## 1. System Prerequisites in Linux (Debian/Ubuntu/Fedora/Arch)

Before building or running Tauri v2 on Linux, ensure the native libraries are installed:

### Ubuntu / Debian / Pop!_OS:
```bash
sudo apt update && sudo apt install -y \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libwebkit2gtk-4.1-dev \
  javascriptcoregtk-4.1-dev
```

### Fedora:
```bash
sudo dnf check-update && sudo dnf install -y \
  webkit2gtk4.1-devel \
  openssl-devel \
  curl \
  wget \
  file \
  libappindicator-gtk3-devel \
  librsvg2-devel \
  base-devel
```

---

## 2. Recommended Directory Structure

```text
git-manager/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── src/
│   │   ├── main.rs            # Entrypoint
│   │   ├── lib.rs             # Tauri app setup and command registration
│   │   ├── ipc/               # Tauri command handlers (deserializers & invokers)
│   │   │   ├── mod.rs
│   │   │   ├── git_commands.rs
│   │   │   ├── ai_commands.rs
│   │   │   └── github_commands.rs
│   │   └── core/              # Pure domain logic in Rust (agnostic of Tauri)
│   │       ├── mod.rs
│   │       ├── git_engine/
│   │       ├── github_client/
│   │       ├── ai_service/
│   │       └── conflict_resolver/
├── src/                       # Frontend source (Svelte/React/Vue/TS)
├── package.json
└── vite.config.ts
```

---

## 3. Best Practices for Tauri IPC Commands

1. **Async Command Handlers:** Use `async` in Tauri commands for heavy I/O operations (like Git operations or AI requests) to avoid blocking the main UI thread:
   ```rust
   #[tauri::command]
   pub async fn get_repo_status(path: String) -> Result<RepoStatusDto, String> {
       core::git_engine::inspect_status(&path).map_err(|e| e.to_string())
   }
   ```
2. **DTO (Data Transfer Objects):** Return serializable structs with `#[derive(serde::Serialize, serde::Deserialize)]` specifically designed for frontend consumption.
3. **Event Emitting for Long Tasks:** For operations like `git fetch` or `git pull`, emit progress events to the window instead of making the frontend await a single synchronous call.
