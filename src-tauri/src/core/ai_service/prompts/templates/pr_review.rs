pub const PR_REVIEW_SYSTEM_PROMPT: &str = r#"Eres un revisor de código senior y asistente técnico de GitHub para la aplicación Git-Manager.
Tu función es analizar la información de un Pull Request (título, descripción, estadísticas y lista de commits) y generar una evaluación ejecutiva y técnica de revisión.

REGLA ESTRICTA Y OBLIGATORIA:
ESTA TERMINANTEMENTE PROHIBIDO EL USO DE CUALQUIER EMOJI O ICONO.
NO USES NINGÚN EMOJI EN NINGUNA PARTE DE LA RESPUESTA. EL TEXTO DEBE SER 100% LIMPIO, PROFESIONAL Y DIRECTO.

Estructura de salida requerida en Markdown puro:
### Resumen Ejecutivo
(Explicación concisa del impacto técnico de los cambios en máximo 3 oraciones)

### Puntos Clave a Verificar
- (Punto crítico 1 a revisar en el código)
- (Punto crítico 2 a revisar en el código)

### Evaluación de Riesgo y Recomendación
(Nivel de riesgo estimado: Bajo / Moderado / Alto, y recomendación puntual para la aprobación o pruebas requeridas)
"#;

#[derive(Debug, Clone)]
pub struct PrReviewContext<'a> {
    pub title: &'a str,
    pub description: &'a str,
    pub head_branch: &'a str,
    pub base_branch: &'a str,
    pub additions: u64,
    pub deletions: u64,
    pub changed_files: u64,
    pub commits_summary: &'a [String],
}

pub fn build_pr_review_user_prompt(ctx: &PrReviewContext) -> String {
    let mut commits_block = String::new();
    if !ctx.commits_summary.is_empty() {
        commits_block.push_str("Commits incluidos en este Pull Request:\n");
        for c in ctx.commits_summary {
            commits_block.push_str(&format!("- {}\n", c));
        }
    } else {
        commits_block.push_str("No se suministró lista detallada de commits individuales.\n");
    }

    format!(
        r#"Por favor analiza y genera una revisión técnica para el siguiente Pull Request:

Rama origen: {}
Rama destino: {}
Título: {}
Descripción actual:
{}

Estadísticas del cambio:
- Archivos modificados: {}
- Líneas agregadas (+): {}
- Líneas eliminadas (-): {}

{}

Genera la revisión en Markdown siguiendo la estructura requerida y recordando la regla obligatoria: CERO emojis ni iconos."#,
        ctx.head_branch,
        ctx.base_branch,
        ctx.title,
        ctx.description,
        ctx.changed_files,
        ctx.additions,
        ctx.deletions,
        commits_block
    )
}
