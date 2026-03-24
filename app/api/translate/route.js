import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import OpenAI from 'openai'

let _openai
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { text, from, to } = await request.json()

  if (!text || !text.trim()) {
    return Response.json({ error: 'No text provided' }, { status: 400 })
  }

  const fromLabel = from === 'ko' ? 'Korean' : 'English'
  const toLabel = to === 'ko' ? 'Korean' : 'English'

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a translator. Translate the following text from ${fromLabel} to ${toLabel}. Return ONLY the translated text, nothing else. Preserve the original formatting, line breaks, and tone.`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    })

    const translated = response.choices[0].message.content.trim()
    return Response.json({ translated })
  } catch (error) {
    console.error('Translation error:', error)
    return Response.json({ error: 'Translation failed' }, { status: 500 })
  }
}
