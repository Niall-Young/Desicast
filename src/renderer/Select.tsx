import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckRegular, DownRegular } from "@mingcute/react/core-regular";

type SelectProps = {
  items: { value: string; label: string }[];
  value: string | null;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  "aria-label": string;
};

// Application composition: Base UI selection with the upstream Nico Input appearance.
export function Select({
  items,
  value,
  onValueChange,
  disabled,
  placeholder,
  "aria-label": label,
}: SelectProps) {
  return (
    <div data-slot="select-wrapper" className="w-full min-w-0">
      <SelectPrimitive.Root
        items={items}
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          if (next !== null) onValueChange(next);
        }}
      >
        <SelectPrimitive.Trigger
          aria-label={label}
          data-slot="select-trigger"
          className="flex h-8 w-full min-w-0 items-center gap-2 rounded-(--nico-border-radius-sm) border-0 bg-(--nico-color-background-input) px-3 text-left text-sm font-normal text-(--nico-color-text) outline-none enabled:hover:bg-(--nico-color-background-input-hover) focus-visible:bg-(--nico-color-background-input) focus-visible:shadow-(--nico-effect-focused-input) data-popup-open:shadow-(--nico-effect-focused-input) disabled:cursor-not-allowed disabled:bg-(--nico-color-background-disabled) disabled:text-(--nico-color-text-disabled)"
        >
          <SelectPrimitive.Value
            placeholder={placeholder}
            className="min-w-0 flex-1 truncate data-placeholder:text-(--nico-color-text-disabled)"
          />
          <SelectPrimitive.Icon
            data-slot="select-icon"
            className="shrink-0 text-(--nico-color-icon-subtlest)"
          >
            <DownRegular size={16} aria-hidden="true" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Positioner
            align="start"
            sideOffset={4}
            alignItemWithTrigger={false}
            collisionPadding={8}
            className="z-50"
          >
            <SelectPrimitive.Popup
              data-slot="select-popup"
              className="nico-effect-shadow-medium w-(--anchor-width) max-w-[calc(100vw-16px)] max-h-(--available-height) overflow-y-auto rounded-(--nico-border-radius-md) border border-(--nico-color-border) bg-(--nico-color-surface-raised) p-1 text-sm text-(--nico-color-text) outline-none origin-[var(--transform-origin)] transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 motion-reduce:transition-none"
            >
              <SelectPrimitive.List>
                {items.map((item) => (
                  <SelectPrimitive.Item
                    key={item.value}
                    value={item.value}
                    className="flex min-h-8 cursor-default items-center gap-2 rounded-(--nico-border-radius-sm) px-3 outline-none data-highlighted:bg-(--nico-color-interaction-hover)"
                  >
                    <SelectPrimitive.ItemText className="min-w-0 flex-1 truncate">
                      {item.label}
                    </SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator>
                      <CheckRegular size={16} aria-hidden="true" />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.List>
            </SelectPrimitive.Popup>
          </SelectPrimitive.Positioner>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}
