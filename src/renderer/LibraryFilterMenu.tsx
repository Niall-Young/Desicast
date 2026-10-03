import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { DesignIcon } from "./design";
import check from "./design-assets/filter-check.svg?url";
import type { LibraryFilter } from "./library-filter";

const groups = [
  {
    key: "types",
    title: "仓库类型",
    options: [
      ["default", "默认仓库"],
      ["github", "Github 仓库"],
      ["gitlab", "Gitlab 仓库"],
    ],
  },
  {
    key: "statuses",
    title: "仓库状态",
    options: [
      ["normal", "正常"],
      ["updated", "有更新"],
    ],
  },
  {
    key: "sorts",
    title: "排序",
    options: [
      ["name-asc", "首字母正序"],
      ["name-desc", "首字母倒序"],
      ["time-asc", "添加时间正序"],
      ["time-desc", "添加时间倒序"],
    ],
  },
] as const;

export function LibraryFilterMenu({
  value,
  onChange,
}: {
  value: LibraryFilter;
  onChange: (value: LibraryFilter) => void;
}) {
  function toggle(key: keyof LibraryFilter, option: string) {
    const current: string[] = value[key];
    const next = current.includes(option)
      ? current.filter((item) => item !== option)
      : [
          ...current.filter(
            (item) =>
              key !== "sorts" || item.split("-")[0] !== option.split("-")[0],
          ),
          option,
        ];
    onChange({ ...value, [key]: next });
  }
  const active =
    value.types.length + value.statuses.length + value.sorts.length > 0;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <IconButton
            kind="plain"
            size="sm"
            aria-label="图库选项"
            data-active={active}
          />
        }
      >
        <DesignIcon name="library-options" />
      </PopoverTrigger>
      <PopoverContent
        className="library-options-popup"
        align="end"
        aria-label="筛选配置"
      >
        {groups.map((group) => (
          <section key={group.key} aria-label={group.title}>
            <div className="library-options-title">{group.title}</div>
            {group.options.map(([option, label]) => {
              const selected = (value[group.key] as string[]).includes(option);
              return (
                <Button
                  key={option}
                  kind="plain"
                  className="library-options-item"
                  aria-pressed={selected}
                  onClick={() => toggle(group.key, option)}
                >
                  <span>{label}</span>
                  {selected && (
                    <img
                      src={check}
                      width="16"
                      height="16"
                      alt=""
                      className="library-options-check"
                      aria-hidden="true"
                    />
                  )}
                </Button>
              );
            })}
          </section>
        ))}
      </PopoverContent>
    </Popover>
  );
}
