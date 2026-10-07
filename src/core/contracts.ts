import { z } from "zod";
import { brandColors } from "./types";
export const targetSchema = z.enum(["svg", "html", "react", "vue", "swiftui"]);
export const searchSchema = z.object({
  query: z.string().max(300).default(""),
  sourceId: z.string().optional(),
  collection: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  limit: z.number().int().min(1).max(96).optional(),
  offset: z.number().int().min(0).max(1_000_000).optional(),
});
export const exportSchema = z.object({
  id: z.string().min(1).max(1000),
  target: targetSchema.default("svg"),
  size: z.number().int().min(8).max(1024).optional(),
  color: z
    .string()
    .regex(/^(#[0-9a-fA-F]{3,8}|currentColor|[a-zA-Z]{1,24})$/)
    .optional(),
});
export const repositorySchema = z.object({
  access: z.enum(["public", "private"]).optional(),
  name: z.string().min(1).max(100),
  url: z.string().max(2000),
  branch: z.string().min(1).max(200),
  directories: z.array(z.string().max(500)).min(1).max(20),
  username: z.string().max(200).optional(),
  token: z.string().max(4096).optional(),
  allowVision: z.boolean().default(true),
});
export const settingsSchema = z.object({
  showInMenuBar: z.boolean().optional(),
  theme: z.enum(["system", "light", "dark"]),
  brandColor: z.enum(brandColors).optional(),
  zoom: z
    .union([
      z.literal(100),
      z.literal(110),
      z.literal(125),
      z.literal(150),
      z.literal(200),
    ])
    .optional(),
  model: z.object({
    id: z.string().max(100).optional(),
    baseUrl: z.string().max(2000),
    model: z.string().max(200),
    consent: z.boolean(),
  }),
});
export const visionSchema = z.object({
  dataUrl: z.string().max(12_000_000),
  sourceId: z.string().optional(),
  collection: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  limit: z.number().int().min(1).max(12).optional(),
});
