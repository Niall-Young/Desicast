import { Checkbox } from "@base-ui/react/checkbox";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { CheckRegular } from "@mingcute/react/core-regular";
import { IconButton } from "@/components/ui/icon-button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { DesignIcon } from "./design";
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
            {group.key === "sorts" ? (
              <RadioGroup
                className="library-options-sort"
                aria-label="排序"
                value={value.sort}
                onValueChange={selectSort}
              >
                {group.options.map(([option, label]) => (
                  <Radio.Root
                    key={option}
                    value={option}
                    className="library-options-item"
                  >
                    <span>{label}</span>
                    <Radio.Indicator className="library-options-check">
                      <CheckRegular aria-hidden="true" size={16} />
                    </Radio.Indicator>
                  </Radio.Root>
                ))}
              </RadioGroup>
            ) : (
              group.options.map(([option, label]) => (
                <Checkbox.Root
                  key={option}
                  className="library-options-item"
                  checked={(value[group.key] as string[]).includes(option)}
                  onCheckedChange={() => toggle(group.key, option)}
                >
                  <span>{label}</span>
                  <Checkbox.Indicator className="library-options-check">
                    <CheckRegular aria-hidden="true" size={16} />
                  </Checkbox.Indicator>
                </Checkbox.Root>
              ))
            )}
          </section>
        ))}
      </PopoverContent>
    </Popover>
  );
}
