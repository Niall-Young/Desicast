"use client";

import * as React from "react";
import { cn } from "cn";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

type SwitchProps = Omit<
  React.ComponentProps<typeof SwitchPrimitive.Root>,
  "className"
> & {
  className?: string;
  /** Nico track sizes: sm 30×16, md 36×20, lg 44×24. */
  size?: "sm" | "md" | "lg";
};

function Switch({ className, size = "sm", ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center overflow-hidden rounded-(--nico-border-radius-full) border-0 bg-(--nico-color-background-neutral-subtle-press) outline-none transition-colors duration-200 ease-out data-checked:bg-(--nico-color-background-brand-intense)",
        "data-[size=sm]:h-4 data-[size=sm]:w-[30px] data-[size=sm]:p-0.5 data-[size=md]:h-5 data-[size=md]:w-9 data-[size=md]:p-1 data-[size=lg]:h-6 data-[size=lg]:w-11 data-[size=lg]:p-1",
        "focus-visible:ring-2 focus-visible:ring-(--nico-color-border-brand) focus-visible:ring-offset-2 focus-visible:ring-offset-(--nico-color-surface)",
        "data-disabled:cursor-not-allowed data-disabled:opacity-(--nico-opaque-disabled) data-disabled:transition-none data-readonly:transition-none motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-3 shrink-0 rounded-(--nico-border-radius-full) bg-(--nico-color-surface) shadow-(--nico-effect-shadow-small) transition-transform duration-200 ease-out group-data-[size=lg]/switch:size-4 group-data-[size=sm]/switch:data-checked:translate-x-[14px] group-data-[size=md]/switch:data-checked:translate-x-4 group-data-[size=lg]/switch:data-checked:translate-x-5 group-data-disabled/switch:transition-none group-data-readonly/switch:transition-none motion-reduce:transition-none"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
export type { SwitchProps };
