import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { repositoryUrl } from "./repositories";
const exec = promisify(execFile);
const quietEnv = () => ({
  ...process.env,
  GIT_TERMINAL_PROMPT: "0",
  GIT_ASKPASS: "/usr/bin/false",
});
export interface LocalCredential {
  username: string;
  password: string;
  method: string;
}
export async function localCredential(
  value: string,
): Promise<LocalCredential | undefined> {
  const url = new URL(repositoryUrl(value));
  try {
    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn("git", ["credential", "fill"], {
        env: quietEnv(),
        stdio: ["pipe", "pipe", "ignore"],
      });
      let result = "";
      const timer = setTimeout(() => child.kill(), 10_000);
      child.stdout.on("data", (data) => {
        result += data;
        if (result.length > 16384) child.kill();
      });
      child.on("error", reject);
      child.on("close", (code) => {
        clearTimeout(timer);
        code === 0 ? resolve(result) : reject(new Error("Unavailable"));
      });
      child.stdin.end(
        `protocol=https\nhost=${url.host}\npath=${url.pathname.slice(1)}\n\n`,
      );
    });
    const entries = Object.fromEntries(
      output
        .trim()
        .split("\n")
        .map((line) => {
          const i = line.indexOf("=");
          return [line.slice(0, i), line.slice(i + 1)];
        }),
    );
    if (entries.username && entries.password)
      return {
        username: entries.username,
        password: entries.password,
        method: "本机 Git 凭据",
      };
  } catch {}
  if (url.hostname === "github.com") {
    try {
      const { stdout } = await exec(
        "gh",
        ["auth", "token", "--hostname", url.hostname],
        { env: quietEnv(), timeout: 10_000 },
      );
      if (stdout.trim())
        return {
          username: "x-access-token",
          password: stdout.trim(),
          method: "GitHub CLI",
        };
    } catch {}
  } else {
    try {
      const { stdout } = await exec(
        "glab",
        ["auth", "token", "--hostname", url.hostname],
        { env: quietEnv(), timeout: 10_000 },
      );
      if (stdout.trim())
        return {
          username: "oauth2",
          password: stdout.trim(),
          method: "GitLab CLI",
        };
    } catch {}
  }
}
export async function withRepositoryAccess<T>(
  url: string,
  credential: LocalCredential | undefined,
  run: (
    git: (args: string[]) => Promise<string>,
    temporary: string,
  ) => Promise<T>,
): Promise<T> {
  url = repositoryUrl(url);
  const temporary = await mkdtemp(join(tmpdir(), "desicast-browse-"));
  try {
    const helper = join(temporary, "credentials.sh");
    await writeFile(
      helper,
      '#!/bin/sh\n[ "$1" = get ] || exit 0\nwhile IFS="=" read -r key value; do\ncase "$key" in protocol) protocol="$value" ;; host) host="$value" ;; esac\ndone\n[ "$protocol" = https ] && [ "$host" = "$DESICAST_GIT_HOST" ] || exit 0\n[ -n "$DESICAST_GIT_TOKEN" ] || exit 0\nprintf "username=%s\\npassword=%s\\n" "$DESICAST_GIT_USER" "$DESICAST_GIT_TOKEN"\n',
      { mode: 0o700 },
    );
    const env = {
      ...quietEnv(),
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      DESICAST_GIT_HOST: new URL(url).host,
      DESICAST_GIT_USER: credential?.username ?? "",
      DESICAST_GIT_TOKEN: credential?.password ?? "",
    };
    const git = async (args: string[]) =>
      (
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
            ...args,
          ],
          { env, timeout: 120_000, maxBuffer: 8 * 1024 * 1024 },
        )
      ).stdout;
    return await run(git, temporary);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
export async function browseRepository(
  value: string,
  branch?: string,
  credential?: LocalCredential,
) {
  const url = repositoryUrl(value);
  credential ??= await localCredential(url);
  try {
    return await withRepositoryAccess(
      url,
      credential,
      async (git, temporary) => {
        const refs = await git([
          "ls-remote",
          "--symref",
          "--",
          url,
          "HEAD",
          "refs/heads/*",
        ]);
        const branches = [
          ...new Set(
            [...refs.matchAll(/^[a-f0-9]+\trefs\/heads\/(.+)$/gm)].map(
              (m) => m[1],
            ),
          ),
        ].sort();
        const defaultBranch =
          refs.match(/^ref: refs\/heads\/(.+)\tHEAD$/m)?.[1] ?? branches[0];
        if (!defaultBranch) throw new Error("empty");
        const selected = branch ?? defaultBranch;
        if (!branches.includes(selected)) throw new Error("branch");
        const tree = join(temporary, "tree");
        await git([
          "clone",
          "--depth=1",
          "--single-branch",
          "--no-tags",
          "--no-checkout",
          "--branch",
          selected,
          "--",
          url,
          tree,
        ]);
        const directories = (
          await git([
            "-C",
            tree,
            "ls-tree",
            "-r",
            "-d",
            "--name-only",
            "-z",
            "HEAD",
          ])
        )
          .split("\0")
          .filter(Boolean);
        return {
          branches,
          defaultBranch,
          branch: selected,
          directories,
          authorization: credential?.method ?? "公开仓库访问",
        };
      },
    );
  } catch {
    throw new Error(
      "无法读取仓库：请检查 HTTPS 地址、网络及本机 Git / gh / glab 登录授权",
    );
  }
}
