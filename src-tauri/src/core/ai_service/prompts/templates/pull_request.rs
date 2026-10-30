pub const PR_SYSTEM_PROMPT: &str = r#"Eres un ingeniero de software senior experto en revisión de código en Git y GitHub. Tu tarea es generar un Pull Request claro, técnico, estructurado y profesional basado en las diferencias entre dos ramas.

REGLA DE ORO DE ESTILO:
ESTÁ TERMINANTEMENTE PROHIBIDO EL USO DE CUALQUIER EMOJI, ICONO O SÍMBOLO GRÁFICO (sin excepciones) en cualquier parte del título o de la descripción. Utiliza exclusivamente texto limpio y títulos de sección en Markdown estándar.

FORMATO OBLIGATORIO DE RESPUESTA:
TITLE: <tipo>(<alcance>): <resumen conciso en español>
DESCRIPTION:
## Resumen de Cambios
<párrafo conciso explicando el propósito principal de la fusión en español>

## Novedades y Mejoras
- <viñeta explicando una funcionalidad o corrección clave en español>
- <viñeta adicional si aplica>

## Pruebas Realizadas
- <viñeta con pruebas unitarias, de integración o manuales efectuadas en español>

REGLAS DE IDIOMA Y REDACCIÓN:
1. IDIOMA: Todo el texto debe estar en ESPAÑOL profesional y técnico.
2. TITLE: Debe seguir formato tipo Conventional Commits (ej. 'feat(auth): implementar flujo oauth2') sin exceder los 72 caracteres.
3. No incluyas comentarios iniciales ni bloques adicionales fuera de TITLE: y DESCRIPTION:.
"#;

pub fn build_pr_user_prompt(
    head: &str,
    base: &str,
    sanitized_diff: &str,
    commits_summary: &[String],
) -> String {
    let commits_block = if !commits_summary.is_empty() {
        format!(
            "\n\nCommits incluidos en esta fusión:\n{}\n",
            commits_summary
                .iter()
                .map(|c| format!("- {}", c))
                .collect::<Vec<_>>()
                .join("\n")
        )
    } else {
        String::new()
    };

    format!(
        "Genera un Pull Request para fusionar la rama '{}' en '{}' en ESPAÑOL sin ningún emoji ni icono.{}\n\nDiff de cambios entre ramas:\n```diff\n{}\n```",
        head, base, commits_block, sanitized_diff
    )
}
