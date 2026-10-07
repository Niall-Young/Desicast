import type { BrandColor } from "../core/types";

export const brandColorLabels: Record<BrandColor, string> = {
  grey: "默认（灰色）",
  red: "红色",
  orange: "橙色",
  yellow: "黄色",
  lime: "青柠",
  green: "绿色",
  teal: "青绿",
  sky: "天蓝",
  blue: "蓝色",
  purple: "紫色",
  pink: "粉色",
};

// Override semantic tokens only; neutral mode restores the supplied Nico mapping.
export function brandColorTokens(
  color: BrandColor,
  dark: boolean,
): Record<string, string> {
  const palette = (shade: number) => `var(--nico-color-${color}-${shade})`;
  const base = dark ? 400 : 500;
  const hover = base + (dark ? -100 : 100);
  return {
    "--nico-color-text-brand": palette(base),
    "--nico-color-icon-brand": palette(base),
    "--nico-color-border-brand": palette(base),
    "--nico-color-background-brand-intense": palette(base),
    "--nico-color-background-brand-intense-hover": palette(hover),
    "--nico-color-background-brand-subtle": palette(dark ? 800 : 100),
    "--nico-color-background-brand-subtle-hover": palette(dark ? 700 : 200),
  };
}

export function applyBrandColor(
  root: HTMLElement,
  color: BrandColor,
  dark: boolean,
) {
  for (const [token, value] of Object.entries(brandColorTokens(color, dark))) {
    if (color === "grey") root.style.removeProperty(token);
    else root.style.setProperty(token, value);
  }
}
