
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const sourceLanguage = formData.get('sourceLanguage') as string
    const targetLanguage = formData.get('targetLanguage') as string
    const sessionId = formData.get('sessionId') as string
    const speaker = formData.get('speaker') as 'cliente' | 'cajero'

    console.log(`🎯 Processing audio: ${speaker} | ${sourceLanguage} -> ${targetLanguage}`)

    if (!audioFile || !sourceLanguage || !targetLanguage || !sessionId || !speaker) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Step 1: Transcribe audio using Deepgram
    const transcribeFormData = new FormData()
    transcribeFormData.append('audio', audioFile)
    transcribeFormData.append('language', sourceLanguage)

    const transcribeResponse = await fetch(`${request.url.split('/api')[0]}/api/transcribe`, {
      method: 'POST',
      body: transcribeFormData,
    })

    if (!transcribeResponse.ok) {
      const error = await transcribeResponse.json()
      console.error('Transcription failed:', error)

      // Return more user-friendly error messages
      if (error.error?.includes('too short')) {
        return NextResponse.json({
          error: 'Audio demasiado corto. Mantén presionado el botón y habla al menos 1 segundo.'
        }, { status: 400 })
      }

      if (error.error?.includes('No speech detected')) {
        return NextResponse.json({
          error: 'No se detectó voz clara. Intenta hablar más cerca del micrófono.'
        }, { status: 400 })
      }

      return NextResponse.json({
        error: 'Error en la transcripción. Intenta nuevamente.',
        details: error
      }, { status: 500 })
    }

    const { transcript } = await transcribeResponse.json()

    // Extra validation: check if transcript is meaningful
    if (!transcript || transcript.trim().length < 2) {
      console.warn('Empty or very short transcript:', transcript)
      return NextResponse.json({
        error: 'No se pudo entender el audio. Por favor, habla más claro y despacio.'
      }, { status: 400 })
    }

    // Step 2: Translate text using Google Translate
    const translateResponse = await fetch(`${request.url.split('/api')[0]}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: transcript,
        sourceLanguage,
        targetLanguage,
      }),
    })

    if (!translateResponse.ok) {
      const error = await translateResponse.json()
      return NextResponse.json({ error: 'Translation failed', details: error }, { status: 500 })
    }

    const { translatedText } = await translateResponse.json()

    // Step 3: Synthesize translated text to speech using OpenAI
    const synthesizeResponse = await fetch(`${request.url.split('/api')[0]}/api/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: translatedText,
        language: targetLanguage,
      }),
    })

    if (!synthesizeResponse.ok) {
      const error = await synthesizeResponse.json()
      return NextResponse.json({ error: 'Speech synthesis failed', details: error }, { status: 500 })
    }

    const { audioBase64 } = await synthesizeResponse.json()

    // Step 4: Save conversation to memory
    try {
      db.saveMessage({
        sessionId,
        speaker,
        originalText: transcript,
        originalLang: sourceLanguage,
        translatedText,
        translatedLang: targetLanguage,
        audioBase64,
      })
    } catch (dbError) {
      console.error('Memory save error:', dbError)
      // Continue even if save fails - don't break the user experience
    }

    return NextResponse.json({
      originalText: transcript,
      translatedText,
      audioBase64,
      sessionId,
      speaker,
    })

  } catch (error) {
    console.error('Audio processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error during audio processing' },
      { status: 500 }
    )
  }
}
