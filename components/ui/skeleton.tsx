import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import "./skeleton.css";

export interface SkeletonProps extends ComponentProps<"div"> {
  /** Placeholder shape; size is controlled through className or style. */
  shape?: "rectangle" | "circle";
  /** Sweep a shimmer wave while loading; automatically disabled for reduced motion. */
  animated?: boolean;
}

function Skeleton({
  className,
  shape = "rectangle",
  animated = true,
  ...props
}: SkeletonProps) {
  return (
    <div
      {...props}
      data-slot="skeleton"
      data-shape={shape}
      aria-hidden="true"
      className={cn(
        "shrink-0 bg-(--nico-color-skeleton)",
        shape === "circle"
          ? "size-4 aspect-square rounded-(--nico-border-radius-full)"
          : "h-4 w-full rounded-(--nico-border-radius-sm)",
        animated && "nico-skeleton-shimmer",
        className,
      )}
    />
  );
}

export { Skeleton };
