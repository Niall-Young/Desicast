import * as React from "react";
import { Toast } from "@base-ui/react/toast";
import {
  InformationFilled,
  WarningFilled,
  CheckCircleFilled,
} from "@mingcute/react/core-filled";
import { AppstoreRegular, CloseRegular } from "@mingcute/react/core-regular";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";

type MessageColor =
  | "information"
  | "negative"
  | "positive"
  | "loading"
  | "neutral";
type MessageData = {
  color?: MessageColor;
  icon?: React.ReactNode;
  closable?: boolean;
};

const appearances = {
  information:
    "bg-(--nico-color-background-information-subtle) border-(--nico-color-border-accent-visual-sky)",
  negative:
    "bg-(--nico-color-background-negative-subtle) border-(--nico-color-border-accent-visual-red)",
  positive:
    "bg-(--nico-color-background-positive-subtle) border-(--nico-color-border-accent-visual-green)",
  loading: "bg-(--nico-color-surface-raised) border-(--nico-color-border)",
  neutral: "bg-(--nico-color-surface-raised) border-(--nico-color-border)",
};
const icons = {
  information: (
    <InformationFilled
      className="size-4"
      color="var(--nico-color-icon-information)"
    />
  ),
  negative: (
    <WarningFilled className="size-4" color="var(--nico-color-icon-negative)" />
  ),
  positive: (
    <CheckCircleFilled
      className="size-4"
      color="var(--nico-color-icon-positive)"
    />
  ),
  loading: (
    <Spinner
      role={undefined}
      aria-label={undefined}
      color="var(--nico-color-icon-subtle)"
    />
  ),
  neutral: (
    <AppstoreRegular className="size-4" color="var(--nico-color-icon)" />
  ),
};

type MessageProps = Omit<
  React.ComponentProps<typeof Toast.Root>,
  "className"
> & {
  className?: string;
  color?: MessageColor;
  /** Use null or false to hide the icon. */
  icon?: React.ReactNode;
  closable?: boolean;
  closeLabel?: string;
};

function Message({
  toast,
  color = "information",
  icon,
  closable = true,
  closeLabel = "关闭消息",
  className,
  ...props
}: MessageProps) {
  const hasActions = closable || Boolean(toast.actionProps);
  return (
    <Toast.Root
      data-slot="message"
      {...props}
      toast={toast}
      data-color={color}
      swipeDirection={[]}
      className={cn(
        "pointer-events-auto absolute top-0 flex w-fit max-w-full shrink-0 items-center gap-3 rounded-lg border text-sm font-normal text-(--nico-color-text) shadow-md outline-none [transform:translateY(calc(var(--toast-offset-y)+var(--toast-index)*12px))] transition-[opacity,transform] duration-240 ease-[cubic-bezier(0.22,1,0.36,1)] data-[starting-style]:[transform:translateY(calc(var(--toast-offset-y)+var(--toast-index)*12px-24px))] data-[starting-style]:opacity-0 data-[ending-style]:[transform:translateY(calc(var(--toast-offset-y)+var(--toast-index)*12px-24px))] data-[ending-style]:opacity-0 data-[ending-style]:duration-180 data-[limited]:hidden motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-(--nico-color-border-brand)",
        hasActions ? "py-[9px] pl-4 pr-[9px]" : "px-4 py-3",
        appearances[color],
        className,
      )}
    >
      <Toast.Content
        data-slot="message-content"
        className="flex min-w-0 items-start gap-2"
      >
        {icon !== null && icon !== false && (
          <span
            data-slot="message-icon"
            aria-hidden="true"
            className="mt-[3px] inline-flex size-4 shrink-0 items-center justify-center [&_svg]:size-4"
          >
            {icon ?? icons[color]}
          </span>
        )}
        <Toast.Title
          data-slot="message-title"
          className="min-w-0 max-w-[448px] [overflow-wrap:anywhere]"
        />
      </Toast.Content>
      {hasActions && (
        <div
          data-slot="message-actions"
          className="flex shrink-0 items-center gap-1"
        >
          {toast.actionProps && (
            <Toast.Action
              data-slot="message-action"
              render={<Button kind="tonal" size="sm" />}
            />
          )}
          {closable && (
            <Toast.Close
              data-slot="message-close"
              aria-label={closeLabel}
              aria-hidden={false}
              render={<IconButton kind="plain" size="sm" />}
            >
              <CloseRegular />
            </Toast.Close>
          )}
        </div>
      )}
    </Toast.Root>
  );
}

function MessageViewport() {
  const { toasts } = Toast.useToastManager<MessageData>();
  return (
    <Toast.Portal>
      <Toast.Viewport
        data-slot="message-viewport"
        aria-label="消息通知"
        style={{
          height: toasts
            .filter((toast) => !toast.limited)
            .reduce(
              (height, toast, index) =>
                height + (toast.height ?? 0) + (index ? 12 : 0),
              0,
            ),
        }}
        className="pointer-events-none fixed inset-x-4 top-[48px] z-[100] flex flex-col items-center gap-3 outline-none"
      >
        {toasts.map((toast) => (
          <Message key={toast.id} toast={toast} {...toast.data} />
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

/** Mount once around the application or a standalone preview. */
function MessageProvider({
  children,
  timeout = 5000,
  limit = 3,
  ...props
}: React.ComponentProps<typeof Toast.Provider>) {
  return (
    <Toast.Provider timeout={timeout} limit={limit} {...props}>
      {children}
      <MessageViewport />
    </Toast.Provider>
  );
}

type MessageOptions = Omit<
  Parameters<ReturnType<typeof Toast.useToastManager<MessageData>>["add"]>[0],
  "data" | "type"
> &
  MessageData;

function useMessage() {
  const manager = Toast.useToastManager<MessageData>();
  return {
    ...manager,
    add({
      color = "information",
      icon,
      closable = true,
      timeout,
      ...options
    }: MessageOptions) {
      return manager.add({
        ...options,
        timeout: timeout ?? (color === "loading" ? 0 : undefined),
        data: { color, icon, closable },
      });
    },
  };
}

export { Message, MessageProvider, MessageViewport, useMessage };
export type { MessageColor, MessageOptions };
