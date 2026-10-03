import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { api, type MCPInfo } from "./api";
import close from "./design-assets/mcp-close.svg?url";
import chatgpt from "./design-assets/mcp-chatgpt.svg?url";
import claude from "./design-assets/mcp-claude.svg?url";
import other from "./design-assets/mcp-other.svg?url";
import copyIcon from "./design-assets/mcp-copy.svg?url";
import statusIcon from "./design-assets/mcp-status.svg?url";
import "./mcp-settings.css";

const clients = [
  {
    id: "codex",
    label: "ChatGPT",
    icon: chatgpt,
    field: "codexCommand",
    copyLabel: "复制 Codex 命令",
  },
  {
    id: "claude",
    label: "Claude code",
    icon: claude,
    field: "claudeCommand",
    copyLabel: "复制 Claude Code 命令",
  },
  {
    id: "other",
    label: "其他",
    icon: other,
    field: "configuration",
    copyLabel: "复制 MCP JSON",
  },
] as const;

export function MCPSettings({
  onClose,
  onError,
  onNotice,
}: {
  onClose: () => void;
  onError: (error: unknown) => void;
  onNotice: (message: string) => void;
}) {
  const [info, setInfo] = useState<MCPInfo>();
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api<MCPInfo>("mcpInfo")
      .then((value) => {
        if (active) setInfo(value);
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "读取配置失败");
        onError(error);
      });
    return () => {
      active = false;
    };
  }, []);
  async function check() {
    setBusy(true);
    try {
      const value = await api<{ tools: number; sourceCount: number }>(
        "mcpCheck",
      );
      onNotice(
        `连接正常 · ${value.tools} 个工具 · ${value.sourceCount} 个来源`,
      );
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ModalContent className="mcp-dialog">
        <ModalHeader showCloseButton={false}>
          <ModalTitle>MCP 配置</ModalTitle>
          <IconButton
            kind="plain"
            size="sm"
            aria-label="关闭 MCP 配置"
            onClick={onClose}
          >
            <img src={close} className="mcp-icon" alt="" />
          </IconButton>
        </ModalHeader>
        <ModalBody>
          <MCPClientPanel
            info={info}
            loadError={loadError}
            onError={onError}
            onNotice={onNotice}
          />
        </ModalBody>
        <ModalFooter
          additionItem={
            <Button
              kind="plain"
              size="sm"
              className="mcp-service-tag"
              aria-label="检查 MCP 连接"
              title="检查本地 stdio MCP 连接"
              loading={busy}
              disabled={busy}
              onClick={check}
            >
              <img
                src={statusIcon}
                className="mcp-icon mcp-status-icon"
                alt=""
              />
              MCP
            </Button>
          }
        >
          <Button kind="tonal" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onClose}>确定</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export function MCPClientPanel({
  info,
  loadError = "",
  onError,
  onNotice,
  descriptionPlacement = "panel",
}: {
  info?: MCPInfo;
  loadError?: string;
  onError: (error: unknown) => void;
  onNotice: (message: string) => void;
  descriptionPlacement?: "panel" | "above-tabs";
}) {
  const [activeClient, setActiveClient] = useState<string>("codex");
  const description = (clientId: string) =>
    clientId === "other"
      ? "请将下方 JSON 合并到客户端的 MCP 配置中，然后重新连接"
      : clientId === "claude"
        ? "请复制下方内容在终端中执行，连接 Claude Code 的 MCP"
        : "请复制下方内容在终端中执行，连接 Codex 的 MCP";
  return (
    <Tabs
      value={activeClient}
      onValueChange={setActiveClient}
      className="mcp-clients"
    >
      {descriptionPlacement === "above-tabs" && (
        <p className="mcp-client-description">{description(activeClient)}</p>
      )}
      <TabsList aria-label="MCP 客户端">
        {clients.map((client) => (
          <TabsTrigger key={client.id} value={client.id}>
            <img src={client.icon} className="mcp-icon" alt="" />
            {client.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {clients.map((client) => (
        <TabsContent key={client.id} value={client.id} className="mcp-panel">
          {descriptionPlacement === "panel" && (
            <p className="mcp-client-description">{description(client.id)}</p>
          )}
          <div className="mcp-code">
            <div className="mcp-code-header">
              <span>{client.id === "other" ? "JSON" : "Bash"}</span>
              <IconButton
                kind="plain"
                size="sm"
                aria-label={client.copyLabel}
                disabled={!info}
                onClick={async () => {
                  try {
                    await api("copy", info![client.field]);
                    onNotice("连接配置已复制");
                  } catch (error) {
                    onError(error);
                  }
                }}
              >
                <img src={copyIcon} className="mcp-icon" alt="" />
              </IconButton>
            </div>
            <pre>
              {info?.[client.field] ??
                (loadError ? "配置暂不可用" : "正在读取…")}
            </pre>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
