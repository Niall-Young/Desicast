import { TreeSelect } from "@/components/ui/tree-select";
import type { TreeNode } from "@/components/ui/tree";

export function DirectoryCascader({
  paths,
  value,
  onChange,
  disabled,
  placeholder = "选择目录",
}: {
  paths: string[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled: boolean;
  placeholder?: string;
}) {
  const nodes = new Map<string, TreeNode>();
  for (const path of paths) {
    const segments = path.split("/");
    for (let depth = 1; depth <= segments.length; depth++) {
      const key = segments.slice(0, depth).join("/");
      if (!nodes.has(key))
        nodes.set(key, { value: key, label: segments[depth - 1] });
    }
  }
  const items: TreeNode[] = [{ value: ".", label: "整个仓库" }];
  for (const [path, node] of nodes) {
    const parent = nodes.get(path.slice(0, path.lastIndexOf("/")));
    if (path.includes("/") && parent) (parent.children ??= []).push(node);
    else items.push(node);
  }
  function select(next: string[]) {
    if (next.includes(".") && !value.includes(".")) onChange(["."]);
    else {
      const directories = next.filter((path) => path !== ".");
      if (directories.length <= 20) onChange(directories);
    }
  }
  return (
    <div className="directory-picker">
      <TreeSelect
        items={items}
        multiple
        value={value}
        onValueChange={select}
        disabled={disabled}
        placeholder={placeholder}
        aria-label="SVG 目录"
        clearLabel="清空目录选择"
        className="w-full"
      />
    </div>
  );
}
