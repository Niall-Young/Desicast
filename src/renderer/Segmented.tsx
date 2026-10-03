import type { ComponentProps } from "react";
import { Tabs } from "@base-ui/react/tabs";
import "./segmented.css";

// Application composition of Gendesign Figma Segmented, not upstream Tabs styling.
export const Segmented = Tabs.Root;

export function SegmentedList({
  className,
  ...props
}: Omit<ComponentProps<typeof Tabs.List>, "className"> & {
  className?: string;
}) {
  return (
    <Tabs.List
      className={["segmented", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export const SegmentedItem = Tabs.Tab;
