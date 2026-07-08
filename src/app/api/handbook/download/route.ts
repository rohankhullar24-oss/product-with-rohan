import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  getStripe,
  HANDBOOK_PRODUCT_METADATA_KEY,
  HANDBOOK_PRODUCT_METADATA_VALUE,
} from "@/lib/stripe";

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
  const sessionId = searchParams.get("session_id");
  const isFree = searchParams.get("free") === "true";

  if (!isFileType(type)) {
    return NextResponse.json({ error: "Invalid file type." }, { status: 400 });
  }

  if (!isFree) {
    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id." }, { status: 400 });
    }

    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      const isPaid = session.payment_status === "paid";
      const isThisProduct =
        session.metadata?.[HANDBOOK_PRODUCT_METADATA_KEY] === HANDBOOK_PRODUCT_METADATA_VALUE;

      if (!isPaid || !isThisProduct) {
        return NextResponse.json({ error: "Payment not verified." }, { status: 402 });
      }
    } catch (error) {
      console.error("Stripe session verification failed:", error);
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
