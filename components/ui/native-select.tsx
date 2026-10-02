import * as React from "react";
import { cn } from "cn";
import { DownRegular } from "@mingcute/react/core-regular";

function NativeSelect({
  className,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"select">, "size"> & { size?: "sm" | "default" }) {
  return (
    <div
      className="group/native-select relative w-fit has-[select:disabled]:opacity-(--nico-opaque-disabled)"
      data-slot="native-select-wrapper"
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          "h-9 w-full min-w-0 appearance-none rounded-md border border-(--nico-color-border-intense) bg-(--nico-color-background-input) hover:bg-(--nico-color-background-input-hover) disabled:bg-(--nico-color-background-input-disabled) px-3 py-2 pr-9 text-sm transition-[color,box-shadow] outline-none selection:bg-(--nico-color-background-brand-intense) selection:text-(--nico-color-text-inverted) placeholder:text-(--nico-color-text-subtle) disabled:pointer-events-none disabled:cursor-not-allowed data-[size=sm]:h-8 data-[size=sm]:py-1",
          "focus-visible:border-(--nico-color-border-brand) focus-visible:ring-1 focus-visible:ring-(--nico-color-border-brand)",
          "aria-invalid:border-(--nico-color-background-negative-intense) aria-invalid:ring-(--nico-color-background-negative-intense)",
          className,
        )}
        {...props}
      />
      <DownRegular
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-(--nico-color-text-subtle) opacity-50 select-none"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  );
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn("bg-[Canvas] text-[CanvasText]", className)}
      {...props}
    />
  );
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn("bg-[Canvas] text-[CanvasText]", className)}
      {...props}
    />
  );
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
