import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckRegular, DownRegular } from "@mingcute/react/core-regular";

import { Checkbox } from "@/components/ui/checkbox";
import {
  selectTriggerClass,
  selectIconClass,
  selectPopupClass,
  selectItemClass,
} from "@/lib/select-styles";

type SelectProps = {
  items: { value: string; label: string }[];
  disabled?: boolean;
  placeholder?: string;
  "aria-label": string;
} & (
  | {
      multiple?: false;
      value: string | null;
      onValueChange: (value: string) => void;
    }
  | {
      multiple: true;
      value: string[];
      onValueChange: (value: string[]) => void;
    }
);

// Application composition: Base UI selection with the upstream Nico Input appearance.
export function Select({
  items,
  value,
  multiple = false,
  onValueChange,
  disabled,
  placeholder,
  "aria-label": label,
}: SelectProps) {
  return (
    <div data-slot="select-wrapper" className="w-full min-w-0">
      <SelectPrimitive.Root
        items={items}
        multiple={multiple}
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          if (multiple)
            (onValueChange as (value: string[]) => void)(next as string[]);
          else if (next !== null)
            (onValueChange as (value: string) => void)(next as string);
        }}
      >
        <SelectPrimitive.Trigger
          aria-label={label}
          data-slot="select-trigger"
          className={`${selectTriggerClass} h-8`}
        >
          <SelectPrimitive.Value
            placeholder={placeholder}
            className="min-w-0 flex-1 truncate data-placeholder:text-(--nico-color-text-disabled)"
          >
            {multiple
              ? () =>
                  (value as string[])
                    .map(
                      (key) =>
                        items.find((item) => item.value === key)?.label ?? key,
                    )
                    .join(", ") || placeholder
              : undefined}
          </SelectPrimitive.Value>
          <SelectPrimitive.Icon
            data-slot="select-icon"
            className={selectIconClass}
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
              className={selectPopupClass}
            >
              <SelectPrimitive.List>
                {items.map((item) => (
                  <SelectPrimitive.Item
                    key={item.value}
                    value={item.value}
                    className={`${selectItemClass} min-h-8 px-3`}
                  >
                    {multiple && (
                      <Checkbox
                        checked={(value as string[]).includes(item.value)}
                        readOnly
                        tabIndex={-1}
                        aria-hidden="true"
                        className="pointer-events-none"
                      />
                    )}
                    <SelectPrimitive.ItemText className="min-w-0 flex-1 truncate">
                      {item.label}
                    </SelectPrimitive.ItemText>
                    {!multiple && (
                      <SelectPrimitive.ItemIndicator>
                        <CheckRegular size={16} aria-hidden="true" />
                      </SelectPrimitive.ItemIndicator>
                    )}
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
