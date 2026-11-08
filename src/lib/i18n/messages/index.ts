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
import { enAdminQuality } from "./en/adminQuality.ts";
import { enAdminFields } from "./en/adminFields.ts";
import { enAdminSpeech } from "./en/adminSpeech.ts";
import { enAdminImages } from "./en/adminImages.ts";
import { enAdminBuiltinSpeech } from "./en/adminBuiltinSpeech.ts";
import { enAdminHarness } from "./en/adminHarness.ts";
import { enAdminAddonCard } from "./en/adminAddonCard.ts";
import { enAdminAddons } from "./en/adminAddons.ts";
import { enAdminWorlds } from "./en/adminWorlds.ts";
import { enAdminPlugins } from "./en/adminPlugins.ts";
import { enAdminSpeed } from "./en/adminSpeed.ts";
import { enAdminModelChoice } from "./en/adminModelChoice.ts";
import { enHome } from "./en/home.ts";
import { enHomeBench } from "./en/homeBench.ts";
import { enHomeTables } from "./en/homeTables.ts";
import { enHomeDashboard } from "./en/homeDashboard.ts";
import { enAuthDoor } from "./en/authDoor.ts";
import { enAuthForm } from "./en/authForm.ts";
import { enAuthPassword } from "./en/authPassword.ts";
import { enSettingsPage } from "./en/settingsPage.ts";
import { enSettingsSmall } from "./en/settingsSmall.ts";
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
import { ruAdminQuality } from "./ru/adminQuality.ts";
import { ruAdminFields } from "./ru/adminFields.ts";
import { ruAdminSpeech } from "./ru/adminSpeech.ts";
import { ruAdminImages } from "./ru/adminImages.ts";
import { ruAdminBuiltinSpeech } from "./ru/adminBuiltinSpeech.ts";
import { ruAdminHarness } from "./ru/adminHarness.ts";
import { ruAdminAddonCard } from "./ru/adminAddonCard.ts";
import { ruAdminAddons } from "./ru/adminAddons.ts";
import { ruAdminWorlds } from "./ru/adminWorlds.ts";
import { ruAdminPlugins } from "./ru/adminPlugins.ts";
import { ruAdminSpeed } from "./ru/adminSpeed.ts";
import { ruAdminModelChoice } from "./ru/adminModelChoice.ts";
import { ruHome } from "./ru/home.ts";
import { ruHomeBench } from "./ru/homeBench.ts";
import { ruHomeTables } from "./ru/homeTables.ts";
import { ruHomeDashboard } from "./ru/homeDashboard.ts";
import { ruAuthDoor } from "./ru/authDoor.ts";
import { ruAuthForm } from "./ru/authForm.ts";
import { ruAuthPassword } from "./ru/authPassword.ts";
import { ruSettingsPage } from "./ru/settingsPage.ts";
import { ruSettingsSmall } from "./ru/settingsSmall.ts";
import { ruCommon } from "./ru/common.ts";

export const en = { ...enCommon, ...enAdmin, ...enAdminSettings, ...enAdminBackup , ...enAdminStorage , ...enAdminUsers , ...enAdminReports , ...enAdminLog , ...enAdminUsage , ...enAdminInvites , ...enAdminAgents , ...enAdminNetwork , ...enAdminQuality , ...enAdminFields , ...enAdminSpeech , ...enAdminImages , ...enAdminBuiltinSpeech , ...enAdminHarness , ...enAdminAddonCard , ...enAdminAddons , ...enAdminWorlds , ...enAdminPlugins , ...enAdminSpeed , ...enAdminModelChoice , ...enHome , ...enHomeBench , ...enHomeTables , ...enHomeDashboard , ...enAuthDoor , ...enAuthForm , ...enAuthPassword , ...enSettingsPage , ...enSettingsSmall };
export type MessageKey = keyof typeof en;

const ru: Record<string, string> = { ...ruCommon, ...ruAdmin, ...ruAdminSettings , ...ruAdminBackup , ...ruAdminStorage , ...ruAdminUsers , ...ruAdminReports , ...ruAdminLog , ...ruAdminUsage , ...ruAdminInvites , ...ruAdminAgents , ...ruAdminNetwork , ...ruAdminQuality , ...ruAdminFields , ...ruAdminSpeech , ...ruAdminImages , ...ruAdminBuiltinSpeech , ...ruAdminHarness , ...ruAdminAddonCard , ...ruAdminAddons , ...ruAdminWorlds , ...ruAdminPlugins , ...ruAdminSpeed , ...ruAdminModelChoice , ...ruHome , ...ruHomeBench , ...ruHomeTables , ...ruHomeDashboard , ...ruAuthDoor , ...ruAuthForm , ...ruAuthPassword , ...ruSettingsPage , ...ruSettingsSmall } as Record<string, string>;

export const DICTIONARIES: Dictionaries = { en, ru };
