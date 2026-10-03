import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { DesignIcon } from "./design";
import check from "./design-assets/filter-check.svg?url";
import {
  defaultLibraryFilter,
  type LibraryFilter,
  type LibrarySort,
} from "./library-filter";

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
  function toggle(key: "types" | "statuses", option: string) {
    const current = value[key] as string[];
    const next = current.includes(option)
      ? current.filter((item) => item !== option)
      : [...current, option];
    onChange({ ...value, [key]: next } as LibraryFilter);
  }
  function selectSort(option: LibrarySort) {
    onChange({ ...value, sort: option });
  }
  const active =
    value.types.length + value.statuses.length > 0 ||
    value.sort !== defaultLibraryFilter.sort;
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
              const selected =
                group.key === "sorts"
                  ? value.sort === option
                  : (value[group.key] as string[]).includes(option);
              return (
                <Button
                  key={option}
                  kind="plain"
                  className="library-options-item"
                  aria-pressed={selected}
                  onClick={() =>
                    group.key === "sorts"
                      ? selectSort(option as LibrarySort)
                      : toggle(group.key, option)
                  }
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
