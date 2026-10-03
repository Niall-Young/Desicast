# Gendesign source provenance

Source: https://github.com/Niall-Young/Gendesign-Design-system

Revision: `af09961698140b80b0a5a06f3170896a76c8032d`

Imported UI components, their transitive component dependencies, `lib/utils.ts`, Nico tokens, and the upstream theme mapping retain their APIs and appearance. Update deliberately and review upstream instructions. The source repository declares no license; it is incorporated at its owner's request. Dependency licenses remain applicable.

## Consumption and verification

Icon source actions use the upstream LinkButton with its link color, default size, transparent background, and hover underline. GitHub actions use the MingCute brand icon. Application layout does not override LinkButton appearance or interaction states.

[gendesign-provenance.json](gendesign-provenance.json) records raw upstream and formatting-normalized SHA-256 checksums for the imported controls and their assets at the revision above. `npm test` checks normalized source fidelity. Message's `cn` import uses the equivalent `lib/utils.ts` re-export; this is the only recorded source adaptation.

Library options use Base UI Checkbox and Radio/RadioGroup primitives with a trailing MingCute check mark. The imported Checkbox and Radio controls do not support borderless menu rows at this revision; this application composition preserves selection and keyboard semantics without repainting their internal slots. Repository directories use upstream TreeSelect/Tree with `multiple`: Cascader at this revision selects a single leaf and cannot preserve directory multiselection. The adapter only builds repository nodes and enforces the whole-repository and 20-directory rules. Inputs, password visibility, Tabs and popover motion retain upstream implementations.

NativeSelect is prohibited and is not imported. The application Select composes Base UI Select for flat single selection; its trigger uses the Nico Input background, borderless outline, radius, 32px height and focus/disabled tokens, plus a trailing MingCute dropdown arrow. It is an application composition, not an imported upstream Select. Repository directories continue to use the upstream multiselect TreeSelect.

This revision has no Segmented, Menu or ContextMenu component. Grid/list, export format and MCP client selection use its actual Tabs; these Tabs have background transitions but no moving selection indicator. Action popups compose upstream Popover and Button. Right-click menus require Base UI ContextMenu for trigger, focus and keyboard semantics, and render upstream Button for action appearance. These are application compositions, not upstream menu components. Application CSS must not repaint imported controls' internal appearance or hide their built-in icons.

Desktop component checks use controlled repository metadata through Electron IPC; the core integration test exercises real HTTPS Git with a local repository. These UI fixtures do not verify current public GitHub availability.
