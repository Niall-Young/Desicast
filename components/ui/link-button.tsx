import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const linkButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1 border-0 bg-transparent p-0 font-normal whitespace-nowrap no-underline outline-none focus-visible:ring-2 focus-visible:ring-(--nico-color-border-brand) focus-visible:ring-offset-2 focus-visible:ring-offset-(--nico-color-surface) disabled:pointer-events-none disabled:opacity-(--nico-opaque-disabled) aria-disabled:pointer-events-none aria-disabled:opacity-(--nico-opaque-disabled) [&:not([aria-disabled=true]):not(:disabled):hover]:underline underline-offset-2 [&_svg]:size-full [&_svg]:shrink-0",
  {
    variants: {
      color: {
        neutral: "text-(--nico-color-text-subtle)",
        link: "text-(--nico-color-link)",
        negative: "text-(--nico-color-text-negative)",
        brand: "text-(--nico-color-text-brand)",
        white: "text-(--nico-color-text-fixed-inverted)",
      },
      size: {
        sm: "text-xs [&_[data-slot=link-button-left-icon]]:size-3 [&_[data-slot=link-button-right-icon]]:size-3",
        md: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: { color: "neutral", size: "md" },
  },
);

type LinkButtonProps = Omit<
  React.ComponentProps<typeof ButtonPrimitive>,
  "color" | "className"
> &
  VariantProps<typeof linkButtonVariants> & {
    className?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
  };

function LinkButton({
  className,
  color = "neutral",
  size = "md",
  disabled = false,
  leftIcon,
  rightIcon,
  children,
  onClickCapture,
  onKeyDownCapture,
  ...props
}: LinkButtonProps) {
  const blocked =
    disabled ||
    props["aria-disabled"] === true ||
    props["aria-disabled"] === "true";
  return (
    <ButtonPrimitive
      {...props}
      data-slot="link-button"
      data-color={color}
      data-size={size}
      disabled={blocked}
      aria-disabled={blocked || undefined}
      className={cn(linkButtonVariants({ color, size }), className)}
      onClickCapture={(event) => {
        if (blocked) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClickCapture?.(event);
      }}
      onKeyDownCapture={(event) => {
        if (blocked && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onKeyDownCapture?.(event);
      }}
    >
      {leftIcon && (
        <span
          data-slot="link-button-left-icon"
          aria-hidden="true"
          className="inline-flex size-4 shrink-0 items-center justify-center"
        >
          {leftIcon}
        </span>
      )}
      {children}
      {rightIcon && (
        <span
          data-slot="link-button-right-icon"
          aria-hidden="true"
          className="inline-flex size-4 shrink-0 items-center justify-center"
        >
          {rightIcon}
        </span>
      )}
    </ButtonPrimitive>
  );
}

export { LinkButton, linkButtonVariants };
