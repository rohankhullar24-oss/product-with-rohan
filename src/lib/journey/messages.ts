import { deleteRow, listRows, saveRow } from "./rows";
import type { MessageTemplate, RecipientEntry, RecipientList } from "./types";

// Message templates and recipient lists from the phone's Auto Scheduler
// (auto_scheduler_rows kinds "template" / "recipient_list"). Sending stays on
// the phone; the web only manages the reusable pieces.

export const listTemplates = async () =>
  (await listRows<MessageTemplate>("template")).sort((a, b) => a.name.localeCompare(b.name));
export const saveTemplate = (t: MessageTemplate) => saveRow<MessageTemplate>("template", t);
export const deleteTemplate = (id: string) => deleteRow("template", id);

export const listRecipientLists = async () =>
  (await listRows<RecipientList>("recipient_list")).sort((a, b) => a.name.localeCompare(b.name));
export const saveRecipientList = (l: RecipientList) => saveRow<RecipientList>("recipient_list", l);
export const deleteRecipientList = (id: string) => deleteRow("recipient_list", id);

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const looksLikePhone = (s: string) => /^\+?[\d\s()-]{6,}$/.test(s);

/**
 * Parses a CSV or vCard export into recipients, like the phone's
 * RecipientImportParser: a CSV picks its name/phone columns from a header
 * row when there is one, otherwise the first phone-like column.
 */
export function parseRecipients(text: string): RecipientEntry[] {
  if (/BEGIN:VCARD/i.test(text)) {
    return text
      .split(/END:VCARD/i)
      .map((card) => {
        const name = card.match(/^FN[^:]*:(.*)$/im)?.[1]?.trim() ?? "";
        const phone = card.match(/^TEL[^:]*:(.*)$/im)?.[1]?.trim() ?? "";
        return { name, phone };
      })
      .filter((r) => r.phone);
  }
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const first = splitCsvLine(lines[0]).map((c) => c.toLowerCase());
  const hasHeader = !first.some(looksLikePhone);
  let nameIdx = hasHeader ? first.findIndex((c) => /name/.test(c)) : -1;
  let phoneIdx = hasHeader ? first.findIndex((c) => /phone|mobile|number|tel/.test(c)) : -1;
  const rows = (hasHeader ? lines.slice(1) : lines).map(splitCsvLine);
  if (phoneIdx < 0) phoneIdx = Math.max(0, rows[0]?.findIndex(looksLikePhone) ?? 0);
  if (nameIdx < 0) nameIdx = phoneIdx === 0 ? 1 : 0;
  return rows
    .map((cols) => ({ name: cols[nameIdx] ?? "", phone: cols[phoneIdx] ?? "" }))
    .filter((r) => looksLikePhone(r.phone));
}
