import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "cn";
import type { InputProps } from "@/components/ui/input";

type InputBaseProps = Omit<InputProps, "clearAll" | "clearLabel" | "suffix"> & {
  type: "text" | "password" | "search";
  leadingContent?: React.ReactNode;
  trailingAction?: React.ReactNode;
  suffixContent?: React.ReactNode;
};

const inputPadding = { sm: "px-[10px]", md: "px-3", lg: "px-4" };

function inputAccessoryClassName(size: NonNullable<InputProps["size"]>) {
  return cn(
    "flex h-full shrink-0 items-center text-(--nico-color-text-subtle) group-has-[>[data-slot=input-control]>[data-slot=input]:disabled:not([readonly])]/input:text-(--nico-color-text-disabled)",
    inputPadding[size],
  );
}

// Shared Nico input structure. Base UI owns native value and Field state.
function InputBase({
  className,
  wrapperClassName,
  size = "md",
  htmlSize,
  prefix,
  suffixContent,
  type,
  leadingContent,
  trailingAction,
  negative = false,
  placeholder,
  readOnly: readOnlyProp = false,
  disabled = false,
  ...props
}: InputBaseProps) {
  const readOnly = readOnlyProp && !disabled;
  const padding = inputPadding[size];

  return (
    <div
      data-slot="input-wrapper"
      data-size={size}
      className={cn(
        "group/input flex w-full min-w-0 items-center rounded-(--nico-border-radius-sm) bg-(--nico-color-background-input) text-sm font-normal text-(--nico-color-text)",
        "[&:not(:focus-within):has(>[data-slot=input-control]>[data-slot=input]:enabled:read-write):hover]:bg-(--nico-color-background-input-hover) focus-within:bg-(--nico-color-background-input) focus-within:shadow-(--nico-effect-focused-input)",
        "has-[>[data-slot=input-control]>[data-slot=input][aria-invalid=true]]:shadow-(--nico-effect-focused-negative) has-[>[data-slot=input-control]>[data-slot=input][data-invalid]]:shadow-(--nico-effect-focused-negative)",
        "has-[>[data-slot=input-control]>[data-slot=input]:disabled]:bg-(--nico-color-background-disabled) has-[>[data-slot=input-control]>[data-slot=input][readonly]]:bg-(--nico-color-background-disabled)",
        { sm: "h-7", md: "h-8", lg: "h-10" }[size],
        wrapperClassName,
      )}
    >
      {prefix != null && (
        <div
          inert={readOnly || undefined}
          data-slot="input-prefix"
          className={cn(
            inputAccessoryClassName(size),
            "border-r border-(--nico-color-border)",
          )}
        >
          {prefix}
        </div>
      )}
      <div
        data-slot="input-control"
        className={cn("flex h-full min-w-0 flex-1 items-center gap-2", padding)}
      >
        {leadingContent}
        <InputPrimitive
          {...props}
          type={type}
          readOnly={readOnly}
          disabled={disabled || readOnly}
          size={htmlSize}
          placeholder={placeholder || " "}
          aria-invalid={negative || props["aria-invalid"]}
          data-slot="input"
          className={cn(
            "h-full w-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-normal text-(--nico-color-text) outline-none",
            "focus:placeholder:opacity-0 disabled:cursor-not-allowed [&:disabled:not([readonly])]:text-(--nico-color-text-disabled)",
            "selection:bg-(--nico-color-background-brand-intense) selection:text-(--nico-color-text-inverted)",
            readOnly
              ? "placeholder:text-(--nico-color-text)"
              : "placeholder:text-(--nico-color-text-disabled)",
            className,
          )}
        />
        {trailingAction}
      </div>
      {suffixContent}
    </div>
  );
}

export { InputBase, inputAccessoryClassName };
