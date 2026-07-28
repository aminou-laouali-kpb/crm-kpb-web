/**
 * Minimal markdown → HTML for contract display (no external dep).
 * Supports headings, bold, tables, blockquotes, lists, paragraphs.
 */
export function markdownToHtml(md) {
  if (!md) return '';
  const lines = md.split('\n');
  const html = [];
  let inTable = false;
  let inBlockquote = false;

  const flushQuote = () => {
    if (inBlockquote) {
      html.push('</blockquote>');
      inBlockquote = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (line.startsWith('|') && line.includes('|')) {
      flushQuote();
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) continue; // separator
      if (!inTable) {
        html.push('<table class="contract-table"><tbody>');
        inTable = true;
      }
      const tag = i > 0 && lines[i - 1]?.startsWith('|') ? 'td' : 'td';
      html.push(`<tr>${cells.map((c) => `<${tag}>${inline(c)}</${tag}>`).join('')}</tr>`);
      continue;
    }
    if (inTable) {
      html.push('</tbody></table>');
      inTable = false;
    }

    if (line.startsWith('> ')) {
      if (!inBlockquote) {
        html.push('<blockquote>');
        inBlockquote = true;
      }
      html.push(`<p>${inline(line.slice(2))}</p>`);
      continue;
    }
    flushQuote();

    if (line.startsWith('### ')) {
      const text = line.slice(4);
      const id = text.toLowerCase().includes('article 7') ? 'article-7' : undefined;
      html.push(`<h3${id ? ` id="${id}"` : ''}>${inline(text)}</h3>`);
    } else if (line.startsWith('## ')) {
      html.push(`<h2>${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith('# ')) {
      html.push(`<h1>${inline(line.slice(2))}</h1>`);
    } else if (line.startsWith('- ')) {
      html.push(`<li>${inline(line.slice(2))}</li>`);
    } else if (line.trim() === '') {
      html.push('<br/>');
    } else {
      html.push(`<p>${inline(line)}</p>`);
    }
  }
  if (inTable) html.push('</tbody></table>');
  flushQuote();
  return html.join('\n');
}

function inline(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>');
}
