use crate::core::terminal_engine::TerminalManager;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn pty_open_session_cmd(
    app: AppHandle,
    state: State<'_, TerminalManager>,
    session_id: String,
    cwd: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    state.open_session(app, &session_id, &cwd, cols, rows)
}

#[tauri::command]
pub async fn pty_write_cmd(
    state: State<'_, TerminalManager>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    state.write_session(&session_id, &data)
}

#[tauri::command]
pub async fn pty_resize_cmd(
    state: State<'_, TerminalManager>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    state.resize_session(&session_id, cols, rows)
}

#[tauri::command]
pub async fn pty_close_session_cmd(
    state: State<'_, TerminalManager>,
    session_id: String,
) -> Result<(), String> {
    state.close_session(&session_id);
    Ok(())
}
