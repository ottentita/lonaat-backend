/**
 * OLLAMA SERVICE
 * Interface to Ollama API for AI operations
 */

import axios from 'axios';

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'llama3';

export interface OllamaResponse {
  raw: any;
  text: string;
  error?: string;
}

/**
 * Ask Ollama a question
 */
export async function askOllama(prompt: string): Promise<OllamaResponse> {
  try {
    const response = await axios.post(OLLAMA_URL, {
      model: MODEL,
      prompt,
      stream: false
    }, {
      timeout: 30000 // 30 second timeout
    });
    
    return {
      raw: response.data,
      text: response.data.response || ''
    };
  } catch (error: any) {
    // Retry once if timeout
    if (error.code === 'ECONNABORTED') {
      try {
        const retryResponse = await axios.post(OLLAMA_URL, {
          model: MODEL,
          prompt,
          stream: false
        }, {
          timeout: 30000
        });
        
        return {
          raw: retryResponse.data,
          text: retryResponse.data.response || ''
        };
      } catch (retryError: any) {
        // Still failed after retry
        return {
          raw: null,
          text: 'AI temporarily unavailable',
          error: 'OLLAMA_OFFLINE'
        };
      }
    }
    
    // Handle Ollama not running
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return {
        raw: null,
        text: 'AI temporarily unavailable',
        error: 'OLLAMA_OFFLINE'
      };
    }
    
    // Handle other errors
    return {
      raw: null,
      text: 'AI temporarily unavailable',
      error: 'OLLAMA_OFFLINE'
    };
  }
}
