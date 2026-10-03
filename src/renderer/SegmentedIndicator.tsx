import { Tabs } from "@base-ui/react/tabs";
import "./segmented-motion.css";

// Base UI measures the selected tab, including unequal widths and resizing.
export function SegmentedIndicator() {
  return <Tabs.Indicator className="segmented-indicator" aria-hidden="true" />;
}
