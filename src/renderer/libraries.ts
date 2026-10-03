import lucide from "./design-assets/lucide-row.svg?url";
import lucideDark from "./library-marks/lucide-dark.svg?url";
import tabler from "./design-assets/tabler-row.svg?url";
import remix from "./design-assets/remix-row.svg?url";
import unicons from "./design-assets/unicons-row.svg?url";
import mingcute from "./design-assets/mingcute-row.svg?url";
import material from "./design-assets/material-row.svg?url";
import eva from "./design-assets/eva-row.svg?url";
import type { LibraryChanges } from "../core/types";

export const defaultLibraries = [
  { id: "lucide", name: "Lucide", mark: lucide, darkMark: lucideDark },
  { id: "tabler", name: "Tabler Icons", mark: tabler },
  { id: "ri", name: "Remix Icon", mark: remix },
  { id: "uil", name: "Unicons", mark: unicons },
  { id: "mingcute", name: "MingCute", mark: mingcute },
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
