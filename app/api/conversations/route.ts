
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const conversations = db.getMessages(sessionId)

    return NextResponse.json(conversations)

  } catch (error) {
    console.error('Memory query error:', error)
    return NextResponse.json(
      { error: 'Internal server error while fetching conversations' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    db.clearSession(sessionId)

    return NextResponse.json({ message: 'Conversation history deleted' })

  } catch (error) {
    console.error('Memory delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error while deleting conversations' },
      { status: 500 }
    )
  }
}
