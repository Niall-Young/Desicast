import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Select } from "./Select";
import { Switch } from "@/components/ui/switch";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { DirectoryCascader } from "./DirectoryCascader";
import { api } from "./api";
import type { Source, RepositoryInput } from "../core/types";
import closeIcon from "./design-assets/add-library-close.svg?url";
import "./add-library.css";

type Metadata = {
  branches: string[];
  directories: string[];
  authorization: string;
  branch: string;
};
export function AddLibraryDialog({
  source,
  children,
  onClose,
  onSaved,
  onNotice,
}: {
  source?: Source;
  children?: ReactNode;
  onClose: () => void;
  onSaved: () => void;
  onNotice: (message: string) => void;
}) {
  const [name, setName] = useState(source?.name ?? "");
  const [url, setUrl] = useState(source?.url ?? "");
  const [branch, setBranch] = useState(source?.branch ?? "");
  const [directories, setDirectories] = useState(source?.directories ?? []);
  const [username, setUsername] = useState(source?.username ?? "");
  const [token, setToken] = useState("");
  const [visible, setVisible] = useState(false);
  const [allowVision, setAllowVision] = useState(source?.allowVision ?? false);
  const [metadata, setMetadata] = useState<Metadata>();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const version = useRef(0);
  useEffect(
    () => () => {
      version.current++;
    },
    [],
  );
  function invalidate() {
    version.current++;
    setMetadata(undefined);
    setLoading(false);
    setError("");
  }
  async function loadRepository(selectedBranch?: string) {
    if (!url.trim() || busy) return;
    const request = ++version.current;
    setLoading(true);
    setMetadata(undefined);
    setError("");
    try {
      const result = await api<Metadata>("browseRepository", {
        url: url.trim(),
        branch: selectedBranch,
        username: username.trim() || undefined,
        token: token || undefined,
      });
      if (request !== version.current) return;
      setMetadata(result);
      setBranch(result.branch);
      setDirectories((current) =>
        current.filter(
          (path) => path === "." || result.directories.includes(path),
        ),
      );
    } catch (error) {
      if (request === version.current)
        setError(error instanceof Error ? error.message : "读取仓库失败");
    } finally {
      if (request === version.current) setLoading(false);
    }
  }
  const unchangedRepository = source?.url === url && source?.branch === branch;
  async function save() {
    if (
      busy ||
      loading ||
      !name.trim() ||
      !directories.length ||
      (!metadata && !unchangedRepository)
    )
      return;
    setBusy(true);
    setError("");
    try {
      const repository: RepositoryInput = {
        name: name.trim(),
        url: url.trim(),
        branch,
        directories,
        username: username.trim() || undefined,
        token: token || undefined,
        allowVision,
      };
      if (source) await api("updateRepository", { id: source.id, repository });
      else await api("addRepository", repository);
      setToken("");
      onSaved();
      onNotice(
        source
          ? "仓库配置已更新，请同步获取最新图标"
          : "仓库已添加，正在拉取图标",
      );
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "添加图标库失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <ModalContent className="add-library-dialog" initialFocus={false}>
        <ModalHeader showCloseButton={false}>
          <ModalTitle>{source ? "编辑图标库" : "添加图标库"}</ModalTitle>
          <IconButton
            kind="plain"
            size="sm"
            aria-label="关闭添加图标库"
            disabled={busy}
            onClick={onClose}
          >
            <img
              className="add-library-icon"
              src={closeIcon}
              width="16"
              height="16"
              alt=""
            />
          </IconButton>
        </ModalHeader>
        <ModalBody>
          <form
            id="add-library-form"
            className="add-library-grid"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <label className="add-library-field add-library-full">
              <span>图标库名称</span>
              <Input
                aria-label="图标库名称"
                required
                maxLength={20}
                placeholder="请输入图标库名称"
                value={name}
                onValueChange={setName}
                clearAll={false}
                suffix={`${name.length}/20`}
                disabled={busy}
              />
            </label>
            <label className="add-library-field">
              <span>仓库链接</span>
              <Input
                aria-label="仓库链接"
                required
                placeholder="https://github.com/your-team/icons.git"
                value={url}
                clearAll={false}
                disabled={busy}
                onValueChange={(value) => {
                  invalidate();
                  setUrl(value);
                  setBranch("");
                  setDirectories([]);
                }}
                onBlur={() => {
                  if (url.trim() && !metadata && !loading)
                    void loadRepository();
                }}
              />
            </label>
            <label className="add-library-field">
              <span>分支</span>
              <div className="add-library-select">
                <Select
                  aria-label="仓库分支"
                  items={(metadata?.branches ?? []).map((item) => ({
                    value: item,
                    label: item,
                  }))}
                  value={branch || null}
                  placeholder={loading ? "正在读取分支…" : "请选择分支"}
                  disabled={!metadata || loading || busy}
                  onValueChange={(value) => {
                    if (!value || metadata?.branch === value) return;
                    setBranch(value);
                    setDirectories([]);
                    void loadRepository(value);
                  }}
                />
              </div>
            </label>
            <div className="add-library-field add-library-full">
              <span>SVG 目录</span>
              <DirectoryCascader
                paths={metadata?.directories ?? []}
                value={directories}
                onChange={setDirectories}
                disabled={!metadata || loading || busy}
                placeholder="请选择仓库内文件目录"
              />
            </div>
            <label className="add-library-field">
              <span>用户名</span>
              <Input
                aria-label="用户名"
                placeholder="请输入用户名"
                value={username}
                clearAll={false}
                disabled={busy}
                onValueChange={(value) => {
                  invalidate();
                  setUsername(value);
                }}
              />
            </label>
            <label className="add-library-field">
              <span>
                访问令牌{" "}
                <span className="add-library-hint">(私有仓库必填)</span>
              </span>
              <div
                className={`add-library-password ${visible ? "is-visible" : ""}`}
              >
                <PasswordInput
                  aria-label="访问令牌"
                  placeholder={
                    source?.hasCredential
                      ? "已保存，留空保留原令牌"
                      : "请输入令牌"
                  }
                  value={token}
                  disabled={busy}
                  visible={visible}
                  onVisibleChange={setVisible}
                  showPasswordLabel="显示令牌"
                  hidePasswordLabel="隐藏令牌"
                  onValueChange={(value) => {
                    invalidate();
                    setToken(value);
                  }}
                />
              </div>
            </label>
          </form>
          {children}
          {(url.trim() || error) && (
            <div className="add-library-status">
              <span role={error ? "alert" : "status"}>
                {error ||
                  (loading
                    ? "正在读取仓库…"
                    : metadata
                      ? `已连接 · ${metadata.authorization}`
                      : "可自动复用本机 Git / gh / glab 凭据")}
              </span>
              <Button
                size="sm"
                kind="plain"
                disabled={loading || busy || !url.trim()}
                onClick={() => loadRepository(branch || undefined)}
              >
                读取仓库信息
              </Button>
            </div>
          )}
        </ModalBody>
        <ModalFooter
          additionItem={
            <label className="add-library-vision">
              <Switch
                size="md"
                aria-label="开启视觉检索"
                checked={allowVision}
                disabled={busy}
                onCheckedChange={setAllowVision}
              />
              <span>开启视觉检索</span>
            </label>
          }
        >
          <Button kind="tonal" disabled={busy} onClick={onClose}>
            取消
          </Button>
          <Button
            form="add-library-form"
            type="submit"
            loading={busy}
            disabled={
              busy ||
              loading ||
              !name.trim() ||
              !directories.length ||
              (!metadata && !unchangedRepository)
            }
          >
            {source ? "保存配置" : "添加"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
