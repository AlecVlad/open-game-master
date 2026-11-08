// Every language's messages in one place. English is complete by
// construction (its keys are the message keys); a language may lack some,
// and those are read in English (core.ts lookup). Add an area by adding its
// en/ and ru/ files here.
import type { Dictionaries } from "../core.ts";
import { enAdmin } from "./en/admin.ts";
import { enAdminSettings } from "./en/adminSettings.ts";
import { enAdminBackup } from "./en/adminBackup.ts";
import { enAdminStorage } from "./en/adminStorage.ts";
import { enAdminUsers } from "./en/adminUsers.ts";
import { enAdminReports } from "./en/adminReports.ts";
import { enAdminLog } from "./en/adminLog.ts";
import { enAdminUsage } from "./en/adminUsage.ts";
import { enAdminInvites } from "./en/adminInvites.ts";
import { enAdminAgents } from "./en/adminAgents.ts";
import { enAdminNetwork } from "./en/adminNetwork.ts";
import { enCommon } from "./en/common.ts";
import { ruAdmin } from "./ru/admin.ts";
import { ruAdminSettings } from "./ru/adminSettings.ts";
import { ruAdminBackup } from "./ru/adminBackup.ts";
import { ruAdminStorage } from "./ru/adminStorage.ts";
import { ruAdminUsers } from "./ru/adminUsers.ts";
import { ruAdminReports } from "./ru/adminReports.ts";
import { ruAdminLog } from "./ru/adminLog.ts";
import { ruAdminUsage } from "./ru/adminUsage.ts";
import { ruAdminInvites } from "./ru/adminInvites.ts";
import { ruAdminAgents } from "./ru/adminAgents.ts";
import { ruAdminNetwork } from "./ru/adminNetwork.ts";
import { ruCommon } from "./ru/common.ts";

export const en = { ...enCommon, ...enAdmin, ...enAdminSettings, ...enAdminBackup , ...enAdminStorage , ...enAdminUsers , ...enAdminReports , ...enAdminLog , ...enAdminUsage , ...enAdminInvites , ...enAdminAgents , ...enAdminNetwork };
export type MessageKey = keyof typeof en;

const ru: Record<string, string> = { ...ruCommon, ...ruAdmin, ...ruAdminSettings , ...ruAdminBackup , ...ruAdminStorage , ...ruAdminUsers , ...ruAdminReports , ...ruAdminLog , ...ruAdminUsage , ...ruAdminInvites , ...ruAdminAgents , ...ruAdminNetwork } as Record<string, string>;

export const DICTIONARIES: Dictionaries = { en, ru };
