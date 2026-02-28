'use client';

import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

/**
 * Renders text that may contain LaTeX inline math in \( ... \) or $ ... $.
 * Use this for quiz questions, options, and explanations so math displays correctly.
 */
export function MathText({ children, className }: { children: string; className?: string }) {
  const str = String(children);
  const parts: { type: 'text' | 'math'; content: string }[] = [];

  // Split by \( ... \) or $ ... $
  const regex = /\\\((.*?)\\\)|\$(.*?)\$/gs;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(regex.source, regex.flags);

  while ((match = re.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: str.slice(lastIndex, match.index) });
    }
    const mathContent = match[1] !== undefined ? match[1] : match[2];
    if (mathContent !== undefined) {
      parts.push({ type: 'math', content: mathContent.trim() });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < str.length) {
    parts.push({ type: 'text', content: str.slice(lastIndex) });
  }

  if (parts.length === 0) {
    return <span className={className}>{str}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.type === 'math' ? (
          <InlineMath key={i} math={part.content} />
        ) : (
          <span key={i}>{part.content}</span>
        )
      )}
    </span>
  );
}
