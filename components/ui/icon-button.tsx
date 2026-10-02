import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { Button } from "@/components/ui/button";

// Nico Icon Button · Figma 30:2610. The icon stays 16px at every size.
const iconButtonVariants = cva("gap-0 [&_svg]:size-4", {
  variants: {
    size: {
      sm: "size-7 p-[5px]",
      md: "size-8 p-[7px]",
      lg: "size-10 p-[11px]",
    },
  },
  defaultVariants: { size: "md" },
});

type IconButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "leftIcon" | "rightIcon" | "size"
> &
  VariantProps<typeof iconButtonVariants>;

function IconButton({
  className,
  size = "md",
  kind = "filled",
  color = "brand",
  loading = false,
  children,
  ...props
}: IconButtonProps) {
  const content = loading ? null : children;

  return (
    <Button
      data-slot="icon-button"
      {...props}
      size={size}
      kind={kind}
      color={color}
      loading={loading}
      className={cn(
        iconButtonVariants({ size }),
        color === "brand" &&
          kind !== "filled" &&
          "text-(--nico-color-icon-subtle)",
        className,
      )}
    >
      {content}
    </Button>
  );
}

export { IconButton, iconButtonVariants };
