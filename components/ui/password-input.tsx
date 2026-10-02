import * as React from "react";
import { Eye2Regular, EyeCloseRegular } from "@mingcute/react/core-regular";
import { IconButton } from "@/components/ui/icon-button";
import { InputBase } from "@/components/ui/internal/input-base";
import type { InputProps } from "@/components/ui/input";

type PasswordInputProps = Omit<
  InputProps,
  "clearAll" | "clearLabel" | "suffix"
> & {
  /** Controlled password visibility; omitted for internal state. */
  visible?: boolean;
  /** Initial visibility for uncontrolled usage. Passwords start masked. */
  defaultVisible?: boolean;
  /** Called when the visibility action is activated. */
  onVisibleChange?: (visible: boolean) => void;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
};

// Nico Password Input · Figma 39:15114. Shares Input's Base UI control and tokens.
function PasswordInput({
  size = "md",
  negative = false,
  readOnly = false,
  disabled = false,
  visible: visibleProp,
  defaultVisible = false,
  onVisibleChange,
  showPasswordLabel = "显示密码",
  hidePasswordLabel = "隐藏密码",
  ...props
}: PasswordInputProps) {
  const [internalVisible, setInternalVisible] = React.useState(defaultVisible);
  const visible = visibleProp ?? internalVisible;
  const selection = React.useRef<{
    input: HTMLInputElement;
    start: number | null;
    end: number | null;
    direction: "forward" | "backward" | "none" | null;
    value: string;
  } | null>(null);

  // Restore selection after React changes the native type, including controlled updates.
  React.useLayoutEffect(() => {
    const saved = selection.current;
    selection.current = null;
    if (!saved || saved.start === null || saved.end === null) return;
    const { input, start, end, direction, value } = saved;
    let canceled = false;
    const restore = () => {
      if (!canceled && input.isConnected && input.value === value) {
        input.setSelectionRange(start, end, direction ?? undefined);
      }
    };
    restore();
    // Browsers can reset a password selection after the click finishes.
    // Restore before the next paint, without moving keyboard focus.
    const frame =
      input.ownerDocument.defaultView!.requestAnimationFrame(restore);
    return () => {
      canceled = true;
      input.ownerDocument.defaultView!.cancelAnimationFrame(frame);
    };
  }, [visible]);

  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    const input = event.currentTarget
      .closest('[data-slot="input-wrapper"]')
      ?.querySelector<HTMLInputElement>(
        ':scope > [data-slot="input-control"] > input[data-slot="input"]',
      );
    if (!input || input.disabled || input.readOnly) return;
    selection.current = {
      input,
      start: input.selectionStart,
      end: input.selectionEnd,
      direction: input.selectionDirection,
      value: input.value,
    };
    if (visibleProp === undefined) setInternalVisible(!visible);
    onVisibleChange?.(!visible);
  }

  const VisibilityIcon = visible ? Eye2Regular : EyeCloseRegular;

  return (
    <InputBase
      {...props}
      type={visible ? "text" : "password"}
      size={size}
      negative={negative}
      readOnly={readOnly}
      disabled={disabled}
      trailingAction={
        <IconButton
          data-slot="password-input-toggle"
          type="button"
          kind="plain"
          size="sm"
          disabled={disabled || readOnly}
          aria-label={visible ? hidePasswordLabel : showPasswordLabel}
          className="size-4 rounded-sm border-0 p-0 text-(--nico-color-icon-subtlest) group-has-[>[data-slot=input-control]>[data-slot=input]:disabled]/input:hidden group-has-[>[data-slot=input-control]>[data-slot=input][readonly]]/input:hidden"
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggle}
        >
          <VisibilityIcon
            data-slot="password-input-icon"
            size={16}
            aria-hidden="true"
          />
        </IconButton>
      }
    />
  );
}

export { PasswordInput };
export type { PasswordInputProps };
