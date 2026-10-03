import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
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
  { id: "general", label: "通用设置", icon: general },
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
        <h1>设置</h1>
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
              <NativeSelect
                size="sm"
                aria-label="外观主题"
                value={settings.theme}
                disabled={busy}
                onChange={(event) =>
                  saveTheme(event.target.value as Settings["theme"])
                }
              >
                <option value="system">系统</option>
                <option value="light">浅色</option>
                <option value="dark">深色</option>
              </NativeSelect>
            </div>
          </div>
        </section>
        <section id="settings-connector">
          <h2>连接器</h2>
          <p className="settings-section-description">
            请复制下方内容在终端中执行，连接 MCP
          </p>
          <MCPClientPanel
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
