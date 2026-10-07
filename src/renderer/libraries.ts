import lucide from "./design-assets/lucide-row.svg?url";
import lucideDark from "./library-marks/lucide-dark.svg?url";
import tabler from "./design-assets/tabler-row.svg?url";
import unicons from "./design-assets/unicons-row.svg?url";
import mingcute from "./design-assets/mingcute-row.svg?url";
import material from "./design-assets/material-row.svg?url";
import eva from "./design-assets/eva-row.svg?url";
import type { LibraryChanges } from "../core/types";
import { publicSearchCollections } from "../core/search-scope";

const libraryArtwork: Record<
  string,
  { name: string; mark: string; darkMark?: string }
> = {
  lucide: { name: "Lucide", mark: lucide, darkMark: lucideDark },
  tabler: { name: "Tabler Icons", mark: tabler },
  uil: { name: "Unicons", mark: unicons },
  mingcute: { name: "MingCute", mark: mingcute },
  ic: { name: "Material Icons", mark: material },
  eva: { name: "Eva Icons", mark: eva },
};
export const defaultLibraries = publicSearchCollections.map((id) => ({
  id,
  ...libraryArtwork[id],
}));
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
