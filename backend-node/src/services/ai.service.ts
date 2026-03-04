import OpenAI from "openai"

const useMock = process.env.MOCK_AI === "true" || process.env.NODE_ENV === 'test'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface AffiliateContentInput {
  productName: string
  description: string
  audience: string
}

export interface GeneratedContent {
  hooks: string[]
  script: string
  caption: string
  hashtags: string[]
}

export async function generateAffiliateContent(
  input: AffiliateContentInput
): Promise<GeneratedContent> {
  // Mock mode for testing without OpenAI quota
  if (useMock) {
    return {
      hooks: [
        "You won't believe this...",
        "This changed everything for me.",
        "Stop scrolling if you need this.",
        "I tested this so you don't have to.",
        "Here's the secret nobody talks about."
      ],
      script: `This is a mock script for ${input.productName}. It demonstrates structured output without calling OpenAI. Perfect for testing and development.`,
      caption: `Mock content for ${input.productName}. Amazing results. Try it now!`,
      hashtags: ["#ai", "#affiliate", "#mock"]
    }
  }

  // Real OpenAI call
  const prompt = `
Return ONLY valid JSON in this format:

{
  "hooks": ["hook1", "hook2", "hook3", "hook4", "hook5"],
  "script": "30-45 second persuasive script",
  "caption": "short engaging caption",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}

Product: ${input.productName}
Description: ${input.description}
Audience: ${input.audience}

No explanations. No markdown. Only JSON.
`

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
  })

  const content = completion.choices[0].message.content

  if (!content) {
    throw new Error("No AI response")
  }

  return JSON.parse(content)
}
