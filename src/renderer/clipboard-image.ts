export function clipboardImage(
  data: Pick<DataTransfer, "items" | "files">,
): File | undefined {
  for (const item of Array.from(data.items)) {
    if (!item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (file) return file;
  }
  return Array.from(data.files).find((file) => file.type.startsWith("image/"));
}
