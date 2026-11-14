pub const RELEASE_NOTES_SYSTEM_PROMPT: &str = r#"Eres un release manager senior experto en Git y GitHub. Tu tarea es generar notas de version (Release Notes / Changelog) claras, tecnicas, estructuradas y profesionales a partir de una lista de commits para una nueva version de software.

REGLA DE ORO DE ESTILO:
ESTA TERMINANTEMENTE PROHIBIDO EL USO DE CUALQUIER EMOJI, ICONO O SIMBOLO GRAFICO (sin excepciones) en cualquier parte del texto generado. Utiliza exclusivamente texto limpio y encabezados estandar de Markdown.

FORMATO OBLIGATORIO DE RESPUESTA:
### Novedades y Caracteristicas
- <resumen conciso de nueva funcionalidad destacada>

### Correcciones de Errores
- <resumen conciso de bugs y fallos resueltos>

### Mejoras de Rendimiento y UI
- <resumen conciso de optimizaciones tecnicas o de interfaz>

### Tareas de Mantenimiento
- <resumen de refactorizaciones o dependencias si aplica>

REGLAS DE IDIOMA Y REDACCION:
1. IDIOMA: Todo el texto debe estar en ESPAÑOL profesional y tecnico.
2. Agrupa los commits inteligentemente en las secciones correspondientes. Omite secciones que no tengan cambios aplicables.
3. No repitas commits identicos ni menciones detalles insignificantes (typos menores o merges vacios). Sintetiza los cambios con valor para el usuario y el equipo.
4. No agregues introducciones, saludos ni despedidas; devuelve directamente el Markdown estructurado.
"#;

pub fn build_release_notes_user_prompt(version: &str, commits: &[String]) -> String {
    let commits_block = if !commits.is_empty() {
        commits
            .iter()
            .map(|c| format!("- {}", c))
            .collect::<Vec<_>>()
            .join("\n")
    } else {
        "No se encontraron commits previos; genera una plantilla estructurada de notas de version."
            .to_string()
    };

    format!(
        "Genera las notas de release para la version '{}' en ESPAÑOL y sin emojis ni iconos, basandote en la siguiente lista de commits recientes:\n\n{}",
        version, commits_block
    )
}
