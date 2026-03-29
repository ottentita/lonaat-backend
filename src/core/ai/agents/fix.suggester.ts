/**
 * FIX SUGGESTER
 * Suggests fixes for errors using Ollama
 */

import { askOllama } from './ollama.service';
import { getMemory } from '../memory/memory.service';
import { SYSTEM_REGISTRY } from '../registry/system.registry';
import { SYSTEM_RULES } from '../rules/system.rules';

export interface ErrorLog {
  message: string;
  context?: any;
}

export interface FixSuggestion {
  suggestion: string;
  error?: string;
}

/**
 * Suggest fix for an error
 */
export async function suggestFix(errorLog: ErrorLog): Promise<FixSuggestion> {
  try {
    // Fetch system memory
    const apiStructure = await getMemory('api_structure');
    const sourcesOfTruth = await getMemory('services_source_of_truth');
    
    // Build structured prompt
    const prompt = buildPrompt(errorLog, apiStructure, sourcesOfTruth);
    
    // Ask Ollama
    const response = await askOllama(prompt);
    
    if (response.error) {
      return {
        suggestion: '',
        error: response.error
      };
    }
    
    // Sanitize output before returning
    const sanitized = sanitizeFixOutput(response.text);
    
    return {
      suggestion: sanitized
    };
  } catch (error: any) {
    return {
      suggestion: '',
      error: error.message || 'Failed to generate fix suggestion'
    };
  }
}

/**
 * Sanitize fix output to contain only suggested fix text
 * Removes system structure, registry data, and raw logs
 */
function sanitizeFixOutput(rawOutput: string): string {
  if (!rawOutput) return '';
  
  // Remove common system data patterns
  let sanitized = rawOutput;
  
  // Remove JSON blocks
  sanitized = sanitized.replace(/```json[\s\S]*?```/gi, '');
  sanitized = sanitized.replace(/\{[\s\S]*?\}/g, '');
  
  // Remove registry/system structure references
  sanitized = sanitized.replace(/SYSTEM STRUCTURE:[\s\S]*?(?=\n\n|$)/gi, '');
  sanitized = sanitized.replace(/REGISTERED SERVICES:[\s\S]*?(?=\n\n|$)/gi, '');
  sanitized = sanitized.replace(/REGISTERED ROUTES:[\s\S]*?(?=\n\n|$)/gi, '');
  sanitized = sanitized.replace(/SOURCE OF TRUTH:[\s\S]*?(?=\n\n|$)/gi, '');
  sanitized = sanitized.replace(/SYSTEM RULES:[\s\S]*?(?=\n\n|$)/gi, '');
  
  // Remove file paths and technical references
  sanitized = sanitized.replace(/src\/[\w\/\-\.]+/gi, '');
  sanitized = sanitized.replace(/\/api\/[\w\/\-]+/gi, (match) => {
    // Keep route suggestions but remove raw paths
    return match.includes('use') || match.includes('change') ? match : '';
  });
  
  // Clean up extra whitespace
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Build structured prompt for Ollama
 */
function buildPrompt(errorLog: ErrorLog, apiStructure: any, sourcesOfTruth: any): string {
  const prompt = `You are a backend debugging assistant. Analyze this error and suggest a fix.

ERROR:
${errorLog.message}

CONTEXT:
${JSON.stringify(errorLog.context || {}, null, 2)}

SYSTEM STRUCTURE:
API Base: ${apiStructure?.base || '/api'}
AI Base: ${apiStructure?.ai_base || '/api/ai-system'}

REGISTERED SERVICES:
${Object.entries(SYSTEM_REGISTRY.services).map(([name, info]: [string, any]) => 
  `- ${name}: ${info.path}`
).join('\n')}

REGISTERED ROUTES:
${Object.entries(SYSTEM_REGISTRY.routes).map(([name, path]) => 
  `- ${name}: ${path}`
).join('\n')}

SYSTEM RULES:
${SYSTEM_RULES.join('\n- ')}

SOURCE OF TRUTH SERVICES:
${JSON.stringify(sourcesOfTruth || {}, null, 2)}

Based on the error, system structure, and rules, suggest a specific fix. Be concise and actionable.`;

  return prompt;
}
