"use client";

import { useState } from "react";
import { formatPounds, type MeasurementSystem } from "@/lib/measurement-system";
import { useI18n } from "@/lib/i18n/provider";
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { GameIcon } from "@/components/ui/GameIcon";
import { CountPop } from "@/components/ui/Reveal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatPrice, purseCoins, purseCopper, type Purse } from "@/lib/srd/currency";
import {
  coinWeightLb,
  COINS_PER_POUND,
  loadLines,
  sortLoadLines,
  type Encumbrance,
  type LoadOrder,
  type LoadSort,
  type WeightSource,
} from "@/lib/srd/encumbrance";

// What the Carried tile is made of (issue #206): every line of the pack with
// its count, its weight each and its line total, the purse, and the lines
// nothing could weigh. Read-only, for anyone who can open the sheet. The
// lines are the ones the total is summed from (src/lib/srd/encumbrance.ts
// loadLines), so they add up to the tile by construction, and both redraw
// from the same sheet when it changes.

// A weight the line does not carry itself says where it came from.
const SOURCE_NOTE_KEY: Record<WeightSource, string | null> = {
  item: null,
  ammunition: "charSheet.loadBreakdown.source.ammunition",
  armor: "charSheet.loadBreakdown.source.armor",
  gear: "charSheet.loadBreakdown.source.gear",
  weapon: "charSheet.loadBreakdown.source.weapon",
};

function pounds(value: number, places: number, system: MeasurementSystem, locale: string): string {
  return system === "si" ? formatPounds(value, system, locale) : String(Number(value.toFixed(places))) + " lb";
}

export function LoadBreakdown({
  open,
  onOpenChange,
  name,
  equipment,
  purse,
  load,
  measurementSystem = "si",
  tableLanguage = "english",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  equipment: Array<{ name: string; qty?: number; weight?: number; equipped?: boolean }>;
  // The purse whose coins the load weighs, as every caller of encumbranceFor
  // counts them (src/lib/srd/currency.ts purseCoins).
  purse: Purse;
  load: Encumbrance;
  measurementSystem?: MeasurementSystem;
  tableLanguage?: string;
}) {
  const { t } = useI18n();
  const [key, setKey] = useState<LoadSort>("total");
  const [order, setOrder] = useState<LoadOrder>("desc");
  const lines = sortLoadLines(loadLines(equipment), key, order);
  const coins = purseCoins(purse);
  const floor = load.unweighed > 0;
  const total = pounds(load.carriedLb, 2, measurementSystem, tableLanguage) + (floor ? "+" : "");
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("charSheet.loadBreakdown.title", { name })}
      icon={<GameIcon icon={{ kind: "glyph", key: "coin-purse" }} size="size-6" />}
      width="w-[min(94vw,38rem)]"
    >
      <div className="load-breakdown space-y-3 text-sm text-stone-300">
        <p className="text-xs leading-relaxed text-stone-400">
          <CountPop value={total} className="font-display text-sm text-amber-100">
            {total}
          </CountPop>{" "}
          {floor
            ? t(load.unweighed === 1 ? "charSheet.loadBreakdown.summary.one" : "charSheet.loadBreakdown.summary.many", {
                total: "",
                capacity: pounds(load.capacityLb, 2, measurementSystem, tableLanguage),
                count: load.unweighed,
              }).replace(/^ /, "")
            : t("charSheet.loadBreakdown.summary.known", {
                total: "",
                capacity: pounds(load.capacityLb, 2, measurementSystem, tableLanguage),
              })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            size="sm"
            label={t("charSheet.loadBreakdown.sortBy")}
            value={key}
            onChange={setKey}
            options={[
              { value: "total", label: t("charSheet.loadBreakdown.lineTotal") },
              { value: "each", label: t("charSheet.loadBreakdown.weightEach") },
            ]}
          />
          <SegmentedControl
            size="sm"
            label={t("charSheet.loadBreakdown.order")}
            value={order}
            onChange={setOrder}
            options={[
              { value: "desc", label: t("charSheet.loadBreakdown.heaviestFirst"), icon: ArrowDownWideNarrow },
              { value: "asc", label: t("charSheet.loadBreakdown.lightestFirst"), icon: ArrowUpNarrowWide },
            ]}
          />
        </div>
        <table className="load-table">
          <caption className="sr-only">
            {t("charSheet.loadBreakdown.caption", {
              name,
              sort: t(key === "total" ? "charSheet.loadBreakdown.lineTotal" : "charSheet.loadBreakdown.weightEach"),
              direction: t(order === "desc" ? "charSheet.loadBreakdown.heaviestFirst" : "charSheet.loadBreakdown.lightestFirst"),
            })}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t("charSheet.loadBreakdown.item")}</th>
              <th scope="col" className="load-num">
                {t("charSheet.loadBreakdown.qty")}
              </th>
              <th scope="col" className="load-num" aria-sort={key === "each" ? (order === "desc" ? "descending" : "ascending") : undefined}>
                {t("charSheet.loadBreakdown.each")}
              </th>
              <th scope="col" className="load-num" aria-sort={key === "total" ? (order === "desc" ? "descending" : "ascending") : undefined}>
                {t("charSheet.loadBreakdown.total")}
              </th>
            </tr>
          </thead>
          {/* Keyed by the sort, so a re-sort deals the rows in again. */}
          <tbody key={`${key}-${order}`} className="stagger-up">
            {lines.map((line) => {
              const noteKey = line.source ? SOURCE_NOTE_KEY[line.source] : null;
              const note = noteKey ? t(noteKey as never) : null;
              const worn = equipment[line.index]?.equipped;
              return (
                <tr key={line.index} data-unknown={line.totalLb === null ? "" : undefined}>
                  <th scope="row">
                    <span className="block text-stone-200">{line.name}</span>
                    {worn || note ? (
                      <span className="block text-[11px] text-stone-500">{[worn ? t("charSheet.loadBreakdown.worn") : null, note].filter(Boolean).join(", ")}</span>
                    ) : null}
                  </th>
                  <td className="load-num">{line.qty}</td>
                  <td className="load-num">{line.eachLb === null ? <span className="load-unknown">{t("charSheet.loadBreakdown.unknown")}</span> : pounds(line.eachLb, 3, measurementSystem, tableLanguage)}</td>
                  <td className="load-num">{line.totalLb === null ? <span className="load-unknown">{t("charSheet.loadBreakdown.unknown")}</span> : pounds(line.totalLb, 2, measurementSystem, tableLanguage)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">
                <span className="block text-stone-200">{t("charSheet.loadBreakdown.coins")}</span>
                <span className="block text-[11px] text-stone-500">
                  {formatPrice(purseCopper(purse))}, {measurementSystem === "si"
                    ? t("charSheet.loadBreakdown.coinsPerKg", { rate: (COINS_PER_POUND / 0.45359237).toFixed(1) })
                    : t("charSheet.loadBreakdown.coinsPerPound", { rate: COINS_PER_POUND })}
                </span>
              </th>
              <td className="load-num">{coins}</td>
              <td className="load-num">{pounds(1 / COINS_PER_POUND, 3, measurementSystem, tableLanguage)}</td>
              <td className="load-num">{pounds(coinWeightLb(coins), 2, measurementSystem, tableLanguage)}</td>
            </tr>
            <tr className="load-sum">
              <th scope="row">{t("charSheet.loadBreakdown.carried")}</th>
              <td className="load-num" colSpan={3}>
                <CountPop value={total}>{total}</CountPop>
                {floor ? (
                  <span className="block text-[11px] font-normal text-amber-300/90">
                    {t(load.unweighed === 1 ? "charSheet.loadBreakdown.unknownOne" : "charSheet.loadBreakdown.unknownMany", { count: load.unweighed })}
                  </span>
                ) : null}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Dialog>
  );
}
