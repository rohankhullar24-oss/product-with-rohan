import { NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/posts";

function corsHeaders(origin: string | null) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (allowedOrigin && origin === allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
  }
  return headers;
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const origin = request.headers.get("origin");
  const { slug } = await params;

  try {
    const post = getPostBySlug(slug);
    return NextResponse.json(post, { headers: corsHeaders(origin) });
  } catch {
    return NextResponse.json(
      { error: "Post not found" },
      { status: 404, headers: corsHeaders(origin) }
    );
  }
}
