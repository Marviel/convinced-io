import { ZodType } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export async function callGenObject<T>({
    schema,
    prompt,
    ...rest
}: {
    schema: ZodType<T>,
    prompt: string,
    temperature: number,
} & Record<string, any>): Promise<T> {
    try {
        const schemaJson = zodToJsonSchema(schema);

        const response = await fetch('/api/genObject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...rest,
                schema: schemaJson,
                prompt,
            }),
        });

        const result = await response.json() as T;
        return result;
    } catch (error) {
        console.error('Error calling genObject:', error);
        throw error;
    }
} 