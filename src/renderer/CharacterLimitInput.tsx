import { useLayoutEffect, useRef, useState, useId } from "react";
import { WarningFilled } from "@mingcute/react/core-filled";
import { Input, type InputProps } from "@/components/ui/input";
import "./character-limit-input.css";

type CharacterLimitInputProps = Omit<
  InputProps,
  "maxLength" | "value" | "defaultValue"
> & {
  value: string;
  limit: number;
};

/** Application composition: keep the native editor and mirror only its artwork. */
export function CharacterLimitInput({
  value,
  limit,
  onValueChange,
  onScroll,
  onSelect,
  suffix,
  style,
  ...props
}: CharacterLimitInputProps) {
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const errorId = useId();
  const overflow = value.length > limit;
  const [geometry, setGeometry] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    font: "",
    letterSpacing: "",
  });

  function syncScroll() {
    if (input.current && mirror.current)
      mirror.current.scrollLeft = input.current.scrollLeft;
  }
  useLayoutEffect(() => {
    const editor = input.current;
    const container = root.current;
    if (!editor || !container) return;
    function measure() {
      const field = editor!.getBoundingClientRect();
      const wrapper = container!.getBoundingClientRect();
      const computed = getComputedStyle(editor!);
      setGeometry({
        left: field.left - wrapper.left,
        top: field.top - wrapper.top,
        width: field.width,
        height: field.height,
        font: computed.font,
        letterSpacing: computed.letterSpacing,
      });
      syncScroll();
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(editor);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    // Native caret scrolling happens after React has committed the new value.
    syncScroll();
    const frame = requestAnimationFrame(syncScroll);
    return () => cancelAnimationFrame(frame);
  }, [value, overflow]);

  return (
    <div className="character-limit-field" ref={root}>
      <Input
        {...props}
        ref={input}
        value={value}
        negative={overflow || props.negative}
        aria-describedby={
          [props["aria-describedby"], overflow ? errorId : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
        style={{
          ...style,
          ...(overflow
            ? { color: "transparent", caretColor: "var(--nico-color-text)" }
            : {}),
        }}
        suffix={
          suffix ?? (
            <span className="character-limit-count">
              {value.length}/{limit}
            </span>
          )
        }
        onValueChange={onValueChange}
        onScroll={(event) => {
          syncScroll();
          onScroll?.(event);
        }}
        onSelect={(event) => {
          syncScroll();
          onSelect?.(event);
        }}
      />
      {overflow && (
        <div
          ref={mirror}
          className="character-limit-mirror"
          aria-hidden="true"
          style={geometry}
        >
          <span>{value.slice(0, limit)}</span>
          <span className="character-limit-excess">{value.slice(limit)}</span>
        </div>
      )}
      <div className="character-limit-message-slot">
        {overflow && (
          <div
            id={errorId}
            data-slot="valid-message"
            className="character-limit-error"
            role="alert"
          >
            <WarningFilled size={16} aria-hidden="true" />
            <span>
              最多 {limit} 个字符，已超出 {value.length - limit} 个
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
