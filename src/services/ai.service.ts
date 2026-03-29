import axios from 'axios';

// Ollama API configuration
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const OLLAMA_TIMEOUT = 30000; // 30 seconds

// Allow mock mode for testing
const useMock = process.env.MOCK_AI === "true" || process.env.NODE_ENV === "test";

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
  // Mock mode for testing
  if (useMock) {
    return {
      hooks: [
        "You won't believe this...",
        "This changed everything for me.",
        "Stop scrolling if you need this.",
        "I tested this so you don't have to.",
        "Here's the secret nobody talks about."
      ],
      script: `This is a mock script for ${input.productName}. It demonstrates structured output without calling AI. Perfect for testing and development.`,
      caption: `Mock content for ${input.productName}. Amazing results. Try it now!`,
      hashtags: ["#ai", "#affiliate", "#mock"]
    }
  }

  // Ollama API call
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
`;

  try {
    console.log('🤖 Calling Ollama API...');
    console.log('📍 URL:', OLLAMA_API_URL);
    console.log('🔧 Model:', OLLAMA_MODEL);

    const response = await axios.post(
      OLLAMA_API_URL,
      {
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false
      },
      {
        timeout: OLLAMA_TIMEOUT,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Ollama response received');

    // Extract response from Ollama
    const aiResponse = response.data.response;

    if (!aiResponse) {
      console.error('❌ No response from Ollama');
      throw new Error('No AI response');
    }

    console.log('📝 AI Response:', aiResponse.substring(0, 100) + '...');

    // Parse JSON response
    let parsedContent: GeneratedContent;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        parsedContent = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', parseError);
      console.error('Raw response:', aiResponse);
      
      // Fallback: create structured content from raw response
      parsedContent = {
        hooks: [
          "Check this out!",
          "You need to see this.",
          "This is amazing!",
          "Don't miss this.",
          "Game changer alert!"
        ],
        script: aiResponse.substring(0, 500),
        caption: aiResponse.substring(0, 150),
        hashtags: ["#ai", "#content", "#affiliate"]
      };
    }

    return parsedContent;

  } catch (error: any) {
    console.error('❌ Ollama API Error:', error.message);
    
    // Check if it's a timeout error
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timed out after 30 seconds');
      throw new Error('AI service timeout - request took too long');
    }
    
    // Check if Ollama is unreachable
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('🔌 Ollama service not reachable');
      throw new Error('AI service unavailable');
    }

    // Log full error for debugging
    console.error('Full error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });

    throw new Error('AI service unavailable');
  }
}
