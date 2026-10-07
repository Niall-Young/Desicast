import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const lifetime = 20_000;
export interface McpConnection {
  name: string;
  version: string;
}

// Stdio servers are separate processes; publish only initialized client metadata.
export function trackMcpConnection(directory: string, client: McpConnection) {
  if (client.name === "desicast-desktop-check") return () => {};
  const folder = join(directory, "mcp-connections");
  const path = join(folder, `${process.pid}-${randomUUID()}.json`);
  const temporary = `${path}.tmp`;
  const publish = () => {
    try {
      mkdirSync(folder, { recursive: true, mode: 0o700 });
      writeFileSync(
        temporary,
        JSON.stringify({
          name: client.name,
          version: client.version,
          pid: process.pid,
          updatedAt: Date.now(),
        }),
        { mode: 0o600 },
      );
      renameSync(temporary, path);
    } catch {
      // Status reporting must never interrupt the MCP protocol.
    }
  };
  publish();
  const timer = setInterval(publish, 5_000);
  timer.unref();
  return () => {
    clearInterval(timer);
    for (const file of [path, temporary]) {
      try {
        unlinkSync(file);
      } catch {}
    }
  };
}

export function readMcpConnections(
  directory: string,
  now = Date.now(),
): McpConnection[] {
  const folder = join(directory, "mcp-connections");
  let files: string[];
  try {
    files = readdirSync(folder);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const connections: McpConnection[] = [];
  for (const file of files.filter((name) => name.endsWith(".json"))) {
    try {
      const value = JSON.parse(readFileSync(join(folder, file), "utf8"));
      if (
        !Number.isInteger(value.pid) ||
        value.pid <= 0 ||
        !Number.isFinite(value.updatedAt) ||
        now - value.updatedAt > lifetime ||
        value.updatedAt > now + 5_000 ||
        typeof value.name !== "string" ||
        typeof value.version !== "string"
      )
        continue;
      process.kill(value.pid, 0);
      connections.push({
        name:
          value.name.replace(/[\x00-\x1f\x7f]/g, " ").slice(0, 80) ||
          "MCP client",
        version: value.version.replace(/[\x00-\x1f\x7f]/g, " ").slice(0, 40),
      });
    } catch {
      // Ignore partial, malformed, and exited-process records.
    }
  }
  return connections.sort((a, b) => a.name.localeCompare(b.name));
}
