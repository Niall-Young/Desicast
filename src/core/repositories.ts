import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readdir,
  readFile,
  rm,
  realpath,
  stat,
} from "node:fs/promises";
import { join, resolve, relative, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { Store } from "./store";
import { sanitizeSvg } from "./svg";
import type { Icon, Source, SecretStore } from "./types";
const exec = promisify(execFile);

export function repositoryUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("请输入 HTTPS Git 仓库地址");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.replace(/\//g, "")
  )
    throw new Error("仓库地址必须为不含凭证、参数或片段的 HTTPS URL");
  return url.toString().replace(/\/$/, "");
}
export function repositoryDirectories(directories: string[]) {
  return [
    ...new Set(
      directories.map(
        (value) =>
          value
            .trim()
            .replace(/\\/g, "/")
            .replace(/^\.\//, "")
            .replace(/\/$/, "") || ".",
      ),
    ),
  ].map((value) => {
    if (
      value.startsWith("/") ||
      value.split("/").includes("..") ||
      value.includes("\0") ||
      value === ".git" ||
      value.startsWith(".git/")
    )
      throw new Error("SVG 目录必须为仓库内的相对路径");
    return value;
  });
}

export async function indexRepository(
  directory: string,
  source: Source,
  commit: string,
): Promise<{ icons: Icon[]; skipped: number }> {
  directory = await realpath(resolve(directory));
  const icons: Icon[] = [],
    seen = new Set<string>();
  let skipped = 0;
  const walk = async (folder: string) => {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.isSymbolicLink()) continue;
      const path = join(folder, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && /\.svg$/i.test(entry.name)) {
        if (icons.length >= 50_000)
          throw new Error("仓库图标超过首版 50,000 个上限，请缩小索引目录");
        const rel = relative(directory, path).split(sep).join("/");
        if (seen.has(rel)) continue;
        seen.add(rel);
        try {
          if ((await stat(path)).size > 1_000_000) throw new Error("SVG 过大");
          const svg = sanitizeSvg(await readFile(path, "utf8"));
          icons.push({
            id: `${source.id}:${rel}`,
            name: entry.name.replace(/\.svg$/i, ""),
            sourceId: source.id,
            collection: source.name,
            svg,
            sourceUrl: source.url!,
            commit,
            path: rel,
          });
        } catch {
          skipped++;
        }
      }
    }
  };
  for (const selected of source.directories ?? ["."]) {
    const path = await realpath(resolve(directory, selected));
    if (path !== directory && !path.startsWith(directory + sep))
      throw new Error("目录越界");
    // readdir intentionally fails for missing directories instead of publishing an empty snapshot.
    await walk(path);
  }
  return { icons, skipped };
}

export async function syncRepository(
  store: Store,
  secrets: SecretStore,
  id: string,
) {
  const source = store.source(id);
  if (!source || source.kind !== "repository") throw new Error("仓库不存在");
  const owner = randomUUID(),
    lock = `sync:${id}`;
  if (!store.acquire(lock, owner))
    throw new Error("这个仓库正在同步，请稍后重试");
  const staging = join(store.directory, "staging");
  await mkdir(staging, { recursive: true, mode: 0o700 });
  let temporary: string | undefined;
  try {
    temporary = await mkdtemp(join(staging, "sync-"));
    const token = await secrets.get(`repository:${id}`);
    const helper = join(temporary, "credentials.sh");
    await writeFile(
      helper,
      '#!/bin/sh\n[ "$1" = get ] || exit 0\nprotocol=\nhost=\nwhile IFS="=" read -r key value; do\ncase "$key" in protocol) protocol="$value" ;; host) host="$value" ;; esac\ndone\n[ "$protocol" = https ] && [ "$host" = "$ICONCAST_GIT_HOST" ] || exit 0\n[ -n "$ICONCAST_GIT_TOKEN" ] || exit 0\nprintf "username=%s\\npassword=%s\\n" "$ICONCAST_GIT_USER" "$ICONCAST_GIT_TOKEN"\n',
      { mode: 0o700 },
    );
    const tree = join(temporary, "tree");
    const env = {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
      GIT_ASKPASS: "/usr/bin/false",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      ICONCAST_GIT_USER: source.username || "oauth2",
      ICONCAST_GIT_TOKEN: token ?? "",
      ICONCAST_GIT_HOST: new URL(source.url!).host,
    };
    try {
      await exec(
        "git",
        [
          "-c",
          "core.hooksPath=/dev/null",
          "-c",
          "credential.helper=",
          "-c",
          `credential.helper=!'${helper.replaceAll("'", "'\\''")}'`,
          "-c",
          "protocol.file.allow=never",
          "clone",
          "--depth=1",
          "--single-branch",
          "--no-tags",
          "--branch",
          source.branch || "main",
          "--",
          repositoryUrl(source.url!),
          tree,
        ],
        { env, timeout: 120_000, maxBuffer: 1024 * 1024 },
      );
    } catch {
      throw new Error(
        "Git 同步失败：请检查仓库地址、分支、访问凭证和网络（需要安装 Git）",
      );
    }
    const commit = (
      await exec("git", ["-C", tree, "rev-parse", "HEAD"], { env })
    ).stdout.trim();
    const indexed = await indexRepository(tree, source, commit);
    // The source could have been removed by another process while the network operation ran.
    if (!store.source(id)) throw new Error("仓库已被移除");
    const updated: Source = {
      ...source,
      commit,
      syncedAt: new Date().toISOString(),
      error: indexed.skipped
        ? `已跳过 ${indexed.skipped} 个不支持或不安全的 SVG`
        : undefined,
      iconCount: indexed.icons.length,
    };
    store.replace(updated, indexed.icons);
    return updated;
  } catch (error) {
    if (store.source(id))
      store.saveSource({
        ...source,
        error: error instanceof Error ? error.message : "同步失败",
      });
    throw error;
  } finally {
    if (temporary) await rm(temporary, { recursive: true, force: true });
    store.unlock(lock, owner);
  }
}
