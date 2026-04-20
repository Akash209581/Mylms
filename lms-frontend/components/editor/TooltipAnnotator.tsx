'use client';

import { useState, useRef, useEffect } from 'react';

export interface Annotation {
  id: string;
  text: string;
  definition: string;
  createdAt?: string;
}

interface TooltipAnnotatorProps {
  content: string;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  readOnly?: boolean;
}

export function TooltipAnnotator({ content, annotations, onAnnotationsChange, readOnly = false }: TooltipAnnotatorProps) {
  const [selectedText, setSelectedText] = useState('');
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [definition, setDefinition] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleSelection = () => {
      if (readOnly) return;
      
      const selection = window.getSelection();
      if (!selection || selection.toString().length === 0) {
        setSelectedText('');
        setSelectionRect(null);
        return;
      }

      const text = selection.toString().trim();
      if (text.length > 0 && text.length < 100) {
        setSelectedText(text);
        const range = selection.getRangeAt(0);
        setSelectionRect(range.getBoundingClientRect());
      }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, [readOnly]);

  const addAnnotation = () => {
    if (!selectedText.trim() || !definition.trim()) return;

    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: selectedText,
      definition: definition.trim(),
      createdAt: new Date().toISOString(),
    };

    onAnnotationsChange([...annotations, newAnnotation]);
    setSelectedText('');
    setDefinition('');
    setShowDialog(false);
  };

  const removeAnnotation = (id: string) => {
    onAnnotationsChange(annotations.filter((a) => a.id !== id));
  };

  const handleShowDialog = () => {
    if (selectedText && selectionRect) {
      setShowDialog(true);
    }
  };

  return (
    <div className="space-y-3">
      {/* Textarea with content (for reference) */}
      <textarea
        ref={textAreaRef}
        readOnly
        value={content}
        className="w-full p-3 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 text-sm font-mono h-24 resize-none"
        placeholder="Problem statement content appears here..."
      />

      {/* Selection feedback */}
      {selectedText && selectionRect && !readOnly && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-blue-600 font-semibold mb-1">Selected: "{selectedText}"</p>
            <p className="text-xs text-blue-500">Click "Add Tooltip" to define this term</p>
          </div>
          <button
            onClick={handleShowDialog}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            + Add Tooltip
          </button>
        </div>
      )}

      {/* Annotation dialog */}
      {showDialog && (
        <div className="p-4 rounded-lg bg-indigo-50 border-2 border-indigo-300">
          <h3 className="text-sm font-semibold text-indigo-900 mb-2">Add Hover Definition</h3>
          <p className="text-xs text-indigo-700 mb-3">Term: <span className="font-semibold">"{selectedText}"</span></p>
          <textarea
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            placeholder="Enter the hover definition/explanation..."
            className="w-full p-2 rounded-lg border border-indigo-200 text-sm mb-3 resize-none h-20"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setShowDialog(false);
                setDefinition('');
              }}
              className="px-3 py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={addAnnotation}
              disabled={!definition.trim()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Add Definition
            </button>
          </div>
        </div>
      )}

      {/* List of annotations */}
      {annotations.length > 0 && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <h3 className="text-xs font-semibold text-emerald-900 mb-2">Hover Definitions ({annotations.length})</h3>
          <div className="space-y-2">
            {annotations.map((ann) => (
              <div key={ann.id} className="p-2 rounded bg-white border border-emerald-100 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-emerald-900 break-words">"{ann.text}"</p>
                    <p className="text-emerald-700 break-words mt-1">{ann.definition}</p>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => removeAnnotation(ann.id)}
                      className="px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded whitespace-nowrap flex-shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {annotations.length === 0 && (
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
          <p className="text-xs text-slate-600">No hover definitions yet. Select text above to add tooltips.</p>
        </div>
      )}
    </div>
  );
}
