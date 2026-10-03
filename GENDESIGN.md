# Gendesign source provenance

Source: https://github.com/Niall-Young/Gendesign-Design-system

Revision: `af09961698140b80b0a5a06f3170896a76c8032d`

Imported UI components, their transitive component dependencies, `lib/utils.ts`, Nico tokens, and the upstream theme mapping retain their APIs and appearance. Update deliberately and review upstream instructions. The source repository declares no license; it is incorporated at its owner's request. Dependency licenses remain applicable.

## Consumption and verification

[gendesign-provenance.json](gendesign-provenance.json) records raw upstream and formatting-normalized SHA-256 checksums for the imported controls and their assets at the revision above. `npm test` checks normalized source fidelity. Message's `cn` import uses the equivalent `lib/utils.ts` re-export; this is the only recorded source adaptation.

Filtering uses upstream Checkbox, with RadioGroup/Radio for sorting. Repository directories use upstream TreeSelect/Tree with `multiple`: Cascader at this revision selects a single leaf and cannot preserve directory multiselection. The adapter only builds repository nodes and enforces the whole-repository and 20-directory rules. Inputs, password visibility, select arrows, Tabs and popover motion retain upstream implementations.

This revision has no Segmented, Menu or ContextMenu component. Grid/list, export format and MCP client selection use its actual Tabs; these Tabs have background transitions but no moving selection indicator. Action popups compose upstream Popover and Button. Right-click menus require Base UI ContextMenu for trigger, focus and keyboard semantics, and render upstream Button for action appearance. These are application compositions, not upstream menu components. Application CSS must not repaint imported controls' internal appearance or hide their built-in icons.

Desktop component checks use controlled repository metadata through Electron IPC; the core integration test exercises real HTTPS Git with a local repository. These UI fixtures do not verify current public GitHub availability.
