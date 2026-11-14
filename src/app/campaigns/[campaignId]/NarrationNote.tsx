"use client";

import { useCapabilities } from "@/lib/use-capabilities";
import { useI18n } from "@/lib/i18n/provider";
import type { ImageBackend } from "@/lib/types";

// Where a campaign's narration and pictures are actually made (issue 89).
// The campaign only switches them on and picks a voice or a backend; the
// address, the model and the key belong to the server and are set by an
// admin, so a table could not tell what its switch would do: was the text
// going to the cloud, to the story model's server, nowhere? These lines say
// it, from what the server reports about itself (/api/capabilities), and say
// so when the thing behind the switch is not there (issue 88).

const noteClass = "reveal text-[11px] leading-4 text-stone-500";
const warnClass = "reveal text-[11px] leading-4 text-amber-400/90";

export function NarrationNote() {
  const { t } = useI18n();
  const capabilities = useCapabilities();
  const tts = capabilities?.tts;
  // No answer yet, or a server older than these fields: say nothing rather
  // than guess.
  if (!tts || !tts.provider) {
    return null;
  }
  if (tts.provider === "off") {
    return (
      <p className={warnClass}>
        {t("campaign.narrationNote.off")}
      </p>
    );
  }
  const server = tts.provider === "kokoro" ? t("campaign.narrationNote.server.kokoro") : t("campaign.narrationNote.server.compatible");
  const where = tts.place === "local" || !tts.place ? t("campaign.narrationNote.where.local") : t("campaign.narrationNote.where.remote", { place: tts.place });
  // The server answers but has no model to ask for (an older server sends
  // no such field and says nothing here).
  if (tts.needsModel) {
    return (
      <p className={warnClass}>
        {t("campaign.narrationNote.needsModel", { server, where })}
      </p>
    );
  }
  if (!tts.reachable) {
    return (
      <p className={warnClass}>
        {t("campaign.narrationNote.unreachable", { server, where })}
      </p>
    );
  }
  return (
    <p className={noteClass}>
      {t("campaign.narrationNote.sent", { server, where, privacy: tts.place === "local" || !tts.place ? t("campaign.narrationNote.privacy.local") : "" })}
    </p>
  );
}

const PAINTERS: Record<ImageBackend, string> = {
  comfyui: "campaign.imagesNote.backend.comfyui",
  "mflux-hs": "campaign.imagesNote.backend.mflux",
  "sdnq-hs": "campaign.imagesNote.backend.sdnq",
  openai: "campaign.imagesNote.backend.openai",
  harness: "campaign.imagesNote.backend.harness",
};

export function ImagesNote({ backend }: { backend: ImageBackend }) {
  const { t } = useI18n();
  const capabilities = useCapabilities();
  if (!capabilities) {
    return null;
  }
  const place = capabilities.images.openaiPlace;
  const where = backend !== "openai" || !place ? "" : place === "local" ? t("campaign.imagesNote.where.local") : t("campaign.imagesNote.where.remote", { place });
  return (
    <p className={noteClass}>
      {t("campaign.imagesNote.description", { backend: t(PAINTERS[backend] as never), where })}
    </p>
  );
}
