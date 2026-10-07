import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "./Select";
import { Switch } from "@/components/ui/switch";
import { menuBarLabels } from "../shared/menu-bar";
import { brandColors, interfaceZooms, type Settings } from "../core/types";
import { brandColorLabels, verifyAppearanceSave } from "./appearance";
import { api, type MCPInfo } from "./api";
import { MCPClientPanel } from "./MCPSettings";
import "./settings-page.css";
import { SettingsMenuButton } from "./SettingsMenuButton";
import back from "./design-assets/settings-back.svg?raw";
import general from "./design-assets/settings-general.svg?raw";
import appearance from "./design-assets/settings-appearance.svg?raw";
import connector from "./design-assets/settings-connector.svg?raw";
import model from "./design-assets/settings-model.svg?raw";
import library from "./design-assets/settings-library.svg?raw";

function SettingsIcon({ artwork }: { artwork: string }) {
  // Only bundled navigation assets are inlined; repository SVGs never enter here
  return (
    <span
      className="settings-icon"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: artwork }}
    />
  );
}

const sections = [
  { id: "general", label: "通用设置", icon: general, group: "基础配置" },
  { id: "appearance", label: "外观", icon: appearance },
  { id: "connector", label: "连接器", icon: connector, group: "连接配置" },
  { id: "model", label: "模型配置", icon: model },
  { id: "libraries", label: "图标库", icon: library, group: "项目管理" },
];

export function SettingsPage({
  settings,
  onSettings,
  onClose,
  onError,
  onNotice,
  modelContent,
  libraryContent,
}: {
  settings: Settings;
  onSettings: (settings: Settings) => void;
  onClose: () => void;
  onError: (error: unknown) => void;
  onNotice: (message: string) => void;
  modelContent: ReactNode;
  libraryContent: ReactNode;
}) {
  const [active, setActive] = useState("general");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [info, setInfo] = useState<MCPInfo>();
  const [loadError, setLoadError] = useState("");
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = content.current;
    if (!container) return;
    let frame = 0;
    const updateActiveSection = () => {
      const top = container.getBoundingClientRect().top + container.clientTop;
      const inset = parseFloat(getComputedStyle(container).paddingTop) || 0;
      let current = sections[0].id;
      for (const section of sections) {
        const element = container.querySelector(`#settings-${section.id}`);
        if (element && element.getBoundingClientRect().top <= top + inset + 1)
          current = section.id;
      }
      // The final section may be too short to reach the top of the viewport.
      if (
        container.scrollTop > 0 &&
        container.scrollTop + container.clientHeight >=
          container.scrollHeight - 1
      )
        current = sections[sections.length - 1].id;
      setActive(current);
    };
    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateActiveSection);
    };
    container.addEventListener("scroll", scheduleUpdate, { passive: true });
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(container);
    for (const element of container.children) observer.observe(element);
    updateActiveSection();
    return () => {
      container.removeEventListener("scroll", scheduleUpdate);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  useEffect(() => {
    let mounted = true;
    api<MCPInfo>("mcpInfo")
      .then((value) => {
        if (mounted) setInfo(value);
      })
      .catch((error) => {
        if (mounted)
          setLoadError(error instanceof Error ? error.message : "读取配置失败");
      });
    return () => {
      mounted = false;
    };
  }, []);
  async function saveAppearance(
    patch: Partial<
      Pick<Settings, "theme" | "brandColor" | "zoom" | "showInMenuBar">
    >,
  ) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    const next = { ...settings, ...patch };
    onSettings(next);
    try {
      const saved = await api<Settings>("saveSettings", { settings: next });
      if (
        patch.showInMenuBar !== undefined &&
        saved.showInMenuBar !== patch.showInMenuBar
      )
        throw new Error("菜单栏设置未保存，请重启 DesiCast 后重试");
      verifyAppearanceSave(saved, patch);
      onSettings(saved);
    } catch (error) {
      onSettings(settings);
      onError(error);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const menuBar = menuBarLabels(settings, navigator.languages);
  return (
    <div className="shell settings-page">
      <aside className="settings-sidebar" aria-label="设置导航">
        <SettingsMenuButton className="settings-back" onClick={onClose}>
          <SettingsIcon artwork={back} />
          返回
        </SettingsMenuButton>
        <nav className="settings-menu" aria-label="设置分类">
          {sections.map((section) => (
            <div key={section.id}>
              {section.group && (
                <p className="settings-menu-group">{section.group}</p>
              )}
              <SettingsMenuButton
                className="settings-menu-item"
                selected={active === section.id}
                aria-current={active === section.id ? "location" : undefined}
                onClick={() => {
                  setActive(section.id);
                  content.current
                    ?.querySelector(`#settings-${section.id}`)
                    ?.scrollIntoView({ block: "start", behavior: "instant" });
                }}
              >
                <SettingsIcon artwork={section.icon} />
                {section.label}
              </SettingsMenuButton>
            </div>
          ))}
        </nav>
      </aside>
      <main
        className="workspace settings-sections"
        aria-label="设置"
        ref={content}
      >
        <section id="settings-general">
          <h2>通用设置</h2>
          <div className="settings-list">
            <div className="settings-cell">
              <div>
                <p>语言</p>
                <p className="settings-cell-description">当前界面语言</p>
              </div>
              <span>简体中文</span>
            </div>
            <div className="settings-cell">
              <div>
                <p>{menuBar.setting}</p>
                <p className="settings-cell-description">
                  {menuBar.description}
                </p>
              </div>
              <Switch
                size="lg"
                aria-label={menuBar.setting}
                checked={settings.showInMenuBar ?? false}
                aria-disabled={busy}
                aria-busy={busy}
                onCheckedChange={(checked, details) => {
                  // Native disabled/readOnly states suppress upstream motion
                  if (saving.current) {
                    details.cancel();
                    return;
                  }
                  void saveAppearance({ showInMenuBar: checked });
                }}
              />
            </div>
          </div>
        </section>
        <section id="settings-appearance">
          <h2>外观</h2>
          <div className="settings-list">
            <div className="settings-cell">
              <div>
                <p>模式</p>
                <p className="settings-cell-description">亮暗模式切换</p>
              </div>
              <Select
                aria-label="外观主题"
                items={[
                  { value: "system", label: "系统" },
                  { value: "light", label: "浅色" },
                  { value: "dark", label: "深色" },
                ]}
                value={settings.theme}
                disabled={busy}
                onValueChange={(value) => {
                  if (value)
                    saveAppearance({ theme: value as Settings["theme"] });
                }}
              />
            </div>
            <div className="settings-cell">
              <div>
                <p>主题色</p>
                <p className="settings-cell-description">切换默认主题色</p>
              </div>
              <Select
                aria-label="主题色"
                items={brandColors.map((value) => ({
                  value,
                  label: brandColorLabels[value],
                  leading: (
                    <span
                      aria-hidden="true"
                      className="size-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          value === "grey"
                            ? "var(--nico-color-text)"
                            : `var(--nico-color-icon-accent-${value})`,
                      }}
                    />
                  ),
                }))}
                value={settings.brandColor ?? "grey"}
                disabled={busy}
                onValueChange={(value) =>
                  saveAppearance({
                    brandColor: value as Settings["brandColor"],
                  })
                }
              />
            </div>
            <div className="settings-cell">
              <div>
                <p>全局缩放</p>
                <p className="settings-cell-description">
                  调整整个界面的缩放比例
                </p>
              </div>
              <Select
                aria-label="全局缩放"
                items={interfaceZooms.map((value) => ({
                  value: String(value),
                  label: `${value}%`,
                }))}
                value={String(settings.zoom ?? 100)}
                disabled={busy}
                onValueChange={(value) =>
                  saveAppearance({ zoom: Number(value) as Settings["zoom"] })
                }
              />
            </div>
          </div>
        </section>
        <section id="settings-connector">
          <MCPClientPanel
            descriptionPlacement="above-tabs"
            info={info}
            loadError={loadError}
            onError={onError}
            onNotice={onNotice}
          />
        </section>
        <section id="settings-model">
          <h2>模型配置</h2>
          {modelContent}
        </section>
        <section id="settings-libraries">
          <h2>图标库</h2>
          {libraryContent}
        </section>
      </main>
    </div>
  );
}
