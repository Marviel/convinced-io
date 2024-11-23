import { generateObject } from 'ai';
import { z } from 'zod';

import { openai } from '@ai-sdk/openai';

export async function genObject<T>({
    schema,
    prompt,
    temperature = 1.0
}: {
    schema: z.ZodType<T>,
    prompt: string,
    temperature?: number
}): Promise<T> {
    try {
        const result = await generateObject({
            model: openai('gpt-4o-mini'),
            schema,
            prompt,
            temperature
        });

        return result.object as T;
    } catch (error) {
        console.error('Error generating object:', error);
        throw error;
    }
} 