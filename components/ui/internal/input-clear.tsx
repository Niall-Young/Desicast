import * as React from "react"
import { CloseCircleFilled } from "@mingcute/react/core-filled"
import { IconButton } from "@/components/ui/icon-button"

function InputClear({ clearLabel }: { clearLabel: string }) {
  function clear(event: React.MouseEvent<HTMLButtonElement>) {
    const input = event.currentTarget.closest('[data-slot="input-wrapper"]')?.querySelector<HTMLInputElement>(':scope > [data-slot="input-control"] > input[data-slot="input"]')
    if (!input || input.disabled || input.readOnly) return
    // Dispatch a native edit so Base UI validation, onChange and onValueChange
    // follow the same path as typing, in both controlled and uncontrolled usage.
    const win = input.ownerDocument.defaultView!
    const setter = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, "value")?.set
    setter?.call(input, "")
    input.dispatchEvent(new win.Event("input", { bubbles: true }))
    input.focus()
  }

  return <IconButton
      data-slot="input-clear"
      type="button"
      kind="plain"
      size="sm"
      aria-label={clearLabel}
      className="invisible size-4 rounded-full border-0 p-0 text-(--nico-color-icon-subtlest) group-hover/input:visible group-focus-within/input:visible group-has-[>[data-slot=input-control]>[data-slot=input]:placeholder-shown]/input:hidden group-has-[>[data-slot=input-control]>[data-slot=input]:disabled]/input:hidden group-has-[>[data-slot=input-control]>[data-slot=input][readonly]]/input:hidden"
      onMouseDown={(event) => event.preventDefault()}
      onClick={clear}
    ><CloseCircleFilled size={16} aria-hidden="true" /></IconButton>
}

export { InputClear }
