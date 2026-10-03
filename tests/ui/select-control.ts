import { expect, type Page } from "@playwright/test";

export async function selectValue(page: Page, name: string, value: string) {
  const label =
    name === "外观主题"
      ? (
          { system: "系统", light: "浅色", dark: "深色" } as Record<
            string,
            string
          >
        )[value]
      : value;
  await page.getByRole("combobox", { name, exact: true }).click();
  await page.getByRole("option", { name: label, exact: true }).click();
  await expect(page.getByRole("combobox", { name, exact: true })).toContainText(
    label,
  );
}
