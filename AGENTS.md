# DesiCast

DesiCast is a macOS Electron application and independent MCP server for public and team-owned SVG icons. Both entrypoints must use the same source, search, synchronization, and export core.

## Project rules

- Use the user's Gendesign component source and Nico tokens for the desktop UI. Preserve upstream APIs and record the imported revision. Application controls use MingCute; library icons retain their original artwork.
- Never import, implement, or use NativeSelect. Do not recreate it with a native HTML select; use the shared Select with the Nico Input appearance and a trailing dropdown arrow.
- Hard constraint: Chinese UI copy must never end with a full stop (`。` or `.`), including labels, descriptions, placeholders, tooltips, notifications, dialogs, and error messages.
- Keep credentials outside ordinary configuration, repository URLs, logs, and MCP responses. Use macOS Keychain in production.
- Repository synchronization is read-only. Do not execute scripts or hooks from icon repositories.
- Keep SVG as the canonical artwork and preserve source provenance in exported results.

## Instruction discovery

Before changes, determine applicable root and nested AGENTS.md scopes, inspect adjacent `.agent-guides` entries, read their descriptions, and load only guides relevant to the task. Follow conditional references only when their stated conditions apply.

## Development

Use npm and the committed lockfile. `npm run dev` launches Electron with Vite. Run `npm run typecheck` and `npm test` after relevant code changes, and `npm run build` when build verification is needed. Documentation-only changes need only documentation checks. `npm run package` creates local macOS artifacts. Packaging and desktop UI automation must run sequentially because native packaging utilities can interfere with window focus.

The user performs desktop UI and visual verification themselves. Do not automatically run `npm run test:ui`, Playwright Electron tests, or equivalent desktop UI automation; these launch real application windows and simulate interactions. Do not launch or focus the application for verification, including through `npm run dev`. Run desktop UI automation or launch the app for verification only when the user explicitly requests it; a general request to implement, fix, build, or test does not authorize this. When UI automation is explicitly requested, build first with `npm run build`. Report skipped desktop UI checks honestly without treating them as a completion blocker. Do not automatically package release artifacts or install the application locally after changes or verification. Run packaging or local installation only when the user explicitly requests that action; a request to implement, fix, build, or test does not authorize either action. This restriction does not disable gitwork: after implementation and required verification, follow gitwork to commit isolated task changes; if a safe commit cannot be created, report the specific reason.

## Personal bookmark knowledge

Use `$chrome-bookmark-knowledge` only when the user explicitly asks to search, inspect, browse, or use their Chrome bookmarks or saved bookmark knowledge. Do not invoke it automatically for public-web research, recommendations, comparisons, resource discovery, supplied URLs, or general requests for personal knowledge. When the user explicitly requests bookmark use and also supplies URLs, process the supplied URLs first, then search bookmarks if still relevant.
