import * as React from "react";
import { cn } from "@/lib/utils";

const statusColors = {
  positive: "bg-(--nico-color-background-positive-intense)",
  information: "bg-(--nico-color-background-information-intense)",
  negative: "bg-(--nico-color-background-negative-intense)",
  neutral: "bg-(--nico-color-text-subtle)",
};

/** A status label with a decorative dot; readable text conveys meaning without color. */
function StatusIndicator({
  className,
  color = "neutral",
  children,
  ...props
}: Omit<React.ComponentProps<"span">, "color"> & {
  color?: keyof typeof statusColors;
}) {
  return (
    <span
      data-slot="status-indicator"
      data-color={color}
      className={cn(
        "inline-flex items-center gap-2 align-middle nico-type-14-regular-default text-(--nico-color-text)",
        className,
      )}
      {...props}
    >
      <span
        data-slot="status-indicator-dot"
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-full", statusColors[color])}
      />
      {children}
    </span>
  );
}

export { StatusIndicator };
