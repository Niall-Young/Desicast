import type { Settings } from "../core/types";
export interface MCPInfo {
  command: string;
  args: string[];
  env: Record<string, string>;
  configuration: string;
  codexCommand: string;
  dataDirectory: string;
  packaged: boolean;
}
declare global {
  interface Window {
    iconcast: {
      call: (
        method: string,
        input?: unknown,
      ) => Promise<{ ok: boolean; value?: unknown; error?: string }>;
    };
  }
}
export async function api<T>(method: string, input?: unknown): Promise<T> {
  if (!window.iconcast) throw new Error("请通过 Electron 启动 Iconcast");
  const result = await window.iconcast.call(method, input);
  if (!result.ok) throw new Error(result.error || "操作失败");
  return result.value as T;
}
export const initialSettings: Settings = {
  theme: "system",
  model: { baseUrl: "https://api.openai.com/v1", model: "", consent: false },
};
export function svgUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
export function isMonochrome(svg: string) {
  return (
    !/<(?:linearGradient|radialGradient)/.test(svg) &&
    new Set(
      [...svg.matchAll(/(?:fill|stroke)="([^"\s]+)"/g)]
        .map((match) => match[1])
        .filter((value) => value !== "none" && value !== "transparent"),
    ).size <= 1
  );
}
