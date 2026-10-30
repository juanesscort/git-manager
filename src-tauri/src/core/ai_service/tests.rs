use super::prompts::templates::commit::{COMMIT_SYSTEM_PROMPT as SYSTEM_PROMPT, build_commit_user_prompt as build_user_prompt};
use super::sanitizer::sanitize_git_diff;

#[test]
fn test_sanitizer_removes_sensitive_files() {
    let mock_diff = r#"diff --git a/.env b/.env
new file mode 100644
--- /dev/null
+++ b/.env
@@ -0,0 +1,2 @@
+DATABASE_PASSWORD=super_secret_123
+AWS_SECRET_KEY=AKIAIOSFODNN7EXAMPLE
diff --git a/src/main.rs b/src/main.rs
--- a/src/main.rs
+++ b/src/main.rs
@@ -1,1 +1,2 @@
+// Added feature
"#;

    let sanitized = sanitize_git_diff(mock_diff);

    assert!(!sanitized.contains("super_secret_123"));
    assert!(!sanitized.contains("AKIAIOSFODNN7EXAMPLE"));
    assert!(sanitized.contains("CONTENIDO DEL ARCHIVO EXCLUIDO POR SEGURIDAD"));
    assert!(sanitized.contains("+// Added feature"));
}

#[test]
fn test_sanitizer_omits_lockfiles() {
    let mock_diff = r#"diff --git a/Cargo.lock b/Cargo.lock
index abc..def 100644
--- a/Cargo.lock
+++ b/Cargo.lock
@@ -10,3 +10,3 @@
-version = "0.1.0"
+version = "0.2.0"
diff --git a/src/lib.rs b/src/lib.rs
--- a/src/lib.rs
+++ b/src/lib.rs
@@ -1 +1 @@
+pub fn test() {}
"#;

    let sanitized = sanitize_git_diff(mock_diff);

    assert!(!sanitized.contains("version = \"0.2.0\""));
    assert!(sanitized.contains("DETALLE DE DEPENDENCIAS LOCKFILE OMITIDO"));
    assert!(sanitized.contains("pub fn test() {}"));
}

#[test]
fn test_prompt_building() {
    let prompt = build_user_prompt("diff test");
    assert!(prompt.contains("Conventional Commit"));
    assert!(prompt.contains("diff test"));
    assert!(SYSTEM_PROMPT.contains("Conventional Commits"));
    assert!(SYSTEM_PROMPT.contains("PROHIBIDO EL USO DE CUALQUIER EMOJI"));
}

#[test]
fn test_prompt_registry_pull_request_without_emojis() {
    use super::prompts::{AiPromptRegistry, AiTaskKind, PromptContext};

    let ctx =
        PromptContext::for_pull_request("diff test between branches", "feature/auth", "main", &[]);
    let user_prompt = AiPromptRegistry::user_prompt(AiTaskKind::PullRequest, &ctx);
    let sys_prompt = AiPromptRegistry::system_prompt(AiTaskKind::PullRequest);

    assert!(user_prompt.contains("feature/auth"));
    assert!(user_prompt.contains("main"));
    assert!(user_prompt.contains("sin ningún emoji ni icono"));
    assert!(sys_prompt.contains("PROHIBIDO EL USO DE CUALQUIER EMOJI"));
    // Ensure no emojis like 📌 or 🚀 are in the prompt definition
    assert!(!sys_prompt.contains("📌"));
    assert!(!sys_prompt.contains("🚀"));
    assert!(!user_prompt.contains("📌"));
    assert!(!user_prompt.contains("🚀"));
}

#[test]
fn test_fallback_chain() {
    use super::gemini::GeminiProvider;
    let provider = GeminiProvider::new(
        "test_key".to_string(),
        Some("gemini-3.5-flash-lite".to_string()),
    );
    assert_eq!(provider.model, "gemini-3.5-flash-lite");
}
