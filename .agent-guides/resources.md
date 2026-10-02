---
description: Use when changing repository synchronization, SVG handling, caching, or resource exports.
---

# Resources

Synchronize only configured HTTPS repositories and selected branches/directories. Publish a complete snapshot atomically after successful validation; retain previous data on failure. Record the commit SHA and use source-qualified stable IDs.

Treat SVG as untrusted input. Reject executable markup and external references before preview or export. Keep artwork geometry, colors, gradients and local references. Namespace internal IDs in repeated web components.

HTML, React and Vue exports must work without an Iconcast runtime dependency. SwiftUI exports contain an SVG image set with Contents.json and Image usage; distinguish asset import from runtime SVG parsing.
