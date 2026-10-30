# Git-Manager: Reglas y Directrices de Desarrollo

Este documento define las reglas de ingeniería, estándares de calidad y restricciones de seguridad obligatorias para el desarrollo de **Git-Manager**.

---

## 1. Visión y Alcance del Proyecto
* **Producto:** Cliente de escritorio nativo de Git y GitHub para uso personal.
* **Stack Tecnológico:**
  * **Backend Core:** **Rust** puro (`libgit2` vía `git2-rs`, cliente GitHub, motor IA, motor 3-way merge).
  * **Puente de Aplicación:** **Tauri v2** (IPC asíncrono tipado).
  * **Frontend:** **React + TypeScript + Vite + Tailwind CSS** (renderizado acelerado por WebKitGTK en Linux).
* **Pilares Fundamentales:**
  1. Soporte completo e ilimitado para repositorios privados y públicos de GitHub (cero paywalls).
  2. Grafo interactivo y visual de ramas y commits (estética moderna estilo GitKraken).
  3. Asistente inteligente de commits con IA (análisis de *staged diffs*).
  4. Resolvedor visual de conflictos de 3 vías (*3-way merge*).

---

## 2. Arquitectura Modular y Reutilización de Código

Tanto el backend como el frontend deben seguir un diseño modular estricto y desacoplado:

### 2.1. Backend en Rust (Modular por Dominios)
* **Principio de Responsabilidad Única:** Cada módulo en `core/` debe ser completamente autónomo y no tener conocimiento de Tauri ni del frontend:
  * `core/git_engine`: Operaciones locales de Git (status, staging, diffs, commits, revwalk).
  * `core/github_client`: Interacción con la API de GitHub (auth, repos privados, PRs).
  * `core/ai_service`: Conectores de IA para generación de commits.
  * `core/conflict_resolver`: Detección y fusión de 3 vías.
* **Reutilización mediante Traits:** Definir traits comunes para proveedores de IA o estrategias de autenticación para intercambiar implementaciones sin alterar la lógica de negocio.
* **Capa IPC Delgada (`ipc/`):** Los comandos de Tauri solo deserializan parámetros, llaman al core y devuelven DTOs serializables. No debe existir lógica de negocio dentro de `ipc/`.

### 2.2. Frontend en React + TypeScript (Feature-Driven & Componentes Reutilizables)
* **Componentes UI Reutilizables (`src/components/ui/`):**
  * Los componentes visuales base (botones, modales, dropdowns, inputs, tabs, splitters, badges) deben ser genéricos, reutilizables y sin lógica acoplada a Git.
* **Estructura por Módulos/Funcionalidades (`src/features/`):**
  * Cada funcionalidad compleja se agrupa en su propia carpeta con sus componentes, hooks y estado específicos:
    * `features/commit-graph`: Grafo interactivo de ramas y lista virtualizada de commits.
    * `features/staging-area`: Panel de archivos preparados/no preparados y visor de diffs.
    * `features/ai-assistant`: Modal/panel de sugerencia y edición de commits con IA.
    * `features/conflict-resolver`: Visor interactivo de 3 paneles para resolver conflictos.
* **Custom Hooks para IPC (`src/hooks/`):**
  * Toda llamada `invoke()` de Tauri debe encapsularse en hooks de React reutilizables (ej. `useRepoStatus`, `useAiCommit`) con estados de carga (`isLoading`), datos (`data`) y errores (`error`).

---

## 3. Estándares del Core en Rust

### 3.1. Manejo de Errores y Robustez
* **Prohibido el uso de `.unwrap()` y `expect()` en código de producción**: Todo error debe propagarse o gestionarse explícitamente mediante tipos `Result<T, E>`.
* **Tipado de errores:** Utilizar `thiserror` para errores de dominio en el Core y `anyhow` exclusivamente en tests o scripts auxiliares.
* **Resiliencia ante bloqueos:** Toda interacción con el repositorio Git debe considerar la existencia de `.git/index.lock` y fallar con mensajes comprensibles sin corromper el árbol de Git.

---

## 4. Seguridad y Privacidad de Datos

### 4.1. Gestión de Credenciales
* **Prohibido almacenar secretos en texto plano:** Ni tokens de GitHub (PAT), ni contraseñas, ni claves privadas deben escribirse en archivos de configuración planos ni en logs.
* **Almacenamiento seguro:** Utilizar `keyring-rs` para delegar la custodia de credenciales al servicio nativo del sistema operativo (Secret Service API / GNOME Keyring en Linux).
* **Autenticación SSH:** Priorizar el uso de `ssh-agent` del sistema operativo para operaciones Git con llaves SSH en lugar de manipular passphrases en crudo.

### 4.2. Sanitización para Inteligencia Artificial
* **Filtrado previo al envío de diffs:** Antes de enviar el contenido de un diff a una API de IA:
  * Excluir archivos sensibles (ej. `.env`, `.pem`, `.key`, `id_rsa`, credenciales detectadas).
  * Omitir archivos binarios y ficheros generados/minimizados (`package-lock.json`, `Cargo.lock`, etc.).
  * Limitar la longitud máxima del payload para evitar agotar la ventana de contexto o incurrir en costes innecesarios.

---

## 5. Frontend y Experiencia de Usuario (UI/UX)

* **Rendimiento visual:** El grafo de ramas y commits debe utilizar renderizado eficiente (Canvas virtualizado o SVG optimizado con `@tanstack/react-virtual`) para garantizar 60 FPS en repositorios grandes.
* **Tipado estricto:** Todo el código del frontend debe estar escrito en TypeScript estricto, sin uso de `any` injustificado.
* **Estado reactivo:** El estado de los archivos (staged/unstaged) debe mantenerse sincronizado con el disco sin polling agresivo.

---

## 6. Metodología de Trabajo

1. **Desarrollo Incremental:** No se inicia una nueva fase sin haber probado y verificado la fase anterior.
2. **Pruebas Automatizadas:** Cada módulo del Core en Rust debe contar con tests unitarios e integrados utilizando repositorios temporales (`tempfile`).
3. **Calidad de Código:** Ejecutar de forma regular:
   * `cargo clippy -- -D warnings`
   * `cargo fmt --check`
   * `npm run lint` / `tsc --noEmit`
4. **Cero Archivos Basura y Limpieza Automática Obligatoria:** Queda terminantemente prohibido dejar archivos de prueba, scripts temporales, código huérfano o recursos de un solo uso en el repositorio. Todo script o archivo temporal generado para diagnosticar o verificar debe eliminarse de inmediato y de forma automática al finalizar su ejecución, garantizando que el árbol de trabajo permanezca 100% libre de residuos.

---

## 7. Comunicación y Estilo de Respuestas
* **Prohibidas las explicaciones extensas y el palabreo:** Toda respuesta debe ser estrictamente puntual, directa al grano y concisa.
* **Claridad ante todo:** Las respuestas deben ser técnicas, nítidas, bien formateadas y fáciles de entender sin rodeos innecesarios.
