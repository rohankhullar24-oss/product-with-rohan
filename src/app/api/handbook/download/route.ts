import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpaySignature } from "@/lib/razorpay";

const FILES = {
  pdf: {
    filename: "The-Product-Manager-Handbook.pdf",
    contentType: "application/pdf",
  },
  docx: {
    filename: "The-Product-Manager-Handbook.docx",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
} as const;

type FileType = keyof typeof FILES;

function isFileType(value: string | null): value is FileType {
  return value === "pdf" || value === "docx";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const orderId = searchParams.get("order_id");
  const paymentId = searchParams.get("payment_id");
  const signature = searchParams.get("signature");
  const isFree = searchParams.get("free") === "true";

  if (!isFileType(type)) {
    return NextResponse.json({ error: "Invalid file type." }, { status: 400 });
  }

  if (!isFree) {
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
  }

  const file = FILES[type];
  const filePath = path.join(process.cwd(), "handbook-assets", file.filename);
  const buffer = await readFile(filePath);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Content-Length": String(buffer.byteLength),
    },
  });
}
