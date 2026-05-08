import React from 'react';
import type { Annotation } from './TooltipAnnotator';

interface TooltipRendererProps {
  content: string;
  annotations: Annotation[];
}

/**
 * Renders text content with tooltip annotations.
 * Replaces matching terms with <span> elements that have title attributes for hover tooltips.
 */
export function TooltipRenderer({ content, annotations }: TooltipRendererProps) {
  if (!annotations || annotations.length === 0) {
    // Render plain text without markup
    return <>{content}</>;
  }

  // Sort annotations by length (longest first) to avoid partial replacements
  const sortedAnnotations = [...annotations].sort((a, b) => b.text.length - a.text.length);

  // Build regex pattern that matches any annotation term (whole word)
  const patterns = sortedAnnotations
    .map(ann => ann.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  const regex = new RegExp(`\\b(${patterns})\\b`, 'gi');
  
  // Create a map of terms to their definitions
  const annotationMap = new Map<string, string>();
  sortedAnnotations.forEach(ann => {
    annotationMap.set(ann.text.toLowerCase(), ann.definition);
  });

  // Split content and build JSX
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;

  let match;
  while ((match = regex.exec(content)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }

    const matchedText = match[0];
    const definition = annotationMap.get(matchedText.toLowerCase());

    if (definition) {
      // Add annotated term as a tooltip span
      parts.push(
        <span
          key={`ann-${matchIndex++}`}
          className="relative inline-block group"
          title={definition}
        >
          <span className="border-b-2 border-dotted border-blue-400 cursor-help hover:bg-blue-50 hover:bg-opacity-30 px-0.5 transition-colors">
            {matchedText}
          </span>
          {/* Tooltip on hover */}
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 bg-slate-800 text-white text-xs rounded-lg px-2 py-1 whitespace-normal max-w-xs shadow-lg pointer-events-none">
            {definition}
            <div className="absolute top-full left-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800" />
          </div>
        </span>
      );
    } else {
      parts.push(matchedText);
    }

    lastIndex = match.index + matchedText.length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return <>{parts}</>;
}
