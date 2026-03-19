import Replicate from 'replicate';

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * Helper: Convert ReadableStream (or any output) to a usable URL/base64 string
 * Replicate SDK v1.x returns ReadableStream for file outputs
 */
async function outputToDataUri(output: unknown): Promise<string | null> {
  // If it's already a string URL, return it
  if (typeof output === 'string') {
    return output;
  }

  // If it's an array, get the first element
  if (Array.isArray(output)) {
    if (output.length > 0) {
      return outputToDataUri(output[0]);
    }
    return null;
  }

  // If it's a ReadableStream, read it into a buffer
  if (output && typeof output === 'object' && 'getReader' in output) {
    try {
      const stream = output as ReadableStream<Uint8Array>;
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }

      // Combine chunks into a single buffer
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      // Convert to base64 data URI
      const base64 = Buffer.from(combined).toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (err) {
      console.error('Error reading stream:', err);
      return null;
    }
  }

  // If it's a FileOutput or has a url() method
  if (output && typeof output === 'object') {
    const obj = output as Record<string, unknown>;
    if (typeof obj.url === 'function') {
      return (obj.url as () => string)();
    }
    if (typeof obj.url === 'string') {
      return obj.url;
    }
    if (typeof obj.toString === 'function') {
      const str = obj.toString();
      if (str.startsWith('http')) {
        return str;
      }
    }
  }

  console.log('Unknown Replicate output type:', typeof output, output);
  return null;
}

/**
 * Build a comprehensive prompt for dramatic face enhancement while preserving identity
 */
function buildFaceStylingPrompt(options: {
  hairstyle?: { length: string; finish: string };
  glasses?: { enabled: boolean; style?: string | null };
  grooming?: { facialHair?: string | null; brows?: string | null };
  lighting?: string | null;
}): string {
  const enhancements: string[] = [];
  const styling: string[] = [];
  
  // Core enhancements (always applied)
  enhancements.push('leaner, debloated face with reduced facial puffiness');
  enhancements.push('longer, fuller eyelashes making eyes more striking and defined');
  enhancements.push('smooth, flawless skin with reduced wrinkles and fine lines');
  enhancements.push('reduced eye bags and dark circles');
  enhancements.push('enhanced, well-groomed eyebrows with better definition');
  enhancements.push('improved hair texture and styling');
  enhancements.push('striking professional lighting with dramatic shadows and highlights');
  
  // Custom styling options
  if (options.hairstyle) {
    const lengthDesc = options.hairstyle.length === 'short' ? 'short' : 
                      options.hairstyle.length === 'medium' ? 'medium length' : 'long';
    const finishDesc = options.hairstyle.finish === 'textured' ? 'textured, voluminous' : 'clean, perfectly styled';
    styling.push(`${lengthDesc} ${finishDesc} hair`);
  } else {
    styling.push('enhanced, voluminous hair with better texture');
  }
  
  // Glasses
  if (options.glasses?.enabled && options.glasses.style) {
    const styleNames: Record<string, string> = {
      'round': 'round-framed glasses',
      'rectangular': 'rectangular-framed glasses',
      'browline': 'browline glasses',
      'aviator': 'aviator-style glasses',
      'geometric': 'geometric-framed glasses',
    };
    styling.push(`wearing stylish ${styleNames[options.glasses.style] || 'glasses'}`);
  }
  
  // Grooming
  if (options.grooming) {
    if (options.grooming.facialHair && options.grooming.facialHair !== 'none') {
      styling.push(`${options.grooming.facialHair} facial hair`);
    }
    if (options.grooming.brows === 'cleaned') {
      styling.push('perfectly groomed, defined eyebrows');
    }
  }
  
  // Lighting
  if (options.lighting) {
    const lightingDesc: Record<string, string> = {
      'neutral_soft': 'soft, even professional lighting',
      'studio_soft': 'dramatic studio lighting with striking shadows',
      'outdoor_shade': 'natural outdoor lighting with depth',
    };
    styling.push(lightingDesc[options.lighting] || 'striking professional lighting');
  } else {
    styling.push('striking professional lighting with dramatic depth');
  }
  
  const prompt = `Professional portrait photography, same person, same identity, same bone structure, same facial features, ${enhancements.join(', ')}, ${styling.join(', ')}, high quality, photorealistic, magazine cover quality, identity preserved, no bone structure changes, no facial feature shape changes, only enhancement and styling improvements`;
  
  return prompt;
}

/**
 * Timeout wrapper for Replicate API calls
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Retry wrapper with exponential backoff for rate limits
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 2000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error as Error;
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // If it's a rate limit, wait before retrying
      if (errorMsg.includes('429') || errorMsg.includes('rate') || errorMsg.includes('limit')) {
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(`Rate limited. Waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // For other errors or max retries reached, throw immediately
      throw error;
    }
  }
  
  throw lastError!;
}

/**
 * Generate a "best version" preview with dramatic enhancements
 * Uses IP-Adapter FaceID for identity-preserving transformations with styling
 */
export async function enhanceFaceImage(
  imageBase64: string,
  options?: {
    hairstyle?: { length: string; finish: string };
    glasses?: { enabled: boolean; style?: string | null };
    grooming?: { facialHair?: string | null; brows?: string | null };
    lighting?: string | null;
    seed?: number;
  }
): Promise<string | null> {
  const imageUri = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  // Build comprehensive enhancement prompt
  const prompt = buildFaceStylingPrompt(options || {});
  const negativePrompt = "deformed, distorted face, bone structure changes, different person, different facial features, different jaw shape, different nose shape, different eye shape, different skull, different ethnicity, different age, different gender, unrealistic, cartoon, anime, low quality, blurry, artifacts, bad anatomy";
  
  console.log('Face enhancement prompt:', prompt);
  console.log('Using IP-Adapter FaceID for identity-preserving enhancements...');
  
  // Try IP-Adapter FaceID first (best for identity preservation + styling)
  // Using a more reliable model name with retry logic
  try {
    const output = await withRetry(
      () => withTimeout(
        replicate.run(
          "lucataco/ip-adapter-faceid",
          {
            input: {
              image: imageUri,
              prompt: prompt,
              negative_prompt: negativePrompt,
              num_outputs: 1,
              num_inference_steps: 40,
              guidance_scale: 7.5,
              seed: options?.seed || -1,
            },
          }
        ),
        45000, // 45 second timeout for more complex generation
        'Image generation timed out after 45 seconds'
      ),
      2, // Max 2 retries
      3000 // 3 second base delay
    );
    
    const result = await outputToDataUri(output);
    if (result) {
      console.log('IP-Adapter FaceID enhancement completed');
      return result;
    }
  } catch (ipError: unknown) {
    const errorMessage = ipError instanceof Error ? ipError.message : String(ipError);
    console.error('IP-Adapter FaceID failed:', errorMessage);
    // Re-throw rate limit errors so they can be handled properly
    const errorMsg = errorMessage;
    if (errorMsg.includes('429') || errorMsg.includes('rate') || errorMsg.includes('limit')) {
      throw ipError;
    }
  }
  
  // Fallback to InstantID
  console.log('Trying InstantID as fallback...');
  try {
    const output = await withTimeout(
      replicate.run(
        "lucataco/instant-id",
        {
          input: {
            image: imageUri,
            prompt: prompt,
            negative_prompt: negativePrompt,
            num_outputs: 1,
            num_inference_steps: 35,
            guidance_scale: 7.5,
            seed: options?.seed || -1,
          },
        }
      ),
      45000,
      'Image generation timed out after 45 seconds'
    );
    
    const result = await outputToDataUri(output);
    if (result) {
      console.log('InstantID enhancement completed');
      return result;
    }
  } catch (instantError: unknown) {
    const errorMessage = instantError instanceof Error ? instantError.message : String(instantError);
    console.error('InstantID failed:', errorMessage);
  }
  
  // Final fallback: Enhanced GFPGAN with better settings
  console.log('Using enhanced GFPGAN as final fallback...');
  try {
    const output = await withRetry(
      () => withTimeout(
        replicate.run(
          "tencentarc/gfpgan:0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c",
          {
            input: {
              img: imageUri,
              version: "v1.4",
              scale: 2,
            },
          }
        ),
        30000,
        'Image generation timed out after 30 seconds'
      ),
      1, // 1 retry for GFPGAN
      2000
    );
    
    const result = await outputToDataUri(output);
    if (result) {
      console.log('GFPGAN enhancement completed (basic only - styling not applied)');
      return result;
    } else {
      console.error('GFPGAN returned null result');
      throw new Error('Image generation returned no result');
    }
  } catch (error) {
    console.error('All enhancement methods failed:', error);
    throw error;
  }
}

/**
 * Enhance a body image (full body photo enhancement)
 * Uses Real-ESRGAN for upscaling + restoration
 */
export async function enhanceBodyImage(
  imageBase64: string
): Promise<string | null> {
  try {
    const imageUri = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    console.log('Calling Real-ESRGAN via Replicate...');

    const output = await replicate.run(
      "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
      {
        input: {
          image: imageUri,
          scale: 2,
          face_enhance: true,
        },
      }
    );

    console.log('Real-ESRGAN raw output type:', typeof output, output?.constructor?.name);
    
    const result = await outputToDataUri(output);
    console.log('Converted body output exists:', !!result, result ? `length: ${result.length}` : 'null');
    
    return result;
  } catch (error) {
    console.error('Body enhancement error:', error);
    throw error;
  }
}

export { replicate };
