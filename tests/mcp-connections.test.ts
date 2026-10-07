import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readMcpConnections, trackMcpConnection } from "../src/mcp/connections";

test("MCP tracking excludes self-checks and expired, malformed, and dead sessions", async () => {
  const directory = await mkdtemp(join(tmpdir(), "desicast-connections-"));
  const stop = trackMcpConnection(directory, { name: "Codex", version: "1" });
  const stopCheck = trackMcpConnection(directory, {
    name: "desicast-desktop-check",
    version: "1",
  });
  try {
    assert.deepEqual(readMcpConnections(directory), [
      { name: "Codex", version: "1" },
    ]);
    assert.deepEqual(readMcpConnections(directory, Date.now() + 21_000), []);
    const folder = join(directory, "mcp-connections");
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, "broken.json"), "{");
    await writeFile(
      join(folder, "dead.json"),
      JSON.stringify({
        name: "Dead",
        version: "1",
        pid: 2147483647,
        updatedAt: Date.now(),
      }),
    );
    assert.equal(readMcpConnections(directory).length, 1);
    stop();
    assert.deepEqual(readMcpConnections(directory), []);
  } finally {
    stop();
    stopCheck();
    await rm(directory, { recursive: true, force: true });
  }
});

test("separate stdio clients appear only after MCP initialization and disappear on close", async () => {
  const directory = await mkdtemp(
    join(tmpdir(), "desicast-stdio-connections-"),
  );
  const clients: Client[] = [];
  try {
    for (const name of ["Codex", "Claude Code", "desicast-desktop-check"]) {
      const client = new Client({ name, version: "test" });
      clients.push(client);
      await client.connect(
        new StdioClientTransport({
          command: process.execPath,
          args: [
            "--import",
            "tsx",
            resolve("src/mcp/server.ts"),
            "--data-dir",
            directory,
          ],
          stderr: "pipe",
        }),
      );
      await client.listTools();
    }
    assert.deepEqual(
      readMcpConnections(directory).map((client) => client.name),
      ["Claude Code", "Codex"],
    );
    await clients[0].close();
    for (
      let attempt = 0;
      attempt < 20 && readMcpConnections(directory).length !== 1;
      attempt++
    )
      await delay(25);
    assert.deepEqual(
      readMcpConnections(directory).map((client) => client.name),
      ["Claude Code"],
    );
  } finally {
    await Promise.all(clients.map((client) => client.close()));
    await rm(directory, { recursive: true, force: true });
  }
});
