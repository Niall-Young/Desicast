"use client"

import * as React from "react"
import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { cn } from "@/lib/utils"
import selectedMark from "./assets/radio-selected.svg?raw"

function RadioGroup<Value = string>({
  className,
  layout = "horizontal",
  ...props
}: Omit<RadioGroupPrimitive.Props<Value>, "className"> & {
  className?: string
  /** Direction of the options. */
  layout?: "horizontal" | "vertical"
}) {
  return <RadioGroupPrimitive
    data-slot="radio-group"
    className={cn("flex", layout === "horizontal" ? "flex-wrap items-center gap-3" : "flex-col items-start gap-2", className)}
    {...props}
  />
}

function Radio({
  className,
  ...props
}: Omit<React.ComponentProps<typeof RadioPrimitive.Root>, "className" | "children"> & { className?: string }) {
  return <RadioPrimitive.Root
    data-slot="radio"
    className={cn(
      "peer relative inline-flex size-4 shrink-0 items-center justify-center rounded-(--nico-border-radius-full) border border-(--nico-color-border) bg-(--nico-color-background-input) text-(--nico-color-icon-inverted) outline-none transition-colors",
      "not-data-disabled:hover:bg-(--nico-color-background-input-hover)",
      "data-checked:not-data-disabled:border-(--nico-color-border-opaque) data-checked:bg-(--nico-color-background-brand-intense) data-checked:not-data-disabled:hover:bg-(--nico-color-background-brand-intense-hover)",
      "data-disabled:cursor-not-allowed data-disabled:border-(--nico-color-border) data-disabled:bg-(--nico-color-background-input-disabled) data-disabled:data-checked:bg-(--nico-color-background-disabled) data-disabled:text-(--nico-color-icon-disabled)",
      "focus-visible:ring-2 focus-visible:ring-(--nico-color-border-brand) focus-visible:ring-offset-2 focus-visible:ring-offset-(--nico-color-surface) aria-invalid:border-(--nico-color-background-negative-intense)",
      className
    )}
    {...props}
  >
    <RadioPrimitive.Indicator data-slot="radio-indicator" className="absolute -inset-px">
      <span aria-hidden="true" className="block size-4 [&_svg]:size-full [&_path]:fill-transparent [&_circle]:fill-current [&_circle]:[fill-opacity:1]"
        // Trusted original Figma vector; colors come from the control's Nico tokens.
        dangerouslySetInnerHTML={{ __html: selectedMark }} />
    </RadioPrimitive.Indicator>
  </RadioPrimitive.Root>
}

export { Radio, RadioGroup }
