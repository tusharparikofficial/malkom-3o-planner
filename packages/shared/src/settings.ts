import { z } from "zod";

/** Runtime settings stored in AppSetting — editable in the UI, no redeploy. */
export const SETTING_KEYS = [
  "brand.primaryColor",
  "brand.primaryHover",
  "brand.primarySoft",
  "brand.logoAssetId",
  "site.title",
  "site.footerNotice",
  "feature.inlineComments",
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const settingValueSchemas: Record<SettingKey, z.ZodTypeAny> = {
  "brand.primaryColor": hexColor,
  "brand.primaryHover": hexColor,
  "brand.primarySoft": hexColor,
  "brand.logoAssetId": z.string().nullable(),
  "site.title": z.string().min(1).max(120),
  "site.footerNotice": z.string().max(500),
  "feature.inlineComments": z.boolean(),
};

/** Official Capgemini palette: Allports #0070AD, Black, White (+ derived tints). */
export const SETTING_DEFAULTS: Record<SettingKey, unknown> = {
  "brand.primaryColor": "#0070AD",
  "brand.primaryHover": "#005A8C",
  "brand.primarySoft": "#E6F1F7",
  "brand.logoAssetId": null,
  "site.title": "MALKOM 3.0 MVP",
  "site.footerNotice":
    "Internal tool. Page usage is tracked per user to improve the MALKOM MVP plan.",
  "feature.inlineComments": true,
};

export interface PublicSettings {
  settings: Record<SettingKey, unknown>;
  devLoginEnabled: boolean;
  ssoEnabled: boolean;
}

export const settingsPatchSchema = z
  .object(
    Object.fromEntries(
      SETTING_KEYS.map((k) => [k, settingValueSchemas[k].optional()]),
    ) as unknown as Record<SettingKey, z.ZodTypeAny>,
  )
  .partial();
