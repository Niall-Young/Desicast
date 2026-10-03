import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "./Select";
import { ArrowLeftRegular } from "@mingcute/react/core-regular";
import type { Settings } from "../core/types";
import { api, type MCPInfo } from "./api";
import { MCPClientPanel } from "./MCPSettings";
import "./settings-page.css";
import general from "./design-assets/settings-general.svg?url";
import appearance from "./design-assets/settings-appearance.svg?url";
import connector from "./design-assets/settings-connector.svg?url";
import model from "./design-assets/settings-model.svg?url";
import library from "./design-assets/settings-library.svg?url";

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
  async function saveTheme(theme: Settings["theme"]) {
    setBusy(true);
    try {
      onSettings(
        await api<Settings>("saveSettings", {
          settings: { ...settings, theme },
        }),
      );
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="shell settings-page">
      <aside className="settings-sidebar" aria-label="设置导航">
        <Button
          kind="plain"
          className="settings-back"
          leftIcon={<ArrowLeftRegular size={16} />}
          onClick={onClose}
        >
          返回
        </Button>
        <nav className="settings-menu" aria-label="设置分类">
          {sections.map((section) => (
            <div key={section.id}>
              {section.group && (
                <p className="settings-menu-group">{section.group}</p>
              )}
              <Button
                kind="plain"
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
                <img src={section.icon} alt="" className="settings-icon" />
                {section.label}
              </Button>
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
                  if (value) saveTheme(value as Settings["theme"]);
                }}
              />
            </div>
          </div>
        </section>
        <section id="settings-connector">
          <h2>连接器</h2>
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
