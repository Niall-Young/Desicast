export async function readClipboardImage(
  items: { types: string[]; getType: (type: string) => Promise<unknown> }[],
): Promise<string | null> {
  for (const item of items) {
    const type = item.types.find((value) =>
      ["image/png", "image/jpeg", "image/webp"].includes(value),
    );
    if (!type) continue;
    const blob = await item.getType(type);
    if (!(blob instanceof Blob)) continue;
    if (blob.size > 8 * 1024 * 1024)
      throw new Error("请选择小于 8 MB 的 PNG、JPEG 或 WebP");
    return `data:${type};base64,${Buffer.from(await blob.arrayBuffer()).toString("base64")}`;
  }
  return null;
}
