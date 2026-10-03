import type { Collection, Source } from "../core/types";
import type { defaultLibraries } from "./libraries";

export type LibraryType = "default" | "github" | "gitlab";
export type LibraryStatus = "normal" | "updated";
export type LibrarySort = "name-asc" | "name-desc" | "time-asc" | "time-desc";
export interface LibraryFilter {
  types: LibraryType[];
  statuses: LibraryStatus[];
  sort: LibrarySort;
}
export const defaultLibraryFilter: LibraryFilter = {
  types: [],
  statuses: [],
  sort: "name-asc",
};
type Library = (typeof defaultLibraries)[number];
interface Entry {
  library?: Library;
  source?: Source;
  name: string;
  type: LibraryType;
  status?: LibraryStatus;
  time: number;
  index: number;
}
export function filterLibraries(
  libraries: Library[],
  sources: Source[],
  collections: Collection[],
  filter: LibraryFilter,
  query = "",
) {
  const entries: Entry[] = [
    ...libraries.map((library, index): Entry => ({
      library,
      name: library.name,
      type: "default",
      status: collections.find((item) => item.id === library.id)?.changes
        ? "updated"
        : "normal",
      time: 0,
      index,
    })),
    ...sources.map((source, index): Entry => ({
      source,
      name: source.name,
      type:
        new URL(source.url!).hostname === "github.com" ? "github" : "gitlab",
      status: source.changes ? "updated" : source.error ? undefined : "normal",
      time: source.createdAt ? Date.parse(source.createdAt) || 0 : 0,
      index: libraries.length + index,
    })),
  ];
  return entries
    .filter(
      (entry) =>
        entry.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
        (!filter.types.length || filter.types.includes(entry.type)) &&
        (!filter.statuses.length ||
          (entry.status && filter.statuses.includes(entry.status))),
    )
    .sort((a, b) => {
      const difference = filter.sort.startsWith("name")
        ? a.name.localeCompare(b.name, "en", { sensitivity: "base" })
        : a.time - b.time;
      if (difference)
        return filter.sort.endsWith("desc") ? -difference : difference;
      return a.index - b.index;
    });
}
