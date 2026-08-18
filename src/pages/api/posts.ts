import fs from 'node:fs';
import path from 'node:path';

function formatContentHeadings(content: string): string {
  if (!content) return '';
  const lines = content.split(/\r?\n/);
  const formatted = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('#')) return line;
    
    const cleanLine = trimmed.replace(/^[#\-\*]+\s*/, '');
    const hasLetters = /[a-zA-ZÁÀẢẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỊ]/.test(cleanLine);
    const lastChar = cleanLine.slice(-1);
    const isPunctuationEnd = ['.', ',', ';'].includes(lastChar);
    
    const isH3Pattern = /^(phương pháp|bước|cách|gợi ý|lưu ý|\d+\.\d+)\s*\d*[:\.]/i.test(cleanLine);
    const isH2Explicit = /^(bài này dành cho|\d+\.|tóm lại|kết luận|cái bẫy|nguyên nhân|giải pháp|tổng kết)/i.test(cleanLine);
    const isShortHeadingLine = hasLetters && cleanLine.length >= 4 && cleanLine.length <= 110 && !isPunctuationEnd && !line.includes('http');
    const isAllCaps = hasLetters && cleanLine.length >= 4 && cleanLine.length < 120 && cleanLine === cleanLine.toUpperCase();

    if (isH3Pattern) {
      return `### ${cleanLine}`;
    }
    if (isH2Explicit || isAllCaps || (isShortHeadingLine && !line.startsWith('*') && !line.startsWith('-') && !line.startsWith('>'))) {
      return `## ${cleanLine}`;
    }
    return line;
  });
  return formatted.join('\n');
}

// Helper to parse frontmatter from markdown
function parseMarkdown(filePath: string) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) {
      return { title: path.basename(filePath), description: '', content: fileContent, tags: [], pubDate: new Date() };
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
      pubDate: data.pubDate || new Date().toISOString().split('T')[0],
      status: isPrivate ? 'private' : 'public',
      draft: isPrivate,
      tags: data.tags || [],
      author: data.author || 'Quang',
      image: data.image || '',
      content
    };
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return null;
  }
}

export async function GET() {
  try {
    const contentDir = path.resolve('./src/content');
    const categories = ['ai', 'marketing', 'cuoc-song'];
    const posts: any[] = [];

    for (const cat of categories) {
      const catDir = path.join(contentDir, cat);
      if (!fs.existsSync(catDir)) continue;

      const files = fs.readdirSync(catDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
      for (const file of files) {
        const filePath = path.join(catDir, file);
        const parsed = parseMarkdown(filePath);
        if (parsed) {
          posts.push({
            id: `${cat}/${file}`,
            slug: file.replace(/\.mdx?$/, ''),
            category: cat,
            ...parsed
          });
        }
      }
    }

    // Sort by publish date desc
    posts.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    return new Response(JSON.stringify({ success: true, posts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { title, description, category, slug, pubDate, status, tags, content, author, image, action } = body;

    if (!title || !category || !slug) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const contentDir = path.resolve('./src/content');
    const catDir = path.join(contentDir, category);
    if (!fs.existsSync(catDir)) {
      fs.mkdirSync(catDir, { recursive: true });
    }

    const fileName = `${slug}.md`;
    const filePath = path.join(catDir, fileName);

    // If it's a delete action
    if (action === 'delete') {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return new Response(JSON.stringify({ success: true, message: 'Post deleted successfully' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({ success: true, message: 'Post not found or already deleted' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Format tags array to YAML
    const tagsStr = tags && Array.isArray(tags) 
      ? `tags: [${tags.map((t: string) => `"${t.trim()}"`).join(', ')}]` 
      : 'tags: []';

    const postStatus = status === 'private' ? 'private' : 'public';
    const isDraft = postStatus === 'private';

    const formattedPostContent = formatContentHeadings(content || '');

    // Format Frontmatter
    const fileContent = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${description.replace(/"/g, '\\"')}"
pubDate: ${pubDate || new Date().toISOString().split('T')[0]}
status: "${postStatus}"
draft: ${isDraft}
author: "${author || 'Quang'}"
image: "${image || ''}"
${tagsStr}
---

${formattedPostContent}
`;

    fs.writeFileSync(filePath, fileContent, 'utf-8');

    return new Response(JSON.stringify({ success: true, message: 'Post saved successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
