"use client";

import { PageSection } from "@/components/PageShell";
import { ui } from "@/lib/ui";
import { useI18n } from "@/lib/i18n/provider";
import {
  Field,
  SecretField,
  SelectField,
  type EnvDefaults,
  type MaskedConfig,
  inheritedHint,
} from "@/app/admin/AdminSettingsFields";

// The two sections about how the server is reached from outside: live voice
// and Discord sign-in. A world an app hosts owns both itself, so the panel
// leaves this whole file out there.
export function AdminNetworkSections({
  config,
  env,
  setConfig,
  voiceUnroutable,
  discordSecret,
  setDiscordSecret,
}: {
  config: MaskedConfig;
  env: EnvDefaults;
  setConfig: (next: MaskedConfig) => void;
  voiceUnroutable: boolean;
  discordSecret: string;
  setDiscordSecret: (value: string) => void;
}) {
  const { t } = useI18n();
  const state = (on: boolean) => t(on ? "admin.network.on" : "admin.network.off");
  return (
    <>
        <PageSection id="admin-voice" heading={t("admin.network.voice.heading")} glyph="ui-voice">
          <p className="mb-3 text-xs text-stone-500">
            {t("admin.network.voice.intro1")}<strong>{t("admin.network.voice.https")}</strong>{t("admin.network.voice.intro2")}<strong>{t("admin.network.voice.onePort")}</strong>{t("admin.network.voice.intro3")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label={t("admin.network.voice.heading")}
              hint={
                config.voiceChat.enabled === ""
                  ? t("admin.network.voice.hint.following", { state: state(env.voiceEnabled) })
                  : t("admin.network.voice.hint.override")
              }
              value={config.voiceChat.enabled}
              onChange={(enabled) => setConfig({ ...config, voiceChat: { ...config.voiceChat, enabled } })}
              options={[
                { value: "", label: t("admin.network.voice.opt.config", { state: state(env.voiceEnabled) }) },
                { value: "on", label: t("admin.network.voice.opt.on") },
                { value: "off", label: t("admin.network.voice.opt.off") },
              ]}
            />
            <SelectField
              label={t("admin.network.voice.transport")}
              hint={t("admin.network.voice.transport.hint")}
              value={config.voiceChat.mode}
              onChange={(mode) => setConfig({ ...config, voiceChat: { ...config.voiceChat, mode } })}
              options={[
                { value: "", label: t("admin.network.voice.transport.server") },
                { value: "mesh", label: t("admin.network.voice.transport.mesh") },
              ]}
            />
            <Field
              label={t("admin.network.voice.port")}
              hint={t("admin.network.voice.port.hint", { value: env.voiceRtcPort })}
            >
              <input
                className={ui.input}
                value={config.voiceChat.rtcPort}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    voiceChat: { ...config.voiceChat, rtcPort: event.target.value },
                  })
                }
                placeholder={env.voiceRtcPort}
              />
            </Field>
            <Field
              label={t("admin.network.voice.ip")}
              hint={t("admin.network.voice.ip.hint")}
            >
              <input
                className={ui.input}
                value={config.voiceChat.announcedIp}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    voiceChat: { ...config.voiceChat, announcedIp: event.target.value },
                  })
                }
                placeholder={env.voiceAnnouncedIp || "203.0.113.10"}
              />
            </Field>
            <Field
              label={t("admin.network.voice.domain")}
              hint={t("admin.network.voice.domain.hint")}
            >
              <input
                className={ui.input}
                value={config.voiceChat.domain}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    voiceChat: { ...config.voiceChat, domain: event.target.value },
                  })
                }
                placeholder={env.voiceDomain || "voice.example.com"}
              />
            </Field>
          </div>
          {/* Hidden as soon as mesh is picked, even before saving: the warning
              is about what the voice server announces, and mesh announces
              nothing. */}
          {voiceUnroutable && config.voiceChat.mode !== "mesh" ? (
            <p role="status" className="live-in mt-3 text-xs text-amber-400">
              {t("admin.network.voice.silent")}
            </p>
          ) : null}
          <p className="mt-3 text-[11px] text-stone-500">
            {t("admin.network.voice.apply")}
          </p>
        </PageSection>

        <PageSection id="admin-discord" heading={t("admin.network.discord.heading")} glyph="system-share">
          <p className="mb-3 text-xs text-stone-500">
            {t("admin.network.discord.intro1")}
            {" "}<code className="text-stone-400">&lt;public URL&gt;/api/auth/discord/callback</code>{" "}
            {t("admin.network.discord.intro2")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t("admin.network.discord.clientId")}
              hint={inheritedHint(config.discord.clientId, env.discordClientId, undefined, t)}
            >
              <input
                className={ui.input}
                value={config.discord.clientId}
                onChange={(event) =>
                  setConfig({ ...config, discord: { ...config.discord, clientId: event.target.value } })
                }
                placeholder={env.discordClientId || t("admin.network.discord.notSet")}
              />
            </Field>
            <SecretField
              label={t("admin.network.discord.secret")}
              isSet={config.discord.hasClientSecret}
              value={discordSecret}
              onChange={setDiscordSecret}
              hint={env.hasDiscordClientSecret ? t("admin.network.discord.envSecret") : undefined}
            />
          </div>
        </PageSection>
    </>
  );
}
