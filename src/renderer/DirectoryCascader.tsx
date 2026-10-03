import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { CloseRegular, RightRegular } from "@mingcute/react/core-regular";
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
  const [trail, setTrail] = useState<string[]>([]);
  const columns = ["", ...trail];
  function select(path: string) {
    if (value.includes(path)) onChange(value.filter((p) => p !== path));
    else if (value.length < 20)
      onChange(
        path === "." ? ["."] : [...value.filter((p) => p !== "."), path],
      );
  }
  return (
    <div className="directory-picker">
      <Popover>
        <PopoverTrigger
          render={
            <Button kind="ghost" disabled={disabled} aria-label="SVG 目录" />
          }
        >
          {value.length ? `已选择 ${value.length} 个目录` : placeholder}{" "}
          <RightRegular size={16} />
        </PopoverTrigger>
        <PopoverContent className="directory-cascader" align="start">
          <label className="directory-option">
            <input
              type="checkbox"
              checked={value.includes(".")}
              onChange={() => select(".")}
            />
            整个仓库
          </label>
          <div className="directory-columns">
            {columns.map((parent, depth) => {
              const children = paths.filter(
                (p) =>
                  (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "") ===
                  parent,
              );
              return (
                <div className="directory-column" key={parent}>
                  {children.length ? (
                    children.map((path) => (
                      <div className="directory-option" key={path}>
                        <input
                          aria-label={`选择目录 ${path}`}
                          type="checkbox"
                          checked={value.includes(path)}
                          onChange={() => select(path)}
                        />
                        <Button
                          kind="plain"
                          size="sm"
                          onClick={() =>
                            setTrail([...trail.slice(0, depth), path])
                          }
                        >
                          {path.split("/").at(-1)}
                          {paths.some((p) => p.startsWith(path + "/")) && (
                            <RightRegular size={14} />
                          )}
                        </Button>
                      </div>
                    ))
                  ) : (
                    <span className="hint">没有子目录</span>
                  )}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
      <div className="directory-tags">
        {value.map((path) => (
          <span className="directory-tag" key={path}>
            {path === "." ? "整个仓库" : path}
            <IconButton
              aria-label={`移除目录 ${path}`}
              size="sm"
              kind="plain"
              onClick={() => onChange(value.filter((p) => p !== path))}
            >
              <CloseRegular size={12} />
            </IconButton>
          </span>
        ))}
      </div>
    </div>
  );
}
