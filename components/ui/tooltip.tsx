"use client";

import * as React from "react";
import { Tooltip as Primitive } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

const AnchorContext = React.createContext<{
  anchor: React.RefObject<HTMLElement | null>;
  id: string;
} | null>(null);
const TooltipProvider = Primitive.Provider;

function Tooltip(props: Primitive.Root.Props) {
  const anchor = React.useRef<HTMLElement | null>(null);
  const id = React.useId();
  return (
    <AnchorContext.Provider value={{ anchor, id }}>
      <Primitive.Root {...props} />
    </AnchorContext.Provider>
  );
}

function TooltipTrigger({ ref, ...props }: Primitive.Trigger.Props) {
  const context = React.useContext(AnchorContext);
  const anchor = context?.anchor;
  const local = React.useRef<HTMLButtonElement | null>(null);
  React.useImperativeHandle(ref, () => local.current!, []);
  return (
    <Primitive.Trigger
      aria-describedby={context?.id}
      data-slot="tooltip-trigger"
      {...props}
      ref={(node: HTMLButtonElement | null) => {
        local.current = node;
        if (anchor) anchor.current = node;
      }}
    />
  );
}

/** Auto chooses the side facing the viewport center; Base UI resolves remaining collisions. */
function TooltipContent({
  className,
  side = "auto",
  align = "center",
  sideOffset = 8,
  collisionPadding = 8,
  children,
  ...props
}: Omit<Primitive.Popup.Props, "className"> & {
  className?: string;
  side?: Primitive.Positioner.Props["side"] | "auto";
} & Pick<
    Primitive.Positioner.Props,
    "align" | "sideOffset" | "collisionPadding"
  >) {
  const context = React.useContext(AnchorContext);
  const anchor = context?.anchor;
  const [autoSide, setAutoSide] = React.useState<
    "top" | "bottom" | "left" | "right"
  >("top");
  React.useLayoutEffect(() => {
    if (side !== "auto" || !anchor?.current) return;
    const element = anchor.current;
    const win = element.ownerDocument.defaultView!;
    const update = () => {
      const rect = element.getBoundingClientRect();
      const viewport = win.visualViewport;
      const x =
        (rect.left + rect.width / 2 - (viewport?.offsetLeft ?? 0)) /
        (viewport?.width ?? win.innerWidth);
      const y =
        (rect.top + rect.height / 2 - (viewport?.offsetTop ?? 0)) /
        (viewport?.height ?? win.innerHeight);
      setAutoSide(
        Math.abs(x - 0.5) > Math.abs(y - 0.5)
          ? x < 0.5
            ? "right"
            : "left"
          : y < 0.5
            ? "bottom"
            : "top",
      );
    };
    update();
    win.addEventListener("resize", update);
    win.addEventListener("scroll", update, true);
    win.visualViewport?.addEventListener("resize", update);
    win.visualViewport?.addEventListener("scroll", update);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      win.removeEventListener("resize", update);
      win.removeEventListener("scroll", update, true);
      win.visualViewport?.removeEventListener("resize", update);
      win.visualViewport?.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [anchor, side]);
  return (
    <Primitive.Portal>
      <Primitive.Positioner
        data-slot="tooltip-positioner"
        side={side === "auto" ? autoSide : side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        collisionAvoidance={{
          side: "flip",
          align: "shift",
          fallbackAxisSide: "end",
        }}
        className="z-50"
      >
        <Primitive.Popup
          role="tooltip"
          id={context?.id}
          data-slot="tooltip-content"
          {...props}
          className={cn(
            "max-w-[min(320px,var(--available-width))] rounded-(--nico-border-radius-sm) border-(length:--nico-border-weight-base) border-(--nico-color-border-opaque) bg-(--nico-color-background-dark) px-3 py-1.5 font-(family-name:--nico-font-family-sans) text-(length:--nico-font-size-sm) leading-(--nico-line-height-sm) font-(--nico-font-weight-regular) text-(--nico-color-text-inverted) text-center wrap-anywhere transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none",
            className,
          )}
        >
          {children}
        </Primitive.Popup>
      </Primitive.Positioner>
    </Primitive.Portal>
  );
}

export { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent };
