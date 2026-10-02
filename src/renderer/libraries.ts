import lucide from "./library-marks/lucide.svg?url";
import lucideDark from "./library-marks/lucide-dark.svg?url";
import tabler from "./library-marks/tabler.svg?url";
import remix from "./library-marks/ri.svg?url";
import unicons from "./library-marks/uil.svg?url";
import mingcute from "./library-marks/mingcute.svg?url";
import material from "./library-marks/material.svg?url";
import eva from "./library-marks/eva.svg?url";
import type { LibraryChanges } from "../core/types";

export const defaultLibraries = [
  { id: "lucide", name: "Lucide", mark: lucide, darkMark: lucideDark },
  { id: "tabler", name: "Tabler Icons", mark: tabler },
  { id: "ri", name: "Remix Icon", mark: remix },
  { id: "uil", name: "Unicons", mark: unicons, monochrome: true },
  { id: "mingcute", name: "MingCute", mark: mingcute, monochrome: true },
  { id: "ic", name: "Material Icons", mark: material },
  { id: "eva", name: "Eva Icons", mark: eva },
];
export function changeDescription(changes: LibraryChanges) {
  return [
    changes.versionUpdated ? "版本更新" : changes.catalogUpdated && "图库更新",
    changes.added && `新增 ${changes.added}`,
    changes.updated && `更新 ${changes.updated}`,
    changes.removed && `删除 ${changes.removed}`,
  ]
    .filter(Boolean)
    .join(" · ");
}
