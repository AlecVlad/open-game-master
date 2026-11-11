"use client";

import { Eye, VenetianMask } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { KitButton, PanelError } from "./PanelKit";
import type { CharacterSheet } from "@/lib/schemas/sheet";

// A player's own pact (issue 503 Phase 7), at the top of their Bonds tab:
// who is in it, who leads, what it plans and when, and that character's own
// secret actions, read from GET /pact, which answers for the viewer's own
// characters alone. A member acts in secret from here: the server holds the
// action and rolls it where only they and the storyteller see
// (POST /actions, secret mode), and the confirmation comes back to them
// alone, never to the table. It comes out when the pact moves or someone
// catches it, as a reveal card in the transcript (MessageParts.tsx).
// Whoever runs the story reads every pact here, without the form.

type OwnSecret = { id: string; kind: string; text: string; total: number; revealed: boolean; caught: boolean };
type PactView = {
  id: string;
  characterId: string;
  characterName: string;
  stance: "joined" | "spy";
  members: string[];
  leader: string;
  plan: string;
  status: string;
  secrets: OwnSecret[];
  kinds: string[];
};

const KIND_KEYS: Record<string, { label: string; hint: string }> = {
  steal: { label: "campaign.relationship.pact.kind.steal.label", hint: "campaign.relationship.pact.kind.steal.hint" },
  scheme: { label: "campaign.relationship.pact.kind.scheme.label", hint: "campaign.relationship.pact.kind.scheme.hint" },
  harm: { label: "campaign.relationship.pact.kind.harm.label", hint: "campaign.relationship.pact.kind.harm.hint" },
  attack: { label: "campaign.relationship.pact.kind.attack.label", hint: "campaign.relationship.pact.kind.attack.hint" },
};

const SKILLS = [
  { id: "stealth", label: "campaign.relationship.pact.skill.stealth" },
  { id: "sleight_of_hand", label: "campaign.relationship.pact.skill.sleight_of_hand" },
  { id: "deception", label: "campaign.relationship.pact.skill.deception" },
];

const PACT_STATUS_KEYS: Record<string, string> = {
  forming: "campaign.relationship.pact.status.forming",
  fired: "campaign.relationship.pact.status.fired",
  broken: "campaign.relationship.pact.status.broken",
};
const PACT_PLAN_KEYS: Record<string, string> = {
  leave: "campaign.relationship.pact.plan.leave",
  sabotage: "campaign.relationship.pact.plan.sabotage",
  strike: "campaign.relationship.pact.plan.strike",
};

export function OwnPacts({ campaignId, refreshKey, sheets, meUserId }: { campaignId: string; refreshKey: number; sheets: CharacterSheet[]; meUserId: string }) {
  const { t } = useI18n();
  const [pacts, setPacts] = useState<PactView[]>([]);
  const [all, setAll] = useState<PactView[]>([]);
  // Bumped after a secret action, so the list reads it back.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    fetch(`/api/campaigns/${campaignId}/pact`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (live && data) {
          setPacts(Array.isArray(data.pacts) ? data.pacts : []);
          setAll(Array.isArray(data.all) ? data.all : []);
        }
      })
      .catch(() => {
        // The tab keeps what it last read.
      });
    return () => {
      live = false;
    };
  }, [campaignId, refreshKey, tick]);
  const load = () => setTick((value) => value + 1);

  if (!pacts.length && !all.length) {
    return null;
  }
  return (
    <div className="space-y-2">
      {pacts.map((pact) => (
        <PactCard key={`${pact.id}-${pact.characterId}`} campaignId={campaignId} pact={pact} sheets={sheets} meUserId={meUserId} onDone={load} />
      ))}
      {all.map((pact) => (
        <section key={pact.id} className="panel rounded-lg border-violet-900/40 px-2.5 py-2 text-xs text-stone-300" data-pact-storyteller={pact.id}>
          <p className="flex items-center gap-1.5 text-violet-200">
            <Eye className="size-3.5" aria-hidden="true" />{t("campaign.relationship.pact.storyteller", { status: PACT_STATUS_KEYS[pact.status] ? t(PACT_STATUS_KEYS[pact.status] as never) : pact.status, members: pact.members.join(", ") })}
          </p>
          <p className="mt-0.5">{t("campaign.relationship.pact.leaderPlan", { leader: pact.leader || t("campaign.relationship.pact.nobody"), plan: PACT_PLAN_KEYS[pact.plan] ? t(PACT_PLAN_KEYS[pact.plan] as never) : pact.plan })}</p>
          <span className="sr-only">{t("campaign.relationship.private.storyteller")}</span>
        </section>
      ))}
    </div>
  );
}

function PactCard({ campaignId, pact, sheets, meUserId, onDone }: { campaignId: string; pact: PactView; sheets: CharacterSheet[]; meUserId: string; onDone: () => void }) {
  const { t } = useI18n();
  const plan = PACT_PLAN_KEYS[pact.plan] ? t(PACT_PLAN_KEYS[pact.plan] as never) : pact.plan;
  return (
    <section className="panel ornate rounded-lg border-violet-400/40 px-2.5 py-2 text-xs" data-own-pact={pact.id} aria-label={t("campaign.relationship.pact.aria", { name: pact.characterName })}>
      <p className="flex items-center gap-1.5 text-[13px] font-medium text-violet-100">
        <VenetianMask className="size-3.5 shrink-0 text-violet-300" aria-hidden="true" />
        {t(pact.stance === "spy" ? "campaign.relationship.pact.stance.spy" : "campaign.relationship.pact.stance.member", { name: pact.characterName })}
      </p>
      <p className="mt-1 leading-5 text-stone-300">
        {t("campaign.relationship.pact.members", { members: pact.members.filter((name) => name !== pact.characterName).join(", "), leader: pact.leader, plan })}
      </p>
      <p className="mt-0.5 text-[11px] text-stone-500">{t("campaign.relationship.pact.onlyYou")}</p>
      {pact.secrets.length ? (
        <ul className="mt-1.5 space-y-1" aria-label={t("campaign.relationship.pact.actionsAria")}>
          {pact.secrets.map((secret) => (
            <li key={secret.id} className="flex items-start gap-1.5 text-stone-300" data-own-secret={secret.revealed ? "out" : "held"}>
              <span className={cn("mt-0.5 shrink-0 rounded-full border px-1.5 text-[10px]", secret.caught ? "border-red-800/60 text-red-300" : secret.revealed ? "border-stone-700 text-stone-400" : "border-violet-700/60 text-violet-200")}>
                {t(`campaign.relationship.pact.secret.${secret.caught ? "caught" : secret.revealed ? "out" : "held"}` as never)}
              </span>
              <span className="min-w-0">
                {secret.text} ({secret.total})
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {pact.status === "forming" && pact.kinds.length ? <SecretActionForm campaignId={campaignId} pact={pact} sheets={sheets} meUserId={meUserId} onDone={onDone} /> : null}
    </section>
  );
}

function SecretActionForm({ campaignId, pact, sheets, meUserId, onDone }: { campaignId: string; pact: PactView; sheets: CharacterSheet[]; meUserId: string; onDone: () => void }) {
  const { t } = useI18n();
  const ids = useId();
  const [kind, setKind] = useState(pact.kinds[0] ?? "scheme");
  const [text, setText] = useState("");
  const [skill, setSkill] = useState("stealth");
  const [targetId, setTargetId] = useState("");
  const [item, setItem] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<{ text: string; caught: boolean } | null>(null);
  const others = sheets.filter((sheet) => !sheet.isCompanion && !sheet.summon && sheet.id !== pact.characterId && sheet.userId !== meUserId);
  const target = others.find((sheet) => sheet.id === targetId);
  const needsTarget = kind === "steal" || kind === "attack";
  const ready = !busy && (!needsTarget || Boolean(target)) && (kind !== "steal" || Boolean(item)) && (needsTarget || Boolean(text.trim()));

  async function submit() {
    setBusy(true);
    setError("");
    setConfirmation(null);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: pact.characterId,
          secret: { kind, text: text.trim(), ...(kind === "scheme" || kind === "harm" ? { skill } : {}), ...(needsTarget ? { targetId } : {}), ...(kind === "steal" ? { item } : {}) },
        }),
      });
      await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(t("campaign.relationship.pact.form.error"));
        return;
      }
      setConfirmation(data.caught ? { text: t("campaign.relationship.pact.form.caught"), caught: true } : { text: t("campaign.relationship.pact.form.done"), caught: false });
      setText("");
      setItem("");
      onDone();
    } catch {
      setError(t("campaign.relationship.pact.form.networkError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="mt-2 space-y-1.5 border-t border-violet-900/40 pt-2"
      aria-label={t("campaign.relationship.pact.form.aria", { name: pact.characterName })}
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) {
          void submit();
        }
      }}
      data-secret-form={pact.characterId}
    >
      <fieldset>
        <legend className="eyebrow text-[10px] text-violet-300">{t("campaign.relationship.pact.form.legend")}</legend>
        <div className="mt-1 grid gap-1 sm:grid-cols-2" role="radiogroup" aria-label={t("campaign.relationship.pact.form.actionsAria")}>
          {pact.kinds.map((option) => (
            <label key={option} className={cn("pk-tap flex min-h-10 cursor-pointer items-start gap-1.5 rounded-md border px-2 py-1.5 focus-within:ring-2 focus-within:ring-violet-400/70", kind === option ? "border-violet-400/60 bg-violet-950/40 text-violet-100" : "border-stone-800 text-stone-300")}>
              <input type="radio" name={`${ids}-kind`} value={option} checked={kind === option} onChange={() => setKind(option)} className="mt-0.5 accent-violet-400" />
              <span>
                <span className="block text-[12px]">{KIND_KEYS[option] ? t(KIND_KEYS[option].label as never) : option}</span>
                <span className="block text-[11px] leading-snug text-stone-400">{KIND_KEYS[option] ? t(KIND_KEYS[option].hint as never) : ""}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {needsTarget ? (
        <label className="block">
          <span className="text-[11px] text-stone-400">{kind === "steal" ? t("campaign.relationship.pact.form.fromWhom") : t("campaign.relationship.pact.form.whom")}</span>
          <select className={cn(ui.input, "mt-0.5 min-h-10 text-xs")} value={targetId} onChange={(event) => { setTargetId(event.target.value); setItem(""); }} data-secret-target="">
            <option value="">{t("campaign.relationship.pact.form.chooseCharacter")}</option>
            {others.map((sheet) => (
              <option key={sheet.id} value={sheet.id}>{sheet.name}</option>
            ))}
          </select>
        </label>
      ) : null}
      {kind === "steal" && target ? (
        <label className="block">
          <span className="text-[11px] text-stone-400">{t("campaign.relationship.pact.form.what")}</span>
          <select className={cn(ui.input, "mt-0.5 min-h-10 text-xs")} value={item} onChange={(event) => setItem(event.target.value)} data-secret-item="">
            <option value="">{t("campaign.relationship.pact.form.chooseItem")}</option>
            {target.equipment.map((line) => (
              <option key={line.name} value={line.name}>{line.name}</option>
            ))}
          </select>
        </label>
      ) : null}
      {kind === "scheme" || kind === "harm" ? (
        <label className="block">
          <span className="text-[11px] text-stone-400">{t("campaign.relationship.pact.form.rolledWith")}</span>
          <select className={cn(ui.input, "mt-0.5 min-h-10 text-xs")} value={skill} onChange={(event) => setSkill(event.target.value)}>
            {SKILLS.map((option) => (
              <option key={option.id} value={option.id}>{t(option.label as never)}</option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="block">
        <span className="text-[11px] text-stone-400">{needsTarget ? t("campaign.relationship.pact.form.inYourWords") : t("campaign.relationship.pact.form.whatYouDo")}</span>
        <input className={cn(ui.input, "mt-0.5 min-h-10 text-xs")} value={text} maxLength={300} onChange={(event) => setText(event.target.value)} placeholder={t("campaign.relationship.pact.form.example")} data-secret-text="" />
      </label>
      <div className="flex items-center justify-end">
        <KitButton type="submit" tone="primary" className="min-h-10 px-4" disabled={!ready} busy={busy}>
          {busy ? null : <VenetianMask className="size-3.5" aria-hidden="true" />}
          {t("campaign.relationship.pact.form.submit")}
        </KitButton>
      </div>
      {error ? <PanelError>{error}</PanelError> : null}
      <p role="status" aria-live="polite" className={cn("text-xs leading-5", confirmation ? "secret-confirm" : "sr-only", confirmation?.caught ? "text-red-300" : "text-violet-200")} data-secret-confirm={confirmation ? (confirmation.caught ? "caught" : "held") : undefined}>
        {confirmation?.text ?? ""}
      </p>
    </form>
  );
}
