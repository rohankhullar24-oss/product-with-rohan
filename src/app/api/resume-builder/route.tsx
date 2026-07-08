import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { extractResumeText } from "@/lib/resume/parse";
import { tailorResume } from "@/lib/resume/tailor";
import { ResumePdf } from "@/lib/resume/ResumePdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const name = formData.get("name")?.toString().trim();
    const phone = formData.get("phone")?.toString().trim();
    const email = formData.get("email")?.toString().trim();
    const targetRole = formData.get("targetRole")?.toString().trim();
    const targetCompany = formData.get("targetCompany")?.toString().trim();
    const targetIndustry = formData.get("targetIndustry")?.toString().trim();
    const file = formData.get("resume");

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

    const resumeText = await extractResumeText(file);
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
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
