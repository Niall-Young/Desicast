import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { LinkButton } from "@/components/ui/link-button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Radio, RadioGroup } from "@/components/ui/radio";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import type { Settings } from "../core/types";
import { api } from "./api";
import emptyIcon from "./design-assets/model-empty.svg?url";
import closeIcon from "./design-assets/model-close.svg?url";
import "./model-settings.css";

export function ModelSettings({
  settings,
  onSettings,
  onError,
  onNotice,
}: {
  settings: Settings;
  onSettings: (settings: Settings) => void;
  onError: (error: unknown) => void;
  onNotice: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const providers = settings.modelProviders ?? [];
  const addButton = (
    <Button kind="ghost" onClick={() => setOpen(true)}>
      添加供应商
    </Button>
  );
  return (
    <div className="model-settings">
      <div className="model-settings-header">{addButton}</div>
      {providers.length ? (
        <RadioGroup
          aria-label="模型供应商"
          className="model-provider-list"
          layout="vertical"
          value={settings.model.id ?? ""}
          disabled={selecting}
          onValueChange={async (id) => {
            setSelecting(true);
            try {
              onSettings(await api<Settings>("selectModelProvider", id));
            } catch (error) {
              onError(error);
            } finally {
              setSelecting(false);
            }
          }}
        >
          {providers.map((provider) => (
            <label className="model-provider-row" key={provider.id}>
              <span title={provider.model}>{provider.model}</span>
              <Radio value={provider.id} aria-label={provider.model} />
            </label>
          ))}
        </RadioGroup>
      ) : (
        <div className="model-settings-empty">
          <div className="model-empty-icon">
            <img src={emptyIcon} alt="" />
          </div>
          <div className="model-empty-copy">
            <p>添加模型 API 提供视觉能力</p>
            <p>请添加具备视觉能力的模型，进行视觉搜索图标</p>
          </div>
          {addButton}
        </div>
      )}
      {open && (
        <AddModelProviderDialog
          onClose={() => setOpen(false)}
          onSettings={onSettings}
          onError={onError}
          onNotice={onNotice}
        />
      )}
    </div>
  );
}

function AddModelProviderDialog({
  onClose,
  onSettings,
  onError,
  onNotice,
}: {
  onClose: () => void;
  onSettings: (settings: Settings) => void;
  onError: (error: unknown) => void;
  onNotice: (message: string) => void;
}) {
  const formId = useId();
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const valid = Boolean(baseUrl.trim() && model.trim());
  const pending = busy || testing;
  const draft = {
    baseUrl: baseUrl.trim(),
    model: model.trim(),
    apiKey: apiKey || undefined,
  };
  return (
    <Modal
      open
      onOpenChange={(value) => {
        if (!value && !pending) onClose();
      }}
    >
      <ModalContent className="model-provider-dialog">
        <ModalHeader showCloseButton={false}>
          <ModalTitle>添加供应商</ModalTitle>
          <IconButton
            kind="plain"
            size="sm"
            aria-label="关闭添加供应商"
            disabled={pending}
            onClick={onClose}
          >
            <img className="model-close-icon" src={closeIcon} alt="" />
          </IconButton>
        </ModalHeader>
        <ModalBody>
          <form
            id={formId}
            className="model-provider-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!valid || pending) return;
              setBusy(true);
              try {
                onSettings(await api<Settings>("addModelProvider", draft));
                onNotice("模型供应商已添加");
                onClose();
              } catch (error) {
                onError(error);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="model-provider-field">
              <label htmlFor={`${formId}-url`}>API 地址</label>
              <Input
                id={`${formId}-url`}
                required
                placeholder="请输入 API 地址"
                value={baseUrl}
                onValueChange={setBaseUrl}
                disabled={pending}
                autoComplete="off"
              />
            </div>
            <div className="model-provider-field">
              <label htmlFor={`${formId}-model`}>模型名称</label>
              <Input
                id={`${formId}-model`}
                required
                placeholder="请输入模型名称"
                value={model}
                onValueChange={setModel}
                disabled={pending}
                autoComplete="off"
              />
            </div>
            <div className="model-provider-field">
              <label htmlFor={`${formId}-key`}>API Key</label>
              <PasswordInput
                id={`${formId}-key`}
                placeholder="请输入 API Key"
                value={apiKey}
                onValueChange={setApiKey}
                disabled={pending}
                autoComplete="off"
              />
            </div>
          </form>
        </ModalBody>
        <ModalFooter
          additionItem={
            <LinkButton
              color="link"
              disabled={!valid || pending}
              onClick={async () => {
                setTesting(true);
                try {
                  await api("testModel", draft);
                  onNotice("连接成功");
                } catch (error) {
                  onError(error);
                } finally {
                  setTesting(false);
                }
              }}
            >
              {testing ? "测试中…" : "测试连接"}
            </LinkButton>
          }
        >
          <Button kind="tonal" disabled={pending} onClick={onClose}>
            取消
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={busy}
            disabled={!valid || pending}
          >
            确定
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
