"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "@/lib/utils"

function Popover(props: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root {...props} />
}

function PopoverTrigger(props: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

type PopoverContentProps = Omit<React.ComponentProps<typeof PopoverPrimitive.Popup>, "className"> & {
  className?: string
  side?: React.ComponentProps<typeof PopoverPrimitive.Positioner>["side"]
  align?: React.ComponentProps<typeof PopoverPrimitive.Positioner>["align"]
  sideOffset?: number
  alignOffset?: number
}

/** Nico arrowless floating surface · Figma 32:7529. All content is supplied through children. */
function PopoverContent({ className, side = "bottom", align = "center", sideOffset = 8, alignOffset = 0, children, ...props }: PopoverContentProps) {
  return <PopoverPrimitive.Portal>
    <PopoverPrimitive.Positioner data-slot="popover-positioner" side={side} align={align} sideOffset={sideOffset} alignOffset={alignOffset} collisionPadding={8} className="z-50">
      <PopoverPrimitive.Popup
        data-slot="popover-content"
        className={cn("nico-effect-shadow-medium w-[360px] max-w-[calc(100vw-16px)] max-h-[var(--available-height)] overflow-y-auto rounded-(--nico-border-radius-md) border border-(--nico-color-border) bg-(--nico-color-surface-raised) py-3 pr-3 pl-4 text-(--nico-color-text) outline-none origin-[var(--transform-origin)] transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 motion-reduce:transition-none", className)}
        {...props}
      >{children}</PopoverPrimitive.Popup>
    </PopoverPrimitive.Positioner>
  </PopoverPrimitive.Portal>
}

function PopoverClose(props: React.ComponentProps<typeof PopoverPrimitive.Close>) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />
}

export { Popover, PopoverTrigger, PopoverContent, PopoverClose }
