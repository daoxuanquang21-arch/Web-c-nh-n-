import fs from 'fs';
import path from 'path';

import { formatCleanTitle, renderMarkdownToHtml } from './markdown-renderer';
export { formatCleanTitle, renderMarkdownToHtml };

export interface ParsedPost {
  title: string;
  description: string;
  pubDate: Date;
  status: 'public' | 'private';
  draft: boolean;
  tags: string[];
  author: string;
  image: string;
  content: string;
}

// Custom parser to read frontmatter and content dynamically
export function parseMarkdownFile(filePath: string): ParsedPost | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    
    if (!match) {
      return {
        title: path.basename(filePath),
        description: '',
        pubDate: new Date(),
        status: 'public',
        draft: false,
        tags: [],
        author: 'Quang',
        image: '',
        content: fileContent
      };
    }
    
    const yamlSection = match[1];
    const content = fileContent.substring(match[0].length).trim();
    const data: any = {};
    
    const lines = yamlSection.split('\n');
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.substring(0, colonIdx).trim();
      let val = line.substring(colonIdx + 1).trim();
      
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      
      if (key === 'tags' && val.startsWith('[') && val.endsWith(']')) {
        data[key] = val.substring(1, val.length - 1).split(',').map(t => t.trim().replace(/['"]/g, ''));
      } else {
        data[key] = val;
      }
    }
    
    const isPrivate = data.status === 'private' || data.draft === 'true' || data.draft === true;
    return {
      title: data.title || path.basename(filePath),
      description: data.description || '',
      pubDate: data.pubDate ? new Date(data.pubDate) : new Date(),
      status: isPrivate ? 'private' : 'public',
      draft: isPrivate,
      tags: data.tags || [],
      author: data.author || 'Quang',
      image: data.image || '',
      content
    };
  } catch (error) {
    console.error('Error parsing markdown file:', error);
    return null;
  }
}


export interface PostListItem {
  id: string;
  slug: string;
  category: string;
  data: {
    title: string;
    description: string;
    pubDate: Date;
    tags: string[];
    author: string;
    image: string;
  };
}

export function getPostsByCategory(category: string): PostListItem[] {
  const contentDir = path.resolve(`./src/content/${category}`);
  const postsList: PostListItem[] = [];

  if (fs.existsSync(contentDir)) {
    const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
    for (const file of files) {
      const filePath = path.join(contentDir, file);
      const parsed = parseMarkdownFile(filePath);
      if (parsed) {
        if (parsed.status === 'private' || parsed.draft) continue;
        postsList.push({
          id: file.replace(/\.mdx?$/, ''),
          slug: file.replace(/\.mdx?$/, ''),
          category,
          data: {
            title: parsed.title,
            description: parsed.description,
            pubDate: parsed.pubDate,
            tags: parsed.tags,
            author: parsed.author,
            image: parsed.image
          }
        });
      }
    }
  }

  return postsList;
}
