import type { menuBarLabels } from "../shared/menu-bar";

type Labels = ReturnType<typeof menuBarLabels>;
interface MenuBarItem {
  destroy(): void;
  setMenu(labels: Labels): void;
}

// Keep the native item referenced until disabled or the application exits.
export class MenuBarController {
  private item?: MenuBarItem;
  constructor(private readonly create: () => MenuBarItem) {}
  get enabled() {
    return this.item !== undefined;
  }
  update(enabled: boolean, labels: Labels) {
    if (!enabled) {
      this.destroy();
      return;
    }
    if (this.item) {
      this.item.setMenu(labels);
      return;
    }
    const item = this.create();
    try {
      item.setMenu(labels);
      this.item = item;
    } catch (error) {
      item.destroy();
      throw error;
    }
  }
  destroy() {
    this.item?.destroy();
    this.item = undefined;
  }
}
