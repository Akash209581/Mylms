'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import { api } from '@/lib/api';

interface Lesson {
  id: number;
  title: string;
  description?: string;
  type: string;
  content?: Record<string, any> | null;
  chapterId: number;
}

interface Question {
  id: number;
  questionNumber?: string;
  type: string;
  difficulty?: string;
  topicNames?: string;
  questionText: string;
  domain?: string;
}

const QUESTION_TYPES = ['ALL', 'MCQ', 'FIB', 'MQ', 'JC', 'PQ', 'OP'];
const DIFFICULTIES = ['ALL', 'VERY_EASY', 'EASY', 'MEDIUM', 'HARD', 'VERY_HARD'];

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = Number(params.id);

  const [user, setUser] = useState<any>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);

  const [timeLimitMinutes, setTimeLimitMinutes] = useState(20);
  const [passPercentage, setPassPercentage] = useState(40);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);

  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isLoadedRef = useRef(false);

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
      const [lessonRes, questionRes] = await Promise.all([
        api.get(`/lessons/${lessonId}`),
        api.get('/question-bank'),
      ]);

      const loadedLesson = lessonRes.data as Lesson;
      setLesson(loadedLesson);

      const existing = loadedLesson.content || {};
      const existingIds = Array.isArray(existing?.questionIds)
        ? existing.questionIds.filter((id: unknown) => typeof id === 'number')
        : [];
      setSelectedQuestionIds(existingIds);

      const settings = existing?.settings || {};
      setTimeLimitMinutes(Number(settings.timeLimitMinutes) || 20);
      setPassPercentage(Number(settings.passPercentage) || 40);
      setMaxAttempts(Number(settings.maxAttempts) || 1);
      setShuffleQuestions(Boolean(settings.shuffleQuestions));
      setShuffleOptions(Boolean(settings.shuffleOptions));

      setQuestions(Array.isArray(questionRes.data) ? questionRes.data : []);
    } catch (error) {
      console.error('Failed to load quiz builder data', error);
      alert('Failed to load quiz builder data.');
    } finally {
      setLoading(false);
      setTimeout(() => {
        isLoadedRef.current = true;
      }, 100);
    }
  };

  const triggerAutosave = async (
    qIds: number[],
    tLimit: number,
    pPercent: number,
    mAttempts: number,
    sQuestions: boolean,
    sOptions: boolean
  ) => {
    if (!isLoadedRef.current || !lesson) return;

    setAutosaveStatus('saving');
    try {
      await api.put(`/lessons/${lesson.id}/content`, {
        content: {
          type: 'quiz-builder',
          questionIds: qIds,
          settings: {
            timeLimitMinutes: tLimit,
            passPercentage: pPercent,
            maxAttempts: mAttempts,
            shuffleQuestions: sQuestions,
            shuffleOptions: sOptions,
          },
          lastUpdatedAt: new Date().toISOString(),
        },
      });
      setAutosaveStatus('saved');
    } catch (error) {
      console.error('Autosave failed:', error);
      setAutosaveStatus('error');
    }
  };

  useEffect(() => {
    if (!isLoadedRef.current || !lesson) return;

    const delayDebounce = setTimeout(() => {
      void triggerAutosave(
        selectedQuestionIds,
        timeLimitMinutes,
        passPercentage,
        maxAttempts,
        shuffleQuestions,
        shuffleOptions
      );
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [
    selectedQuestionIds,
    timeLimitMinutes,
    passPercentage,
    maxAttempts,
    shuffleQuestions,
    shuffleOptions,
    lesson?.id
  ]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesType = typeFilter === 'ALL' || q.type === typeFilter;
      const matchesDifficulty = difficultyFilter === 'ALL' || q.difficulty === difficultyFilter;
      const text = `${q.questionText || ''} ${q.topicNames || ''} ${q.questionNumber || ''}`.toLowerCase();
      const matchesSearch = !search.trim() || text.includes(search.toLowerCase());
      return matchesType && matchesDifficulty && matchesSearch;
    });
  }, [questions, typeFilter, difficultyFilter, search]);

  const selectedQuestions = useMemo(
    () => questions.filter((q) => selectedQuestionIds.includes(q.id)),
    [questions, selectedQuestionIds],
  );

  const toggleQuestion = (questionId: number) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId],
    );
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
      <Navbar title="Quiz Builder" />

      <main className="page-content">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.push(`${dashboardBase}/courses`)}
            className="text-indigo-400 hover:text-indigo-300 mb-4 inline-flex items-center gap-2"
          >
            ← Back to Courses
          </button>

          <div className="glass-card p-6 mb-6">
            <h1 className="text-2xl font-bold text-white">Quiz Builder</h1>
            <p className="text-gray-400 mt-1">
              Topic: <span className="text-white font-semibold">{lesson?.title || 'Untitled Topic'}</span>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Time Limit (minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={timeLimitMinutes}
                  onChange={(e) => setTimeLimitMinutes(Math.max(1, Number(e.target.value) || 1))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Pass Percentage</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={passPercentage}
                  onChange={(e) => setPassPercentage(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Max Attempts</label>
                <input
                  type="number"
                  min={1}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Math.max(1, Number(e.target.value) || 1))}
                  className="input-field w-full"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                />
                Shuffle Questions
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                />
                Shuffle MCQ Options
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                {autosaveStatus === 'saving' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                    ⚡ Saving changes...
                  </span>
                )}
                {autosaveStatus === 'saved' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span>✨ Saved automatically</span>
                  </span>
                )}
                {autosaveStatus === 'error' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                    <span>⚠️ Autosave failed</span>
                  </span>
                )}
                {autosaveStatus === 'idle' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 text-gray-400 border border-white/5">
                    <span>✓ Ready</span>
                  </span>
                )}
              </div>
              <button
                onClick={() =>
                  router.push(
                    `${dashboardBase}/question-bank/create?returnTo=${encodeURIComponent(`${dashboardBase}/edit-quiz/${lessonId}`)}`,
                  )
                }
                className="btn-primary px-5 py-2.5"
              >
                + Create New Question
              </button>
            </div>
          </div>

          <div className="glass-card p-6 mb-6">
            <h2 className="text-xl text-white font-semibold mb-4">Select From Question Bank</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field"
                placeholder="Search question, topic, ID"
              />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field">
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="input-field"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <div className="text-xs text-gray-400 flex items-center px-2">
                {selectedQuestionIds.length} selected
              </div>
            </div>

            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filteredQuestions.map((q) => {
                const selected = selectedQuestionIds.includes(q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => toggleQuestion(q.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selected
                        ? 'bg-indigo-500/15 border-indigo-400 text-indigo-100'
                        : 'bg-slate-800/30 border-slate-700 text-gray-200 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="text-xs text-gray-400 mb-1">
                          {q.questionNumber || `Q-${q.id}`} · {q.type} · {q.difficulty || 'MEDIUM'}
                        </div>
                        <div className="font-medium">{q.questionText}</div>
                        {q.topicNames && <div className="text-xs text-gray-400 mt-1">Topics: {q.topicNames}</div>}
                      </div>
                      <div className="text-sm font-semibold">{selected ? 'Selected' : 'Select'}</div>
                    </div>
                  </button>
                );
              })}
              {filteredQuestions.length === 0 && (
                <div className="text-sm text-gray-400 py-10 text-center">No matching questions found.</div>
              )}
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-xl text-white font-semibold mb-3">Selected Questions</h2>
            <div className="space-y-2">
              {selectedQuestions.map((q, index) => (
                <div key={q.id} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700 text-gray-200">
                  <span className="text-gray-400 mr-2">{index + 1}.</span>
                  <span>{q.questionText}</span>
                </div>
              ))}
              {selectedQuestions.length === 0 && (
                <div className="text-sm text-gray-400">No questions selected yet.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
