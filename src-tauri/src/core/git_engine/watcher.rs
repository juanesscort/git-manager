use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc::channel;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

pub struct RepoWatcherManager {
    current_path: Arc<Mutex<Option<PathBuf>>>,
    watcher: Arc<Mutex<Option<RecommendedWatcher>>>,
}

impl Default for RepoWatcherManager {
    fn default() -> Self {
        Self::new()
    }
}

impl RepoWatcherManager {
    pub fn new() -> Self {
        Self {
            current_path: Arc::new(Mutex::new(None)),
            watcher: Arc::new(Mutex::new(None)),
        }
    }

    pub fn watch_path(&self, app: AppHandle, path_str: &str) -> Result<(), String> {
        let new_path = PathBuf::from(path_str);
        if !new_path.exists() || !new_path.is_dir() {
            return Err("Ruta no válida o inexistente".to_string());
        }

        let mut path_guard = self.current_path.lock().unwrap();
        if let Some(ref current) = *path_guard
            && current == &new_path
        {
            return Ok(()); // Already watching this path
        }

        // Clean up previous watcher
        let mut watcher_guard = self.watcher.lock().unwrap();
        *watcher_guard = None;

        let last_emit = Arc::new(Mutex::new(Instant::now() - Duration::from_secs(1)));
        let last_emit_clone = Arc::clone(&last_emit);
        let app_handle = app.clone();

        let (tx, rx) = channel();

        let mut watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            },
            Config::default(),
        )
        .map_err(|e| format!("Error creando file watcher: {}", e))?;

        watcher
            .watch(&new_path, RecursiveMode::Recursive)
            .map_err(|e| format!("Error observando ruta {}: {}", path_str, e))?;

        // Background thread to debounce events and emit to frontend
        std::thread::spawn(move || {
            while let Ok(event) = rx.recv() {
                // Filter out non-essential noisy paths
                let is_ignored = event.paths.iter().any(|p| {
                    let s = p.to_string_lossy();
                    s.contains("/node_modules/")
                        || s.contains("/target/")
                        || s.contains("/.git/objects/")
                        || s.contains("/.git/logs/")
                        || s.ends_with(".lock")
                });

                if is_ignored {
                    continue;
                }

                // Debounce: minimum 250ms between emitted events
                let mut guard = last_emit_clone.lock().unwrap();
                let now = Instant::now();
                if now.duration_since(*guard) >= Duration::from_millis(250) {
                    *guard = now;
                    let _ = app_handle.emit("repo-fs-changed", ());
                }
            }
        });

        *watcher_guard = Some(watcher);
        *path_guard = Some(new_path);

        Ok(())
    }
}
