import type { Lang, Params } from "@/lib/i18n/core";
import type { MessageKey } from "@/lib/i18n/messages";

export type NotificationTextParams = Record<string, string | number>;

type Translate = (key: MessageKey, params?: Params) => string;

function stringParam(params: NotificationTextParams, key: string): string {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

function notificationWhen(value: string, lang: Lang): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date) + " UTC";
}

// The inbox still carries `body` for old clients and old saved rows. New
// rows add parameters, allowing each recipient to render the same event in
// their own interface language without translating user-authored names.
export function notificationText(
  kind: string,
  params: NotificationTextParams | undefined,
  legacyBody: string,
  lang: Lang,
  t: Translate,
): string {
  if (!params) return legacyBody;
  const campaignTitle = stringParam(params, "campaignTitle");
  const sessionTitle = stringParam(params, "sessionTitle");
  const when = notificationWhen(stringParam(params, "startsAt"), lang);
  switch (kind) {
    case "session_scheduled":
      return t(sessionTitle ? "notifications.message.scheduled" : "notifications.message.scheduledUntitled", { campaignTitle, sessionTitle, when });
    case "session_updated":
      return t(sessionTitle ? "notifications.message.updated" : "notifications.message.updatedUntitled", { campaignTitle, sessionTitle, when });
    case "session_cancelled":
      return t(sessionTitle ? "notifications.message.cancelled" : "notifications.message.cancelledUntitled", { campaignTitle, sessionTitle, when });
    case "rsvp": {
      const username = stringParam(params, "username");
      return t(sessionTitle ? "notifications.message.rsvpNo" : "notifications.message.rsvpNoUntitled", { username, campaignTitle, sessionTitle });
    }
    default:
      return legacyBody;
  }
}
