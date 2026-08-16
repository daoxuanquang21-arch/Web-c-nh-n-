import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.coerce.date(),
  image: z.string().optional(),
  author: z.string().default('Quang'),
  tags: z.array(z.string()).optional(),
  status: z.enum(['public', 'private']).optional(),
  draft: z.boolean().optional(),
});

const cuocSongCollection = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/cuoc-song" }),
  schema: blogSchema,
});

const marketingCollection = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/marketing" }),
  schema: blogSchema,
});

const aiCollection = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/ai" }),
  schema: blogSchema,
});

export const collections = {
  'cuoc-song': cuocSongCollection,
  'marketing': marketingCollection,
  'ai': aiCollection,
};
