"use client";

import * as React from "react";
import { cn } from "cn";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "nico-type-14-regular-default flex items-center gap-2 text-(--nico-color-text) select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-(--nico-opaque-disabled) peer-disabled:cursor-not-allowed peer-disabled:opacity-(--nico-opaque-disabled)",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
