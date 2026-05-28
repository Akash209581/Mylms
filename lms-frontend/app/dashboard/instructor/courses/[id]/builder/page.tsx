'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';

interface Course {
    id: number;
    title: string;
    description: string;
    category: string;
    level: string;
    price: number;
    objectives?: string;
    prerequisites?: string;
    targetAudience?: string;
    duration?: number;
    thumbnail?: string;
    status: string;
}

interface Module {
    id: number;
    title: string;
    description?: string;
    order: number;
    courseId: number;
}

interface Chapter {
    id: number;
    title: string;
    description?: string;
    order: number;
    moduleId: number;
}

interface Lesson {
    id: number;
    title: string;
    description?: string;
    videoUrl?: string;
    contentUrl?: string;
    duration?: number;
    type: string;
    order: number;
    chapterId: number;
    published: boolean;
}


export default function CourseBuilderPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = Number(params.id);

    const [course, setCourse] = useState<Course | null>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [chapters, setChapters] = useState<{ [moduleId: number]: Chapter[] }>({});
    const [lessons, setLessons] = useState<{ [chapterId: number]: Lesson[] }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState<any>(null);
    const [submittingForApproval, setSubmittingForApproval] = useState(false);

    // Modal states
    const [showCourseOverviewModal, setShowCourseOverviewModal] = useState(false);
    const [showModuleModal, setShowModuleModal] = useState(false);
    const [showChapterModal, setShowChapterModal] = useState(false);
    const [showLessonModal, setShowLessonModal] = useState(false);

    const [editingModule, setEditingModule] = useState<Module | null>(null);
    const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

    const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
    const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);

    const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
    const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());


    // Form states
    const [courseForm, setCourseForm] = useState({
        objectives: '',
        prerequisites: '',
        targetAudience: '',
        duration: 0,
    });

    const [moduleForm, setModuleForm] = useState({
        title: '',
        description: '',
    });

    const [chapterForm, setChapterForm] = useState({
        title: '',
        description: '',
    });

    const [lessonForm, setLessonForm] = useState({
        title: '',
        description: '',
        videoUrl: '',
        duration: 0,
        type: 'video',
        published: false,
    });


    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            setUser(JSON.parse(stored));
        }
        fetchCourseData();
    }, [courseId]);

    const getDashboardPath = () => {
        if (!user) return '/dashboard/instructor';
        return `/dashboard/${user.role.toLowerCase()}`;
    };

    const fetchCourseData = async () => {
        try {
            setLoading(true);
            
            // Fetch course details
            const courseRes = await api.get(`/courses/${courseId}`);
            setCourse(courseRes.data);
            setCourseForm({
                objectives: courseRes.data.objectives || '',
                prerequisites: courseRes.data.prerequisites || '',
                targetAudience: courseRes.data.targetAudience || '',
                duration: courseRes.data.duration || 0,
            });

            // Fetch modules
            const modulesRes = await api.get(`/modules/course/${courseId}`);
            setModules(modulesRes.data);

            const chaptersData: { [key: number]: Chapter[] } = {};
            const topicsData: { [key: number]: Lesson[] } = {};

            for (const module of modulesRes.data) {
                const chaptersRes = await api.get(`/chapters/module/${module.id}`);
                chaptersData[module.id] = chaptersRes.data;

                for (const chapter of chaptersRes.data) {
                    const lessonsRes = await api.get(`/lessons/chapter/${chapter.id}`);
                    topicsData[chapter.id] = lessonsRes.data;
                }
            }
            setChapters(chaptersData);
            setLessons(topicsData);

            setLoading(false);

        } catch (err: any) {
            console.error('Error fetching course data:', err);
            setError('Failed to load course data');
            setLoading(false);
        }
    };

    const handleUpdateCourseOverview = async () => {
        try {
            await api.put(`/courses/${courseId}`, courseForm);
            alert('Course overview updated successfully!');
            setShowCourseOverviewModal(false);
            fetchCourseData();
        } catch (err: any) {
            alert('Failed to update course overview: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleCreateModule = async () => {
        try {
            await api.post('/modules', {
                ...moduleForm,
                courseId,
            });
            alert('Section created successfully!');
            setShowModuleModal(false);
            setModuleForm({ title: '', description: '' });
            fetchCourseData();
        } catch (err: any) {
            alert('Failed to create section: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleUpdateModule = async () => {
        if (!editingModule) return;
        
        try {
            await api.put(`/modules/${editingModule.id}`, moduleForm);
            alert('Section updated successfully!');
            setShowModuleModal(false);
            setEditingModule(null);
            setModuleForm({ title: '', description: '' });
            fetchCourseData();
        } catch (err: any) {
            alert('Failed to update section: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteModule = async (moduleId: number) => {
        if (!confirm('Are you sure? This will delete all lectures in this section.')) return;
        
        try {
            await api.delete(`/modules/${moduleId}`);
            alert('Section deleted successfully!');
            fetchCourseData();
        } catch (err: any) {
            alert('Failed to delete section: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleCreateChapter = async () => {
        if (!selectedModuleId) return;
        try {
            await api.post('/chapters', {
                ...chapterForm,
                moduleId: selectedModuleId,
            });
            setShowChapterModal(false);
            setChapterForm({ title: '', description: '' });
            fetchCourseData();
        } catch (err: any) {
            alert('Failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleUpdateChapter = async () => {
        if (!editingChapter) return;
        try {
            await api.put(`/chapters/${editingChapter.id}`, chapterForm);
            setShowChapterModal(false);
            setEditingChapter(null);
            setChapterForm({ title: '', description: '' });
            fetchCourseData();
        } catch (err: any) {
            alert('Failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteChapter = async (id: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/chapters/${id}`);
            fetchCourseData();
        } catch (err: any) {
            alert('Failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleCreateLesson = async () => {
        if (!selectedChapterId) return;
        
        try {
            await api.post('/lessons', {
                ...lessonForm,
                chapterId: selectedChapterId,
            });
            alert('Topic created successfully!');

            setShowLessonModal(false);
            setLessonForm({ title: '', description: '', videoUrl: '', duration: 0, type: 'video', published: false });
            fetchCourseData();
        } catch (err: any) {
            alert('Failed to create lecture: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleUpdateLesson = async () => {
        if (!editingLesson) return;
        
        try {
            await api.put(`/lessons/${editingLesson.id}`, lessonForm);
            alert('Lecture updated successfully!');
            setShowLessonModal(false);
            setEditingLesson(null);
            setLessonForm({ title: '', description: '', videoUrl: '', duration: 0, type: 'video', published: false });
            fetchCourseData();
        } catch (err: any) {
            alert('Failed to update lecture: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteLesson = async (lessonId: number) => {
        if (!confirm('Are you sure you want to delete this lecture?')) return;
        
        try {
            await api.delete(`/lessons/${lessonId}`);
            alert('Lecture deleted successfully!');
            fetchCourseData();
        } catch (err: any) {
            alert('Failed to delete lecture: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleSubmitForApproval = async () => {
        if (!course) return;
        if (!(course.status === 'DRAFT' || course.status === 'REJECTED')) {
            alert('Only draft or rejected courses can be submitted.');
            return;
        }

        if (!confirm('Submit this course for admin approval?')) return;

        try {
            setSubmittingForApproval(true);
            await api.post(`/courses/${courseId}/submit`);
            alert('Course submitted for approval successfully.');
            await fetchCourseData();
        } catch (err: any) {
            alert('Failed to submit: ' + (err.response?.data?.message || err.message));
        } finally {
            setSubmittingForApproval(false);
        }
    };

    const openEditModuleModal = (module: Module) => {
        setEditingModule(module);
        setModuleForm({
            title: module.title,
            description: module.description || '',
        });
        setShowModuleModal(true);
    };

    const openEditLessonModal = (lesson: Lesson) => {
        setEditingLesson(lesson);
        setLessonForm({
            title: lesson.title,
            description: lesson.description || '',
            videoUrl: lesson.videoUrl || '',
            duration: lesson.duration || 0,
            type: lesson.type,
            published: lesson.published,
        });
        setShowLessonModal(true);
    };

    const openEditChapterModal = (chapter: Chapter) => {
        setEditingChapter(chapter);
        setChapterForm({
            title: chapter.title,
            description: chapter.description || '',
        });
        setShowChapterModal(true);
    };

    const toggleModuleExpand = (moduleId: number) => {
        const newExpanded = new Set(expandedModules);
        if (newExpanded.has(moduleId)) {
            newExpanded.delete(moduleId);
        } else {
            newExpanded.add(moduleId);
        }
        setExpandedModules(newExpanded);
    };

    const toggleChapterExpand = (chapterId: number) => {

        const newExpanded = new Set(expandedChapters);
        if (newExpanded.has(chapterId)) {
            newExpanded.delete(chapterId);
        } else {
            newExpanded.add(chapterId);
        }
        setExpandedChapters(newExpanded);
    };

    const getTopicEditorPath = (lesson: Lesson) => {
        const base = getDashboardPath();
        const normalizedType = (lesson.type || '').toLowerCase();

        if (['quiz', 'test', 'assessment'].includes(normalizedType)) return `${base}/edit-quiz/${lesson.id}`;
        if (normalizedType === 'assignment') return `${base}/edit-assignment/${lesson.id}`;
        if (normalizedType === 'programming') return `${base}/edit-programming/${lesson.id}`;
        return `${base}/edit-lesson/${courseId}?lessonId=${lesson.id}`;
    };

    const getTopicEditorLabel = (lesson: Lesson) => {
        const normalizedType = (lesson.type || '').toLowerCase();
        if (normalizedType === 'quiz') return 'Quiz Builder';
        if (normalizedType === 'test') return 'Test Builder';
        if (normalizedType === 'assessment') return 'Assessment Builder';
        if (normalizedType === 'assignment') return 'Assignment Editor';
        if (normalizedType === 'programming') return 'Programming Builder';
        return 'Content Editor';
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-mesh flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="min-h-screen bg-mesh flex items-center justify-center">
                <div className="glass-card p-8 text-center max-w-md">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-white mb-2">Error</h2>
                    <p className="text-gray-400 mb-6">{error || 'Course not found'}</p>
                    <button onClick={() => router.back()} className="btn-primary w-full">Go Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role={user?.role || 'INSTRUCTOR'} />
            <Navbar title="Course Builder" />
            
            <main className="page-content">
                <div className="max-w-7xl mx-auto mb-8">
                    <button
                        onClick={() => router.push(`${getDashboardPath()}/courses`)}
                        className="text-purple-400 hover:text-purple-300 mb-4 flex items-center gap-2 group transition-all"
                    >
                        <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Courses
                    </button>
                
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">{course.title}</h1>
                        <div className="flex gap-3 text-sm">
                            <span className={`px-3 py-1 rounded-full ${
                                course.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                                course.status === 'PENDING_APPROVAL' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                            }`}>
                                {course.status.replace('_', ' ')}
                            </span>
                            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full">
                                {course.level}
                            </span>
                            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                                {course.category}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {(course.status === 'DRAFT' || course.status === 'REJECTED') && (
                            <button
                                onClick={handleSubmitForApproval}
                                disabled={submittingForApproval}
                                className="btn-primary px-6 py-3 disabled:opacity-60"
                            >
                                {submittingForApproval ? 'Submitting...' : '🚀 Submit For Approval'}
                            </button>
                        )}
                        <button
                            onClick={() => setShowCourseOverviewModal(true)}
                            className="btn-success px-6 py-3"
                        >
                            📝 Edit Course Overview
                        </button>
                    </div>
                </div>
            </div>

            {/* Course Overview Card */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="glass-card p-6">
                    <h2 className="text-2xl font-bold text-white mb-4">Course Overview</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
                        <div>
                            <strong className="text-purple-400">Objectives:</strong>
                            <p className="mt-1">{course.objectives || 'Not set'}</p>
                        </div>
                        <div>
                            <strong className="text-purple-400">Prerequisites:</strong>
                            <p className="mt-1">{course.prerequisites || 'Not set'}</p>
                        </div>
                        <div>
                            <strong className="text-purple-400">Target Audience:</strong>
                            <p className="mt-1">{course.targetAudience || 'Not set'}</p>
                        </div>
                        <div>
                            <strong className="text-purple-400">Duration:</strong>
                            <p className="mt-1">{course.duration ? `${course.duration} hours` : 'Not set'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Course Content */}
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-white">Course Content</h2>
                    <button
                        onClick={() => {
                            setEditingModule(null);
                            setModuleForm({ title: '', description: '' });
                            setShowModuleModal(true);
                        }}
                        className="btn-success px-6 py-3"
                    >
                        ➕ Add New Module
                    </button>

                </div>

                {modules.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <p className="text-gray-400 text-lg mb-4">No modules yet. Add your first module to start building your course!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {modules.map((module, index) => (
                            <div key={module.id} className="glass-card p-6 border-l-4 border-purple-500">
                                {/* Module Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1 cursor-pointer" onClick={() => toggleModuleExpand(module.id)}>
                                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                            <span className="text-purple-400">Module {index + 1}:</span>
                                            {module.title}
                                            <span className="text-[var(--text-secondary)] text-sm">
                                                {expandedModules.has(module.id) ? '▼' : '▶'}
                                            </span>
                                        </h3>
                                        {module.description && (
                                            <p className="text-gray-400 mt-1">{module.description}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedModuleId(module.id);
                                                setEditingChapter(null);
                                                setChapterForm({ title: '', description: '' });
                                                setShowChapterModal(true);
                                            }}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                                        >
                                            ➕ Add Chapter
                                        </button>
                                        <button
                                            onClick={() => openEditModuleModal(module)}
                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteModule(module.id)}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                                        >
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </div>

                                {/* Chapters List */}
                                {expandedModules.has(module.id) && (
                                    <div className="mt-4 ml-6 space-y-4">
                                        {chapters[module.id]?.length > 0 ? (
                                            chapters[module.id].map((chapter, chapterIndex) => (
                                                <div key={chapter.id} className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex-1 cursor-pointer" onClick={() => toggleChapterExpand(chapter.id)}>
                                                            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                                                                <span className="text-blue-400">Chapter {index + 1}.{chapterIndex + 1}:</span>
                                                                {chapter.title}
                                                                <span className="text-xs text-gray-400">
                                                                    {expandedChapters.has(chapter.id) ? '▼' : '▶'}
                                                                </span>
                                                            </h4>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedChapterId(chapter.id);
                                                                    setEditingLesson(null);
                                                                    setLessonForm({ title: '', description: '', videoUrl: '', duration: 0, type: 'video', published: false });
                                                                    setShowLessonModal(true);
                                                                }}
                                                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                                                            >
                                                                ➕ Topic
                                                            </button>
                                                            <button onClick={() => openEditChapterModal(chapter)} className="p-1 hover:text-purple-400">✏️</button>
                                                            <button onClick={() => handleDeleteChapter(chapter.id)} className="p-1 hover:text-red-400">🗑️</button>
                                                        </div>
                                                    </div>

                                                    {/* Topics (Lessons) List */}
                                                    {expandedChapters.has(chapter.id) && (
                                                        <div className="mt-3 ml-4 space-y-2">
                                                            {lessons[chapter.id]?.length > 0 ? (
                                                                lessons[chapter.id].map((lesson, lessonIndex) => (
                                                                    <div
                                                                        key={lesson.id}
                                                                        className="bg-slate-900/40 p-3 rounded-lg flex justify-between items-center group"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="text-gray-500 text-xs">{index+1}.{chapterIndex+1}.{lessonIndex+1}</span>
                                                                            <h5 className="text-gray-200 font-medium text-sm">{lesson.title}</h5>
                                                                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded uppercase">{lesson.type}</span>
                                                                        </div>
                                                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button
                                                                                onClick={() => router.push(getTopicEditorPath(lesson))}
                                                                                className="text-xs text-purple-400 hover:underline font-semibold"
                                                                            >
                                                                                {getTopicEditorLabel(lesson)}
                                                                            </button>
                                                                            <button onClick={() => openEditLessonModal(lesson)} className="p-1 hover:text-purple-400 transition-colors">✏️</button>
                                                                            <button onClick={() => handleDeleteLesson(lesson.id)} className="p-1 hover:text-red-400 transition-colors">🗑️</button>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p className="text-gray-500 text-xs italic">No topics.</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-gray-500 text-sm italic">No chapters. Add one to start adding topics.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

            </div>

            {/* Course Overview Modal */}
            {showCourseOverviewModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--bg-surface)] border-2 border-purple-500/30 rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-6">Edit Course Overview</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[var(--text-primary)] font-medium mb-2">
                                    Learning Objectives
                                </label>
                                <textarea
                                    value={courseForm.objectives}
                                    onChange={(e) => setCourseForm({ ...courseForm, objectives: e.target.value })}
                                    rows={4}
                                    className="input-field w-full resize-none"
                                    placeholder="What will students learn from this course?"
                                />
                            </div>

                            <div>
                                <label className="block text-[var(--text-primary)] font-medium mb-2">
                                    Prerequisites
                                </label>
                                <textarea
                                    value={courseForm.prerequisites}
                                    onChange={(e) => setCourseForm({ ...courseForm, prerequisites: e.target.value })}
                                    rows={3}
                                    className="input-field w-full resize-none"
                                    placeholder="What should students know before taking this course?"
                                />
                            </div>

                            <div>
                                <label className="block text-[var(--text-primary)] font-medium mb-2">
                                    Target Audience
                                </label>
                                <textarea
                                    value={courseForm.targetAudience}
                                    onChange={(e) => setCourseForm({ ...courseForm, targetAudience: e.target.value })}
                                    rows={3}
                                    className="input-field w-full resize-none"
                                    placeholder="Who is this course for?"
                                />
                            </div>

                            <div>
                                <label className="block text-[var(--text-primary)] font-medium mb-2">
                                    Estimated Duration (hours)
                                </label>
                                <input
                                    type="number"
                                    value={courseForm.duration}
                                    onChange={(e) => setCourseForm({ ...courseForm, duration: parseInt(e.target.value) || 0 })}
                                    className="input-field w-full"
                                    placeholder="e.g., 10"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={handleUpdateCourseOverview}
                                className="btn-success flex-1 py-3"
                            >
                                💾 Save Changes
                            </button>
                            <button
                                onClick={() => setShowCourseOverviewModal(false)}
                                className="btn-danger flex-1 py-3"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Module Modal */}
            {showModuleModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--bg-surface)] border-2 border-purple-500/30 rounded-2xl p-8 max-w-2xl w-full">
                        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-6">
                            {editingModule ? 'Edit Section' : 'Add New Section'}
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[var(--text-primary)] font-medium mb-2">
                                    Module Title <span className="text-red-600">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={moduleForm.title}
                                    onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                                    className="input-field w-full"
                                    placeholder="e.g., Introduction to React"
                                />
                            </div>

                            <div>
                                <label className="block text-[var(--text-primary)] font-medium mb-2">
                                    Module Description
                                </label>
                                <textarea
                                    value={moduleForm.description}
                                    onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                                    rows={4}
                                    className="input-field w-full resize-none"
                                    placeholder="Brief description of what this module covers..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={editingModule ? handleUpdateModule : handleCreateModule}
                                className="btn-success flex-1 py-3"
                            >
                                {editingModule ? '💾 Update Module' : '➕ Create Module'}
                            </button>

                            <button
                                onClick={() => {
                                    setShowModuleModal(false);
                                    setEditingModule(null);
                                    setModuleForm({ title: '', description: '' });
                                }}
                                className="btn-danger flex-1 py-3"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chapter Modal */}
            {showChapterModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--bg-surface)] border-2 border-blue-500/30 rounded-2xl p-8 max-w-2xl w-full">
                        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-6">
                            {editingChapter ? 'Edit Chapter' : 'Add New Chapter'}
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[var(--text-primary)] font-medium mb-2">
                                    Chapter Title <span className="text-red-600">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={chapterForm.title}
                                    onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                                    className="input-field w-full"
                                    placeholder="e.g., Components and Props"
                                />
                            </div>

                            <div>
                                <label className="block text-[var(--text-primary)] font-medium mb-2">
                                    Chapter Description
                                </label>
                                <textarea
                                    value={chapterForm.description}
                                    onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
                                    rows={4}
                                    className="input-field w-full resize-none"
                                    placeholder="Brief description..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={editingChapter ? handleUpdateChapter : handleCreateChapter}
                                className="btn-success flex-1 py-3"
                            >
                                {editingChapter ? '💾 Update Chapter' : '➕ Create Chapter'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowChapterModal(false);
                                    setEditingChapter(null);
                                    setChapterForm({ title: '', description: '' });
                                }}
                                className="btn-danger flex-1 py-3"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lesson Modal */}
            {showLessonModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--bg-surface)] border-2 border-purple-500/30 rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-6">
                            {editingLesson ? 'Edit Topic' : 'Add New Topic'}
                        </h2>

                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[var(--text-primary)] font-medium mb-2">
                                    Topic Title <span className="text-red-600">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={lessonForm.title}
                                    onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                                    className="input-field w-full"
                                    placeholder="e.g., Setting up React Environment"
                                />
                            </div>

                            <div>
                                <label className="block text-[var(--text-primary)] font-medium mb-2">
                                    Topic Description
                                </label>
                                <textarea
                                    value={lessonForm.description}
                                    onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                                    rows={4}
                                    className="input-field w-full resize-none"
                                    placeholder="What will students learn in this topic?"
                                />
                            </div>


                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[var(--text-primary)] font-medium mb-2">
                                        Content Type
                                    </label>
                                    <select
                                        value={lessonForm.type}
                                        onChange={(e) => setLessonForm({ ...lessonForm, type: e.target.value })}
                                        className="input-field w-full"
                                    >
                                        <option value="video">Video</option>
                                        <option value="article">Article</option>
                                        <option value="quiz">Quiz</option>
                                        <option value="test">Test</option>
                                        <option value="assessment">Assessment</option>
                                        <option value="assignment">Assignment</option>
                                        <option value="programming">Programming</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[var(--text-primary)] font-medium mb-2">
                                        Duration (minutes)
                                    </label>
                                    <input
                                        type="number"
                                        value={lessonForm.duration}
                                        onChange={(e) => setLessonForm({ ...lessonForm, duration: parseInt(e.target.value) || 0 })}
                                        className="input-field w-full"
                                        placeholder="e.g., 15"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[var(--text-primary)] font-medium mb-2">
                                    Video URL (YouTube, Vimeo, etc.)
                                </label>
                                <input
                                    type="text"
                                    value={lessonForm.videoUrl}
                                    onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                                    className="input-field w-full"
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    disabled={lessonForm.type !== 'video'}
                                />
                                {lessonForm.type !== 'video' && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        Video URL is only used for Video topics.
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={lessonForm.published}
                                        onChange={(e) => setLessonForm({ ...lessonForm, published: e.target.checked })}
                                        className="w-5 h-5 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                                    />
                                    <span className="text-[var(--text-primary)] font-medium">
                                        Publish this lecture (make it visible to students)
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={editingLesson ? handleUpdateLesson : handleCreateLesson}
                                className="btn-success flex-1 py-3"
                            >
                                {editingLesson ? '💾 Update Topic' : '➕ Create Topic'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowLessonModal(false);
                                    setEditingLesson(null);
                                    setLessonForm({ title: '', description: '', videoUrl: '', duration: 0, type: 'video', published: false });
                                }}
                                className="btn-danger flex-1 py-3"
                            >
                                Cancel
                            </button>
                        </div>

                    </div>
                </div>
            )}
            </main>
        </div>
    );
}
