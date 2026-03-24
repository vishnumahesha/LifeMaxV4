import Anthropic from '@anthropic-ai/sdk';

// This file should ONLY be imported in server-side code (API routes)
// Never import this in client components

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('ANTHROPIC_API_KEY is not set. AI features will not work.');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Vision model for image analysis (face scan, body scan, photo validation, meal scan)
// Using claude-opus-4-5 for maximum accuracy with images
export function getVisionModel() {
  return {
    model: 'claude-opus-4-5' as const,
    max_tokens: 8192,
    temperature: 0, // DETERMINISTIC: same photo = same result
  };
}

// Text model for text-only tasks (action plan generation)
// Using claude-sonnet-4-5 for fast, high-quality text generation
export function getTextModel() {
  return {
    model: 'claude-sonnet-4-5' as const,
    max_tokens: 4096,
    temperature: 0.5,
  };
}

// Helper to convert base64 to Anthropic's image format
export function base64ToImageContent(base64Data: string, mediaType: string = 'image/jpeg') {
  // Remove data URL prefix if present
  const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

  return {
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: mediaType,
      data: base64,
    },
  };
}

// Create a message with vision (image + text)
export async function createVisionMessage(
  prompt: string,
  images: Array<{ base64: string; mediaType?: string }>
) {
  const config = getVisionModel();

  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  > = [];

  // Add images first
  images.forEach((img) => {
    content.push(base64ToImageContent(img.base64, img.mediaType || 'image/jpeg'));
  });

  // Add text prompt
  content.push({ type: 'text', text: prompt });

  const message = await anthropic.messages.create({
    model: config.model,
    max_tokens: config.max_tokens,
    temperature: config.temperature,
    messages: [
      {
        role: 'user',
        content,
      },
    ],
  });

  // Extract text from response
  const textBlock = message.content.find((block) => block.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text : '';
}

// Create a text-only message
export async function createTextMessage(prompt: string) {
  const config = getTextModel();

  const message = await anthropic.messages.create({
    model: config.model,
    max_tokens: config.max_tokens,
    temperature: config.temperature,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract text from response
  const textBlock = message.content.find((block) => block.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text : '';
}

// Extract JSON from Claude's text response
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

// Export the client for advanced usage
export { anthropic };
