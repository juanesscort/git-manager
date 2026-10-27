---
name: modular-architecture
description: Procedures, file tree patterns, and standards for building reusable UI components and backend domain modules in Git-Manager across React/TypeScript and Rust. Use when creating new components, features, or backend services.
---

# Modular Architecture & Reusable Component Standards

This skill defines the blueprint for designing cleanly isolated, reusable, and maintainable modules across both the React/TypeScript frontend and the Rust backend.

---

## 1. Frontend Modular Layout (React + TypeScript)

The frontend follows a **Feature-Driven Architecture** combined with an **Atomic / Primitives UI Layer**:

```text
src/
├── components/ui/             # Base reusable UI components (Agnostic of Git domain)
│   ├── Button.tsx
│   ├── Modal.tsx
│   ├── Input.tsx
│   ├── Tooltip.tsx
│   ├── Badge.tsx
│   ├── SplitPane.tsx          # Resizable split panes for GitKraken layout
│   └── Dropdown.tsx
├── features/                  # Domain-specific feature modules
│   ├── commit-graph/          # Commit graph & branch history
│   │   ├── components/
│   │   │   ├── CommitGraphCanvas.tsx
│   │   │   ├── CommitNode.tsx
│   │   │   └── BranchBadge.tsx
│   │   ├── hooks/useCommitGraph.ts
│   │   └── types.ts
│   ├── staging-area/          # Staging, unstaging & diff viewer
│   │   ├── components/
│   │   │   ├── FileList.tsx
│   │   │   ├── FileItem.tsx
│   │   │   └── MonacoDiffViewer.tsx
│   │   ├── hooks/useStaging.ts
│   │   └── types.ts
│   ├── ai-assistant/          # AI commit generation modal & diff preview
│   │   ├── components/
│   │   │   ├── AiCommitModal.tsx
│   │   │   └── PromptConfig.tsx
│   │   ├── hooks/useAiCommit.ts
│   │   └── types.ts
│   └── conflict-resolver/     # 3-Way merge interactive conflict tool
│       ├── components/
│       │   ├── ThreeWayMergeView.tsx
│       │   ├── ConflictBlock.tsx
│       │   └── MergeControls.tsx
│       ├── hooks/useConflictResolver.ts
│       └── types.ts
├── hooks/                     # Shared application hooks
│   ├── useTauriIpc.ts         # Generic type-safe IPC wrapper
│   └── useKeyboardShortcuts.ts
├── types/                     # Shared global DTOs from Rust backend
│   └── bindings.ts
├── App.tsx
└── main.tsx
```

### Reusability Rules for UI Components:
1. **Zero Domain Logic in `components/ui/`:** A `Button`, `Modal`, or `SplitPane` must never import git or backend types. They should only receive standard HTML/React props and callbacks.
2. **Prop Interface Contracts:** Every reusable component must export a well-defined TypeScript interface (e.g., `ButtonProps`).
3. **Compound Components where applicable:** For complex UI pieces like modals or splitters, use compound components (`Modal.Header`, `Modal.Body`, `Modal.Footer`) to maximize flexibility.

---

## 2. Backend Modular Layout (Rust Core)

The Rust backend is separated into pure domain libraries inside `core/` and transport adapters inside `ipc/`:

```text
src-tauri/src/
├── main.rs
├── lib.rs
├── ipc/                       # Thin Tauri commands (IPC adapters only)
│   ├── mod.rs
│   ├── git_commands.rs        # Calls core::git_engine
│   ├── github_commands.rs     # Calls core::github_client
│   ├── ai_commands.rs         # Calls core::ai_service
│   └── conflict_commands.rs   # Calls core::conflict_resolver
├── core/                      # Pure Rust domain (zero Tauri dependencies)
│   ├── mod.rs
│   ├── git_engine/            # libgit2 wrapper (status, staging, diffs, revwalk)
│   │   ├── mod.rs
│   │   ├── status.rs
│   │   ├── staging.rs
│   │   ├── diff.rs
│   │   └── history.rs
│   ├── github_client/         # GitHub REST/GraphQL API & token management
│   │   ├── mod.rs
│   │   ├── auth.rs
│   │   └── repos.rs
│   ├── ai_service/            # Pluggable AI commit generator
│   │   ├── mod.rs
│   │   ├── traits.rs          # AiCommitProvider trait
│   │   ├── gemini.rs
│   │   └── ollama.rs
│   └── conflict_resolver/     # 3-way merge detection & resolution
│       ├── mod.rs
│       ├── detector.rs
│       └── merger.rs
└── models/                    # Shared DTOs and serializable data structures
    ├── mod.rs
    ├── git_models.rs
    └── ai_models.rs
```

### Reusability Rules for Rust Modules:
1. **Traits for Extensibility:** Core services like AI or Git remotes should define traits (`AiCommitProvider`, `CredentialStore`) so implementations can be swapped or mocked in unit tests.
2. **Pure Functions:** Business logic should avoid mutating global state; prefer passing references (`&Repository`, `&Path`) and returning explicit `Result<T, CustomError>`.
3. **Dedicated DTOs:** Never serialize raw internal `git2` objects to JSON directly; map them into clean, serializable structs in `models/` before sending to the frontend.
