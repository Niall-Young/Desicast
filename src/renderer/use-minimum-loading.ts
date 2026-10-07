import { useLayoutEffect, useRef, useState } from "react";

/** Keep one continuous loading session visible, including gaps between requests. */
export class MinimumLoading {
  private visible = false;
  private startedAt = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly onChange: (visible: boolean) => void,
    private readonly minimumMs = 2000,
  ) {}

  update(active: boolean) {
    this.dispose();
    if (active) {
      if (!this.visible) {
        this.startedAt = performance.now();
        this.visible = true;
        this.onChange(true);
      }
      return;
    }
    if (!this.visible) return;
    const remaining = this.minimumMs - (performance.now() - this.startedAt);
    if (remaining > 0) {
      this.timer = setTimeout(() => this.hide(), remaining);
    } else {
      this.hide();
    }
  }

  private hide() {
    this.timer = undefined;
    this.visible = false;
    this.onChange(false);
  }

  dispose() {
    clearTimeout(this.timer);
    this.timer = undefined;
  }
}

export function useMinimumLoading(active: boolean) {
  const [visible, setVisible] = useState(active);
  const controller = useRef<MinimumLoading | null>(null);
  if (!controller.current) controller.current = new MinimumLoading(setVisible);

  useLayoutEffect(() => {
    const loading = controller.current!;
    loading.update(active);
    return () => loading.dispose();
  }, [active]);

  return active || visible;
}
