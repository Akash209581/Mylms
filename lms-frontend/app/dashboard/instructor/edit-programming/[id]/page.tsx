'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import { api } from '@/lib/api';
import { TooltipAnnotator, type Annotation } from '@/components/editor/TooltipAnnotator';

type LessonEditorProps = {
  lessonId: number;
  initialContent?: Record<string, any> | null;
  lessonTitle?: string;
  onSave: (content: Record<string, any>) => Promise<void>;
  onAddTopic?: () => void;
  onBack?: () => void;
  readOnly?: boolean;
  showPreviewByDefault?: boolean;
  fullPreviewTitle?: string;
  plainCodePreview?: boolean;
  stickyTopOffsetPx?: number;
};

const LessonEditor = dynamic<LessonEditorProps>(
  () => import('../../../../../components/editor/LessonEditor'),
  { ssr: false, loading: () => <div className="nb-editor animate-pulse min-h-[360px]" /> },
);

const toBuilderContent = (value: unknown): Record<string, any> | null => {
  if (value && typeof value === 'object') {
    return value as Record<string, any>;
  }
  if (typeof value === 'string' && value.trim()) {
    return {
      type: 'markdown',
      source: value,
    };
  }
  return null;
};

const hasBuilderContent = (value: Record<string, any> | null): boolean => {
  if (!value) return false;
  if (Array.isArray(value.cells)) {
    return value.cells.some((cell: any) => typeof cell?.content === 'string' && cell.content.trim());
  }
  if (typeof value.source === 'string') {
    return !!value.source.trim();
  }
  return false;
};

const contentToPlainText = (value: unknown): string => {
  const content = toBuilderContent(value);
  if (!content) return '';
  if (Array.isArray(content.cells)) {
    return content.cells
      .map((cell: any) => (typeof cell?.content === 'string' ? cell.content : ''))
      .join('\n')
      .trim();
  }
  if (typeof content.source === 'string') {
    return content.source.trim();
  }
  return '';
};

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createProgrammingTemplateContent = (
  problemValue: unknown,
  inputValue: unknown,
  outputValue: unknown,
  constraintsValue: unknown,
): Record<string, any> => {
  const problemText = contentToPlainText(problemValue);
  const inputText = contentToPlainText(inputValue);
  const outputText = contentToPlainText(outputValue);
  const constraintsText = contentToPlainText(constraintsValue);

  return {
    type: 'notebook',
    cells: [
      { id: uid('h2-problem'), type: 'subheading', content: 'Problem Statement' },
      { id: uid('txt-problem'), type: 'text', content: problemText },
      { id: uid('h2-input'), type: 'subheading', content: 'Input Format' },
      { id: uid('txt-input'), type: 'text', content: inputText },
      { id: uid('h2-output'), type: 'subheading', content: 'Output Format' },
      { id: uid('txt-output'), type: 'text', content: outputText },
      { id: uid('h2-constraints'), type: 'subheading', content: 'Constraints' },
      { id: uid('txt-constraints'), type: 'text', content: constraintsText },
    ],
  };
};

interface Lesson {
  id: number;
  title: string;
  content?: Record<string, any> | null;
}

interface TestCase {
  input: string;
  output: string;
  explanation?: string;
}

const LANGUAGES = ['Python', 'Java', 'C', 'C++', 'JavaScript', 'Go', 'Rust'];

export default function EditProgrammingPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = Number(params.id);

  const [user, setUser] = useState<any>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [problemStatementContent, setProblemStatementContent] = useState<Record<string, any> | null>(null);
  const [explanationContent, setExplanationContent] = useState<Record<string, any> | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [allowedLanguages, setAllowedLanguages] = useState<string[]>(['Python']);
  const [testCases, setTestCases] = useState<TestCase[]>([{ input: '', output: '', explanation: '' }]);
  const [builderTab, setBuilderTab] = useState<'explanation' | 'problem' | 'testcases'>('explanation');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/login');
      return;
    }

    const parsed = JSON.parse(stored);
    if (!['INSTRUCTOR', 'ADMIN', 'SUPERADMIN'].includes(parsed.role)) {
      router.push('/login');
      return;
    }

    setUser(parsed);
    void loadData();
  }, [lessonId]);

  const dashboardBase = `/dashboard/${(user?.role || 'instructor').toLowerCase()}`;

  const loadData = async () => {
    try {
      setLoading(true);
      const lessonRes = await api.get(`/lessons/${lessonId}`);
      const loadedLesson = lessonRes.data as Lesson;
      setLesson(loadedLesson);

      const content = loadedLesson.content || {};
      const hasLegacySplitFields = !!(
        toBuilderContent(content.inputFormat) ||
        toBuilderContent(content.outputFormat) ||
        toBuilderContent(content.constraints)
      );
      const existingProblem = toBuilderContent(content.problemStatement);
      if (!existingProblem || hasLegacySplitFields) {
        setProblemStatementContent(
          createProgrammingTemplateContent(
            content.problemStatement,
            content.inputFormat,
            content.outputFormat,
            content.constraints,
          ),
        );
      } else {
        setProblemStatementContent(existingProblem);
      }

      const existingExplanation = toBuilderContent(content.explanation);
      if (!existingExplanation) {
        setExplanationContent({
          type: 'notebook',
          cells: [
            {
              id: uid('txt-explanation-initial'),
              type: 'text',
              content: '## Topic Explanation\n\nProvide background theory, tutorials, or deep concepts related to this coding topic.',
            },
          ],
        });
      } else {
        setExplanationContent(existingExplanation);
      }

      setAllowedLanguages(Array.isArray(content.allowedLanguages) && content.allowedLanguages.length > 0 ? content.allowedLanguages : ['Python']);
      setTestCases(Array.isArray(content.testCases) && content.testCases.length > 0 ? content.testCases : [{ input: '', output: '', explanation: '' }]);
    } catch (error) {
      console.error('Failed to load programming builder data', error);
      alert('Failed to load programming builder data.');
    } finally {
      setLoading(false);
    }
  };

  const setTestCase = (index: number, key: keyof TestCase, value: string) => {
    setTestCases((prev) => prev.map((tc, i) => (i === index ? { ...tc, [key]: value } : tc)));
  };

  const addTestCase = () => setTestCases((prev) => [...prev, { input: '', output: '', explanation: '' }]);

  const removeTestCase = (index: number) => {
    setTestCases((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [{ input: '', output: '', explanation: '' }];
    });
  };

  const toggleLanguage = (lang: string) => {
    setAllowedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((x) => x !== lang) : [...prev, lang],
    );
  };

  const saveProgramming = async () => {
    if (!lesson) return;
    if (!hasBuilderContent(problemStatementContent)) {
      alert('Problem statement is required.');
      return;
    }

    const normalizedCases = testCases
      .map((tc) => ({
        input: tc.input?.trim() || '',
        output: tc.output?.trim() || '',
        explanation: tc.explanation?.trim() || undefined,
      }))
      .filter((tc) => tc.input && tc.output);

    if (normalizedCases.length === 0) {
      alert('Add at least one valid test case (input and output).');
      return;
    }

    if (allowedLanguages.length === 0) {
      alert('Select at least one allowed language.');
      return;
    }

    try {
      setSaving(true);
      await api.put(`/lessons/${lesson.id}/content`, {
        content: {
          type: 'programming-builder',
          problemStatement: problemStatementContent,
          explanation: explanationContent,
          annotations: annotations.length > 0 ? annotations : undefined,
          inputFormat: null,
          outputFormat: null,
          constraints: null,
          allowedLanguages,
          testCases: normalizedCases,
          lastUpdatedAt: new Date().toISOString(),
        },
      });
      alert('Programming topic saved successfully.');
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to save programming topic');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh">
      <Sidebar role={user?.role || 'INSTRUCTOR'} />
      <Navbar title="Programming Builder" />

      <main className="page-content">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.push(`${dashboardBase}/courses`)}
            className="text-indigo-400 hover:text-indigo-300 mb-4 inline-flex items-center gap-2"
          >
            ← Back to Courses
          </button>

          <div className="glass-card p-6 mb-6">
            <h1 className="text-2xl font-bold text-white">Programming Builder</h1>
            <p className="text-gray-400 mt-1">
              Topic: <span className="text-white font-semibold">{lesson?.title || 'Untitled Topic'}</span>
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-white/10 pb-3 gap-6 mb-6">
            <button
              type="button"
              onClick={() => setBuilderTab('explanation')}
              className={`pb-2 text-sm font-semibold transition-all relative ${
                builderTab === 'explanation' ? 'text-primary-400 font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              📖 Topic Explanation
              {builderTab === 'explanation' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setBuilderTab('problem')}
              className={`pb-2 text-sm font-semibold transition-all relative ${
                builderTab === 'problem' ? 'text-primary-400 font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              💻 Problem Statement
              {builderTab === 'problem' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setBuilderTab('testcases')}
              className={`pb-2 text-sm font-semibold transition-all relative ${
                builderTab === 'testcases' ? 'text-primary-400 font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              🧪 Test Cases
              {builderTab === 'testcases' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400 rounded-full" />
              )}
            </button>
          </div>

          {builderTab === 'explanation' && (
            <div className="glass-card p-6 mb-6 space-y-5 animate-in fade-in duration-200">
              <div>
                <label className="block text-sm text-gray-300 mb-2 font-semibold">📖 Pedagogical Topic Explanation</label>
                <p className="text-xs text-gray-450 mb-4">Provide deep background concepts, theory, diagrams, and descriptions to introduce students to this specific programming topic.</p>
                {explanationContent && (
                  <LessonEditor
                    lessonId={lesson?.id || lessonId}
                    lessonTitle={lesson?.title || 'Programming Topic Explanation'}
                    initialContent={explanationContent}
                    showPreviewByDefault={true}
                    fullPreviewTitle="Explanation Preview"
                    plainCodePreview={false}
                    stickyTopOffsetPx={64}
                    onSave={async (content) => {
                      setExplanationContent(content);
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {builderTab === 'problem' && (
            <div className="glass-card p-6 mb-6 space-y-5 animate-in fade-in duration-200">
              <div>
                <label className="block text-sm text-gray-300 mb-2 font-semibold">💻 Coding Problem Statement</label>
                <p className="text-xs text-gray-450 mb-4">Draft the coding question, including Input/Output Formats and Constraints.</p>
                {problemStatementContent && (
                  <LessonEditor
                    lessonId={lesson?.id || lessonId}
                    lessonTitle={lesson?.title || 'Programming Topic'}
                    initialContent={problemStatementContent}
                    showPreviewByDefault={true}
                    fullPreviewTitle="Full Preview"
                    plainCodePreview={true}
                    stickyTopOffsetPx={64}
                    // @ts-ignore
                    annotations={annotations}
                    onSave={async (content) => {
                      setProblemStatementContent(content);
                    }}
                  />
                )}
                
                {['ADMIN', 'SUPERADMIN'].includes(user?.role) && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <label className="block text-sm text-gray-300 mb-3 font-semibold">🔍 Add Hover Tooltips</label>
                    <p className="text-xs text-gray-400 mb-3">Select any word or phrase in the problem statement to add a hover definition that students will see</p>
                    <TooltipAnnotator
                      content={contentToPlainText(problemStatementContent)}
                      annotations={annotations}
                      onAnnotationsChange={setAnnotations}
                      readOnly={false}
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-700/50">
                <label className="block text-sm text-gray-300 mb-2 font-semibold">Allowed Languages</label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => {
                    const active = allowedLanguages.includes(lang);
                    return (
                      <button
                        key={lang}
                        onClick={() => toggleLanguage(lang)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'bg-slate-800/30 border-slate-600 text-gray-300 hover:border-slate-400'
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {builderTab === 'testcases' && (
            <div className="glass-card p-6 mb-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl text-white font-semibold">Test Cases</h2>
                <button onClick={addTestCase} className="btn-secondary px-3 py-1.5 text-sm">+ Add Test Case</button>
              </div>

              <div className="space-y-4">
                {testCases.map((tc, index) => (
                  <div key={index} className="p-4 rounded-xl bg-slate-800/30 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-gray-300 font-semibold">Test Case {index + 1}</p>
                      <button
                        onClick={() => removeTestCase(index)}
                        className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <textarea
                        rows={4}
                        value={tc.input}
                        onChange={(e) => setTestCase(index, 'input', e.target.value)}
                        className="input-field font-mono text-sm"
                        placeholder="Input"
                      />
                      <textarea
                        rows={4}
                        value={tc.output}
                        onChange={(e) => setTestCase(index, 'output', e.target.value)}
                        className="input-field font-mono text-sm"
                        placeholder="Expected output"
                      />
                    </div>

                    <textarea
                      rows={2}
                      value={tc.explanation || ''}
                      onChange={(e) => setTestCase(index, 'explanation', e.target.value)}
                      className="input-field mt-3 resize-none font-mono text-sm"
                      placeholder="Explanation (optional)"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={saveProgramming} disabled={saving} className="btn-success px-6 py-2.5 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Programming Topic'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
