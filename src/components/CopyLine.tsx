"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";

// One line of text to copy: a command to run, a token shown once, a setup
// line. The tick draws itself in when the copy lands.
export function CopyLine({ text, label, block = false }: { text: string; label: string; block?: boolean }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <div className={block ? "hx-code items-start whitespace-pre" : "hx-code"}>
      <code className="select-all">{text}</code>
      <button
        type="button"
        aria-label={t("common.copy.aria", { label })}
        className="motion-press shrink-0 rounded p-1 text-stone-400 hover:text-amber-200"
        onClick={() => {
          void navigator.clipboard
            ?.writeText(text)
            .then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            })
            .catch(() => undefined);
        }}
      >
        {copied ? <Check key="done" className="tick-in size-4 text-emerald-400" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}

[executed on device: PZLD8SRKH9OMZNV (424c96e3-c9c5-4152-a4d9-25b4c5961356)]