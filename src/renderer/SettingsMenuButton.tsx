import type { ComponentProps } from "react";
import { Button } from "@base-ui/react/button";
import "./settings-navigation.css";

// Gendesign's Button has no neutral side-menu appearance at the imported revision
export function SettingsMenuButton({
  selected = false,
  className,
  ...props
}: ComponentProps<typeof Button> & { selected?: boolean }) {
  return (
    <Button
      {...props}
      data-selected={selected}
      className={`settings-navigation-button ${className ?? ""}`}
    />
  );
}
