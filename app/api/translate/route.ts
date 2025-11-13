import { NextRequest, NextResponse } from 'next/server'

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { text, sourceLanguage, targetLanguage } = await request.json()

    console.log(`Translation request: ${sourceLanguage} -> ${targetLanguage}`)

    if (!text || !sourceLanguage || !targetLanguage) {
      return NextResponse.json(
        { error: 'Missing required fields: text, sourceLanguage, targetLanguage' },
        { status: 400 }
      )
    }

    // If source and target are the same, return the original text
    if (sourceLanguage === targetLanguage) {
      console.log('Source and target languages are the same, returning original text')
      return NextResponse.json({
        translatedText: text,
        detectedSourceLanguage: sourceLanguage
      })
    }

    const url = `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLanguage,
        target: targetLanguage,
        format: 'text'
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Google Translate error:', errorText)
      console.error(`Failed translation: ${sourceLanguage} -> ${targetLanguage}`)
      return NextResponse.json(
        { error: 'Translation failed', details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    const translatedText = result?.data?.translations?.[0]?.translatedText || text

    console.log(`Translation successful: "${text.substring(0, 30)}..." -> "${translatedText.substring(0, 30)}..."`)

    return NextResponse.json({
      translatedText,
      detectedSourceLanguage: result?.data?.translations?.[0]?.detectedSourceLanguage || sourceLanguage
    })

  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json(
      { error: 'Internal server error during translation' },
      { status: 500 }
    )
  }
}
