import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { licenseKey } = await request.json()

  if (!licenseKey || typeof licenseKey !== "string") {
    return NextResponse.json({ valid: false, error: "License key is required." }, { status: 400 })
  }

  const body = new URLSearchParams({
    product_id: "HPo01TTHZJ0FMQtoNWGUyg==",
    license_key: licenseKey.trim(),
    increment_uses_count: "false",
  })

  let gumroadRes: Response
  try {
    gumroadRes = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    })
  } catch {
    return NextResponse.json({ valid: false, error: "Could not reach license server. Check your connection." }, { status: 502 })
  }

  const data = await gumroadRes.json()

  if (data.success) {
    return NextResponse.json({ valid: true })
  }

  return NextResponse.json({ valid: false, error: data.message ?? "Invalid license key." })
}
