// Every language's messages in one place. English is complete by
// construction (its keys are the message keys); a language may lack some,
// and those are read in English (core.ts lookup). Add an area by adding its
// en/ and ru/ files here.
import type { Dictionaries } from "../core.ts";
import { enAdmin } from "./en/admin.ts";
import { enCommon } from "./en/common.ts";
import { ruAdmin } from "./ru/admin.ts";
import { ruCommon } from "./ru/common.ts";

export const en = { ...enCommon, ...enAdmin };
export type MessageKey = keyof typeof en;

const ru: Partial<Record<MessageKey, string>> = { ...ruCommon, ...ruAdmin };

export const DICTIONARIES: Dictionaries = { en, ru: ru as Record<string, string> };
