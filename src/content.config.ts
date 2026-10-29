import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const collections = {
  other: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/other' }),
    schema: z.object({
      title: z.string(),
      date: z.coerce.date(),
      type: z.enum(['post', 'image', 'project']),
      excerpt: z.string().default(''),
      images: z.array(z.object({ src: z.string(), alt: z.string().default('') })).default([]),
    }),
  }),
};
