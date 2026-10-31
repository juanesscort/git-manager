use portable_pty::{Child, CommandBuilder, MasterPty, PtySize, native_pty_system};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

pub struct PtySession {
    pub writer: Box<dyn Write + Send>,
    pub master: Box<dyn MasterPty + Send>,
    pub child: Box<dyn Child + Send + Sync>,
}

#[derive(Default, Clone)]
pub struct TerminalManager {
    sessions: Arc<Mutex<HashMap<String, PtySession>>>,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn open_session(
        &self,
        app_handle: AppHandle,
        session_id: &str,
        cwd: &str,
        cols: u16,
        rows: u16,
    ) -> Result<(), String> {
        // Kill existing session with same ID if any
        self.close_session(session_id);

        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows: rows.max(10),
                cols: cols.max(20),
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Error abriendo PTY: {}", e))?;

        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
        let mut cmd = CommandBuilder::new(&shell);
        cmd.cwd(cwd);
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Error iniciando shell en PTY: {}", e))?;

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Error obteniendo lector de PTY: {}", e))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Error obteniendo escritor de PTY: {}", e))?;

        let session = PtySession {
            writer,
            master: pair.master,
            child,
        };

        {
            let mut guard = self.sessions.lock().unwrap();
            guard.insert(session_id.to_string(), session);
        }

        // Spawn background reader thread streaming PTY bytes into Tauri event
        let session_id_owned = session_id.to_string();
        let event_name = format!("pty-data-{}", session_id_owned);
        let sessions_clone = Arc::clone(&self.sessions);

        std::thread::spawn(move || {
            let mut buf = [0u8; 8192];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break, // EOF, process exited
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = app_handle.emit(&event_name, data);
                    }
                    Err(_) => break,
                }
            }
            // Clean up session when shell terminates
            let mut guard = sessions_clone.lock().unwrap();
            guard.remove(&session_id_owned);
        });

        Ok(())
    }

    pub fn write_session(&self, session_id: &str, data: &str) -> Result<(), String> {
        let mut guard = self.sessions.lock().unwrap();
        if let Some(session) = guard.get_mut(session_id) {
            session
                .writer
                .write_all(data.as_bytes())
                .map_err(|e| format!("Error escribiendo en PTY: {}", e))?;
            session
                .writer
                .flush()
                .map_err(|e| format!("Error haciendo flush a PTY: {}", e))?;
            Ok(())
        } else {
            Err(format!("Sesión PTY '{}' no encontrada", session_id))
        }
    }

    pub fn resize_session(&self, session_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let mut guard = self.sessions.lock().unwrap();
        if let Some(session) = guard.get_mut(session_id) {
            session
                .master
                .resize(PtySize {
                    rows: rows.max(5),
                    cols: cols.max(10),
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| format!("Error redimensionando PTY: {}", e))?;
            Ok(())
        } else {
            Err(format!("Sesión PTY '{}' no encontrada", session_id))
        }
    }

    pub fn close_session(&self, session_id: &str) {
        let mut guard = self.sessions.lock().unwrap();
        if let Some(mut session) = guard.remove(session_id) {
            let _ = session.child.kill();
        }
    }
}
