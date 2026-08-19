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

// Helper to parse markdown formatting like links and bold text
function parseInlineMarkdown(text: string): string {
  if (!text) return '';
  // Convert links [text](url)
  let formatted = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-brand-green dark:text-emerald-400 font-bold hover:underline">$1</a>');
  // Convert bold **text**
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>');
  return formatted;
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
      htmlParts.push(`<blockquote class="border-l-4 border-slate-300 dark:border-slate-700 pl-4 my-4 italic text-slate-600 dark:text-slate-400">${parseInlineMarkdown(qText)}</blockquote>`);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        htmlParts.push('<ul class="list-disc pl-6 space-y-1.5 my-3 text-slate-700 dark:text-slate-300">');
        inList = true;
      }
      const lText = trimmed.substring(2);
      htmlParts.push(`<li>${parseInlineMarkdown(lText)}</li>`);
    } else {
      if (inList) { htmlParts.push('</ul>'); inList = false; }
      htmlParts.push(`<p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-6 text-base sm:text-lg">${parseInlineMarkdown(trimmed)}</p>`);
    }
  });

  if (inList) htmlParts.push('</ul>');
  return htmlParts.join('\n');
}
