export function menuBarLabels(
  settings: { theme: string; language?: "zh" | "en" | "system" },
  systemLanguages: readonly string[] = [],
) {
  const language = settings.language;
  const english =
    language === "en" ||
    (language === "system" &&
      !systemLanguages[0]?.toLowerCase().startsWith("zh"));
  return english
    ? {
        setting: "Show in menu bar",
        description:
          "Keep DesiCast in the Mac menu bar after closing its window",
        open: "Open DesiCast",
        quit: "Quit DesiCast",
      }
    : {
        setting: "菜单栏中显示",
        description: "关闭窗口后，在 Mac 系统的菜单栏中显示",
        open: "打开 DesiCast",
        quit: "退出 DesiCast",
      };
}
