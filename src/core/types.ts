export type Target = "svg" | "html" | "react" | "vue" | "swiftui";
export interface RepositoryInput {
  access?: "public" | "private";
  name: string;
  url: string;
  branch: string;
  directories: string[];
  username?: string;
  token?: string;
  allowVision: boolean;
}
export interface LibraryChanges {
  versionUpdated?: boolean;
  catalogUpdated?: boolean;
  revision: string;
  detectedAt: string;
  added: number;
  updated: number;
  removed: number;
}
export interface Source {
  access?: "public" | "private";
  createdAt?: string;
  id: string;
  kind: "public" | "repository";
  name: string;
  url?: string;
  branch?: string;
  directories?: string[];
  username?: string;
  allowVision: boolean;
  commit?: string;
  syncedAt?: string;
  error?: string;
  iconCount: number;
  hasCredential?: boolean;
  changes?: LibraryChanges;
}
export interface Icon {
  publicRevision?: string;
  id: string;
  name: string;
  sourceId: string;
  collection: string;
  svg: string;
  sourceUrl: string;
  license?: string;
  licenseUrl?: string;
  commit?: string;
  path?: string;
  reason?: string;
}
export interface SearchInput {
  query: string;
  sourceId?: string;
  collection?: string;
  limit?: number;
  offset?: number;
}
export interface SearchResult {
  icons: Icon[];
  total: number;
  warning?: string;
}
export interface ExportInput {
  id: string;
  target: Target;
  size?: number;
  color?: string;
}
export interface ResourceFile {
  path: string;
  content: string;
}
export interface ExportResult {
  target: Target;
  code: string;
  files: ResourceFile[];
  icon: Icon;
  previewSvg: string;
  instructions: string;
}
export interface ModelSettings {
  id?: string;
  baseUrl: string;
  model: string;
  hasKey?: boolean;
  consent: boolean;
}
export const brandColors = [
  "grey",
  "red",
  "orange",
  "yellow",
  "lime",
  "green",
  "teal",
  "sky",
  "blue",
  "purple",
  "pink",
] as const;
export type BrandColor = (typeof brandColors)[number];
export const interfaceZooms = [100, 110, 125, 150, 200] as const;
export type InterfaceZoom = (typeof interfaceZooms)[number];

export interface Settings {
  theme: "system" | "light" | "dark";
  brandColor?: BrandColor;
  zoom?: InterfaceZoom;
  showInMenuBar?: boolean;
  model: ModelSettings;
  modelProviders?: (ModelSettings & { id: string })[];
}
export interface Collection {
  lastModified?: number;
  version?: string;
  changes?: LibraryChanges;
  id: string;
  name: string;
  total: number;
  license?: string;
  licenseUrl?: string;
  authorUrl?: string;
}
export interface VisionInput {
  dataUrl: string;
  sourceId?: string;
  collection?: string;
  limit?: number;
}
export interface SecretStore {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}
