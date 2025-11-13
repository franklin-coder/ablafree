import { NextRequest, NextResponse } from 'next/server'

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const language = formData.get('language') as string || 'es'
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Convert File to ArrayBuffer for Deepgram
    const arrayBuffer = await audioFile.arrayBuffer()

    // Validate audio size (minimum 1KB to have meaningful content)
    if (arrayBuffer.byteLength < 1000) {
      console.warn('Audio too short:', arrayBuffer.byteLength, 'bytes')
      return NextResponse.json({ 
        error: 'Audio is too short. Please speak for at least 1 second.' 
      }, { status: 400 })
    }

    // Convert to Uint8Array which is compatible with fetch body
    const audioData = new Uint8Array(arrayBuffer)

    // Map language codes to Deepgram format
    const languageMap: { [key: string]: string } = {
      'es': 'es',           // Spanish
      'en': 'en-US',        // English
      'fr': 'fr',           // French
      'de': 'de',           // German
      'pt': 'pt',           // Portuguese
      'it': 'it',           // Italian
      'zh': 'zh-CN',        // Chinese (Simplified)
      'ja': 'ja',           // Japanese
      'ko': 'ko',           // Korean
      'ar': 'ar'            // Arabic
    }
    
    const deepgramLanguage = languageMap[language] || 'en-US'
    console.log(`Processing audio with language: ${language} -> ${deepgramLanguage}`)

    const response = await fetch(`https://api.deepgram.com/v1/listen?language=${deepgramLanguage}&model=nova-2`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/wav',
      },
      body: audioData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Deepgram error:', errorText)
      return NextResponse.json(
        { error: 'Transcription failed', details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
    
    if (!transcript) {
      return NextResponse.json({ error: 'No speech detected' }, { status: 400 })
    }

    return NextResponse.json({
      transcript,
      confidence: result?.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0
    })

  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'Internal server error during transcription' },
      { status: 500 }
    )
  }
}