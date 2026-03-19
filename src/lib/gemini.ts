import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// This file should ONLY be imported in server-side code (API routes)
// Never import this in client components

if (!process.env.GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY is not set. AI features will not work.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Safety settings - allow analysis while blocking harmful content
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Model for analysis (vision + text) - Using gemini-2.0-flash which supports images
// DETERMINISM: temperature=0 ensures same input = same output
export function getVisionModel() {
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    safetySettings,
    generationConfig: {
      temperature: 0, // DETERMINISTIC: same photo = same result
      topP: 1,        // Disable nucleus sampling for determinism
      topK: 1,        // Only pick top token for determinism
      maxOutputTokens: 8192,
    },
  });
}

// Model for text generation (workout plans, etc.)
export function getTextModel() {
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    safetySettings,
    generationConfig: {
      temperature: 0.5,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 4096,
    },
  });
}

// Model for image generation/editing
// Uses Gemini 2.0 Flash with experimental image generation capability
export function getImageGenerationModel() {
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp-image-generation',
    generationConfig: {
      temperature: 0.8, // Some creativity but not too random
      topP: 0.95,
      topK: 40,
      // Note: Response modalities for image output are set in the API call
    },
  });
}

// Helper to convert base64 to Gemini's format
export function base64ToGenerativePart(base64Data: string, mimeType: string) {
  // Remove data URL prefix if present
  const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
}

// Extract JSON from response that might have markdown code blocks
export function extractJSON<T>(text: string): T {
  // Try to find JSON in markdown code block
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim()) as T;
  }
  
  // Try to find raw JSON object
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return JSON.parse(objectMatch[0]) as T;
  }
  
  // Last resort: try parsing the whole thing
  return JSON.parse(text) as T;
}

// Extract base64 image from response
// Handles both GenerateContentResponse objects and raw response structures
interface ImageResponseCandidate {
  content?: {
    parts?: Array<{
      inlineData?: {
        mimeType: string;
        data: string;
      };
    }>;
  };
}

interface ImageResponse {
  candidates?: ImageResponseCandidate[] | (() => ImageResponseCandidate[]);
}

export function extractImageFromResponse(response: ImageResponse): string | null {
  try {
    // Try to get candidates from response
    let candidates = response.candidates;
    
    // If response has a candidates() method (GenerateContentResponse), call it
    if (!candidates && typeof response.candidates === 'function') {
      candidates = response.candidates();
    }
    
    if (!candidates || candidates.length === 0) {
      console.log('No candidates in response');
      return null;
    }
    
    const parts = candidates[0].content?.parts;
    if (!parts) {
      console.log('No parts in response candidate');
      return null;
    }
    
    console.log('Response parts count:', parts.length);
    
    for (const part of parts) {
      // Check for inline image data
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        console.log('Found inline image data, mimeType:', mimeType);
        return `data:${mimeType};base64,${part.inlineData.data}`;
      }
      
      // Check for file data (some models use this)
      if (part.fileData?.fileUri) {
        console.log('Found file URI:', part.fileData.fileUri);
        return part.fileData.fileUri;
      }
    }
    
    console.log('No image data found in parts');
    return null;
  } catch (e) {
    console.error('Error extracting image:', e);
    return null;
  }
}
