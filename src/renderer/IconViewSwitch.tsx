import { Tabs } from "@base-ui/react/tabs";
import { DesignIcon } from "./design";
import { SegmentedIndicator } from "./SegmentedIndicator";
import "./icon-view-switch.css";

type IconView = "grid" | "list";

// Application composition: Gendesign has no Segmented at the imported revision.
export function IconViewSwitch({
  value,
  onValueChange,
}: {
  value: IconView;
  onValueChange: (value: IconView) => void;
}) {
  return (
    <Tabs.Root
      value={value}
      onValueChange={(next) => {
        if (next === "grid" || next === "list") onValueChange(next);
      }}
    >
      <Tabs.List
        className="icon-view-switch segmented-motion"
        aria-label="图标显示方式"
      >
        <SegmentedIndicator />
        <Tabs.Tab value="grid" aria-label="网格视图">
          <DesignIcon name="grid" />
        </Tabs.Tab>
        <Tabs.Tab value="list" aria-label="列表视图">
          <DesignIcon name="list" />
        </Tabs.Tab>
      </Tabs.List>
    </Tabs.Root>
  );
}
