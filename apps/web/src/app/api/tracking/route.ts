import { NextRequest, NextResponse } from "next/server";

const legacyApiBase = process.env.API_BASE_URL ? `${process.env.API_BASE_URL.replace(/\/$/, "")}/v1` : undefined;
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? legacyApiBase ?? "http://localhost:8000/v1";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const response = await fetch(`${API_BASE}/tracking/events`, {
    method: "POST",
    headers: {
      "Content-Type": request.headers.get("content-type") ?? "application/json",
    },
    body,
    cache: "no-store",
  });

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}
