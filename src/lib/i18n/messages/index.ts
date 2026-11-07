// Every language's messages in one place. English is complete by
// construction (its keys are the message keys); a language may lack some,
// and those are read in English (core.ts lookup). Add an area by adding its
// en/ and ru/ files here.
import type { Dictionaries } from "../core.ts";
import { enAdmin } from "./en/admin.ts";
import { enAdminSettings } from "./en/adminSettings.ts";
import { enAdminBackup } from "./en/adminBackup.ts";
import { enCommon } from "./en/common.ts";
import { ruAdmin } from "./ru/admin.ts";
import { ruAdminSettings } from "./ru/adminSettings.ts";
import { ruAdminBackup } from "./ru/adminBackup.ts";
import { ruCommon } from "./ru/common.ts";

export const en = { ...enCommon, ...enAdmin, ...enAdminSettings, ...enAdminBackup };
export type MessageKey = keyof typeof en;

const ru: Record<string, string> = { ...ruCommon, ...ruAdmin, ...ruAdminSettings , ...ruAdminBackup } as Record<string, string>;

export const DICTIONARIES: Dictionaries = { en, ru };
