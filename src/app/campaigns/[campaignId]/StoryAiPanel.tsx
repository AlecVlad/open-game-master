"use client";

import { AlignLeft, Bot, Image as ImageIcon, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";

import { cn } from "@/lib/cn";
import { ImagesNote } from "@/app/campaigns/[campaignId]/NarrationNote";
import { commitValue, draftsFrom, editDraft, followSaved, inStep } from "@/app/campaigns/[campaignId]/settingDrafts";
import { ModelNote } from "@/components/ModelNote";
import { Select } from "@/components/ui/Select";
import type { MaskedStorySettings } from "@/lib/db/settings";
import type { HarnessOffer } from "@/lib/harness/policy";
import { endpointKind } from "@/lib/dm/sampling-logic";
import { shellHost } from "@/lib/shell-host";
import type { TextProvider } from "@/lib/text-models";
import {
  ART_STYLE_TEXT_MAX,
  ART_STYLES,
  PROSE_SIZE_VALUES,
  type ArtStyle,
  type ImageBackend,
  type StorySettings,
} from "@/lib/types";

// A secret field never receives its stored value; SECRET_KEPT means "leave it
// as is" and the field is simply omitted from the PATCH. Same contract as the
// admin settings panel.
const SECRET_KEPT = "\u0000keep";

// The text settings typed in place.
type TextField = "customBaseUrl" | "customModel" | "utilityBaseUrl" | "utilityModel" | "artStyleMap" | "artStyleScene";

// In the order the pickers offer them: llama.cpp (or another
// OpenAI-compatible server) is the one ODM sets up and recommends.
// Per-campaign AI settings for the Settings tab. The values render from the
// campaign snapshot (kept live by campaign_updated over SSE); only the
// key-existence booleans come from the story-settings GET, because the
// snapshot is scrubbed of keys for everyone.
export function StoryAiPanel({
  campaignId,
  settings,
  steersStory,
}: {
  campaignId: string;
  settings: StorySettings;
  steersStory: boolean;
}) {
  const { t } = useI18n();
  const PROVIDER_LABELS: Record<TextProvider, string> = {
    custom: t("campaign.storyAi.provider.custom"),
    local: t("campaign.storyAi.provider.local"),
    none: t("campaign.storyAi.provider.none"),
    harness: t("campaign.storyAi.provider.harness"),
  };
  const BACKEND_LABELS: Record<ImageBackend, string> = {
    comfyui: t("campaign.storyAi.backend.comfyui"),
    openai: t("campaign.storyAi.backend.openai"),
    "mflux-hs": t("campaign.storyAi.backend.mflux"),
    "sdnq-hs": t("campaign.storyAi.backend.sdnq"),
    harness: t("campaign.storyAi.backend.harness"),
  };
  const artStyleLabels: Record<ArtStyle, string> = {
    setting: t("campaign.storyAi.artStyle.setting"),
    painted: t("campaign.storyAi.artStyle.painted"),
    ink: t("campaign.storyAi.artStyle.ink"),
    realistic: t("campaign.storyAi.artStyle.realistic"),
    comic: t("campaign.storyAi.artStyle.comic"),
    custom: t("campaign.storyAi.artStyle.custom"),
  };
  const artStyleNotes: Record<ArtStyle, string> = {
    setting: t("campaign.storyAi.artStyleNote.setting"),
    painted: t("campaign.storyAi.artStyleNote.painted"),
    ink: t("campaign.storyAi.artStyleNote.ink"),
    realistic: t("campaign.storyAi.artStyleNote.realistic"),
    comic: t("campaign.storyAi.artStyleNote.comic"),
    custom: t("campaign.storyAi.artStyleNote.custom"),
  };
  const proseSizeLabels: Record<StorySettings["proseSize"], string> = {
    tiny: t("campaign.storyAi.proseSize.tiny"),
    xsmall: t("campaign.storyAi.proseSize.xsmall"),
    small: t("campaign.storyAi.proseSize.small"),
    medium: t("campaign.storyAi.proseSize.medium"),
    large: t("campaign.storyAi.proseSize.large"),
    xlarge: t("campaign.storyAi.proseSize.xlarge"),
    xxlarge: t("campaign.storyAi.proseSize.xxlarge"),
    huge: t("campaign.storyAi.proseSize.huge"),
    giant: t("campaign.storyAi.proseSize.giant"),
  };
  const [busy, setBusy] = useState(false);
  // Every control renders the server's settings, so a refused PATCH changes
  // nothing on screen; without this line it changes nothing silently.
  const [error, setError] = useState("");
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [hasUtilityKey, setHasUtilityKey] = useState(false);
  // Defaults to true so the warning never flashes while the answer is in
  // flight on servers that are fine.
  const [imagesConfigured, setImagesConfigured] = useState(true);
  // This campaign's own backend, which for a table on its own OpenAI key is
  // ready even when the server has no image backend of its own.
  const [imagesReady, setImagesReady] = useState(true);
  // Its backend is there but has no model picked, so it paints nothing
  // (src/lib/db/settings.ts); the server's own ComfyUI said the same.
  const [imagesNeedModel, setImagesNeedModel] = useState(false);
  // The model a blank campaign model falls back to: the server's storyteller.
  const [serverModel, setServerModel] = useState("");
  const [serverImagesNeedModel, setServerImagesNeedModel] = useState(false);
  // A world an app hosts: the backend is chosen once for the device and every
  // campaign follows it, so this panel shows it instead of editing it. null
  // until the answer lands, so the editable rows never flash on a device.
  const [deviceManaged, setDeviceManaged] = useState<boolean | null>(null);
  // Only an admin points the server at an address or holds its keys, so for
  // anyone else the URL and key fields are left out and the campaign runs on
  // the server's own backends (src/lib/db/settings.ts).
  const [serverManaged, setServerManaged] = useState(false);
  // Whether the server's agent program may narrate (and paint for) this
  // campaign; the admin decides (src/lib/harness/policy.ts). Hidden until
  // the answer lands, so the choice never flashes on and off.
  const [harness, setHarness] = useState<HarnessOffer | null>(null);
  // Text fields commit on blur or Enter, so a half-typed URL never PATCHes.
  // Each follows the saved settings until the player types into it
  // (settingDrafts.ts): a change saved in another window shows here, and a
  // field that still showed the old value is not saved back over it.
  const savedText: Record<TextField, string> = {
    customBaseUrl: settings.customBaseUrl,
    customModel: settings.customModel,
    utilityBaseUrl: settings.utilityBaseUrl,
    utilityModel: settings.utilityModel,
    artStyleMap: settings.artStyleMap,
    artStyleScene: settings.artStyleScene,
  };
  const [text, setText] = useState(() => draftsFrom(savedText));
  if (!inStep(text, savedText)) {
    setText(followSaved(text, savedText));
  }
  const setDraft = (field: TextField, value: string) => setText((prev) => editDraft(prev, field, value));
  const [keys, setKeys] = useState({ customApiKey: SECRET_KEPT, utilityApiKey: SECRET_KEPT });
  const drafts = { ...text.drafts, ...keys };

  useEffect(() => {
    if (!steersStory) {
      return;
    }
    let cancelled = false;
    void fetch(`/api/campaigns/${campaignId}/story-settings`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { settings?: MaskedStorySettings; harness?: HarnessOffer } | null) => {
        if (!cancelled && data?.settings) {
          setHasCustomKey(data.settings.hasCustomApiKey);
          setHasUtilityKey(data.settings.hasUtilityApiKey);
          setImagesReady(data.settings.imagesReady);
          setImagesNeedModel(data.settings.imagesNeedModel === true);
          setServerManaged(data.settings.serverManaged === true);
        }
        if (!cancelled && data?.harness) {
          setHarness(data.harness);
        }
        if (!cancelled) {
          // A server older than this field, or a failed read, edits as before.
          setDeviceManaged(data?.settings?.deviceManaged === true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDeviceManaged(false);
        }
      });
    void fetch("/api/capabilities")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { images?: { configured?: boolean; needsModel?: boolean }; story?: { model?: string } } | null) => {
        if (!cancelled && data?.images) {
          setImagesConfigured(data.images.configured !== false);
          setServerImagesNeedModel(data.images.needsModel === true);
        }
        if (!cancelled && data?.story?.model) {
          setServerModel(data.story.model);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [steersStory, campaignId]);

  async function patch(update: Partial<StorySettings>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/story-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        errorCode?: string;
        settings?: MaskedStorySettings;
        harness?: HarnessOffer;
      };
      if (!response.ok) {
        const errorKey = {
          INVALID_STORY_SETTINGS: "campaign.storyAi.error.invalid",
          STORY_AGENT_NOT_AVAILABLE: "campaign.storyAi.error.agentUnavailable",
          STORY_AGENT_IMAGES_NOT_ALLOWED: "campaign.storyAi.error.agentImagesUnavailable",
          CAMPAIGN_NOT_FOUND: "campaign.storyAi.error.campaignMissing",
        }[data.errorCode ?? ""];
        setError(errorKey ? t(errorKey) : data.error ?? t("campaign.storyAi.error.notSaved"));
        return;
      }
      if (data.settings) {
        setHasCustomKey(data.settings.hasCustomApiKey);
        setHasUtilityKey(data.settings.hasUtilityApiKey);
        setImagesReady(data.settings.imagesReady);
        setImagesNeedModel(data.settings.imagesNeedModel === true);
      }
      if (data.harness) {
        setHarness(data.harness);
      }
      if (update.customApiKey !== undefined) {
        setKeys((prev) => ({ ...prev, customApiKey: SECRET_KEPT }));
      }
      if (update.utilityApiKey !== undefined) {
        setKeys((prev) => ({ ...prev, utilityApiKey: SECRET_KEPT }));
      }
    } catch {
      setError(t("campaign.storyAi.error.network"));
    } finally {
      setBusy(false);
    }
  }

  function commitText(field: TextField) {
    const value = commitValue(text, savedText, field);
    if (value !== null) {
      void patch({ [field]: value });
    }
  }

  function commitKey(field: "customApiKey" | "utilityApiKey") {
    const value = drafts[field];
    if (value !== SECRET_KEPT) {
      void patch({ [field]: value.trim() });
    }
  }

  const harnessName = harness?.label
    ? harness.model
      ? t("campaign.storyAi.provider.harnessNamedModel", { label: harness.label, model: harness.model })
      : t("campaign.storyAi.provider.harnessNamed", { label: harness.label })
    : PROVIDER_LABELS.harness;

  
  // A blank model is the server's, said with its name and where it comes
  // from rather than left for the reader to infer.
  const inheritedModel = serverModel
    ? t("campaign.storyAi.summary.modelOnServer", { model: serverModel })
    : t("campaign.storyAi.summary.serverModel");
  const storytellerSummary =
    settings.textProvider === "custom"
      ? settings.customModel || inheritedModel
      : settings.textProvider === "harness"
        ? harnessName
        : PROVIDER_LABELS[settings.textProvider];
  const imagesSummary = settings.imageGenerationEnabled
    ? [
        BACKEND_LABELS[settings.imageBackend],
        settings.autoImages ? t("campaign.storyAi.summary.auto") : null,
        settings.artStyle === "setting" ? null : t("campaign.storyAi.summary.style", { style: artStyleLabels[settings.artStyle].toLowerCase() }),
      ].filter(Boolean).join(", ")
    : t("campaign.storyAi.summary.off");

  if (!steersStory) {
    return (
      <section className="rounded-lg border border-stone-800 bg-stone-950/60 p-4">
        <h2 className="mb-1 text-sm font-medium text-stone-300">{t("campaign.storyAi.title")}</h2>
        <p className="mb-2 text-xs text-stone-500">{t("campaign.storyAi.viewer.description")}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-stone-400">
          <span className="flex items-center gap-1.5">
            <Bot className="size-3.5 text-amber-200" />
            {t("campaign.storyAi.summary.storyteller", { name: storytellerSummary })}
          </span>
          <span className="flex items-center gap-1.5">
            <Wrench className="size-3.5 text-amber-200" />
            {t("campaign.storyAi.summary.utility", { name: settings.utilityModel || t("campaign.storyAi.summary.off") })}
          </span>
          <span className="flex items-center gap-1.5">
            <ImageIcon className="size-3.5 text-amber-200" />
            {t("campaign.storyAi.summary.images", { name: imagesSummary })}
          </span>
          <span className="flex items-center gap-1.5">
            <AlignLeft className="size-3.5 text-amber-200" />
            {t("campaign.storyAi.summary.passages", { name: proseSizeLabels[settings.proseSize] })}
          </span>
        </div>
      </section>
    );
  }

  const shell = shellHost();
  const backendName = {
    openai: t("campaign.storyAi.endpoint.openai"),
    openrouter: t("campaign.storyAi.endpoint.openrouter"),
    local: t("campaign.storyAi.backend.localModel"),
  }[endpointKind(settings.customBaseUrl)];
  const deviceStoryteller =
    settings.textProvider === "custom"
      ? `${settings.customModel || t("campaign.storyAi.backend.custom")} (${backendName})`
      : settings.textProvider === "harness"
        ? harnessName
        : PROVIDER_LABELS[settings.textProvider];
  // The agent is offered only where the admin allows it, but a campaign that
  // already chose it keeps seeing its own choice.
  const providerChoices = (Object.keys(PROVIDER_LABELS) as TextProvider[]).filter(
    (provider) => provider !== "harness" || harness?.offered || settings.textProvider === "harness",
  );

  const selectClass =
    "rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-xs outline-none focus:border-amber-600";
  const inputClass = cn(selectClass, "w-64 max-w-full");
  const labelClass = "w-32 shrink-0 text-stone-500";
  const blurOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  return (
    <section className="rounded-lg border border-stone-800 bg-stone-950/60 p-4">
      <h2 className="mb-1 text-sm font-medium text-stone-300">{t("campaign.storyAi.title")}</h2>
      <p className="mb-3 text-xs text-stone-500">
        {t("campaign.storyAi.editor.description")} {t(deviceManaged ? "campaign.storyAi.editor.deviceChoice" : "campaign.storyAi.editor.serverChoice")}

      </p>
      {error ? <p className="motion-shake mb-2 text-xs text-red-400">{error}</p> : null}
      <div className={cn("space-y-3 text-xs", busy && "opacity-70")}>
        {deviceManaged === null ? null : deviceManaged ? (
          <div className="reveal space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={labelClass}>{t("campaign.storyAi.label.storyteller")}</span>
              <span className="text-stone-300">{deviceStoryteller}</span>
            </div>
            {settings.textProvider !== "none" && settings.utilityModel ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className={labelClass}>{t("campaign.storyAi.label.utility")}</span>
                <span className="text-stone-300">{settings.utilityModel}</span>
              </div>
            ) : null}
            <p className="text-stone-500">
              {t("campaign.storyAi.device.explanation")}{" "}
              {shell
                ? t("campaign.storyAi.device.changeHome")
                : t("campaign.storyAi.device.changeHost")}
            </p>
            {shell ? (
              <button
                type="button"
                onClick={() => shell.showServers()}
                className="motion-press rounded-md border border-stone-700 px-2 py-1 text-stone-300 hover:border-amber-700 hover:text-amber-200"
              >
                {t("campaign.storyAi.device.homeButton")}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="reveal space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={labelClass}>{t("campaign.storyAi.label.storyteller")}</span>
              <Select
                value={settings.textProvider}
                onChange={(textProvider) => patch({ textProvider })}
                options={providerChoices.map((provider) => ({
                  value: provider,
                  label: provider === "harness" ? harnessName : PROVIDER_LABELS[provider],
                }))}
                label={t("campaign.storyAi.label.storyteller")}
                size="sm"
              />
            </div>
            {settings.textProvider === "harness" ? (
              <p className="reveal text-stone-500">
                {t("campaign.storyAi.note.agent")}
              </p>
            ) : null}
            {settings.textProvider === "custom" && serverManaged ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={labelClass}>{t("campaign.storyAi.label.model")}</span>
                  <input
                    aria-label={t("campaign.storyAi.label.model")}
                    value={drafts.customModel}
                    onChange={(event) =>
                      setDraft("customModel", event.target.value)
                    }
                    onBlur={() => commitText("customModel")}
                    onKeyDown={blurOnEnter}
                    className={inputClass}
                  />
                </div>
                <ModelNote role="story" baseUrl="" model={settings.customModel} />
                <p className="text-stone-500">
                  {settings.customModel
                    ? t("campaign.storyAi.note.modelOnServer")
                    : t("campaign.storyAi.note.modelInherited", { model: inheritedModel })}{" "}
                  {t("campaign.storyAi.note.adminOnly")}
                </p>
              </>
            ) : settings.textProvider === "custom" ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={labelClass}>{t("campaign.storyAi.label.baseUrl")}</span>
                  <input
                    aria-label={t("campaign.storyAi.label.baseUrl")}
                    value={drafts.customBaseUrl}
                    onChange={(event) =>
                      setDraft("customBaseUrl", event.target.value)
                    }
                    onBlur={() => commitText("customBaseUrl")}
                    onKeyDown={blurOnEnter}
                    placeholder="http://127.0.0.1:8080/v1"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={labelClass}>{t("campaign.storyAi.label.model")}</span>
                  <input
                    aria-label={t("campaign.storyAi.label.model")}
                    value={drafts.customModel}
                    onChange={(event) =>
                      setDraft("customModel", event.target.value)
                    }
                    onBlur={() => commitText("customModel")}
                    onKeyDown={blurOnEnter}
                    className={inputClass}
                  />
                </div>
                <ModelNote role="story" baseUrl={settings.customBaseUrl} model={settings.customModel} />
                <div className="flex flex-wrap items-center gap-2">
                  <span className={labelClass}>{t("campaign.storyAi.label.apiKey")}</span>
                  <input
                    type="password"
                    aria-label={t("campaign.storyAi.label.apiKey")}
                    value={drafts.customApiKey === SECRET_KEPT ? "" : drafts.customApiKey}
                    onChange={(event) =>
                      setKeys((prev) => ({ ...prev, customApiKey: event.target.value }))
                    }
                    onBlur={() => commitKey("customApiKey")}
                    onKeyDown={blurOnEnter}
                    placeholder={hasCustomKey ? t("campaign.storyAi.key.set") : t("campaign.storyAi.key.notSet")}
                    className={inputClass}
                  />
                  {hasCustomKey ? (
                    <button
                      type="button"
                      onClick={() => patch({ customApiKey: "" })}
                      className="rounded-md border border-stone-700 px-2 py-1 text-stone-400 hover:text-red-400"
                    >
                      {t("campaign.storyAi.key.clear")}
                    </button>
                  ) : null}
                </div>
                <p className="text-stone-500">{t("campaign.storyAi.note.blankFallback")}</p>
              </>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 border-t border-stone-800/60 pt-3">
              <span className={labelClass}>{t("campaign.storyAi.label.utility")}</span>
              <Select
                value={settings.utilityProvider}
                onChange={(utilityProvider) => patch({ utilityProvider })}
                options={(["custom", "local"] as TextProvider[]).map((provider) => ({ value: provider, label: PROVIDER_LABELS[provider] }))}
                label={t("campaign.storyAi.label.utilityProvider")}
                size="sm"
              />
              <input
                aria-label={t("campaign.storyAi.label.utilityModel")}
                value={drafts.utilityModel}
                onChange={(event) =>
                  setDraft("utilityModel", event.target.value)
                }
                onBlur={() => commitText("utilityModel")}
                onKeyDown={blurOnEnter}
                placeholder={t("campaign.storyAi.utility.modelPlaceholder")}
                className={inputClass}
              />
            </div>
            {settings.utilityModel ? (
              <ModelNote role="utility" baseUrl={settings.utilityProvider === "custom" ? settings.utilityBaseUrl || settings.customBaseUrl : ""} model={settings.utilityModel} />
            ) : null}
            {settings.utilityProvider === "custom" && settings.utilityModel && !serverManaged ? (
              <div className="reveal flex flex-wrap items-center gap-2">
                <span className={labelClass}>{t("campaign.storyAi.label.utilityUrl")}</span>
                <input
                  aria-label={t("campaign.storyAi.label.utilityUrl")}
                  value={drafts.utilityBaseUrl}
                  onChange={(event) =>
                    setDraft("utilityBaseUrl", event.target.value)
                  }
                  onBlur={() => commitText("utilityBaseUrl")}
                  onKeyDown={blurOnEnter}
                  placeholder={t("campaign.storyAi.utility.urlPlaceholder")}
                  className={inputClass}
                />
                <input
                  type="password"
                  aria-label={t("campaign.storyAi.label.utilityApiKey")}
                  value={drafts.utilityApiKey === SECRET_KEPT ? "" : drafts.utilityApiKey}
                  onChange={(event) =>
                    setKeys((prev) => ({ ...prev, utilityApiKey: event.target.value }))
                  }
                  onBlur={() => commitKey("utilityApiKey")}
                  onKeyDown={blurOnEnter}
                  placeholder={hasUtilityKey ? t("campaign.storyAi.key.set") : t("campaign.storyAi.utility.keyPlaceholder")}
                  className={cn(selectClass, "w-40")}
                />
                {hasUtilityKey ? (
                  <button
                    type="button"
                    onClick={() => patch({ utilityApiKey: "" })}
                    className="rounded-md border border-stone-700 px-2 py-1 text-stone-400 hover:text-red-400"
                  >
                    {t("campaign.storyAi.key.clear")}
                  </button>
                ) : null}
              </div>
            ) : null}

          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-stone-800/60 pt-3">
          <span className={labelClass}>{t("campaign.storyAi.label.images")}</span>
          <Select<ImageBackend | "off">
            value={settings.imageGenerationEnabled ? settings.imageBackend : "off"}
            label={t("campaign.storyAi.label.images")}
            size="sm"
            options={[
              { value: "off", label: t("campaign.storyAi.image.off") },
              // On a device the backend follows the device; only on and off
              // are this campaign's to choose.
              ...(deviceManaged
                ? [settings.imageBackend]
                : (Object.keys(BACKEND_LABELS) as ImageBackend[]).filter(
                    (backend) => backend !== "harness" || harness?.pictures || settings.imageBackend === "harness",
                  )
              ).map((backend) => ({ value: backend, label: BACKEND_LABELS[backend] })),
            ]}
            onChange={(value) => {
              // "Off" is imageGenerationEnabled, not a backend: picking a
              // backend again switches images back on in the same PATCH.
              void patch(
                value === "off"
                  ? { imageGenerationEnabled: false }
                  : { imageBackend: value, imageGenerationEnabled: true },
              );
            }}
          />
          {settings.imageGenerationEnabled ? (
            <>
              <Select<StorySettings["aspect"]>
                value={settings.aspect}
                onChange={(aspect) => patch({ aspect })}
                options={[
                  { value: "square", label: t("campaign.storyAi.image.aspect.square") },
                  { value: "portrait", label: t("campaign.storyAi.image.aspect.portrait") },
                  { value: "landscape", label: t("campaign.storyAi.image.aspect.landscape") },
                ]}
                label={t("campaign.storyAi.image.pictureShape")}
                size="sm"
              />
              <Select<StorySettings["imageMode"]>
                value={settings.imageMode}
                onChange={(imageMode) => patch({ imageMode })}
                options={[
                  { value: "fast", label: t("campaign.storyAi.image.speed.fast") },
                  { value: "slow", label: t("campaign.storyAi.image.speed.slow") },
                ]}
                label={t("campaign.storyAi.image.pictureSpeed")}
                size="sm"
              />
              <button
                type="button"
                onClick={() => patch({ autoImages: !settings.autoImages })}
                className={cn(
                  "rounded-md border px-2 py-1",
                  settings.autoImages
                    ? "border-amber-700 bg-amber-950/50 text-amber-200"
                    : "border-stone-700 text-stone-400",
                )}
              >
                {t("campaign.storyAi.image.autoScenes")}
              </button>
            </>
          ) : null}
        </div>
        {settings.imageGenerationEnabled &&
        imagesNeedModel &&
        (settings.imageBackend === "openai" || (settings.imageBackend === "comfyui" && serverImagesNeedModel)) ? (
          <p className="reveal text-amber-400/90">
            {deviceManaged && settings.imageBackend === "openai"
              ? t("campaign.storyAi.warning.deviceModel")
              : serverManaged
                ? t("campaign.storyAi.warning.serverModel")
                : t("campaign.storyAi.warning.model")}
          </p>
        ) : settings.imageGenerationEnabled && settings.imageBackend === "openai" && !imagesReady ? (
          <p className="reveal text-amber-400/90">
            {deviceManaged
              ? t("campaign.storyAi.warning.deviceKey")
              : serverManaged
                ? t("campaign.storyAi.warning.serverKey")
                : t("campaign.storyAi.warning.key")}
          </p>
        ) : settings.imageGenerationEnabled && !imagesConfigured && imagesReady ? (
          <p className="reveal text-amber-400/90">
            {t("campaign.storyAi.warning.noBackend")}
          </p>
        ) : settings.imageGenerationEnabled && !deviceManaged ? (
          <ImagesNote backend={settings.imageBackend} />
        ) : null}
        {settings.imageGenerationEnabled ? (
          <div className="reveal space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={labelClass}>{t("campaign.storyAi.label.artStyle")}</span>
              <Select<ArtStyle>
                value={settings.artStyle}
                onChange={(artStyle) => patch({ artStyle })}
                options={ART_STYLES.map((style) => ({ value: style, label: artStyleLabels[style] }))}
                label={t("campaign.storyAi.label.artStyle")}
                size="sm"
              />
              <span key={settings.artStyle} className="reveal text-stone-500">
                {artStyleNotes[settings.artStyle]}
              </span>
            </div>
            {settings.artStyle === "custom" ? (
              <div className="reveal space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={labelClass}>{t("campaign.storyAi.label.maps")}</span>
                  <input
                    value={drafts.artStyleMap}
                    onChange={(event) => setDraft("artStyleMap", event.target.value)}
                    onBlur={() => commitText("artStyleMap")}
                    onKeyDown={blurOnEnter}
                    maxLength={ART_STYLE_TEXT_MAX}
                    placeholder={t("campaign.storyAi.customStyle.mapsPlaceholder")}
                    aria-label={t("campaign.storyAi.label.mapsStyle")}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={labelClass}>{t("campaign.storyAi.label.scenes")}</span>
                  <input
                    value={drafts.artStyleScene}
                    onChange={(event) => setDraft("artStyleScene", event.target.value)}
                    onBlur={() => commitText("artStyleScene")}
                    onKeyDown={blurOnEnter}
                    maxLength={ART_STYLE_TEXT_MAX}
                    placeholder={t("campaign.storyAi.customStyle.scenesPlaceholder")}
                    aria-label={t("campaign.storyAi.label.scenesStyle")}
                    className={inputClass}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-stone-800/60 pt-3">
          <span className={labelClass}>{t("campaign.storyAi.label.passages")}</span>
          <Select<StorySettings["proseSize"]>
            value={settings.proseSize}
            onChange={(proseSize) => patch({ proseSize })}
            options={PROSE_SIZE_VALUES.map((size) => ({ value: size, label: proseSizeLabels[size] }))}
            label={t("campaign.storyAi.label.passages")}
            size="sm"
          />
          <span className="text-stone-500">{t("campaign.storyAi.proseSize.description")}</span>
        </div>
      </div>
    </section>
  );
}
