import { Attachment3Regular } from "@mingcute/react/core-regular";
import refreshLibrary from "./design-assets/refresh-library.svg?url";
import code from "./design-assets/code.svg?url";
import grid from "./design-assets/grid.svg?url";
import list from "./design-assets/list.svg?url";
import copy_name from "./design-assets/copy-name.svg?url";
import github from "./design-assets/github.svg?url";
import download from "./design-assets/download.svg?url";
import lucide_heading from "./design-assets/lucide-heading.svg?url";
import { defaultLibraries } from "./libraries";
import settings from "./design-assets/settings.svg?url";
import check from "./design-assets/check.svg?url";
import library_search from "./design-assets/library-search.svg?url";
import library_options from "./design-assets/library-options.svg?url";
import library_add from "./design-assets/library-add.svg?url";
import back from "./design-assets/back.svg?url";
import forward from "./design-assets/forward.svg?url";
import sidebar from "./design-assets/sidebar.svg?url";
import add from "./design-assets/add.svg?url";
import search from "./design-assets/search.svg?url";
import book_row from "./design-assets/book-row.svg?url";
import book_card from "./design-assets/book-card.svg?url";
import lucideCard from "./design-assets/lucide-card.svg?url";
import tablerCard from "./design-assets/tabler-card.svg?url";
import uniconsCard from "./design-assets/unicons-card.svg?url";
import mingcuteCard from "./design-assets/mingcute-card.svg?url";
import materialCard from "./design-assets/material-card.svg?url";
import evaCard from "./design-assets/eva-card.svg?url";

const controls = {
  "image-search": Attachment3Regular,
  "refresh-library": refreshLibrary,
  code: code,
  grid: grid,
  list: list,
  "copy-name": copy_name,
  github: github,
  download: download,
  "lucide-heading": lucide_heading,

  settings,
  check,
  "library-search": library_search,
  "library-options": library_options,
  "library-add": library_add,
  back,
  forward,
  sidebar,
  add,
  search,
  "book-row": book_row,
  "book-card": book_card,
};
export function DesignIcon({ name }: { name: keyof typeof controls }) {
  if (name === "image-search") {
    return <Attachment3Regular size={20} aria-hidden="true" />;
  }
  return (
    <img
      className={`design-icon ${name === "check" ? "status-icon" : ""} ${name === "github" || name === "lucide-heading" ? "original-color" : ""}`}
      src={controls[name]}
      alt=""
      aria-hidden="true"
    />
  );
}
const cardMarks: Record<string, string> = {
  lucide: lucideCard,
  tabler: tablerCard,
  uil: uniconsCard,
  mingcute: mingcuteCard,
  ic: materialCard,
  eva: evaCard,
};
export const designNames: Record<string, string> = {
  lucide: "Lucide icon",
  tabler: "Tabler icon",
  ri: "Remix icon",
  uil: "Unicon",
  mingcute: "Mingcute icon",
  ic: "Material icon",
  eva: "Eva icon",
};
export const homeLibraries = [
  "lucide",
  "tabler",
  "uil",
  "mingcute",
  "ic",
  "eva",
].map((id) => ({
  ...defaultLibraries.find((library) => library.id === id)!,
  designName: designNames[id],
}));
export function LibraryMark({
  library,
  card = false,
}: {
  library: (typeof defaultLibraries)[number];
  card?: boolean;
}) {
  const mark = card ? cardMarks[library.id] : library.mark;
  return (
    <span
      className={`library-mark ${card ? "library-mark-card" : ""}`}
      aria-hidden="true"
    >
      <img className={library.darkMark ? "mark-light" : ""} src={mark} alt="" />
      {library.darkMark && (
        <img className="mark-dark" src={library.darkMark} alt="" />
      )}
    </span>
  );
}
