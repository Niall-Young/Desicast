import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { SecretStore } from "./types";
const exec = promisify(execFile);

export class KeychainSecrets implements SecretStore {
  constructor(private service = "com.niallyoung.desicast") {}
  async get(key: string) {
    try {
      return (
        await exec("/usr/bin/security", [
          "find-generic-password",
          "-s",
          this.service,
          "-a",
          key,
          "-w",
        ])
      ).stdout.trimEnd();
    } catch {
      return undefined;
    }
  }
  async set(key: string, value: string) {
    try {
      await exec("/usr/bin/security", [
        "add-generic-password",
        "-U",
        "-s",
        this.service,
        "-a",
        key,
        "-w",
        value,
      ]);
    } catch {
      throw new Error("无法保存到 macOS Keychain，请检查钥匙串访问权限");
    }
  }
  async delete(key: string) {
    try {
      await exec("/usr/bin/security", [
        "delete-generic-password",
        "-s",
        this.service,
        "-a",
        key,
      ]);
    } catch {}
  }
}
export class MemorySecrets implements SecretStore {
  private values = new Map<string, string>();
  async get(key: string) {
    return this.values.get(key);
  }
  async set(key: string, value: string) {
    this.values.set(key, value);
  }
  async delete(key: string) {
    this.values.delete(key);
  }
}
