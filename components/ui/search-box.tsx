import { SearchRegular } from "@mingcute/react/core-regular"
import type { InputProps } from "@/components/ui/input"
import { InputBase } from "@/components/ui/internal/input-base"
import { InputClear } from "@/components/ui/internal/input-clear"
import { cn } from "cn"

type SearchBoxProps = Omit<InputProps, "suffix">

// Nico Search Box · Figma 39:13911. Base UI owns value and Field state.
function SearchBox({
  size = "md", clearAll = true, clearLabel = "清空搜索",
  placeholder = "搜索...", className, ...props
}: SearchBoxProps) {
  return <InputBase
    {...props}
    type="search"
    size={size}
    placeholder={placeholder}
    className={cn("[&::-webkit-search-cancel-button]:appearance-none", className)}
    leadingContent={<SearchRegular
      data-slot="search-box-icon"
      size={16}
      color="var(--nico-color-icon-subtlest)"
      aria-hidden="true"
      className="shrink-0"
    />}
    trailingAction={clearAll && <InputClear clearLabel={clearLabel} />}
  />
}

export { SearchBox }
export type { SearchBoxProps }
