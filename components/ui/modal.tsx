"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { CloseRegular } from "@mingcute/react/core-regular";
import { cn } from "cn";

import { IconButton } from "@/components/ui/icon-button";

function Modal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="modal" {...props} />;
}

function ModalTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="modal-trigger" {...props} />;
}

function ModalPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="modal-portal" {...props} />;
}

function ModalClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="modal-close" {...props} />;
}

function ModalOverlay({
  className,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Backdrop>, "className"> & {
  className?: string;
}) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="modal-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-(--nico-color-overlay) transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

// Nico Modal · Figma 31:9328. Compose Header, Body and optional Footer as direct children.
function ModalContent({
  className,
  children,
  divider = true,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Popup>, "className"> & {
  className?: string;
  /** Show the header and footer separators and apply their matching body spacing. */
  divider?: boolean;
}) {
  return (
    <ModalPortal>
      <ModalOverlay />
      <DialogPrimitive.Popup
        data-slot="modal-content"
        data-divider={divider}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[520px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-(--nico-border-radius-md) border border-(--nico-color-border) bg-(--nico-color-surface) text-(--nico-color-text) outline-none",
          "transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 motion-reduce:transition-none",
          "[&[data-divider=true]>[data-slot=modal-header]]:border-b [&[data-divider=true]>[data-slot=modal-body]]:pt-4 [&[data-divider=true]>[data-slot=modal-footer]]:border-t",
          "[&:has(>[data-slot=modal-footer])>[data-slot=modal-body]]:pb-0 [&[data-divider=true]:has(>[data-slot=modal-footer])>[data-slot=modal-body]]:pb-4",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </ModalPortal>
  );
}

function ModalHeader({
  className,
  children,
  showCloseButton = true,
  closeLabel = "关闭",
  ...props
}: React.ComponentProps<"div"> & {
  /** Show the shared IconButton that dismisses this modal. */
  showCloseButton?: boolean;
  /** Accessible label for the header close action. */
  closeLabel?: string;
}) {
  return (
    <div
      data-slot="modal-header"
      className={cn(
        "flex shrink-0 items-center gap-3 border-(--nico-color-border) pt-[17px] pr-[14px] pb-3 pl-5",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <ModalClose
          render={
            <IconButton
              kind="plain"
              size="sm"
              aria-label={closeLabel}
              className="ml-auto"
            />
          }
        >
          <CloseRegular size={16} aria-hidden="true" />
        </ModalClose>
      )}
    </div>
  );
}

function ModalTitle({
  className,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Title>, "className"> & {
  className?: string;
}) {
  return (
    <DialogPrimitive.Title
      data-slot="modal-title"
      className={cn("min-w-0 flex-1 truncate text-base font-medium", className)}
      {...props}
    />
  );
}

function ModalDescription({
  className,
  ...props
}: Omit<
  React.ComponentProps<typeof DialogPrimitive.Description>,
  "className"
> & { className?: string }) {
  return (
    <DialogPrimitive.Description
      data-slot="modal-description"
      className={cn("text-sm text-(--nico-color-text-subtle)", className)}
      {...props}
    />
  );
}

function ModalBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-body"
      className={cn("min-h-0 overflow-y-auto px-5 pb-5 text-sm", className)}
      {...props}
    />
  );
}

function ModalFooter({
  className,
  children,
  additionItem,
  ...props
}: React.ComponentProps<"div"> & {
  /** Optional content at the left of the footer, separate from its action buttons. */
  additionItem?: React.ReactNode;
}) {
  return (
    <div
      data-slot="modal-footer"
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-end gap-6 border-(--nico-color-border) px-5 pt-4 pb-5",
        className,
      )}
      {...props}
    >
      {additionItem != null && (
        <div
          data-slot="modal-addition-item"
          className="min-w-0 flex-1 text-sm text-(--nico-color-text-subtle)"
        >
          {additionItem}
        </div>
      )}
      <div
        data-slot="modal-actions"
        className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2"
      >
        {children}
      </div>
    </div>
  );
}

export {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalPortal,
  ModalTitle,
  ModalTrigger,
};
