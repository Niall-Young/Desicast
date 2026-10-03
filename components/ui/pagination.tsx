import * as React from "react";
import {
  LeftRegular,
  RightRegular,
  More1Regular,
  ArrowsLeftRegular,
  ArrowsRightRegular,
} from "@mingcute/react/core-regular";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";

type PaginationProps = Omit<
  React.ComponentProps<"nav">,
  "children" | "onChange"
> & {
  /** Total number of pages. Zero renders no page buttons. */
  count: number;
  /** Current page, starting at 1. */
  page?: number;
  /** Initial uncontrolled page. */
  defaultPage?: number;
  /** Called only when a different, available page is requested. */
  onPageChange?: (page: number) => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  /** Show only previous, current / total, and next. */
  simple?: boolean;
  /** Accessible names for navigation actions; useful for localization. */
  getItemLabel?: (
    type: "page" | "previous" | "next" | "jump-previous" | "jump-next",
    page: number,
  ) => string;
};

const dimension = { sm: "min-w-7", md: "min-w-8", lg: "min-w-10" };
const label = (
  type: "page" | "previous" | "next" | "jump-previous" | "jump-next",
  page: number,
) =>
  type === "previous"
    ? "上一页"
    : type === "next"
      ? "下一页"
      : type === "jump-previous"
        ? `向前跳转至第 ${page} 页`
        : type === "jump-next"
          ? `向后跳转至第 ${page} 页`
          : `第 ${page} 页`;
const integer = (value: number, fallback: number) =>
  Number.isFinite(value)
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.trunc(value))
    : fallback;

// Keep the window bounded even for very large datasets, with stable first/last pages.
function pageItems(
  count: number,
  page: number,
): (number | "start-ellipsis" | "end-ellipsis")[] {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "end-ellipsis", count];
  if (page >= count - 3)
    return [
      1,
      "start-ellipsis",
      count - 4,
      count - 3,
      count - 2,
      count - 1,
      count,
    ];
  return [1, "start-ellipsis", page - 1, page, page + 1, "end-ellipsis", count];
}

function Pagination({
  count,
  page,
  defaultPage = 1,
  onPageChange,
  size = "md",
  disabled = false,
  simple = false,
  getItemLabel = label,
  className,
  "aria-label": ariaLabel = "分页",
  ...props
}: PaginationProps) {
  const total = Math.max(0, integer(count, 0));
  const [internalPage, setInternalPage] = React.useState(defaultPage);
  const current =
    total === 0
      ? 0
      : Math.min(total, Math.max(1, integer(page ?? internalPage, 1)));
  function change(next: number) {
    if (disabled || next < 1 || next > total || next === current) return;
    if (page === undefined) setInternalPage(next);
    onPageChange?.(next);
  }

  return (
    <nav
      {...props}
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      data-slot="pagination"
      data-size={size}
      className={cn("text-sm text-(--nico-color-text)", className)}
    >
      <ul
        data-slot="pagination-list"
        className="m-0 flex list-none flex-wrap items-center gap-1 p-0"
      >
        <li>
          <IconButton
            data-slot="pagination-previous"
            type="button"
            size={size}
            kind="plain"
            disabled={disabled || current <= 1}
            aria-label={getItemLabel("previous", Math.max(1, current - 1))}
            onClick={() => change(current - 1)}
          >
            <LeftRegular className="rtl:rotate-180" />
          </IconButton>
        </li>
        {simple ? (
          <li
            data-slot="pagination-status"
            aria-live="polite"
            aria-atomic="true"
            className="px-2 tabular-nums text-(--nico-color-text-subtle)"
          >
            {current} / {total}
          </li>
        ) : (
          pageItems(total, current).map((item) => {
            const backward = item === "start-ellipsis";
            const target = Math.min(
              total,
              Math.max(1, current + (backward ? -5 : 5)),
            );
            const JumpIcon = backward ? ArrowsLeftRegular : ArrowsRightRegular;
            return (
              <li key={item}>
                {typeof item === "number" ? (
                  <Button
                    data-slot="pagination-page"
                    type="button"
                    size={size}
                    kind={item === current ? "tonal" : "plain"}
                    className={cn(
                      dimension[size],
                      "px-1 tabular-nums",
                      item === current &&
                        "aria-[current=page]:bg-(--nico-color-interaction-selected-brand) aria-[current=page]:text-(--nico-color-text-brand)",
                    )}
                    aria-label={getItemLabel("page", item)}
                    aria-current={item === current ? "page" : undefined}
                    disabled={disabled}
                    onClick={() => change(item)}
                  >
                    {item}
                  </Button>
                ) : (
                  <IconButton
                    data-slot="pagination-ellipsis"
                    data-direction={backward ? "previous" : "next"}
                    type="button"
                    size={size}
                    kind="plain"
                    disabled={disabled}
                    aria-label={getItemLabel(
                      backward ? "jump-previous" : "jump-next",
                      target,
                    )}
                    onClick={() => change(target)}
                    className="group/pagination-jump"
                  >
                    <span aria-hidden="true" className="relative size-4">
                      <More1Regular
                        data-slot="pagination-ellipsis-icon"
                        className="absolute inset-0 group-enabled/pagination-jump:group-hover/pagination-jump:opacity-0 group-focus-visible/pagination-jump:opacity-0"
                      />
                      <JumpIcon
                        data-slot="pagination-jump-icon"
                        className="absolute inset-0 opacity-0 group-enabled/pagination-jump:group-hover/pagination-jump:opacity-100 group-focus-visible/pagination-jump:opacity-100 rtl:rotate-180"
                      />
                    </span>
                  </IconButton>
                )}
              </li>
            );
          })
        )}
        <li>
          <IconButton
            data-slot="pagination-next"
            type="button"
            size={size}
            kind="plain"
            disabled={disabled || current >= total}
            aria-label={getItemLabel("next", Math.min(total, current + 1))}
            onClick={() => change(current + 1)}
          >
            <RightRegular className="rtl:rotate-180" />
          </IconButton>
        </li>
      </ul>
    </nav>
  );
}

export { Pagination };
export type { PaginationProps };
