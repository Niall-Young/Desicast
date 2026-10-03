"use client"

import * as React from "react"
import { cn } from "cn"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import checkMark from "./assets/checkbox-check.svg?raw"
import indeterminateMark from "./assets/checkbox-indeterminate.svg?raw"
import "./checkbox.css"

// Keep injected SVG nodes stable when a parent rerenders without changing the glyph.
const CheckboxGlyph = React.memo(function CheckboxGlyph({ indeterminate }: { indeterminate: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "nico-checkbox-glyph block w-2 translate-x-[0.25px] translate-y-[0.25px]",
        indeterminate ? "h-0.5" : "h-1.5"
      )}
      // Trusted local Figma exports only; preserve the original vector paths.
      dangerouslySetInnerHTML={{ __html: indeterminate ? indeterminateMark : checkMark }}
    />
  )
})

function Checkbox({
  className,
  indeterminate,
  ...props
}: Omit<React.ComponentProps<typeof CheckboxPrimitive.Root>, "className"> & { className?: string }) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      indeterminate={indeterminate}
      className={cn(
        "peer inline-flex size-4 shrink-0 items-center justify-center rounded-(--nico-border-radius-xs) border border-(--nico-color-border) bg-(--nico-color-background-input) text-(--nico-color-border-inverted) outline-none transition-colors",
        "not-data-disabled:hover:bg-(--nico-color-background-input-hover)",
        "data-checked:not-data-disabled:border-(--nico-color-border-opaque) data-checked:bg-(--nico-color-background-brand-intense) data-checked:not-data-disabled:hover:bg-(--nico-color-background-brand-intense-hover)",
        "data-indeterminate:not-data-disabled:border-(--nico-color-border-opaque) data-indeterminate:bg-(--nico-color-background-brand-intense) data-indeterminate:not-data-disabled:hover:bg-(--nico-color-background-brand-intense-hover)",
        "data-disabled:cursor-not-allowed data-disabled:border-(--nico-color-border) data-disabled:bg-(--nico-color-background-input-disabled) data-disabled:text-(--nico-color-border) data-disabled:data-checked:bg-(--nico-color-background-disabled) data-disabled:data-indeterminate:bg-(--nico-color-background-disabled)",
        "focus-visible:ring-2 focus-visible:ring-(--nico-color-border-brand) focus-visible:ring-offset-2 focus-visible:ring-offset-(--nico-color-surface) aria-invalid:border-(--nico-color-background-negative-intense) aria-invalid:ring-(--nico-color-background-negative-intense)",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        {/* Figma vectors 31:9359 / 31:9392; preserve the original paths. */}
        <CheckboxGlyph key={indeterminate ? "indeterminate" : "checked"} indeterminate={Boolean(indeterminate)} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
