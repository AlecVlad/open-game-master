// Localized labels for the Hand's shared-out attacks and targets.
import type { HandShares } from "@/lib/battlemap/hand-core";
import type { Params } from "@/lib/i18n/core";

type PluralTranslator = (key: string, count: number, params?: Params) => string;

const SHARE_UNIT_KEYS: Record<HandShares["unit"], string> = {
  dart: "campaign.session.hand.share.unit.dart",
  ray: "campaign.session.hand.share.unit.ray",
  beam: "campaign.session.hand.share.unit.beam",
  creature: "campaign.session.hand.share.unit.creature",
};

export function handShareUnit(
  unit: HandShares["unit"],
  count: number,
  translatePlural: PluralTranslator,
): string {
  return translatePlural(SHARE_UNIT_KEYS[unit], count);
}

export function handShareUnitCollective(
  unit: HandShares["unit"],
  translate: (key: string) => string,
): string {
  return translate(`${SHARE_UNIT_KEYS[unit]}.collective`);
}
