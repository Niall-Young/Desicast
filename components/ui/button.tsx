import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { Spinner } from "@/components/ui/spinner";

// Use the supplied Nico tokens directly, without component color aliases.
const buttonVariants = cva(
  cn(
    "inline-flex shrink-0 items-center justify-center gap-1 rounded-md border border-solid text-sm font-normal whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-(--nico-color-border-brand) focus-visible:ring-offset-2 focus-visible:ring-offset-(--nico-color-surface) disabled:pointer-events-none disabled:opacity-(--nico-opaque-disabled) aria-disabled:pointer-events-none aria-disabled:opacity-(--nico-opaque-disabled) aria-invalid:border-(--nico-color-background-negative-intense) aria-invalid:ring-(--nico-color-background-negative-intense) [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[capsule=true]:rounded-full",
  ),
  {
    variants: {
      size: {
        md: "h-8 px-[13px] py-1 data-[left-icon=true]:pl-[11px] data-[right-icon=true]:pr-[11px]",
        sm: "h-7 px-[11px] py-0.5 data-[left-icon=true]:pl-[9px] data-[right-icon=true]:pr-[9px]",
        lg: "h-10 px-[15px] py-2 data-[left-icon=true]:pl-[13px] data-[right-icon=true]:pr-[13px]",
      },
      color: { brand: "", negative: "", discovery: "", white: "" },
      kind: { filled: "", tonal: "", ghost: "", plain: "" },
    },
    compoundVariants: [
      {
        color: "brand",
        kind: "filled",
        className:
          "bg-(--nico-color-background-brand-intense) text-(--nico-color-text-inverted) border-transparent [&:not([aria-disabled=true]):not(:disabled):hover]:bg-(--nico-color-background-brand-intense-hover) data-[selected=true]:bg-(--nico-color-background-brand-intense)",
      },
      {
        color: "brand",
        kind: "tonal",
        className:
          "bg-(--nico-color-background-neutral-subtle) text-(--nico-color-text) border-transparent [&:not([aria-disabled=true]):not(:disabled):hover]:bg-(--nico-color-background-neutral-subtle-hover) data-[selected=true]:bg-(--nico-color-interaction-selected-brand)",
      },
      {
        color: "brand",
        kind: "ghost",
        className:
          "bg-transparent text-(--nico-color-text) border-(--nico-color-border-intense) [&:not([aria-disabled=true]):not(:disabled):hover]:bg-(--nico-color-interaction-hover) data-[selected=true]:bg-(--nico-color-interaction-selected-brand)",
      },
      {
        color: "brand",
        kind: "plain",
        className:
          "bg-transparent text-(--nico-color-text) border-transparent [&:not([aria-disabled=true]):not(:disabled):hover]:bg-(--nico-color-interaction-hover) data-[selected=true]:bg-(--nico-color-interaction-selected-brand)",
      },
      {
        color: "negative",
        kind: "filled",
        className:
          "bg-(--nico-color-background-negative-intense) text-(--nico-color-text-inverted) border-transparent [&:not([aria-disabled=true]):not(:disabled):hover]:bg-(--nico-color-background-negative-intense-hover) data-[selected=true]:bg-(--nico-color-background-negative-intense)",
      },
      {
        color: "negative",
        kind: "tonal",
        className:
          "bg-(--nico-color-background-negative-subtle) text-(--nico-color-text-negative) border-transparent [&:not([aria-disabled=true]):not(:disabled):hover]:bg-(--nico-color-background-negative-subtle-hover) data-[selected=true]:bg-(--nico-color-interaction-selected-negative)",
      },
      {
        color: "negative",
        kind: "ghost",
        className:
          "bg-transparent text-(--nico-color-text-negative) border-(--nico-color-border-negative) [&:not([aria-disabled=true]):not(:disabled):hover]:bg-(--nico-color-interaction-hover-negative) data-[selected=true]:bg-(--nico-color-interaction-selected-negative)",
      },
      {
        color: "negative",
        kind: "plain",
        className:
          "bg-transparent text-(--nico-color-text-negative) border-transparent [&:not([aria-disabled=true]):not(:disabled):hover]:bg-(--nico-color-interaction-hover-negative) data-[selected=true]:bg-(--nico-color-interaction-selected-negative)",
      },
      // Nico has no discovery-specific interaction tokens; use its shared hover/selected tokens.
      {
        color: "discovery",
        kind: "filled",
        className:
          "bg-(--nico-color-background-discovery-intense) text-(--nico-color-text-inverted) border-transparent [&:not([aria-disabled=true]):not(:disabled):hover]:bg-(--nico-color-background-discovery-intense-hover) data-[selected=true]:bg-(--nico-color-background-discovery-intense)",
      },
      {
        color: "discovery",
        kind: "tonal",
        className:
          "bg-(--nico-color-background-discovery-subtle) text-(--nico-color-text-discovery) border-transparent [&:not([aria-disabled=true]):not(:disabled):hover]:bg-(--nico-color-background-discovery-subtle-hover) data-[selected=true]:bg-(--nico-color-interaction-selected)",
      },
      {
        color: "discovery",
        kind: "ghost",
        className:
          "bg-transparent text-(--nico-color-text-discovery) border-(--nico-color-border-discovery) [&:not([aria-disabled=true]):not(:disabled):hover]:bg-(--nico-color-interaction-hover) data-[selected=true]:bg-(--nico-color-interaction-selected)",
      },
      {
        color: "discovery",
        kind: "plain",
        className:
          "bg-transparent text-(--nico-color-text-discovery) border-transparent [&:not([aria-disabled=true]):not(:disabled):hover]:bg-(--nico-color-interaction-hover) data-[selected=true]:bg-(--nico-color-interaction-selected)",
      },
      {
        color: "white",
        kind: "filled",
        className:
          "bg-(--nico-color-background-white-intense) text-(--nico-color-grey-alpha-1500) border-transparent [&:not([aria-disabled=true]):not(:disabled):hover]:bg-(--nico-color-background-white-intense-hover) data-[selected=true]:bg-(--nico-color-background-white-intense)",
      },
      {
        color: "white",
        kind: "tonal",
        className:
          "bg-(--nico-color-background-white-subtle) text-(--nico-color-text-fixed-inverted) border-transparent [&:not([aria-disabled=true]):not(:disabled):hover]:bg-(--nico-color-background-white-subtle-hover) data-[selected=true]:bg-(--nico-color-interaction-selected-white)",
      },
      {
        color: "white",
        kind: "ghost",
        className:
          "bg-transparent text-(--nico-color-text-fixed-inverted) border-(--nico-color-border-fixed-inverted) [&:not([aria-disabled=true]):not(:disabled):hover]:bg-(--nico-color-interaction-hover-white) data-[selected=true]:bg-(--nico-color-interaction-selected-white)",
      },
      {
        color: "white",
        kind: "plain",
        className:
          "bg-transparent text-(--nico-color-text-fixed-inverted) border-transparent [&:not([aria-disabled=true]):not(:disabled):hover]:bg-(--nico-color-interaction-hover-white) data-[selected=true]:bg-(--nico-color-interaction-selected-white)",
      },
    ],
    defaultVariants: { kind: "filled", color: "brand", size: "md" },
  },
);

type ButtonProps = Omit<
  React.ComponentProps<typeof ButtonPrimitive>,
  "color" | "className"
> & { className?: string } & VariantProps<typeof buttonVariants> & {
    capsule?: boolean;
    selected?: boolean;
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
  };

function Button({
  className,
  size = "md",
  color = "brand",
  kind = "filled",
  capsule = false,
  selected,
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  children,
  onClick,
  onClickCapture,
  onKeyDownCapture,
  ...props
}: ButtonProps) {
  const blocked =
    disabled ||
    loading ||
    props["aria-disabled"] === true ||
    props["aria-disabled"] === "true";
  const spinner = (
    <Spinner
      data-slot="button-spinner"
      aria-hidden="true"
      role={undefined}
      aria-label={undefined}
    />
  );
  const content = (label: React.ReactNode) => (
    <>
      {loading && !rightIcon && !leftIcon && spinner}
      {leftIcon && (
        <span
          data-slot="button-left-icon"
          aria-hidden="true"
          className="inline-flex size-4 shrink-0 items-center justify-center"
        >
          {loading ? spinner : leftIcon}
        </span>
      )}
      {label}
      {rightIcon && !(loading && leftIcon) && (
        <span
          data-slot="button-right-icon"
          aria-hidden="true"
          className="inline-flex size-4 shrink-0 items-center justify-center"
        >
          {loading ? spinner : rightIcon}
        </span>
      )}
    </>
  );
  return (
    <ButtonPrimitive
      data-slot="button"
      {...props}
      data-size={size}
      data-color={color}
      data-kind={kind}
      data-capsule={capsule || undefined}
      data-left-icon={Boolean(leftIcon) || undefined}
      data-right-icon={Boolean(rightIcon) || undefined}
      data-selected={selected ?? props["aria-pressed"]}
      aria-pressed={selected ?? props["aria-pressed"]}
      aria-busy={loading || props["aria-busy"]}
      aria-disabled={blocked || undefined}
      disabled={blocked}
      className={cn(buttonVariants({ size, color, kind }), className)}
      onClick={onClick}
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
      {content(children)}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
