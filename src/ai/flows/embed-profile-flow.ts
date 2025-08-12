
'use server';
/**
 * @fileOverview An AI flow to embed a business profile (logo and name) onto a base image.
 *
 * - embedProfileOnImage - A function that handles the image modification process.
 * - EmbedProfileInput - The input type for the embedProfileOnImage function.
 * - EmbedProfileOutput - The return type for the embedProfileOnImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Base64 } from 'js-base64';

const EmbedProfileInputSchema = z.object({
  baseImageUri: z.string().describe("The base image to edit, as a data URI."),
  logoImageUri: z.string().describe("The logo image to embed, as a data URI."),
  businessName: z.string().describe("The business name to embed."),
});
export type EmbedProfileInput = z.infer<typeof EmbedProfileInputSchema>;

const EmbedProfileOutputSchema = z.object({
  editedImageUri: z.string().describe("The resulting image with the profile embedded, as a data URI."),
});
export type EmbedProfileOutput = z.infer<typeof EmbedProfileOutputSchema>;


export async function embedProfileOnImage(input: EmbedProfileInput): Promise<EmbedProfileOutput> {
  return embedProfileFlow(input);
}


const embedProfileFlow = ai.defineFlow(
  {
    name: 'embedProfileFlow',
    inputSchema: EmbedProfileInputSchema,
    outputSchema: EmbedProfileOutputSchema,
  },
  async (input) => {
    const prompt = `
        You are an expert graphic designer. Your task is to tastefully embed a business profile onto a base image.

        - The business profile consists of a logo and a business name.
        - Place the logo and business name together in one of the corners of the base image (e.g., bottom-right, bottom-left).
        - Ensure the business name is legible, using a professional font and a color that contrasts well with the background. The font size should be subtle and not overpower the main image.
        - The logo should be placed near the business name.
        - Do not alter the base image in any other way.

        Business Name: "${input.businessName}"
    `;

    const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: [
            { text: prompt },
            { media: { url: input.baseImageUri } },
            { media: { url: input.logoImageUri, role: 'mask' } }, // Using logo as a mask/overlay
        ],
        config: {
            responseModalities: ['IMAGE'],
        },
    });

    if (!media?.url) {
        throw new Error('Image generation failed to return an image.');
    }
    
    return { editedImageUri: media.url };
  }
);
