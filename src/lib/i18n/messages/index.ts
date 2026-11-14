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
import { enSettingsAgents } from "./en/settingsAgents.ts";
import { enSettingsReceiver } from "./en/settingsReceiver.ts";
import { enAvatarCrop } from "./en/avatarCrop.ts";
import { enCharactersPage } from "./en/charactersPage.ts";
import { enRosterPortrait } from "./en/rosterPortrait.ts";
import { enCharUse } from "./en/charUse.ts";
import { enCharSheet } from "./en/charSheet.ts";
import { enCharDetail } from "./en/charDetail.ts";
import { enCharReady } from "./en/charReady.ts";
import { enCharEdit } from "./en/charEdit.ts";
import { enBuilderShell } from "./en/builderShell.ts";
import { enWizard } from "./en/wizard.ts";
import { enBuilderShared } from "./en/builderShared.ts";
import { enBuilderFinish } from "./en/builderFinish.ts";
import { enBuilderSummary } from "./en/builderSummary.ts";
import { enBuilderIdentity } from "./en/builderIdentity.ts";
import { enBuilderAbilitiesStep } from "./en/builderAbilitiesStep.ts";
import { enBuilderExtras } from "./en/builderExtras.ts";
import { enBuilderScreens } from "./en/builderScreens.ts";
import { enBuilderSpells } from "./en/builderSpells.ts";
import { enBuilderRemaining } from "./en/builderRemaining.ts";
import { enBuilderSetup } from "./en/builderSetup.ts";
import { enBuilderCalling } from "./en/builderCalling.ts";
import { enBuilderChoices } from "./en/builderChoices.ts";
import { enBuilderAncestry } from "./en/builderAncestry.ts";
import { enCommon } from "./en/common.ts";
import { enHelp } from "./en/help.ts";
import { enSocial } from "./en/social.ts";
import { enAppShell } from "./en/appShell.ts";
import { enInvite } from "./en/invite.ts";
import { enPlugin } from "./en/plugin.ts";
import { enMonsterEditor } from "./en/monsterEditor.ts";
import { enWorkshop } from "./en/workshop.ts";
import { enCampaignSession } from "./en/campaignSession.ts";
import { enCampaignPanels } from "./en/campaignPanels.ts";
import { enEncounterEvents } from "./en/encounterEvents.ts";
import { enTurnTrace } from "./en/turnTrace.ts";
import { enSetup } from "./en/setup.ts";
import { enPdfImport } from "./en/pdfImport.ts";
import { enCreateCampaign } from "./en/createCampaign.ts";
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
import { ruSettingsAgents } from "./ru/settingsAgents.ts";
import { ruSettingsReceiver } from "./ru/settingsReceiver.ts";
import { ruAvatarCrop } from "./ru/avatarCrop.ts";
import { ruCharactersPage } from "./ru/charactersPage.ts";
import { ruRosterPortrait } from "./ru/rosterPortrait.ts";
import { ruCharUse } from "./ru/charUse.ts";
import { ruCharSheet } from "./ru/charSheet.ts";
import { ruCharDetail } from "./ru/charDetail.ts";
import { ruCharReady } from "./ru/charReady.ts";
import { ruCharEdit } from "./ru/charEdit.ts";
import { ruBuilderShell } from "./ru/builderShell.ts";
import { ruWizard } from "./ru/wizard.ts";
import { ruBuilderShared } from "./ru/builderShared.ts";
import { ruBuilderFinish } from "./ru/builderFinish.ts";
import { ruBuilderSummary } from "./ru/builderSummary.ts";
import { ruBuilderIdentity } from "./ru/builderIdentity.ts";
import { ruBuilderAbilitiesStep } from "./ru/builderAbilitiesStep.ts";
import { ruBuilderExtras } from "./ru/builderExtras.ts";
import { ruBuilderScreens } from "./ru/builderScreens.ts";
import { ruBuilderSpells } from "./ru/builderSpells.ts";
import { ruBuilderRemaining } from "./ru/builderRemaining.ts";
import { ruBuilderSetup } from "./ru/builderSetup.ts";
import { ruBuilderCalling } from "./ru/builderCalling.ts";
import { ruBuilderChoices } from "./ru/builderChoices.ts";
import { ruBuilderAncestry } from "./ru/builderAncestry.ts";
import { ruCommon } from "./ru/common.ts";
import { ruHelp } from "./ru/help.ts";
import { ruSocial } from "./ru/social.ts";
import { ruAppShell } from "./ru/appShell.ts";
import { ruInvite } from "./ru/invite.ts";
import { ruPlugin } from "./ru/plugin.ts";
import { ruMonsterEditor } from "./ru/monsterEditor.ts";
import { ruWorkshop } from "./ru/workshop.ts";
import { ruCampaignSession } from "./ru/campaignSession.ts";
import { ruCampaignPanels } from "./ru/campaignPanels.ts";
import { ruEncounterEvents } from "./ru/encounterEvents.ts";
import { ruTurnTrace } from "./ru/turnTrace.ts";
import { ruSetup } from "./ru/setup.ts";
import { ruPdfImport } from "./ru/pdfImport.ts";
import { ruCreateCampaign } from "./ru/createCampaign.ts";

export const en = { ...enCommon, ...enHelp, ...enSocial, ...enAppShell, ...enInvite, ...enPlugin, ...enMonsterEditor, ...enWorkshop, ...enAdmin, ...enAdminSettings, ...enAdminBackup , ...enAdminStorage , ...enAdminUsers , ...enAdminReports , ...enAdminLog , ...enAdminUsage , ...enAdminInvites , ...enAdminAgents , ...enAdminNetwork , ...enAdminQuality , ...enAdminFields , ...enAdminSpeech , ...enAdminImages , ...enAdminBuiltinSpeech , ...enAdminHarness , ...enAdminAddonCard , ...enAdminAddons , ...enAdminWorlds , ...enAdminPlugins , ...enAdminSpeed , ...enAdminModelChoice , ...enHome , ...enHomeBench , ...enHomeTables , ...enHomeDashboard , ...enAuthDoor , ...enAuthForm , ...enAuthPassword , ...enSettingsPage , ...enSettingsSmall , ...enSettingsAgents , ...enSettingsReceiver , ...enAvatarCrop , ...enCharactersPage , ...enRosterPortrait , ...enCharUse , ...enCharSheet , ...enCharDetail , ...enCharReady , ...enCharEdit , ...enBuilderShell , ...enWizard , ...enBuilderShared , ...enBuilderFinish , ...enBuilderSummary , ...enBuilderIdentity , ...enBuilderAbilitiesStep , ...enBuilderExtras , ...enBuilderScreens , ...enBuilderSpells , ...enBuilderRemaining , ...enBuilderSetup , ...enBuilderCalling , ...enBuilderChoices , ...enBuilderAncestry, ...enCampaignSession, ...enCampaignPanels, ...enEncounterEvents, ...enTurnTrace, ...enCreateCampaign, ...enSetup, ...enPdfImport };
export const MESSAGE_ALIASES = {
  "campaign.afterRoll.error.server": "common.error.network",
  "campaign.characterVoices.error.server": "common.error.network",
  "campaign.companionBuilder.close": "dialog.close",
  "campaign.companionBuilder.error.server": "common.error.network",
  "campaign.companionCommand.error.server": "common.error.network",
  "campaign.companionKeep.error.server": "common.error.network",
  "campaign.companionPaint.error.server": "common.error.network",
  "campaign.diceTray.error.server": "common.error.network",
  "campaign.dmAction.error.server": "common.error.network",
  "campaign.dmAssist.error.server": "common.error.network",
  "campaign.dmBeat.error.server": "common.error.network",
  "campaign.dmBestiary.network": "common.error.network",
  "campaign.dmConsoleParts.close": "dialog.close",
  "campaign.dmDelegation.error.server": "common.error.network",
  "campaign.dmEnemyHp.error.server": "common.error.network",
  "campaign.dmTables.error.server": "common.error.network",
  "campaign.fact.error.server": "common.error.network",
  "campaign.factions.action.cancel": "confirmDialog.cancel",
  "campaign.factions.action.save": "common.action.save",
  "campaign.joinConfirm.cancel": "confirmDialog.cancel",
  "campaign.joinConfirm.error.server": "common.error.network",
  "campaign.lobby.error.server": "common.error.network",
  "campaign.lore.actions.delete": "common.action.delete",
  "campaign.lore.editor.cancel": "confirmDialog.cancel",
  "campaign.lore.editor.save": "common.action.save",
  "campaign.lore.row.close": "dialog.close",
  "campaign.mapPanel.dialog.close": "dialog.close",
  "campaign.mapPanel.error.server": "common.error.network",
  "campaign.market.cancel": "confirmDialog.cancel",
  "campaign.marketEditor.cancel": "confirmDialog.cancel",
  "campaign.notes.error.server": "common.error.network",
  "campaign.overworld.placePartOf.error.network": "common.error.network",
  "campaign.pins.error.server": "common.error.network",
  "campaign.quest.error.server": "common.error.network",
  "campaign.relationship.consent.networkError": "common.error.network",
  "campaign.relationship.pact.form.networkError": "common.error.network",
  "campaign.report.cancel": "confirmDialog.cancel",
  "campaign.session.advance.network": "common.error.network",
  "campaign.session.ask.error.network": "common.error.network",
  "campaign.session.battle.cancel": "confirmDialog.cancel",
  "campaign.session.battle.close": "dialog.close",
  "campaign.session.board.close": "dialog.close",
  "campaign.session.characterJoin.error.server": "common.error.network",
  "campaign.session.characterNotes.cancel": "confirmDialog.cancel",
  "campaign.session.characterNotes.save": "common.action.save",
  "campaign.session.coordination.cancel": "confirmDialog.cancel",
  "campaign.session.dispute.cancel": "confirmDialog.cancel",
  "campaign.session.encounterPrep.delete": "common.action.delete",
  "campaign.session.encounterPrep.save": "common.action.save",
  "campaign.session.encounterRows.delete": "common.action.delete",
  "campaign.session.eventLog.cancel": "confirmDialog.cancel",
  "campaign.session.formation.cancel": "confirmDialog.cancel",
  "campaign.session.formation.error.network": "common.error.network",
  "campaign.session.halted.serverUnreachable": "common.error.network",
  "campaign.session.hand.board.close": "dialog.close",
  "campaign.session.hand.board.serverUnreachable": "common.error.network",
  "campaign.session.initiative.form.cancel": "confirmDialog.cancel",
  "campaign.session.inlineMessageEditor.cancel": "confirmDialog.cancel",
  "campaign.session.inlineMessageEditor.save": "common.action.save",
  "campaign.session.leadEdit.cancel": "confirmDialog.cancel",
  "campaign.session.leadEdit.error.network": "common.error.network",
  "campaign.session.leadEdit.save": "common.action.save",
  "campaign.session.loreCheck.close": "dialog.close",
  "campaign.session.loreCheck.error.network": "common.error.network",
  "campaign.session.networkError": "common.error.network",
  "campaign.session.pact.network": "common.error.network",
  "campaign.session.party.serverUnavailable": "common.error.network",
  "campaign.session.renarrate.cancel": "confirmDialog.cancel",
  "campaign.session.renarrate.error.network": "common.error.network",
  "campaign.session.roll.serverUnreachable": "common.error.network",
  "campaign.session.rules.network": "common.error.network",
  "campaign.session.sideChat.error.network": "common.error.network",
  "campaign.session.sideChat.form.cancel": "confirmDialog.cancel",
  "campaign.story.arc.cancel": "confirmDialog.cancel",
  "campaign.story.chapter.cancel": "confirmDialog.cancel",
  "campaign.story.chapter.save": "common.action.save",
  "campaign.story.npcReview.cancel": "confirmDialog.cancel",
  "campaign.story.npcReview.save": "common.action.save",
  "campaign.story.rewind.cancel": "confirmDialog.cancel",
  "campaign.storyAi.error.network": "common.error.network",
  "campaign.storyboard.delete": "common.action.delete",
  "campaign.storyPanel.action.cancel": "confirmDialog.cancel",
  "campaign.storyPanel.action.save": "common.action.save",
  "campaign.summonDoor.error.server": "common.error.network",
  "campaign.tableRows.delete": "common.action.delete",
  "campaign.voice.error.server": "common.error.network",
  "campaign.voiceDock.close": "dialog.close",
  "charSheet.choice.network": "common.error.network",
  "charSheet.error.network": "common.error.network",
  "charSheet.hopes.cancel": "confirmDialog.cancel",
  "charSheet.hopes.network": "common.error.network",
  "charSheet.levelUp.close": "dialog.close",
  "charSheet.levelUp.error.network": "common.error.network",
  "charSheet.owed.network": "common.error.network",
  "charSheet.spells.network": "common.error.network",
  "commandPalette.close": "dialog.close",
  "dictate.error.server": "common.error.network",
  "dictationShortcut.cancel": "confirmDialog.cancel",
  "promptDialog.cancel": "confirmDialog.cancel",
  "promptDialog.save": "common.action.save",
  "report.cancel": "confirmDialog.cancel",
  "schedule.error.network": "common.error.network",
  "serverAddress.close": "dialog.close",
  "workshop.addon.close": "dialog.close",
  "workshop.bestiary.action.delete": "common.action.delete",
  "workshop.bundle.preview.cancel": "confirmDialog.cancel",
  "workshop.cancel": "confirmDialog.cancel",
  "workshop.contentImport.error.connection": "common.error.network",
  "workshop.context.delete": "common.action.delete",
  "workshop.homebrew.editor.save": "common.action.save",
  "workshop.maps.addon.close": "dialog.close",
  "workshop.maps.layers.delete": "common.action.delete",
  "workshop.maps.selection.action.delete": "common.action.delete",
  "workshop.maps.selection.cancel": "confirmDialog.cancel",
  "workshop.maps.shell.close": "dialog.close",
  "workshop.rulesets.close": "dialog.close",
  "workshop.rulesets.delete": "common.action.delete",
  "workshop.rulesets.save": "common.action.save",
  "workshop.targetParty.save": "common.action.save",
  "workshop.testFight.setup.confirmAction": "common.action.save",
  "workshop.world.atlas.edit.delete.action": "common.action.delete",
  "workshop.world.atlasCard.close": "dialog.close",
  "workshop.world.atlasCard.delete": "common.action.delete",
  "workshop.world.entityEditor.action.cancel": "confirmDialog.cancel",
  "workshop.world.entityEditor.action.save": "common.action.save",
  "workshop.world.entityPage.delete.action": "common.action.delete",
  "workshop.world.panel.cancel": "confirmDialog.cancel",
  "workshop.world.timeline.calendar.save": "common.action.save",
  "admin.addon.err.network": "common.error.network",
  "admin.addons.err.network": "common.error.network",
  "admin.backup.err.reach": "common.error.network",
  "admin.builtinSpeech.err.network": "common.error.network",
  "admin.harness.picture.err.reach": "common.error.network",
  "admin.harness.test.error.reach": "common.error.network",
  "admin.invites.err.network": "common.error.network",
  "admin.probe.err.reach": "common.error.network",
  "admin.storage.err.reach": "common.error.network",
  "admin.worlds.err.network": "common.error.network",
  "auth.err.network": "common.error.network",
  "builder.anc.ab.dex": "common.ability.dexterity",
  "builder.anc.ab.str": "common.ability.strength",
  "builder.bg.skill": "builder.race.skill.term",
  "builder.block.feat.ability.cha": "common.ability.charisma",
  "builder.block.feat.ability.con": "common.ability.constitution",
  "builder.block.feat.ability.dex": "common.ability.dexterity",
  "builder.block.feat.ability.int": "common.ability.intelligence",
  "builder.block.feat.ability.str": "common.ability.strength",
  "builder.block.feat.ability.wis": "common.ability.wisdom",
  "builder.extra.ability.cha": "common.ability.charisma",
  "builder.extra.ability.con": "common.ability.constitution",
  "builder.extra.ability.dex": "common.ability.dexterity",
  "builder.extra.ability.int": "common.ability.intelligence",
  "builder.extra.ability.str": "common.ability.strength",
  "builder.extra.ability.wis": "common.ability.wisdom",
  "builder.feat.choice.ability.cha": "common.ability.charisma",
  "builder.feat.choice.ability.int": "common.ability.intelligence",
  "builder.feat.choice.ability.wis": "common.ability.wisdom",
  "builder.multi.ability.CHA": "common.ability.charisma",
  "builder.multi.ability.CON": "common.ability.constitution",
  "builder.multi.ability.DEX": "common.ability.dexterity",
  "builder.multi.ability.INT": "common.ability.intelligence",
  "builder.multi.ability.STR": "common.ability.strength",
  "builder.multi.ability.WIS": "common.ability.wisdom",
  "builder.race.ability.cha": "common.ability.charisma",
  "builder.race.ability.con": "common.ability.constitution",
  "builder.race.ability.dex": "common.ability.dexterity",
  "builder.race.ability.int": "common.ability.intelligence",
  "builder.race.ability.str": "common.ability.strength",
  "builder.race.ability.wis": "common.ability.wisdom",
  "builder.race.expertise.placeholder": "builder.race.training.placeholder",
  "builder.race.feat.all": "builder.asi.allFeats",
  "builder.race.feat.browse": "builder.asi.browseFeats",
  "builder.race.repeatSkill.label": "builder.race.repeat.label",
  "characters.err.net": "common.error.network",
  "charDetail.backChars": "charUse.new.back",
  "charDetail.dup": "characters.menu.dup",
  "charDetail.dup.busy": "charDetail.st.copy",
  "charDetail.dupEdit": "characters.menu.dupEdit",
  "charDetail.edit": "characters.menu.edit",
  "charDetail.export.busy": "charDetail.st.export",
  "charDetail.portrait.upload": "characters.menu.upload",
  "charEdit.back": "charDetail.backLib",
  "charEdit.err.delete": "characters.err.delete",
  "charEdit.err.net": "common.error.network",
  "charEdit.err.save": "charUse.new.err",
  "charEdit.notfound": "charDetail.notfound",
  "charReady.back": "charDetail.backLib",
  "charReady.notfound": "charDetail.notfound",
  "charSheet.ability.cha": "common.ability.charisma",
  "charSheet.ability.con": "common.ability.constitution",
  "charSheet.ability.dex": "common.ability.dexterity",
  "charSheet.ability.int": "common.ability.intelligence",
  "charSheet.ability.str": "common.ability.strength",
  "charSheet.ability.wis": "common.ability.wisdom",
  "charUse.err.net": "common.error.network",
  "charUse.new.net": "common.error.network",
  "charUse.open": "characters.menu.open",
  "createCampaign.dialog.error.network": "common.error.network",
  "infoDialog.dexterity": "common.ability.dexterity",
  "infoDialog.strength": "common.ability.strength",
  "invite.error.server": "common.error.network",
  "password.network": "common.error.network",
  "settings.pl.network": "common.error.network",
  "settings.recv.err.net": "common.error.network",
  "workshop.monsterEditor.stats.ability.cha": "common.ability.charisma",
  "workshop.monsterEditor.stats.ability.con": "common.ability.constitution",
  "workshop.monsterEditor.stats.ability.dex": "common.ability.dexterity",
  "workshop.monsterEditor.stats.ability.int": "common.ability.intelligence",
  "workshop.monsterEditor.stats.ability.str": "common.ability.strength",
  "workshop.monsterEditor.stats.ability.wis": "common.ability.wisdom",
  "workshop.plugin.publish.serverFailed": "common.error.network",
  "builder.asi.title.ability": "builder.asi.title",
  "builder.race.variant.placeholder": "builder.race.variant.choose",
  "builder.race.skill.placeholder": "builder.race.repeat.placeholder",
  "builder.bg.pick": "builder.race.repeat.placeholder",
  "builder.race.weapon.placeholder": "builder.feat.choice.weapon.placeholder",
  "builder.race.tool.placeholder": "builder.feat.choice.tool.placeholder",
  "builder.screen.action.close": "dialog.close",
  "builder.screen.hp.help.aria": "builder.screen.hp.title",
  "builder.screen.levelup.subclass.label": "builder.screen.levelup.subclass.title",
  "builder.call.subclass": "builder.screen.levelup.subclass.title",
  "builder.call.spec": "builder.screen.levelup.subclass.specialization",
} as const satisfies Record<string, keyof typeof en>;
export type MessageKey = keyof typeof en | keyof typeof MESSAGE_ALIASES;

const ru: Record<string, string> = { ...ruCommon, ...ruHelp, ...ruSocial, ...ruAppShell, ...ruInvite, ...ruPlugin, ...ruMonsterEditor, ...ruWorkshop, ...ruAdmin, ...ruAdminSettings , ...ruAdminBackup , ...ruAdminStorage , ...ruAdminUsers , ...ruAdminReports , ...ruAdminLog , ...ruAdminUsage , ...ruAdminInvites , ...ruAdminAgents , ...ruAdminNetwork , ...ruAdminQuality , ...ruAdminFields , ...ruAdminSpeech , ...ruAdminImages , ...ruAdminBuiltinSpeech , ...ruAdminHarness , ...ruAdminAddonCard , ...ruAdminAddons , ...ruAdminWorlds , ...ruAdminPlugins , ...ruAdminSpeed , ...ruAdminModelChoice , ...ruHome , ...ruHomeBench , ...ruHomeTables , ...ruHomeDashboard , ...ruAuthDoor , ...ruAuthForm , ...ruAuthPassword , ...ruSettingsPage , ...ruSettingsSmall , ...ruSettingsAgents , ...ruSettingsReceiver , ...ruAvatarCrop , ...ruCharactersPage , ...ruRosterPortrait , ...ruCharUse , ...ruCharSheet , ...ruCharDetail , ...ruCharReady , ...ruCharEdit , ...ruBuilderShell , ...ruWizard , ...ruBuilderShared , ...ruBuilderFinish , ...ruBuilderSummary , ...ruBuilderIdentity , ...ruBuilderAbilitiesStep , ...ruBuilderExtras , ...ruBuilderScreens , ...ruBuilderSpells , ...ruBuilderRemaining , ...ruBuilderSetup , ...ruBuilderCalling , ...ruBuilderChoices , ...ruBuilderAncestry, ...ruCampaignSession, ...ruCampaignPanels, ...ruEncounterEvents, ...ruTurnTrace, ...ruCreateCampaign, ...ruSetup, ...ruPdfImport } as Record<string, string>;

function withAliases(messages: Record<string, string>): Record<string, string> {
  const resolved = { ...messages };
  for (const [alias, canonical] of Object.entries(MESSAGE_ALIASES)) {
    const value = messages[canonical];
    if (value !== undefined) resolved[alias] = value;
  }
  return resolved;
}

export const DICTIONARIES: Dictionaries = {
  en: withAliases(en),
  ru: withAliases(ru),
};