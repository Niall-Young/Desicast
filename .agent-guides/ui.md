---
description: Use when implementing or changing desktop layouts, components, themes, or interaction states.
---

# Desktop UI

Use Gendesign components with their original Base UI APIs. Text actions use Button; icon-only actions use IconButton with an accessible name. Do not introduce shadcn or Radix wrappers.

Before choosing a control, inspect the exports and examples at the revision recorded in [GENDESIGN.md](../GENDESIGN.md). Reuse the component that supports the required interaction, including selection, keyboard behavior, icons and motion. Application CSS may arrange controls, but must not repaint their internal slots, hide built-in icons, or replace interaction states to imitate another component. When upstream has no matching component, record the limitation and the minimal composition in GENDESIGN.md rather than claim it is an upstream control.

Load the supplied Nico token CSS and theme mapping. New appearance uses semantic Nico variables directly; do not substitute custom palettes. Follow system appearance by default and support explicit light/dark modes.

Use an icon-focused three-pane workspace: sources, searchable grid, collapsible detail. Verify real Electron light/dark appearance, narrow windows, loading, empty/error states, and long labels.
