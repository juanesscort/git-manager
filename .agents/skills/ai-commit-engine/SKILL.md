---
name: ai-commit-engine
description: Procedures for extracting staged Git diffs, filtering sensitive information, and formatting prompts to generate Conventional Commits with AI models (Gemini API, OpenAI, or local Ollama). Use when working on AI commit generation features.
---

# AI Commit Engine Guide

This skill defines the procedures, security filters, and prompt specifications for generating intelligent commit messages using Large Language Models.

---

## 1. Diff Extraction and Sanitization Pipeline

Before any code is sent to an external or local AI model, it MUST pass through the sanitization filter:

1. **Sensitive File Blacklist:**
   Never include diffs from files matching these patterns:
   * `.env*`, `*secret*`, `*credentials*`
   * `*.pem`, `*.key`, `id_rsa*`, `id_ed25519*`
   * `*.token`
2. **Lockfiles & Generated Files:**
   * `package-lock.json`, `Cargo.lock`, `yarn.lock`, `pnpm-lock.yaml`, `composer.lock`
   * Omit diff details for these; simply notify the prompt that dependencies were updated.
3. **Payload Truncation:**
   * If a single file diff exceeds **300 lines**, summarize the changes or truncate to the first 100 lines + modification header.
   * Total prompt diff length should be capped at **4,000 tokens / ~16,000 characters** to ensure fast responses and low latency.

---

## 2. Conventional Commits Prompt Specification

The system prompt instructed to the AI model must strictly adhere to the following template:

```text
You are an expert Git assistant. Generate a concise, clear Git commit message following the Conventional Commits specification based on the provided staged git diff.

Format:
<type>(<scope optional>): <short description in imperative mood>

[optional body explaining 'what' and 'why', not 'how']

Rules:
1. Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore.
2. Short description must be lowercase and have no trailing period. Maximum 72 characters.
3. Do not invent features not present in the diff.
4. Output ONLY the raw commit message (no conversational text, no markdown backticks).
```

---

## 3. Pluggable Model Architecture

The `ai_service` module in Rust should define an asynchronous trait to allow seamless switching between providers:

```rust
#[async_trait::async_trait]
pub trait AiCommitProvider: Send + Sync {
    async fn generate_commit_message(&self, sanitized_diff: &str) -> Result<String, Box<dyn std::error::Error>>;
}
```

* **Providers to implement:**
  1. `GeminiProvider`: Direct HTTPS call to Gemini API using Google API key.
  2. `OpenAiCompatibleProvider`: Compatible with OpenAI, Groq, Mistral, and Claude proxies.
  3. `OllamaProvider`: Local HTTP endpoint (`http://localhost:11434/api/generate`) for 100% offline and private commit generation.
