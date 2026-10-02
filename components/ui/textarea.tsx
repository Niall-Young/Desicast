import * as React from "react";
import { Field } from "@base-ui/react/field";
import { cn } from "cn";

type TextareaProps = Omit<
  React.ComponentProps<"textarea">,
  "disabled" | "readOnly"
> & {
  /** Non-interactive display with readable text. Mutually exclusive with disabled. */
  readOnly?: boolean;
  /** Non-interactive display with dimmed text. Takes precedence over readOnly. */
  disabled?: boolean;
  /** Apply Nico's negative outline and mark the control invalid. */
  negative?: boolean;
  /** Minimum visible lines, between 3 and 10. Content grows up to 10 lines. */
  rows?: number;
  /** Base UI value change callback, for controlled or uncontrolled usage. */
  onValueChange?: Field.Control.Props["onValueChange"];
};

// Nico Input Area · Figma 39:15741. Field.Control owns editing and validation.
function Textarea({
  className,
  readOnly = false,
  disabled = false,
  negative = false,
  rows = 3,
  style,
  ref,
  id,
  name,
  value,
  defaultValue,
  onValueChange,
  required,
  autoFocus,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: TextareaProps) {
  const isReadOnly = readOnly && !disabled;

  return (
    <Field.Control
      id={id}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      required={required}
      autoFocus={autoFocus}
      readOnly={isReadOnly}
      disabled={disabled || isReadOnly}
      aria-invalid={negative || ariaInvalid}
      aria-describedby={ariaDescribedBy}
      {...(ariaLabelledBy !== undefined && {
        "aria-labelledby": ariaLabelledBy,
      })}
      data-slot="textarea"
      render={<textarea {...props} ref={ref} rows={rows} />}
      className={cn(
        "block field-sizing-content max-h-[230px] w-full min-w-0 resize-y overflow-y-auto rounded-(--nico-border-radius-sm) border border-(--nico-color-border-opaque) bg-(--nico-color-background-input) px-[11px] py-1 text-sm font-normal text-(--nico-color-text) outline-none",
        "[&:enabled:read-write:not(:focus):hover]:bg-(--nico-color-background-input-hover) focus:bg-(--nico-color-background-input) focus:shadow-(--nico-effect-focused-input) focus:placeholder:opacity-0",
        "aria-invalid:shadow-(--nico-effect-focused-negative) data-invalid:shadow-(--nico-effect-focused-negative)",
        "disabled:cursor-not-allowed disabled:bg-(--nico-color-background-disabled) [&:disabled:not([readonly])]:text-(--nico-color-text-disabled)",
        "selection:bg-(--nico-color-background-brand-intense) selection:text-(--nico-color-text-inverted)",
        isReadOnly
          ? "placeholder:text-(--nico-color-text)"
          : "placeholder:text-(--nico-color-text-disabled)",
        className,
      )}
      style={{
        minHeight: `calc(${Math.max(3, Math.min(rows, 10))} * var(--nico-line-height-sm) + 10px)`,
        ...style,
      }}
    />
  );
}

export { Textarea };
export type { TextareaProps };
