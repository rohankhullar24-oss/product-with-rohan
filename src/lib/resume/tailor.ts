export type TailoredResume = {
  name: string;
  phone: string;
  email: string;
  location?: string;
  summary: string;
  skills: string[];
  experience: {
    company: string;
    role: string;
    dates: string;
    bullets: string[];
  }[];
  education: {
    school: string;
    degree: string;
    dates: string;
  }[];
  certifications?: string[];
};

export type TailorInput = {
  resumeText: string;
  name: string;
  phone: string;
  email: string;
  targetCompany?: string;
  targetRole: string;
  targetIndustry?: string;
};

const RESUME_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    phone: { type: "string" },
    email: { type: "string" },
    location: { type: "string" },
    summary: {
      type: "string",
      description: "2-3 sentence professional summary tailored to the target role/industry.",
    },
    skills: { type: "array", items: { type: "string" } },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string" },
          role: { type: "string" },
          dates: { type: "string" },
          bullets: {
            type: "array",
            items: { type: "string" },
            description: "Achievement-oriented bullets, quantified where possible, rewritten to emphasize relevance to the target role.",
          },
        },
        required: ["company", "role", "dates", "bullets"],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          school: { type: "string" },
          degree: { type: "string" },
          dates: { type: "string" },
        },
        required: ["school", "degree", "dates"],
      },
    },
    certifications: { type: "array", items: { type: "string" } },
  },
  required: ["name", "phone", "email", "summary", "skills", "experience", "education"],
};

export async function tailorResume(input: TailorInput): Promise<TailoredResume> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const targetLine = [
    input.targetRole && `Target role: ${input.targetRole}`,
    input.targetIndustry && `Target industry/space: ${input.targetIndustry}`,
    input.targetCompany && `Target company: ${input.targetCompany}`,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You are an expert resume writer specializing in product management careers. Rewrite the resume below to be sharply tailored to the target below. Keep all facts truthful — do not invent employers, dates, or metrics that aren't implied by the original resume. Do rewrite bullets to be achievement-oriented, quantify impact where the original text supports it, use strong action verbs, and prioritize/reorder content most relevant to the target.

${targetLine || "No specific target provided — tailor generically for strong product management roles."}

Contact info to use:
Name: ${input.name}
Phone: ${input.phone}
Email: ${input.email}

Original resume text:
"""
${input.resumeText}
"""

Return the tailored resume as structured JSON matching the schema.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESUME_SCHEMA,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No content returned from Gemini");
  }

  return JSON.parse(text) as TailoredResume;
}
