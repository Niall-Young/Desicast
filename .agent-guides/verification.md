---
description: Use when testing, packaging, or handing off desktop and MCP functionality.
---

# Verification

Run relevant declared type checks, core integration tests, and build checks. For documentation-only changes, check the documentation. Desktop UI and visual verification belong to the user by default: follow AGENTS.md and run Playwright Electron tests or other app-launching UI checks only on explicit request. Report when desktop UI checks were not run. Follow the explicit-request requirement in AGENTS.md for packaging and local installation. When packaging is explicitly requested, exercise the packaged standalone MCP executable with the desktop closed.

Verify real network search separately from fixtures. Test repository add/update/delete, failed synchronization preserving old data, export fidelity and repeated component IDs. Do not label a fixture-only model test or asset structure validation as real model or Xcode validation.

Do not push or publish releases without explicit authorization. Keep generated packages and credentials out of Git. Maintain the bilingual README and applicable instructions before handoff.
