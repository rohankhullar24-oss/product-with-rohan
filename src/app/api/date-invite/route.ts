import { NextRequest, NextResponse } from "next/server";
import { getResend, HANDBOOK_FROM_EMAIL } from "@/lib/resend";
import { FOOD_OPTIONS, PLAN_OPTIONS, formatDate, formatTime } from "@/lib/date-invite";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const NOTIFY_EMAIL = "rohankhullar24@gmail.com";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    date?: string;
    time?: string;
    plan?: string;
    food?: string;
  } | null;

  const date = body?.date;
  const time = body?.time;
  const plan = body?.plan;
  const food = body?.food;

  if (
    !date ||
    !DATE_RE.test(date) ||
    !time ||
    !TIME_RE.test(time) ||
    !plan ||
    !PLAN_OPTIONS.includes(plan) ||
    !food ||
    !FOOD_OPTIONS.some((option) => option.label === food)
  ) {
    return NextResponse.json({ error: "Missing or invalid details." }, { status: 400 });
  }

  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: `Will You Go On A Date With Me <${HANDBOOK_FROM_EMAIL}>`,
      to: NOTIFY_EMAIL,
      subject: "She said yes! 🌹",
      text: [
        "She said yes, and here's what she picked:",
        "",
        `Date: ${formatDate(date)}`,
        `Time: ${formatTime(time)}`,
        `Plan: ${plan}`,
        `Food: ${food}`,
      ].join("\n"),
    });

    if (error) {
      console.error("Resend send failed:", error);
      return NextResponse.json({ error: "Could not send." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Date invite email failed:", error);
    return NextResponse.json({ error: "Could not send." }, { status: 500 });
  }
}
