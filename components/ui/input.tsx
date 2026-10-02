import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "cn";
import {
  InputBase,
  inputAccessoryClassName,
} from "@/components/ui/internal/input-base";
import { InputClear } from "@/components/ui/internal/input-clear";

type InputProps = Omit<
  React.ComponentProps<typeof InputPrimitive>,
  "className" | "size" | "prefix" | "type" | "readOnly" | "disabled"
> & {
  className?: string;
  /** Classes for the complete control, including prefix and suffix. */
  wrapperClassName?: string;
  /** Nico control height: 28, 32 or 40px. */
  size?: "sm" | "md" | "lg";
  /** Native input width in characters. */
  htmlSize?: number;
  /** Any React content, including interactive controls such as Select. */
  prefix?: React.ReactNode;
  /** Any React content; interactive children own their state and accessibility. */
  suffix?: React.ReactNode;
  /** Show the clear action on hover or focus when text is present. */
  clearAll?: boolean;
  clearLabel?: string;
  negative?: boolean;
  /** Non-interactive display with readable text. Mutually exclusive with disabled. */
  readOnly?: boolean;
  /** Non-interactive display with dimmed text. Mutually exclusive with readOnly. */
  disabled?: boolean;
};

// Nico Input · Figma 37:11151. Plain text remains a separate public API.
function Input({
  size = "md",
  clearAll = true,
  clearLabel = "清空输入",
  negative = false,
  readOnly = false,
  disabled = false,
  suffix,
  ...props
}: InputProps) {
  return (
    <InputBase
      {...props}
      type="text"
      size={size}
      negative={negative}
      readOnly={readOnly}
      disabled={disabled}
      suffixContent={
        suffix != null && (
          <div
            inert={(readOnly && !disabled) || undefined}
            data-slot="input-suffix"
            className={cn(
              inputAccessoryClassName(size),
              "border-l border-(--nico-color-border)",
            )}
          >
            {suffix}
          </div>
        )
      }
      trailingAction={clearAll && <InputClear clearLabel={clearLabel} />}
    />
  );
}

export { Input };
export type { InputProps };
