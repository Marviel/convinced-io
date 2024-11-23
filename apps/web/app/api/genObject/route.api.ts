import { generateObject } from 'ai';
import { NextResponse } from 'next/server';

import { openai } from '@ai-sdk/openai';

import { unsafeJsonSchemaToZod } from '../../../utils/unsafeJsonSchemaToZod';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        console.log(body);

        const { schema: schemaPreParsed, prompt, ...rest } = body;

        const schema = unsafeJsonSchemaToZod(schemaPreParsed);

        const result = await generateObject({
            ...rest,
            model: openai('gpt-4o'),
            schema,
            prompt,
        });

        return NextResponse.json(result.object);
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Failed to process request' },
            { status: 500 }
        );
    }
} 