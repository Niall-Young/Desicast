"use client"

import * as React from "react"
import { DownRegular, CloseRegular } from "@mingcute/react/core-regular"
import { cn } from "@/lib/utils"
import { Popover, PopoverTrigger, PopoverContent } from "./popover"
import { IconButton } from "./icon-button"
import { Tree, type TreeNode, type TreeProps } from "./tree"

export interface TreeSelectProps extends Pick<TreeProps, "items" | "value" | "defaultValue" | "onValueChange" | "multiple" | "disabled" | "readOnly" | "size" | "expandedValues" | "defaultExpandedValues" | "onExpandedValuesChange" | "emptyText"> {
  id?: string
  "aria-label"?: string
  "aria-labelledby"?: string
  placeholder?: string
  clearable?: boolean
  clearLabel?: string
  negative?: boolean
  name?: string
  form?: string
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}
/** Popover selector sharing the public Tree's data and selection model. */
function TreeSelect({ items, value, defaultValue = [], onValueChange, multiple = false, disabled = false, readOnly = false, size = "md", placeholder = "请选择", clearable = true, clearLabel = "清空选择", negative = false, name, form, open, defaultOpen = false, onOpenChange, className, id, "aria-label": label = "树形选择", "aria-labelledby": labelledBy, ...treeProps }: TreeSelectProps) {
  const [selection, setSelection] = React.useState(defaultValue)
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  const current = multiple ? (value ?? selection) : (value ?? selection).slice(0, 1)
  const blocked = disabled || readOnly
  const trigger = React.useRef<HTMLButtonElement>(null)
  const container = React.useRef<HTMLDivElement>(null)
  const hiddenInput = React.useRef<HTMLInputElement>(null)
  const initial = React.useRef(defaultValue)
  const popupId = React.useId()
  const labels = new Map<string, string>()
  const ancestors = new Set<string>()
  function visit(nodes: TreeNode[], parents: string[] = []) {
    nodes.forEach(node => {
      labels.set(node.value, node.label)
      if (current.includes(node.value)) parents.forEach(parent => ancestors.add(parent))
      if (node.children) visit(node.children, [...parents, node.value])
    })
  }
  visit(items)
  function change(next: string[]) {
    if (blocked) return
    if (value === undefined) setSelection(next)
    onValueChange?.(next)
  }
  function changeOpen(next: boolean) {
    if (open === undefined) setIsOpen(next)
    onOpenChange?.(next)
  }
  React.useEffect(() => {
    const owner = hiddenInput.current?.form
    function reset(event: Event) {
      queueMicrotask(() => { if (!event.defaultPrevented && value === undefined) setSelection(initial.current) })
    }
    owner?.addEventListener("reset", reset)
    return () => owner?.removeEventListener("reset", reset)
  }, [value, form])
  React.useEffect(() => { if (blocked && isOpen) setIsOpen(false) }, [blocked, isOpen])
  const text = current.map(key => labels.get(key) ?? key).join("、")
  return <div ref={container} data-slot="tree-select" data-size={size} className={cn("relative w-80 max-w-full", className)}>
    <Popover open={!blocked && (open ?? isOpen)} onOpenChange={changeOpen}>
      <PopoverTrigger ref={trigger} id={id} disabled={disabled} aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy} aria-readonly={readOnly || undefined} aria-invalid={negative || undefined} aria-haspopup="tree" aria-controls={!blocked && (open ?? isOpen) ? popupId : undefined}
        data-slot="tree-select-trigger" className={cn("nico-type-14-regular-default flex w-full items-center gap-2 rounded-(--nico-border-radius-sm) border-0 bg-(--nico-color-background-input) px-3 text-left text-(--nico-color-text) outline-none focus-visible:shadow-(--nico-effect-focused-input) data-popup-open:shadow-(--nico-effect-focused-input)", { sm: "h-7", md: "h-8", lg: "h-10" }[size], blocked ? "bg-(--nico-color-background-disabled)" : "hover:bg-(--nico-color-background-input-hover)", disabled && "cursor-not-allowed text-(--nico-color-text-disabled)", negative && "shadow-(--nico-effect-focused-negative)", clearable && current.length > 0 && !blocked && "pr-16")}
        onClick={event => { if (readOnly) event.preventDefault() }}>
        <span data-slot="tree-select-value" className={cn("min-w-0 flex-1 truncate", !current.length && "text-(--nico-color-text-disabled)")} title={text || undefined}>{text || placeholder}</span>
        <DownRegular size={16} aria-hidden="true" className="shrink-0 text-(--nico-color-icon-subtlest)" />
      </PopoverTrigger>
      <PopoverContent role="presentation" align="start" sideOffset={4} className="w-(--anchor-width) min-w-48 p-1" initialFocus={() => container.current?.ownerDocument.getElementById(popupId)?.querySelector<HTMLElement>('[role="treeitem"][tabindex="0"]') ?? false}>
        <Tree {...treeProps} id={popupId} aria-label={label} items={items} value={current} multiple={multiple} size={size} defaultExpandedValues={treeProps.defaultExpandedValues ?? [...ancestors]} onValueChange={next => { change(next); if (!multiple) changeOpen(false) }} />
      </PopoverContent>
    </Popover>
    {clearable && current.length > 0 && !blocked && <IconButton data-slot="tree-select-clear" kind="plain" size="sm" aria-label={clearLabel} className="absolute right-2 top-1/2 size-6 -translate-y-1/2" onClick={() => { change([]); trigger.current?.focus() }}><CloseRegular size={16} aria-hidden="true" /></IconButton>}
    <input ref={hiddenInput} type="hidden" form={form} disabled={disabled} />
    {name && current.map(key => <input key={key} type="hidden" name={name} form={form} value={key} disabled={disabled} />)}
  </div>
}
export { TreeSelect }
