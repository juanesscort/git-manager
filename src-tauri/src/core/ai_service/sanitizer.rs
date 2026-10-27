const MAX_DIFF_CHARS: usize = 16_000;

pub fn sanitize_git_diff(raw_diff: &str) -> String {
    if raw_diff.trim().is_empty() {
        return String::new();
    }

    let mut sanitized = String::with_capacity(raw_diff.len());
    let mut current_file_is_sensitive = false;
    let mut current_file_is_lockfile = false;

    for line in raw_diff.lines() {
        if line.starts_with("diff --git ") {
            let lower = line.to_lowercase();

            current_file_is_sensitive = lower.contains(".env")
                || lower.contains("secret")
                || lower.contains("credential")
                || lower.contains(".pem")
                || lower.contains(".key")
                || lower.contains("id_rsa")
                || lower.contains("id_ed25519")
                || lower.contains(".token");

            current_file_is_lockfile = lower.contains("cargo.lock")
                || lower.contains("package-lock.json")
                || lower.contains("pnpm-lock.yaml")
                || lower.contains("yarn.lock");

            sanitized.push_str(line);
            sanitized.push('\n');

            if current_file_is_sensitive {
                sanitized.push_str("[CONTENIDO DEL ARCHIVO EXCLUIDO POR SEGURIDAD: Posible secreto o credencial]\n");
            } else if current_file_is_lockfile {
                sanitized.push_str(
                    "[DETALLE DE DEPENDENCIAS LOCKFILE OMITIDO: Actualización de dependencias]\n",
                );
            }
            continue;
        }

        if current_file_is_sensitive || current_file_is_lockfile {
            continue;
        }

        sanitized.push_str(line);
        sanitized.push('\n');

        if sanitized.len() >= MAX_DIFF_CHARS {
            sanitized
                .push_str("\n[...DIFF TRUNCADO: Se excedió el límite de longitud segura...]\n");
            break;
        }
    }

    sanitized
}
