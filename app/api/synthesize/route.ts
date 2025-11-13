import { NextRequest, NextResponse } from 'next/server'

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { text, language } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    // Map language codes to OpenAI voices
    const voiceMap: { [key: string]: string } = {
      'es': 'nova',    // Spanish - female voice
      'en': 'alloy',   // English - neutral voice
      'fr': 'shimmer', // French - warm voice
      'de': 'onyx',    // German - deep voice
      'pt': 'nova',    // Portuguese - female voice
      'it': 'shimmer', // Italian - warm voice
      'zh': 'alloy',   // Chinese - neutral voice
      'ja': 'echo',    // Japanese - male voice
      'ko': 'fable',   // Korean - expressive voice
      'ar': 'onyx'     // Arabic - deep voice
    }

    const voice = voiceMap[language] || 'alloy'
    console.log(`Synthesizing speech for language: ${language} with voice: ${voice}`)

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        response_format: 'wav'
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI TTS error:', errorText)
      return NextResponse.json(
        { error: 'Speech synthesis failed', details: errorText },
        { status: response.status }
      )
    }

    // Convert audio response to base64
    const audioBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')

    return NextResponse.json({
      audioBase64: base64Audio,
      voice: voice
    })

  } catch (error) {
    console.error('Speech synthesis error:', error)
    return NextResponse.json(
      { error: 'Internal server error during speech synthesis' },
      { status: 500 }
    )
  }
}