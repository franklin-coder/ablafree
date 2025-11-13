
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = "force-dynamic"

// GET endpoint to fetch new messages since a specific timestamp
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const since = searchParams.get('since') // ISO timestamp

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const messages = db.getMessages(
      sessionId,
      since ? new Date(since) : undefined
    )

    return NextResponse.json({ messages })

  } catch (error) {
    console.error('Memory query error:', error)
    return NextResponse.json(
      { error: 'Internal server error while fetching messages' },
      { status: 500 }
    )
  }
}
