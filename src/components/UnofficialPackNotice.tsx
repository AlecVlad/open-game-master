"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/provider";

// The standing notice on any world pack built on somebody else's setting.
//
// This is deliberately explicit and deliberately unmissable. The risk a fan
// campaign actually runs is not that it exists, it is that a player could
// come away thinking the rights holder made it or blessed it. So wherever a
// pack names itself, this names what it is not.
//
// A pack with no `rightsHolder` is an original world and gets the milder
// community-content line instead of a non-affiliation disclaimer it does not
// need.
export function UnofficialPackNotice({
  rightsHolder,
  inspiredBy,
  variant = "block",
  className,
}: {
  rightsHolder: string;
  inspiredBy?: string;
  // "block" for a bordered panel (the builder, the plugin browser);
  // "inline" for a single quiet line under a picker.
  variant?: "block" | "inline";
  className?: string;
}) {
  const { t } = useI18n();
  const holder = rightsHolder.trim();
  const body = holder
    ? t("workshop.plugin.notice.withHolder", { holder })
    : t("workshop.plugin.notice.original");

  if (variant === "inline") {
    return (
      <p className={cn("text-[11px] italic leading-4 text-stone-500", className)}>
        {holder ? t("workshop.plugin.notice.inline") : ""}
        {body}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-stone-800 bg-stone-950/60 px-3 py-2 text-[11px] leading-4 text-stone-400",
        className,
      )}
    >
      <p className="font-medium uppercase tracking-wide text-stone-300">
        {t("workshop.plugin.notice.title")}
      </p>
      <p className="mt-1">{body}</p>
      {inspiredBy ? <p className="reveal mt-1 text-stone-500">{inspiredBy}</p> : null}
    </div>
  );
}
