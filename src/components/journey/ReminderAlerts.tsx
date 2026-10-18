"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { listReminders, nextTrigger, scheduleLabel } from "@/lib/journey/reminders";

// Optional browser notifications for reminders, on top of the phone's alarms.
// They only fire while some Journey tab is open: there's no push server, so
// this is a convenience for desk time, not a replacement for the app.

const STORAGE_KEY = "journey-reminder-alerts";
/** Fired after any reminder change so open tabs reschedule. */
export const ALERTS_CHANGED_EVENT = "journey-reminders-changed";
const HORIZON_MS = 24 * 60 * 60 * 1000;
const REFRESH_MS = 15 * 60 * 1000;

function readEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "on" && Notification.permission === "granted";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(ALERTS_CHANGED_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(ALERTS_CHANGED_EVENT, cb);
  };
}

export function useReminderAlertsSetting() {
  const supported = useSyncExternalStore(subscribe, () => "Notification" in window, () => false);
  const enabled = useSyncExternalStore(subscribe, readEnabled, () => false);

  async function toggle() {
    try {
      if (enabled) {
        localStorage.setItem(STORAGE_KEY, "off");
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          alert("Your browser blocked notifications for this site. Allow them in site settings to use browser alerts.");
          return;
        }
        localStorage.setItem(STORAGE_KEY, "on");
      }
    } catch {
      return;
    }
    window.dispatchEvent(new Event(ALERTS_CHANGED_EVENT));
  }

  return { supported, enabled, toggle };
}

/** Mounted once in the Journey layout; schedules the next day's alerts. */
export default function ReminderAlerts() {
  const { enabled } = useReminderAlertsSetting();
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    let timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;

    const clear = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };

    async function schedule() {
      clear();
      let reminders;
      try {
        reminders = await listReminders();
      } catch {
        return; // Signed out or offline; the next refresh retries.
      }
      if (cancelled) return;
      const now = new Date();
      for (const r of reminders) {
        const at = nextTrigger(r, now);
        if (!at || at.getTime() - now.getTime() > HORIZON_MS) continue;
        timers.push(
          setTimeout(() => {
            const n = new Notification(r.title || "Reminder", { body: r.notes || scheduleLabel(r), tag: `${r.id}-${at.getTime()}` });
            n.onclick = () => {
              window.focus();
              router.push("/journey/reminders");
              n.close();
            };
            // Line up whatever comes after this slot.
            setTimeout(schedule, 1000);
          }, at.getTime() - now.getTime())
        );
      }
    }

    schedule();
    const interval = setInterval(schedule, REFRESH_MS);
    window.addEventListener(ALERTS_CHANGED_EVENT, schedule);
    return () => {
      cancelled = true;
      clear();
      clearInterval(interval);
      window.removeEventListener(ALERTS_CHANGED_EVENT, schedule);
    };
  }, [enabled, router]);

  return null;
}
