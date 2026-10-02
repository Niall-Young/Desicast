"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { InformationFilled, WarningFilled } from "@mingcute/react/core-filled";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const DialogAppearance = React.createContext(false);

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(
  props: React.ComponentProps<typeof DialogPrimitive.Trigger>,
) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal(
  props: React.ComponentProps<typeof DialogPrimitive.Portal>,
) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose(
  props: React.ComponentProps<typeof DialogPrimitive.Close>,
) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Backdrop>, "className"> & {
  className?: string;
}) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-(--nico-color-overlay) transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

/** Nico confirmation dialog (32:7037). Use Modal for forms and other custom content. */
function DialogContent({
  className,
  negative = false,
  children,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Popup>, "className"> & {
  className?: string;
  negative?: boolean;
}) {
  return (
    <DialogAppearance.Provider value={negative}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          data-negative={negative || undefined}
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[400px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-(--nico-border-radius-md) border border-(--nico-color-border) bg-(--nico-color-surface) text-(--nico-color-text) outline-none transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 motion-reduce:transition-none",
            className,
          )}
          {...props}
        >
          {children}
        </DialogPrimitive.Popup>
      </DialogPortal>
    </DialogAppearance.Provider>
  );
}

function DialogHeader({
  className,
  icon,
  children,
  ...props
}: React.ComponentProps<"div"> & { icon?: React.ReactNode }) {
  const negative = React.useContext(DialogAppearance);
  const StatusIcon = negative ? WarningFilled : InformationFilled;
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex shrink-0 items-center gap-3 px-5 pt-5 pb-3",
        className,
      )}
      {...props}
    >
      {icon !== null && (
        <span
          data-slot="dialog-icon"
          aria-hidden="true"
          className={cn(
            "flex size-5 shrink-0 items-center justify-center [&_svg]:size-5",
            negative
              ? "text-(--nico-color-icon-negative)"
              : "text-(--nico-color-icon-information)",
          )}
        >
          {icon ?? <StatusIcon size={20} />}
        </span>
      )}
      {children}
    </div>
  );
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("min-h-0 overflow-y-auto px-5 pb-3", className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  additionItem,
  children,
  ...props
}: React.ComponentProps<"div"> & { additionItem?: React.ReactNode }) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 p-5",
        className,
      )}
      {...props}
    >
      {additionItem != null && (
        <div data-slot="dialog-addition-item" className="min-w-0 text-sm">
          {additionItem}
        </div>
      )}
      <div
        data-slot="dialog-actions"
        className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2"
      >
        {children}
      </div>
    </div>
  );
}

function DialogTitle({
  className,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Title>, "className"> & {
  className?: string;
}) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("min-w-0 flex-1 truncate text-base font-medium", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: Omit<
  React.ComponentProps<typeof DialogPrimitive.Description>,
  "className"
> & { className?: string }) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm font-normal wrap-anywhere text-(--nico-color-text)",
        className,
      )}
      {...props}
    />
  );
}

/** Primary confirmation action; negative dialogs inherit the negative Button color. */
function DialogAction(
  props: React.ComponentProps<typeof DialogPrimitive.Close>,
) {
  const negative = React.useContext(DialogAppearance);
  return (
    <DialogPrimitive.Close
      data-slot="dialog-action"
      render={<Button color={negative ? "negative" : "brand"} />}
      {...props}
    />
  );
}

function DialogCancel(
  props: React.ComponentProps<typeof DialogPrimitive.Close>,
) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-cancel"
      render={<Button kind="tonal" />}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogAction,
  DialogBody,
  DialogCancel,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
