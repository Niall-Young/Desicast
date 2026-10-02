import { cn } from "cn"
import { Loading3Regular } from "@mingcute/react/core-regular"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loading3Regular
      role="status"
      aria-label="Loading"
      className={cn("size-4 shrink-0 animate-spin motion-reduce:animate-none", className)}
      {...props}
    />
  )
}

export { Spinner }
