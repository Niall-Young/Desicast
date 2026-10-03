import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Select } from "./Select";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
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
  const [access, setAccess] = useState<"public" | "private">(
    source?.access ??
      (source?.hasCredential || source?.username ? "private" : "public"),
  );
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
  const activeRequest = useRef<number | undefined>(undefined);
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
    if (!url.trim() || busy || activeRequest.current === version.current)
      return;
    const request = ++version.current;
    activeRequest.current = request;
    setLoading(true);
    setMetadata(undefined);
    setError("");
    try {
      const result = await api<Metadata>("browseRepository", {
        url: url.trim(),
        branch: selectedBranch,
        sourceId:
          access === "private" && source?.url === url ? source.id : undefined,
        username:
          access === "private" ? username.trim() || undefined : undefined,
        token: access === "private" ? token || undefined : undefined,
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
      if (activeRequest.current === request) activeRequest.current = undefined;
      if (request === version.current) setLoading(false);
    }
  }
  const originalAccess =
    source?.access ??
    (source?.hasCredential || source?.username ? "private" : "public");
  const unchangedRepository =
    source?.url === url &&
    source?.branch === branch &&
    originalAccess === access;
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
        access,
        username:
          access === "private" ? username.trim() || undefined : undefined,
        token: access === "private" ? token || undefined : undefined,
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
        <ModalBody className="add-library-body">
          <form
            id="add-library-form"
            className="add-library-form"
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
            <section className="add-library-section">
              <div className="add-library-access">
                <span id="repository-access-label">仓库类型</span>
                <RadioGroup
                  className="repository-access-segmented"
                  aria-labelledby="repository-access-label"
                  value={access}
                  disabled={busy}
                  onValueChange={(value) => {
                    if (value !== "public" && value !== "private") return;
                    invalidate();
                    setAccess(value);
                    setBranch("");
                    setDirectories([]);
                    setToken("");
                    setUsername("");
                    setVisible(false);
                  }}
                >
                  <RadioPrimitive.Root
                    value="public"
                    render={<button type="button" />}
                    nativeButton
                  >
                    公开仓库
                  </RadioPrimitive.Root>
                  <RadioPrimitive.Root
                    value="private"
                    render={<button type="button" />}
                    nativeButton
                  >
                    私有仓库
                  </RadioPrimitive.Root>
                </RadioGroup>
              </div>
              <div className="add-library-grid">
                <div className="add-library-field add-library-full">
                  <span id="repository-url-label">仓库链接</span>
                  <div className="add-library-repository-link">
                    <Input
                      aria-labelledby="repository-url-label"
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
                          void loadRepository(branch || undefined);
                      }}
                    />
                    <Button
                      type="button"
                      kind="tonal"
                      loading={loading}
                      disabled={busy || !url.trim()}
                      onClick={() => loadRepository(branch || undefined)}
                    >
                      解析仓库
                    </Button>
                  </div>
                </div>
                {access === "private" && (
                  <>
                    <label className="add-library-field">
                      <span>
                        用户名 <span className="add-library-hint">(选填)</span>
                      </span>
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
                        <span
                          className="add-library-hint"
                          title="未配置本机 Git / gh / glab 凭据时需填写令牌"
                        >
                          (按需填写)
                        </span>
                      </span>
                      <div
                        className={`add-library-password ${visible ? "is-visible" : ""}`}
                      >
                        <PasswordInput
                          aria-label="访问令牌"
                          placeholder={
                            source?.hasCredential
                              ? "已保存，留空保留原令牌"
                              : "未登录的私有仓库需填写令牌"
                          }
                          value={token}
                          disabled={busy}
                          visible={visible}
                          onBlur={() => {
                            if (url.trim() && !metadata && !loading)
                              void loadRepository(branch || undefined);
                          }}
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
                  </>
                )}
                <label className="add-library-field add-library-branch">
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
              </div>
            </section>
          </form>
          {children}
          {!loading && (url.trim() || error) && (
            <div className="add-library-status">
              <span role={error ? "alert" : "status"}>
                {error ||
                  (metadata
                    ? `已连接 · ${metadata.authorization}`
                    : access === "private"
                      ? "配置凭据后读取仓库信息"
                      : "公开仓库无需配置凭据")}
              </span>
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
