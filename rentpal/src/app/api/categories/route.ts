import { NextResponse } from 'next/server'

// Minimal placeholder route to avoid 404s. Replace with real data fetching.
export async function GET() {
  try {
    // Return an empty list for now
    return NextResponse.json({ categories: [] })
  } catch (e) {
    return NextResponse.json({ error: 'failed_to_fetch' }, { status: 500 })
  }
}
