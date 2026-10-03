import { z } from "zod";
import type { Store } from "./store";

export const libraryPreferenceSchema = z.object({
  id: z.string().min(1).max(200),
  pinned: z.boolean().optional(),
  hidden: z.boolean().optional(),
  name: z.string().trim().min(1).max(100).optional(),
});
export interface LibraryPreference {
  pinned?: boolean;
  hidden?: boolean;
  name?: string;
}
export type LibraryPreferences = Record<string, LibraryPreference>;
export function libraryPreferences(store: Store): LibraryPreferences {
  return store.setting("library-preferences", {});
}
export function saveLibraryPreference(store: Store, input: unknown) {
  const { id, ...patch } = libraryPreferenceSchema.parse(input);
  const preferences = libraryPreferences(store);
  preferences[id] = { ...preferences[id], ...patch };
  store.saveSetting("library-preferences", preferences);
  return preferences;
}
