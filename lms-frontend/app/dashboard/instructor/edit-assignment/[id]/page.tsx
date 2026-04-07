'use client';

import { useEffect, useState } from 'react';
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
}

export default function EditAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = Number(params.id);

  const [user, setUser] = useState<any>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [instructions, setInstructions] = useState('');
  const [submissionType, setSubmissionType] = useState<'text' | 'file' | 'both'>('both');
  const [maxMarks, setMaxMarks] = useState(100);
  const [dueInDays, setDueInDays] = useState(7);
  const [checklist, setChecklist] = useState<string[]>(['']);

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
      setInstructions(typeof content.instructions === 'string' ? content.instructions : '');
      setSubmissionType((content.submissionType as 'text' | 'file' | 'both') || 'both');
      setMaxMarks(Number(content.maxMarks) || 100);
      setDueInDays(Number(content.dueInDays) || 7);
      setChecklist(Array.isArray(content.checklist) && content.checklist.length > 0 ? content.checklist : ['']);
    } catch (error) {
      console.error('Failed to load assignment editor data', error);
      alert('Failed to load assignment editor data.');
    } finally {
      setLoading(false);
    }
  };

  const updateChecklistItem = (index: number, value: string) => {
    setChecklist((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const addChecklistItem = () => setChecklist((prev) => [...prev, '']);

  const removeChecklistItem = (index: number) => {
    setChecklist((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [''];
    });
  };

  const saveAssignment = async () => {
    if (!lesson) return;
    if (!instructions.trim()) {
      alert('Assignment instructions are required.');
      return;
    }

    try {
      setSaving(true);
      await api.put(`/lessons/${lesson.id}/content`, {
        content: {
          type: 'assignment-builder',
          instructions: instructions.trim(),
          submissionType,
          maxMarks,
          dueInDays,
          checklist: checklist.map((item) => item.trim()).filter(Boolean),
          lastUpdatedAt: new Date().toISOString(),
        },
      });
      alert('Assignment saved successfully.');
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to save assignment');
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
      <Navbar title="Assignment Builder" />

      <main className="page-content">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => router.push(`${dashboardBase}/courses`)}
            className="text-indigo-400 hover:text-indigo-300 mb-4 inline-flex items-center gap-2"
          >
            ← Back to Courses
          </button>

          <div className="glass-card p-6 mb-6">
            <h1 className="text-2xl font-bold text-white">Assignment Editor</h1>
            <p className="text-gray-400 mt-1">
              Topic: <span className="text-white font-semibold">{lesson?.title || 'Untitled Topic'}</span>
            </p>
          </div>

          <div className="glass-card p-6 mb-6">
            <label className="block text-sm text-gray-300 mb-2">Instructions</label>
            <textarea
              rows={10}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="input-field w-full"
              placeholder="Describe the assignment problem, expected deliverables, evaluation criteria, and submission notes."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Submission Type</label>
                <select
                  value={submissionType}
                  onChange={(e) => setSubmissionType(e.target.value as 'text' | 'file' | 'both')}
                  className="input-field w-full"
                >
                  <option value="text">Text Response</option>
                  <option value="file">File Upload</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Maximum Marks</label>
                <input
                  type="number"
                  min={1}
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(Math.max(1, Number(e.target.value) || 1))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Due In (days)</label>
                <input
                  type="number"
                  min={1}
                  value={dueInDays}
                  onChange={(e) => setDueInDays(Math.max(1, Number(e.target.value) || 1))}
                  className="input-field w-full"
                />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl text-white font-semibold">Student Checklist</h2>
              <button onClick={addChecklistItem} className="btn-secondary px-3 py-1.5 text-sm">+ Add Item</button>
            </div>

            <div className="space-y-2">
              {checklist.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={item}
                    onChange={(e) => updateChecklistItem(idx, e.target.value)}
                    className="input-field flex-1"
                    placeholder={`Checklist item ${idx + 1}`}
                  />
                  <button
                    onClick={() => removeChecklistItem(idx)}
                    className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={saveAssignment} disabled={saving} className="btn-success px-6 py-2.5 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Assignment'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
