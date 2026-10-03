"use client"

import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { CheckRegular, RightRegular } from "@mingcute/react/core-regular"
import { cn } from "@/lib/utils"

export interface TreeNode {
  /** Globally unique, stable node value. */
  value: string
  label: string
  icon?: React.ReactNode
  children?: TreeNode[]
  disabled?: boolean
  /** A non-selectable branch can still be expanded. */
  selectable?: boolean
}
export interface TreeProps extends Omit<React.ComponentProps<"div">, "children" | "defaultValue" | "onChange" | "onKeyDown"> {
  items: TreeNode[]
  onKeyDown?: React.KeyboardEventHandler<HTMLElement>
  /** Selection is always an array; single mode keeps at most one value. */
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  expandedValues?: string[]
  defaultExpandedValues?: string[]
  onExpandedValuesChange?: (value: string[]) => void
  /** Independent selection, without parent/child cascading. */
  multiple?: boolean
  disabled?: boolean
  readOnly?: boolean
  size?: "sm" | "md" | "lg"
  emptyText?: string
}

/** Hierarchical selection with roving focus and arrow-key navigation. */
function Tree({ items, value, defaultValue = [], onValueChange, expandedValues, defaultExpandedValues = [], onExpandedValuesChange, multiple = false, disabled = false, readOnly = false, size = "md", emptyText = "暂无数据", className, onKeyDown, ...props }: TreeProps) {
  const [selection, setSelection] = React.useState(defaultValue)
  const [expansion, setExpansion] = React.useState(defaultExpandedValues)
  const selected = multiple ? (value ?? selection) : (value ?? selection).slice(0, 1)
  const expanded = expandedValues ?? expansion
  const root = React.useRef<HTMLDivElement>(null)
  const focusedWithin = React.useRef(false)
  const refs = React.useRef(new Map<string, HTMLElement>())
  const [active, setActive] = React.useState<string | null>(null)
  const typeahead = React.useRef({ text: "", time: 0 })
  const rows: { node: TreeNode; level: number; parent?: string; disabled: boolean; position: number; count: number }[] = []
  function flatten(nodes: TreeNode[], level = 1, parent?: string, inheritedDisabled = disabled) {
    nodes.forEach((node, index) => {
      const blocked = inheritedDisabled || Boolean(node.disabled)
      rows.push({ node, level, parent, disabled: blocked, position: index + 1, count: nodes.length })
      if (expanded.includes(node.value) && node.children?.length) flatten(node.children, level + 1, node.value, blocked)
    })
  }
  flatten(items)
  const enabled = rows.filter(row => !row.disabled)
  const tabValue = enabled.find(row => row.node.value === active)?.node.value ?? enabled.find(row => selected.includes(row.node.value))?.node.value ?? enabled[0]?.node.value
  function focus(next?: string) {
    if (!next) return
    setActive(next)
    refs.current.get(next)?.focus()
  }
  function toggle(node: TreeNode) {
    const next = expanded.includes(node.value) ? expanded.filter(v => v !== node.value) : [...expanded, node.value]
    if (expandedValues === undefined) setExpansion(next)
    onExpandedValuesChange?.(next)
  }
  function select(node: TreeNode) {
    if (readOnly || node.selectable === false) return
    const next = multiple ? selected.includes(node.value) ? selected.filter(v => v !== node.value) : [...selected, node.value] : [node.value]
    if (value === undefined) setSelection(next)
    onValueChange?.(next)
  }
  // If a controlled collapse/removal hides the focused node, retain a tree tab stop.
  React.useLayoutEffect(() => {
    if (focusedWithin.current && !enabled.some(row => row.node.value === active)) focus(tabValue)
  })
  return <div {...props} ref={root} onFocusCapture={event => { focusedWithin.current = true; props.onFocusCapture?.(event) }} onBlurCapture={event => { focusedWithin.current = Boolean(root.current?.contains(event.relatedTarget)); props.onBlurCapture?.(event) }} role="tree" aria-label={props['aria-label'] ?? (props['aria-labelledby'] ? undefined : "树形列表")} aria-multiselectable={multiple || undefined} aria-disabled={disabled || undefined} aria-readonly={readOnly || undefined} data-slot="tree" data-size={size} className={cn("nico-type-14-regular-default w-full min-w-0 text-(--nico-color-text)", className)}>
    {!rows.length && <div data-slot="tree-empty" className="px-3 py-4 text-(--nico-color-text-subtlest)">{emptyText}</div>}
    {rows.map(row => {
      const { node } = row
      const branch = Boolean(node.children?.length)
      const isExpanded = expanded.includes(node.value)
      const isSelected = selected.includes(node.value)
      return <ButtonPrimitive key={node.value} render={<div />} nativeButton={false} ref={el => { if (el) refs.current.set(node.value, el); else refs.current.delete(node.value) }}
        role="treeitem" aria-label={node.label} aria-level={row.level} aria-posinset={row.position} aria-setsize={row.count} aria-expanded={branch ? isExpanded : undefined} aria-selected={node.selectable === false ? undefined : isSelected}
        disabled={row.disabled} tabIndex={!row.disabled && tabValue === node.value ? 0 : -1} data-slot="tree-item"
        className={cn("flex w-full cursor-default items-center gap-2 rounded-(--nico-border-radius-sm) pr-3 outline-none select-none hover:bg-(--nico-color-interaction-hover) focus-visible:shadow-(--nico-effect-focused-input) data-disabled:text-(--nico-color-text-disabled) data-disabled:hover:bg-transparent", { sm: "h-7", md: "h-8", lg: "h-10" }[size])}
        style={{ paddingLeft: 8 + (row.level - 1) * 16 }} onFocus={() => setActive(node.value)}
        onClick={event => {
          focus(node.value)
          if (branch && ((event.target as HTMLElement).closest('[data-slot="tree-toggle"]') || node.selectable === false)) toggle(node)
          else select(node)
        }}
        onKeyDown={event => {
          onKeyDown?.(event)
          if (event.defaultPrevented || row.disabled) return
          const index = enabled.findIndex(entry => entry.node.value === node.value)
          let handled = true
          switch (event.key) {
            case "ArrowDown": focus(enabled[Math.min(index + 1, enabled.length - 1)]?.node.value); break
            case "ArrowUp": focus(enabled[Math.max(index - 1, 0)]?.node.value); break
            case "Home": focus(enabled[0]?.node.value); break
            case "End": focus(enabled.at(-1)?.node.value); break
            case "ArrowRight": if (branch) { if (!isExpanded) toggle(node); else focus(enabled.find(entry => entry.parent === node.value)?.node.value) }; break
            case "ArrowLeft": if (branch && isExpanded) toggle(node); else focus(row.parent); break
            default:
              handled = false
              if (event.key !== " " && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                const now = Date.now()
                const previous = now - typeahead.current.time < 700 ? typeahead.current.text : ""
                const text = previous + event.key.toLocaleLowerCase()
                typeahead.current = { text, time: now }
                const query = [...text].every(char => char === text[0]) ? text[0] : text
                const ordered = [...enabled.slice(index + 1), ...enabled.slice(0, index + 1)]
                focus(ordered.find(entry => entry.node.label.toLocaleLowerCase().startsWith(query))?.node.value)
              }
          }
          if (handled) { event.preventDefault(); event.stopPropagation() }
        }}>
        <span data-slot="tree-toggle" aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center text-(--nico-color-icon-subtle)">{branch && <RightRegular size={16} className={cn("transition-transform duration-150 motion-reduce:transition-none", isExpanded && "rotate-90")} />}</span>
        {node.icon && <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center">{node.icon}</span>}
        <span data-slot="tree-label" className="min-w-0 flex-1 truncate">{node.label}</span>
        {isSelected && <CheckRegular data-slot="tree-indicator" size={16} aria-hidden="true" className="shrink-0" />}
      </ButtonPrimitive>
    })}
  </div>
}
export { Tree }
