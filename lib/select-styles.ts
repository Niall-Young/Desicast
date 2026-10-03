// Shared Nico appearance for flat and hierarchical selection controls.
export const selectTriggerClass =
  "flex w-full min-w-0 items-center gap-2 rounded-(--nico-border-radius-sm) border-0 bg-(--nico-color-background-input) px-3 text-left text-sm font-normal text-(--nico-color-text) outline-none enabled:hover:bg-(--nico-color-background-input-hover) focus-visible:bg-(--nico-color-background-input) focus-visible:shadow-(--nico-effect-focused-input) data-popup-open:shadow-(--nico-effect-focused-input) disabled:cursor-not-allowed disabled:bg-(--nico-color-background-disabled) disabled:text-(--nico-color-text-disabled)";
export const selectIconClass =
  "inline-flex size-4 shrink-0 items-center justify-center text-(--nico-color-icon-subtlest)";
export const selectPopupClass =
  "nico-effect-shadow-medium w-(--anchor-width) max-w-[calc(100vw-16px)] max-h-(--available-height) overflow-y-auto rounded-(--nico-border-radius-md) border border-(--nico-color-border) bg-(--nico-color-surface-raised) p-1 text-sm text-(--nico-color-text) outline-none origin-[var(--transform-origin)] transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 motion-reduce:transition-none";
export const selectItemClass =
  "flex cursor-default items-center gap-2 rounded-(--nico-border-radius-sm) outline-none hover:bg-(--nico-color-interaction-hover) data-highlighted:bg-(--nico-color-interaction-hover) focus-visible:shadow-(--nico-effect-focused-input)";
