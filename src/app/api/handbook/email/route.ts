import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { getResend, HANDBOOK_FROM_EMAIL } from "@/lib/resend";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FILES = [
  {
    filename: "The-Product-Manager-Handbook.docx",
    path: "The-Product-Manager-Handbook.docx",
  },
];

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    email?: string;
    order_id?: string;
    payment_id?: string;
    signature?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const { order_id: orderId, payment_id: paymentId, signature } = body;

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
  }

  let verified: boolean;
  try {
    verified = verifyRazorpaySignature(orderId, paymentId, signature);
  } catch (error) {
    console.error("Razorpay signature verification failed:", error);
    return NextResponse.json({ error: "Payment not verified." }, { status: 402 });
  }

  if (!verified) {
    return NextResponse.json({ error: "Payment not verified." }, { status: 402 });
  }

  try {
    const attachments = await Promise.all(
      FILES.map(async (file) => {
        const filePath = path.join(process.cwd(), "handbook-assets", file.path);
        const buffer = await readFile(filePath);
        return { filename: file.filename, content: buffer };
      })
    );

    const resend = getResend();
    const { error } = await resend.emails.send({
      from: `The Product Manager Handbook <${HANDBOOK_FROM_EMAIL}>`,
      to: email,
      subject: "Your Product Manager Handbook",
      text: "Thanks for your purchase — the Word copy of The Product Manager Handbook is attached to this email. For the PDF, use the download buttons on the site.",
      attachments,
    });

    if (error) {
      console.error("Resend send failed:", error);
      return NextResponse.json({ error: "Could not send email. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Handbook email send failed:", error);
    return NextResponse.json({ error: "Could not send email. Please try again." }, { status: 500 });
  }
}
