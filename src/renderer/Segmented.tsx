import type { ComponentProps } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { SegmentedIndicator } from "./SegmentedIndicator";
import "./segmented.css";

// Application composition of Gendesign Figma Segmented, not upstream Tabs styling.
export const Segmented = Tabs.Root;

export function SegmentedList({
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Tabs.List>, "className"> & {
  className?: string;
}) {
  return (
    <Tabs.List
      className={["segmented segmented-motion", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <SegmentedIndicator />
      {children}
    </Tabs.List>
  );
}

export const SegmentedItem = Tabs.Tab;
