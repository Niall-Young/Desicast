# Iconcast

Iconcast is a macOS Electron application and independent MCP server for public and team-owned SVG icons. Both entrypoints must use the same source, search, synchronization, and export core.

## Project rules

- Use the user's Gendesign component source and Nico tokens for the desktop UI. Preserve upstream APIs and record the imported revision. Application controls use MingCute; library icons retain their original artwork.
- Keep credentials outside ordinary configuration, repository URLs, logs, and MCP responses. Use macOS Keychain in production.
- Repository synchronization is read-only. Do not execute scripts or hooks from icon repositories.
- Keep SVG as the canonical artwork and preserve source provenance in exported results.

## Instruction discovery

Before changes, determine applicable root and nested AGENTS.md scopes, inspect adjacent `.agent-guides` entries, read their descriptions, and load only guides relevant to the task. Follow conditional references only when their stated conditions apply.

## Development

Use npm and the committed lockfile. `npm run dev` launches Electron with Vite. Run `npm run typecheck`, `npm test`, and `npm run test:ui` after relevant changes; UI checks need a current `npm run build`. `npm run package` creates local macOS artifacts. Packaging and desktop UI automation must run sequentially because native packaging utilities can interfere with window focus.

## Personal bookmark knowledge

Use `$chrome-bookmark-knowledge` only when the user explicitly asks to search, inspect, browse, or use their Chrome bookmarks or saved bookmark knowledge. Do not invoke it automatically for public-web research, recommendations, comparisons, resource discovery, supplied URLs, or general requests for personal knowledge. When the user explicitly requests bookmark use and also supplies URLs, process the supplied URLs first, then search bookmarks if still relevant.
