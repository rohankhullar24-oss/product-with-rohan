import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { extractResumeText } from "@/lib/resume/parse";
import { tailorResume } from "@/lib/resume/tailor";
import { ResumePdf } from "@/lib/resume/ResumePdf";
import { isRateLimited } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_RESUME_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  if (isRateLimited(request, "resume-builder", 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  try {
    const formData = await request.formData();

    const name = formData.get("name")?.toString().trim();
    const phone = formData.get("phone")?.toString().trim();
    const email = formData.get("email")?.toString().trim();
    const targetRole = formData.get("targetRole")?.toString().trim();
    const targetCompany = formData.get("targetCompany")?.toString().trim();
    const targetIndustry = formData.get("targetIndustry")?.toString().trim();
    const file = formData.get("resume");
    const consent = formData.get("consent")?.toString();

    if (consent !== "true") {
      return NextResponse.json(
        { error: "You must confirm how your resume will be processed before submitting." },
        { status: 400 }
      );
    }

    if (!name || !phone || !email) {
      return NextResponse.json(
        { error: "Name, phone, and email are required." },
        { status: 400 }
      );
    }

    if (!targetRole) {
      return NextResponse.json(
        { error: "Target role is required." },
        { status: 400 }
      );
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Please upload a resume file (PDF or DOCX)." },
        { status: 400 }
      );
    }

    if (file.size > MAX_RESUME_BYTES) {
      return NextResponse.json(
        { error: "That resume file is too large (max 8MB)." },
        { status: 413 }
      );
    }

    let resumeText: string;
    try {
      resumeText = await extractResumeText(file);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Couldn't read the uploaded resume.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (!resumeText.trim()) {
      return NextResponse.json(
        { error: "Couldn't extract any text from the uploaded resume." },
        { status: 400 }
      );
    }

    const tailored = await tailorResume({
      resumeText,
      name,
      phone,
      email,
      targetRole,
      targetCompany: targetCompany || undefined,
      targetIndustry: targetIndustry || undefined,
    });

    const pdfBuffer = await renderToBuffer(<ResumePdf resume={tailored} />);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name.replace(/\s+/g, "_")}_Resume.pdf"`,
      },
    });
  } catch (error) {
    console.error("resume-builder error:", error);
    return NextResponse.json(
      { error: "Something went wrong while building your resume. Please try again." },
      { status: 500 }
    );
  }
}
