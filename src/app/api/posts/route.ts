import { NextResponse } from "next/server";
import { getAllPosts } from "@/lib/posts";

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

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const posts = getAllPosts();
  return NextResponse.json(posts, { headers: corsHeaders(origin) });
}
