import fs from 'node:fs';
import path from 'node:path';

// Helper to format clean titles (same logic as in [slug].astro)
export function formatCleanTitle(t: string): string {
  if (!t) return '';
  const lettersOnly = t.replace(/[^a-zA-ZÁÀẢẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỊ]/g, '');
  if (lettersOnly.length > 5 && lettersOnly === lettersOnly.toUpperCase()) {
    let lower = t.toLowerCase();
    lower = lower.charAt(0).toUpperCase() + lower.slice(1);
    return lower.replace(/\b(ai|seo|sop|hot|vps|ui|ux|ads|cpm|cpc)\b/gi, (m) => m.toUpperCase());
  }
  return t;
}

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

// Custom markdown renderer with exact design specs matching Layout.astro
export function renderMarkdownToHtml(md: string): string {
  if (!md) return '<p class="text-slate-500 italic">Chưa có nội dung...</p>';
  const lines = md.split(/\r?\n/);
  let inList = false;
  let htmlParts: string[] = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        htmlParts.push('</ul>');
        inList = false;
      }
      return;
    }

    if (trimmed.startsWith('### ')) {
      if (inList) { htmlParts.push('</ul>'); inList = false; }
      const hText = trimmed.substring(4);
      htmlParts.push(`<h3 class="text-lg sm:text-xl font-bold text-brand-green dark:text-emerald-400 mt-8 mb-3 pl-3 border-l-4 border-brand-green leading-snug">${formatCleanTitle(hText)}</h3>`);
    } else if (trimmed.startsWith('## ')) {
      if (inList) { htmlParts.push('</ul>'); inList = false; }
      const hText = trimmed.substring(3);
      htmlParts.push(`<h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-10 mb-4 border-b-2 border-slate-200 dark:border-slate-800 pb-2.5 leading-snug">${formatCleanTitle(hText)}</h2>`);
    } else if (trimmed.startsWith('> ')) {
      if (inList) { htmlParts.push('</ul>'); inList = false; }
      const qText = trimmed.substring(2);
      htmlParts.push(`<blockquote class="border-l-4 border-slate-300 dark:border-slate-700 pl-4 my-4 italic text-slate-600 dark:text-slate-400">${qText}</blockquote>`);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        htmlParts.push('<ul class="list-disc pl-6 space-y-1.5 my-3 text-slate-700 dark:text-slate-300">');
        inList = true;
      }
      const lText = trimmed.substring(2);
      htmlParts.push(`<li>${lText}</li>`);
    } else {
      if (inList) { htmlParts.push('</ul>'); inList = false; }
      // Bold text conversion **text**
      const pFormatted = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>');
      htmlParts.push(`<p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-6 text-base sm:text-lg">${pFormatted}</p>`);
    }
  });

  if (inList) htmlParts.push('</ul>');
  return htmlParts.join('\n');
}
