import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:https";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { IconService } from "../src/core/service";
import { browseRepository } from "../src/core/repository-access";
import { MemorySecrets } from "../src/core/secrets";
const exec = promisify(execFile);
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>';

test("Authenticated HTTPS Git sync works without interactive prompts and atomically applies add/change/delete", async () => {
  const directory = await mkdtemp(join(tmpdir(), "desicast-https-"));
  const seed = join(directory, "seed"),
    repositories = join(directory, "repositories"),
    bare = join(repositories, "icons.git"),
    cert = join(directory, "cert.pem"),
    key = join(directory, "key.pem");
  const previousCA = process.env.GIT_SSL_CAINFO;
  const previousGlobal = process.env.GIT_CONFIG_GLOBAL;
  let rejectCredentials = false;
  const service = new IconService(join(directory, "data"), new MemorySecrets());
  const server = createServer({});
  try {
    await mkdir(join(seed, "icons"), { recursive: true });
    await mkdir(repositories);
    await exec("openssl", [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      key,
      "-out",
      cert,
      "-days",
      "1",
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost,IP:127.0.0.1",
    ]);
    await exec("git", ["init", "-b", "main", seed]);
    await writeFile(join(seed, "icons/search.svg"), svg);
    await writeFile(join(seed, "icons/old.svg"), svg);
    const commit = async (message: string) => {
      await exec("git", ["-C", seed, "add", "icons"]);
      await exec("git", [
        "-C",
        seed,
        "-c",
        "user.name=DesiCast fixture",
        "-c",
        "user.email=fixture@desicast.invalid",
        "commit",
        "-m",
        message,
      ]);
    };
    await commit("initial fixture");
    await exec("git", ["clone", "--bare", seed, bare]);
    const backend = join(
      (await exec("git", ["--exec-path"])).stdout.trim(),
      "git-http-backend",
    );
    server.setSecureContext({
      key: await readFile(key),
      cert: await readFile(cert),
    });
    server.on("request", (request, response) => {
      if (
        rejectCredentials ||
        request.headers.authorization !==
          `Basic ${Buffer.from("oauth2:fixture-token").toString("base64")}`
      ) {
        response.writeHead(401, {
          "WWW-Authenticate": 'Basic realm="Iconcast fixture"',
        });
        response.end();
        return;
      }
      const url = new URL(request.url!, "https://localhost");
      const child = execFile(
        backend,
        {
          env: {
            ...process.env,
            GIT_PROJECT_ROOT: repositories,
            GIT_HTTP_EXPORT_ALL: "1",
            PATH_INFO: url.pathname,
            QUERY_STRING: url.search.slice(1),
            REQUEST_METHOD: request.method!,
            CONTENT_TYPE: request.headers["content-type"] ?? "",
            CONTENT_LENGTH: request.headers["content-length"] ?? "",
            REMOTE_USER: "fixture",
            HTTP_GIT_PROTOCOL:
              (request.headers["git-protocol"] as string) ?? "",
          },
          encoding: "buffer",
          maxBuffer: 5 * 1024 * 1024,
        },
        (error, output) => {
          if (error) {
            response.writeHead(500);
            response.end();
            return;
          }
          const boundary = output.indexOf("\r\n\r\n"),
            headers = output.subarray(0, boundary).toString().split("\r\n");
          for (const header of headers) {
            const colon = header.indexOf(":");
            if (colon < 0) continue;
            const name = header.slice(0, colon),
              value = header.slice(colon + 1).trim();
            if (name === "Status")
              response.statusCode = Number(value.split(" ")[0]);
            else response.setHeader(name, value);
          }
          response.end(output.subarray(boundary + 4));
        },
      );
      request.pipe(child.stdin!);
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    process.env.GIT_SSL_CAINFO = cert;
    const address = server.address() as { port: number };
    const source = await service.addRepository({
      name: "Private team",
      url: `https://127.0.0.1:${address.port}/icons.git`,
      branch: "main",
      directories: ["icons"],
      token: "fixture-token",
      allowVision: false,
    });
    const metadata = await browseRepository(source.url!, undefined, {
      username: "oauth2",
      password: "fixture-token",
      method: "fixture",
    });
    assert.deepEqual(metadata.branches, ["main"]);
    assert.equal(metadata.branch, "main");
    assert.deepEqual(metadata.directories, ["icons"]);
    assert.equal(JSON.stringify(metadata).includes("fixture-token"), false);
    await assert.rejects(
      browseRepository(source.url!, "missing", {
        username: "oauth2",
        password: "fixture-token",
        method: "fixture",
      }),
    );
    const first = await service.sync(source.id);
    assert.equal(first.iconCount, 2);
    assert.equal(first.changes, undefined);
    assert.ok(first.commit);
    await rm(join(seed, "icons/old.svg"));
    await writeFile(
      join(seed, "icons/search.svg"),
      svg.replace('r="8"', 'r="6"'),
    );
    await writeFile(join(seed, "icons/new.svg"), svg);
    await commit("updated fixture");
    await exec("git", ["-C", seed, "push", bare, "main"]);
    const second = await service.sync(source.id);
    assert.notEqual(second.commit, first.commit);
    assert.equal(second.iconCount, 2);
    assert.deepEqual(
      second.changes && {
        added: second.changes.added,
        updated: second.changes.updated,
        removed: second.changes.removed,
      },
      { added: 1, updated: 1, removed: 1 },
    );
    assert.equal(service.store.icon(`${source.id}:icons/old.svg`), undefined);
    assert.match(
      service.store.icon(`${source.id}:icons/search.svg`)!.svg,
      /r="6"/,
    );
    assert.ok(service.store.icon(`${source.id}:icons/new.svg`));
    const helper = join(directory, "local-credentials.sh");
    await writeFile(
      helper,
      '#!/bin/sh\n[ "$1" = get ] || exit 0\nprintf "username=oauth2\\npassword=fixture-token\\n"\n',
      { mode: 0o700 },
    );
    const config = join(directory, "gitconfig");
    await writeFile(config, `[credential]\n\thelper = ${helper}\n`);
    process.env.GIT_CONFIG_GLOBAL = config;
    const localMetadata = await browseRepository(source.url!);
    assert.equal(localMetadata.authorization, "本机 Git 凭据");
    const localSource = await service.addRepository({
      name: "Local authorization",
      url: source.url!,
      branch: "main",
      directories: ["icons"],
      allowVision: false,
    });
    assert.equal((await service.sync(localSource.id)).iconCount, 2);
    assert.equal(
      JSON.stringify(service.store.sources()).includes("fixture-token"),
      false,
    );
    rejectCredentials = true;
    await assert.rejects(service.sync(source.id));
    assert.equal(service.store.source(source.id)?.commit, second.commit);
    assert.equal(service.store.local("", source.id).length, 2);
  } finally {
    service.close();
    if (previousGlobal === undefined) delete process.env.GIT_CONFIG_GLOBAL;
    else process.env.GIT_CONFIG_GLOBAL = previousGlobal;
    if (previousCA === undefined) delete process.env.GIT_SSL_CAINFO;
    else process.env.GIT_SSL_CAINFO = previousCA;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
