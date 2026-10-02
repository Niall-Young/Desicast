"use client";

import * as React from "react";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import type { ToastObject } from "@base-ui/react/toast";
import {
  WarningFilled,
  CheckCircleFilled,
  InformationFilled,
} from "@mingcute/react/core-filled";
import { CommandRegular } from "@mingcute/react/core-regular";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type ToastColor =
  "information" | "negative" | "positive" | "loading" | "neutral";
export interface ToastData {
  /** Nico status appearance. */
  color?: ToastColor;
  /** Pass null to hide the status icon, or supply a custom icon. */
  icon?: React.ReactNode;
  /** Optional secondary action; clicking dismisses the toast. */
  cancelProps?: React.ComponentPropsWithoutRef<"button">;
}

const toastManager = ToastPrimitive.createToastManager<ToastData>();

/** Place once around the app; includes the fixed bottom-right viewport. */
function ToastProvider({
  children,
  toastManager: manager = toastManager,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Provider>) {
  return (
    <ToastPrimitive.Provider toastManager={manager} {...props}>
      {children}
      <ToastViewport />
    </ToastPrimitive.Provider>
  );
}

function ToastViewport() {
  const { toasts } = ToastPrimitive.useToastManager<ToastData>();
  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport
        data-slot="toast-viewport"
        style={{
          height: toasts
            .filter((toast) => !toast.limited)
            .reduce(
              (height, toast, index) =>
                height + (toast.height ?? 0) + (index ? 12 : 0),
              0,
            ),
        }}
        className="pointer-events-none fixed right-5 bottom-5 z-[100] flex max-h-[calc(100dvh-40px)] w-[400px] max-w-[calc(100vw-40px)] flex-col-reverse gap-3 outline-none"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  );
}

/** Nico Toast (31:8496): title, optional description and two optional actions. */
function Toast({
  toast,
  className,
  ...props
}: Omit<
  React.ComponentProps<typeof ToastPrimitive.Root>,
  "toast" | "className"
> & { toast: ToastObject<ToastData>; className?: string }) {
  const { close } = ToastPrimitive.useToastManager<ToastData>();
  const color =
    toast.data?.color ??
    (toast.type === "success"
      ? "positive"
      : toast.type === "error"
        ? "negative"
        : toast.type === "loading"
          ? "loading"
          : "information");
  const Icon =
    color === "negative"
      ? WarningFilled
      : color === "positive"
        ? CheckCircleFilled
        : color === "neutral"
          ? CommandRegular
          : InformationFilled;
  const cancel = toast.data?.cancelProps;
  return (
    <ToastPrimitive.Root
      toast={toast}
      data-slot="toast"
      data-color={color}
      className={cn(
        "pointer-events-auto absolute right-0 bottom-0 w-full shrink-0 rounded-(--nico-border-radius-md) border border-(--nico-color-border) bg-(--nico-color-surface-raised) py-3 pr-3 pl-4 text-(--nico-color-text) nico-effect-shadow-medium outline-none [transform:translate(0,calc(-1*(var(--toast-offset-y)+var(--toast-index)*12px)))] transition-[opacity,transform] duration-240 ease-[cubic-bezier(0.22,1,0.36,1)] data-starting-style:[transform:translate(24px,calc(-1*(var(--toast-offset-y)+var(--toast-index)*12px)))] data-starting-style:opacity-0 data-ending-style:[transform:translate(24px,calc(-1*(var(--toast-offset-y)+var(--toast-index)*12px)))] data-ending-style:opacity-0 data-ending-style:duration-180 data-limited:hidden motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <ToastPrimitive.Content
        data-slot="toast-content"
        className="flex flex-col gap-4"
      >
        <div className="flex items-start gap-2">
          {toast.data?.icon !== null && (
            <span
              data-slot="toast-icon"
              aria-hidden="true"
              className={cn(
                "mt-1 flex size-4 shrink-0 items-center justify-center [&_svg]:size-4",
                {
                  information: "text-(--nico-color-icon-information)",
                  negative: "text-(--nico-color-icon-negative)",
                  positive: "text-(--nico-color-icon-positive)",
                  loading: "text-(--nico-color-icon)",
                  neutral: "text-(--nico-color-icon)",
                }[color],
              )}
            >
              {toast.data?.icon ??
                (color === "loading" ? (
                  <Spinner aria-hidden="true" />
                ) : (
                  <Icon size={16} />
                ))}
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1 wrap-anywhere">
            <ToastPrimitive.Title
              data-slot="toast-title"
              className="nico-type-16-medium-default"
            />
            <ToastPrimitive.Description
              data-slot="toast-description"
              className="nico-type-14-regular-default text-(--nico-color-text-subtle)"
            />
          </div>
        </div>
        {(cancel || toast.actionProps) && (
          <div
            data-slot="toast-actions"
            className="flex flex-wrap items-center justify-end gap-2"
          >
            {cancel && (
              <ToastPrimitive.Close
                aria-hidden={false}
                data-slot="toast-cancel"
                render={<Button size="sm" kind="tonal" />}
                {...cancel}
              />
            )}
            {toast.actionProps && (
              <ToastPrimitive.Action
                data-slot="toast-action"
                render={
                  <Button
                    size="sm"
                    color={color === "negative" ? "negative" : "brand"}
                  />
                }
                onClick={() => close(toast.id)}
              />
            )}
          </div>
        )}
      </ToastPrimitive.Content>
    </ToastPrimitive.Root>
  );
}

const useToastManager = ToastPrimitive.useToastManager<ToastData>;
export { Toast, ToastProvider, ToastViewport, toastManager, useToastManager };
