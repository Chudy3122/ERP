import React from 'react';

// Matches http(s):// URLs and bare www. links.
const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

/**
 * Renders plain text with any URLs turned into clickable links. Inline, so it
 * works inside a `whitespace-pre-wrap` parent (line breaks/spacing preserved).
 */
export default function Linkify({ text, className }: { text: string; className?: string }) {
  if (!text) return null;

  const nodes: React.ReactNode[] = [];
  const re = new RegExp(URL_RE);
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const raw = match[0];
    const start = match.index;
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));

    // Trailing punctuation usually isn't part of the URL.
    let url = raw;
    let trailing = '';
    const tm = url.match(/[).,!?;:'"\]]+$/);
    if (tm) { trailing = tm[0]; url = url.slice(0, -trailing.length); }

    const href = url.startsWith('http') ? url : `https://${url}`;
    nodes.push(
      <a
        key={`l${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={className ?? 'break-all font-medium text-[#F7941D] underline underline-offset-2 hover:text-[#e0850f]'}
      >
        {url}
      </a>
    );
    if (trailing) nodes.push(trailing);
    lastIndex = start + raw.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return <>{nodes}</>;
}
