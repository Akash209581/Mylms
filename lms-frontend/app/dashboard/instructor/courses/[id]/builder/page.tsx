'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import { getRoleBasePath } from '@/lib/roleUtils';
import {
    BookOpen,
    Layers,
    Plus,
    Trash2,
    Pencil,
    UploadCloud,
    CheckCircle2,
    Eye,
    FileText,
    Image as ImageIcon,
    ChevronDown,
    ChevronRight,
    ArrowLeft,
    Sparkles,
} from 'lucide-react';

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
    published?: boolean;
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
    content?: any;
}

const PRESET_BANNERS = [
    {
        id: 'python-neon',
        name: 'Python & DSA',
        category: 'Programming',
        url: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: 'data-science',
        name: 'Data Science',
        category: 'Data Science',
        url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: 'code-laptop',
        name: 'Programming',
        category: 'Programming',
        url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: 'web-dev',
        name: 'Web Dev',
        category: 'Web Development',
        url: 'https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: 'ai-ml',
        name: 'AI & ML',
        category: 'Artificial Intelligence - Machine Learning, Deep Learning',
        url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: 'agentic-ai',
        name: 'Agentic AI',
        category: 'Agentic AI',
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: 'cybersecurity',
        name: 'Cybersecurity',
        category: 'Cybersecurity',
        url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
    },
];

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
    const [showCourseDetailsModal, setShowCourseDetailsModal] = useState(false);
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

    // Course Details & Cover Form
    const [courseForm, setCourseForm] = useState({
        title: '',
        description: '',
        thumbnail: '',
        category: 'General',
        level: 'Beginner',
        price: 0,
        objectives: '',
        prerequisites: '',
        targetAudience: '',
        duration: 0,
        published: true,
    });

    const [bannerUploading, setBannerUploading] = useState(false);
    const [bannerUploadProgress, setBannerUploadProgress] = useState(0);
    const bannerFileInputRef = useRef<HTMLInputElement>(null);

    // Module Form
    const [moduleForm, setModuleForm] = useState({
        title: '',
        description: '',
    });

    // Chapter Form
    const [chapterForm, setChapterForm] = useState({
        title: '',
        description: '',
    });

    // Lesson / Topic Form
    const [lessonForm, setLessonForm] = useState({
        title: '',
        description: '',
        type: 'pdf',
        published: true,
    });
    const [topicPdfFile, setTopicPdfFile] = useState<File | null>(null);
    const [topicUploading, setTopicUploading] = useState(false);
    const [topicUploadProgress, setTopicUploadProgress] = useState<{ [lessonId: number]: number }>({});

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            setUser(JSON.parse(stored));
        }
        fetchCourseData();
    }, [courseId]);

    const getDashboardPath = () => {
        return getRoleBasePath(user?.role);
    };

    const fetchCourseData = async () => {
        try {
            setLoading(true);

            // Fetch course details
            const courseRes = await api.get(`/courses/${courseId}`);
            const cData = courseRes.data;
            setCourse(cData);
            setCourseForm({
                title: cData.title || '',
                description: cData.description || '',
                thumbnail: cData.thumbnail || '',
                category: cData.category || 'General',
                level: cData.level || 'Beginner',
                price: cData.price || 0,
                objectives: cData.objectives || '',
                prerequisites: cData.prerequisites || '',
                targetAudience: cData.targetAudience || '',
                duration: cData.duration || 0,
                published: cData.published ?? true,
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

            // Expand all modules and chapters by default for immediate convenience
            setExpandedModules(new Set(modulesRes.data.map((m: any) => m.id)));
            const allChIds: number[] = [];
            for (const mId in chaptersData) {
                chaptersData[mId].forEach(ch => allChIds.push(ch.id));
            }
            setExpandedChapters(new Set(allChIds));

            setLoading(false);
        } catch (err: any) {
            console.error('Error fetching course data:', err);
            setError('Failed to load course data');
            setLoading(false);
        }
    };

    // Banner Upload Handler
    const handleBannerUpload = async (file: File) => {
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            alert('Banner image must be under 10MB.');
            return;
        }

        setBannerUploading(true);
        setBannerUploadProgress(10);

        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/courses/upload-banner', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setBannerUploadProgress(percent);
                    }
                }
            });

            if (res.data?.url) {
                setCourseForm(prev => ({ ...prev, thumbnail: res.data.url }));
                setBannerUploadProgress(100);
            }
        } catch (err: any) {
            alert('Banner upload failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setBannerUploading(false);
            setTimeout(() => setBannerUploadProgress(0), 1000);
        }
    };

    // Save Entire Course Details (Cover, Info, Objectives, etc.)
    const handleUpdateCourseDetails = async () => {
        if (!courseForm.title.trim() || courseForm.title.trim().length < 5) {
            alert('Course Title must be at least 5 characters long.');
            return;
        }
        if (!courseForm.description.trim() || courseForm.description.trim().length < 10) {
            alert('Course Description must be at least 10 characters long.');
            return;
        }

        try {
            const payload: any = {
                title: courseForm.title.trim(),
                description: courseForm.description.trim(),
                thumbnail: courseForm.thumbnail || '',
                category: courseForm.category,
                level: courseForm.level,
                price: Number(courseForm.price) || 0,
                objectives: courseForm.objectives || '',
                prerequisites: courseForm.prerequisites || '',
                targetAudience: courseForm.targetAudience || '',
                duration: Number(courseForm.duration) || 0,
                published: courseForm.published,
            };

            await api.put(`/courses/${courseId}`, payload);
            alert('Course details & cover updated successfully!');
            setShowCourseDetailsModal(false);
            fetchCourseData();
        } catch (err: any) {
            alert('Failed to update course details: ' + (err.response?.data?.message || err.message));
        }
    };

    // Module Handlers
    const handleCreateModule = async () => {
        if (!moduleForm.title.trim()) {
            alert('Please enter a module title.');
            return;
        }
        try {
            await api.post('/modules', {
                ...moduleForm,
                courseId,
            });
            setShowModuleModal(false);
            setModuleForm({ title: '', description: '' });
            fetchCourseData();
        } catch (err: any) {
            alert('Failed to create module: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleUpdateModule = async () => {
        if (!editingModule) return;
        if (!moduleForm.title.trim()) {
            alert('Please enter a module title.');
            return;
        }
        try {
            await api.put(`/modules/${editingModule.id}`, moduleForm);
            setShowModuleModal(false);
            setEditingModule(null);
            setModuleForm({ title: '', description: '' });
            fetchCourseData();
        } catch (err: any) {
            alert('Failed to update module: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteModule = async (moduleId: number) => {
        if (!confirm('Are you sure? This will delete all chapters and topics inside this module.')) return;
        try {
            await api.delete(`/modules/${moduleId}`);
            fetchCourseData();
        } catch (err: any) {
            alert('Failed to delete module: ' + (err.response?.data?.message || err.message));
        }
    };

    // Chapter Handlers
    const handleCreateChapter = async () => {
        if (!selectedModuleId) return;
        if (!chapterForm.title.trim()) {
            alert('Please enter a chapter title.');
            return;
        }
        try {
            await api.post('/chapters', {
                ...chapterForm,
                moduleId: selectedModuleId,
            });
            setShowChapterModal(false);
            setChapterForm({ title: '', description: '' });
            fetchCourseData();
        } catch (err: any) {
            alert('Failed to create chapter: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleUpdateChapter = async () => {
        if (!editingChapter) return;
        if (!chapterForm.title.trim()) {
            alert('Please enter a chapter title.');
            return;
        }
        try {
            await api.put(`/chapters/${editingChapter.id}`, chapterForm);
            setShowChapterModal(false);
            setEditingChapter(null);
            setChapterForm({ title: '', description: '' });
            fetchCourseData();
        } catch (err: any) {
            alert('Failed to update chapter: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteChapter = async (id: number) => {
        if (!confirm('Are you sure? This will delete all topics inside this chapter.')) return;
        try {
            await api.delete(`/chapters/${id}`);
            fetchCourseData();
        } catch (err: any) {
            alert('Failed to delete chapter: ' + (err.response?.data?.message || err.message));
        }
    };

    // Topic Handlers
    const openAddTopicModal = (chapterId: number) => {
        setSelectedChapterId(chapterId);
        setEditingLesson(null);
        setLessonForm({
            title: '',
            description: '',
            type: 'pdf',
            published: true,
        });
        setTopicPdfFile(null);
        setShowLessonModal(true);
    };

    const openEditTopicModal = (lesson: Lesson) => {
        setEditingLesson(lesson);
        setSelectedChapterId(lesson.chapterId);
        setLessonForm({
            title: lesson.title,
            description: lesson.description || '',
            type: lesson.type || 'pdf',
            published: lesson.published ?? true,
        });
        setTopicPdfFile(null);
        setShowLessonModal(true);
    };

    const handleCreateTopic = async () => {
        if (!selectedChapterId) return;
        if (!lessonForm.title.trim()) {
            alert('Please enter a topic title.');
            return;
        }

        try {
            setTopicUploading(true);
            let pdfUrl = '';
            let fileName = '';
            let fileSize = 0;

            if (topicPdfFile) {
                const formData = new FormData();
                formData.append('file', topicPdfFile);
                const uploadRes = await api.post('/courses/upload-pdf-file', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                pdfUrl = uploadRes.data.url;
                fileName = uploadRes.data.fileName || topicPdfFile.name;
                fileSize = uploadRes.data.fileSize || topicPdfFile.size;
            }

            const payload: any = {
                title: lessonForm.title.trim(),
                description: lessonForm.description || '',
                type: lessonForm.type || 'pdf',
                published: true,
                chapterId: selectedChapterId,
            };

            if (pdfUrl) {
                payload.contentUrl = pdfUrl;
                payload.content = { isPdf: true, pdfUrl, fileName, fileSize };
            }

            await api.post('/lessons', payload);
            setShowLessonModal(false);
            setEditingLesson(null);
            setLessonForm({ title: '', description: '', type: 'pdf', published: true });
            setTopicPdfFile(null);
            await fetchCourseData();
        } catch (err: any) {
            alert('Failed to create topic: ' + (err.response?.data?.message || err.message));
        } finally {
            setTopicUploading(false);
        }
    };

    const handleUpdateTopic = async () => {
        if (!editingLesson) return;
        if (!lessonForm.title.trim()) {
            alert('Please enter a topic title.');
            return;
        }

        try {
            setTopicUploading(true);
            let pdfUrl = editingLesson.contentUrl || editingLesson.content?.pdfUrl || '';
            let fileName = editingLesson.content?.fileName || '';
            let fileSize = editingLesson.content?.fileSize || 0;

            if (topicPdfFile) {
                const formData = new FormData();
                formData.append('file', topicPdfFile);
                const uploadRes = await api.post('/courses/upload-pdf-file', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                pdfUrl = uploadRes.data.url;
                fileName = uploadRes.data.fileName || topicPdfFile.name;
                fileSize = uploadRes.data.fileSize || topicPdfFile.size;
            }

            const payload: any = {
                title: lessonForm.title.trim(),
                description: lessonForm.description || '',
                type: lessonForm.type || 'pdf',
                published: lessonForm.published ?? true,
            };

            if (pdfUrl) {
                payload.contentUrl = pdfUrl;
                payload.content = { isPdf: true, pdfUrl, fileName, fileSize };
            }

            await api.put(`/lessons/${editingLesson.id}`, payload);
            setShowLessonModal(false);
            setEditingLesson(null);
            setLessonForm({ title: '', description: '', type: 'pdf', published: true });
            setTopicPdfFile(null);
            await fetchCourseData();
        } catch (err: any) {
            alert('Failed to update topic: ' + (err.response?.data?.message || err.message));
        } finally {
            setTopicUploading(false);
        }
    };

    const handleDeleteTopic = async (lessonId: number) => {
        if (!confirm('Are you sure you want to delete this topic?')) return;
        try {
            await api.delete(`/lessons/${lessonId}`);
            fetchCourseData();
        } catch (err: any) {
            alert('Failed to delete topic: ' + (err.response?.data?.message || err.message));
        }
    };

    // Direct PDF Upload / Replace on a Topic
    const handleUploadTopicPdf = async (chapterId: number, lessonId: number, file: File) => {
        if (!file) return;
        if (file.size > 50 * 1024 * 1024) {
            alert(`Selected PDF (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds 50MB limit.`);
            return;
        }

        try {
            setTopicUploadProgress(prev => ({ ...prev, [lessonId]: 10 }));
            const formData = new FormData();
            formData.append('file', file);
            const uploadRes = await api.post('/courses/upload-pdf-file', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setTopicUploadProgress(prev => ({ ...prev, [lessonId]: percent }));
                    }
                }
            });

            const pdfUrl = uploadRes.data.url;
            const fileName = uploadRes.data.fileName || file.name;
            const fileSize = uploadRes.data.fileSize || file.size;

            await api.put(`/lessons/${lessonId}`, {
                type: 'pdf',
                contentUrl: pdfUrl,
                content: { isPdf: true, pdfUrl, fileName, fileSize }
            });

            setLessons(prev => ({
                ...prev,
                [chapterId]: prev[chapterId]?.map(l => l.id === lessonId ? {
                    ...l,
                    type: 'pdf',
                    contentUrl: pdfUrl,
                    content: { isPdf: true, pdfUrl, fileName, fileSize }
                } : l) || []
            }));

            setTimeout(() => {
                setTopicUploadProgress(prev => {
                    const next = { ...prev };
                    delete next[lessonId];
                    return next;
                });
            }, 1000);
        } catch (err: any) {
            setTopicUploadProgress(prev => {
                const next = { ...prev };
                delete next[lessonId];
                return next;
            });
            alert('Failed to upload PDF: ' + (err.response?.data?.message || err.message));
        }
    };

    // Submit For Approval
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

    const totalChaptersCount = Object.values(chapters).reduce((acc, chList) => acc + chList.length, 0);
    const totalTopicsCount = Object.values(lessons).reduce((acc, tList) => acc + tList.length, 0);

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role={user?.role || 'INSTRUCTOR'} />
            <Navbar title="Course Editor & Structure Builder" />

            <main className="page-content">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Top Navigation */}
                    <button
                        onClick={() => router.push(`${getDashboardPath()}/courses`)}
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2 group transition-all text-sm font-semibold"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Courses</span>
                    </button>

                    {/* Course Banner & Information Header Card */}
                    <div className="glass-card overflow-hidden rounded-3xl border border-white/10 shadow-2xl relative">
                        {/* Cover Image Header */}
                        <div className="h-60 sm:h-72 w-full relative overflow-hidden bg-slate-950">
                            {course.thumbnail ? (
                                <img
                                    src={course.thumbnail}
                                    alt={course.title}
                                    className="w-full h-full object-cover brightness-90 hover:brightness-100 transition-all duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 text-6xl">
                                    📚
                                </div>
                            )}

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

                            {/* Top Badges */}
                            <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${course.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                                    course.status === 'PENDING_APPROVAL' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse' :
                                        'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                    }`}>
                                    {course.status === 'APPROVED' ? '✅ Approved' : course.status === 'PENDING_APPROVAL' ? '⏳ Pending Approval' : '📝 Draft / Revision'}
                                </span>
                                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-xs font-bold backdrop-blur-md">
                                    🎯 {course.level || 'All Levels'}
                                </span>
                                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-xs font-bold backdrop-blur-md">
                                    📂 {course.category || 'General'}
                                </span>
                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold backdrop-blur-md">
                                    {course.price > 0 ? `₹${course.price}` : 'Free'}
                                </span>
                            </div>

                            {/* Quick Change Cover Button on Banner */}
                            <div className="absolute top-4 right-4 z-10">
                                <button
                                    onClick={() => setShowCourseDetailsModal(true)}
                                    className="px-3.5 py-2 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5 shadow-lg"
                                >
                                    <ImageIcon size={14} className="text-indigo-400" />
                                    <span>Change Cover / Banner</span>
                                </button>
                            </div>

                            {/* Title & Info on bottom of banner */}
                            <div className="absolute bottom-4 left-6 right-6 z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                                <div className="space-y-1">
                                    <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
                                        {course.title}
                                    </h1>
                                    <p className="text-gray-300 text-xs sm:text-sm line-clamp-2 max-w-3xl drop-shadow">
                                        {course.description}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {(course.status === 'DRAFT' || course.status === 'REJECTED') && (
                                        <button
                                            onClick={handleSubmitForApproval}
                                            disabled={submittingForApproval}
                                            className="btn-primary px-5 py-2.5 text-xs font-bold shadow-lg disabled:opacity-60"
                                        >
                                            {submittingForApproval ? 'Submitting...' : '🚀 Submit For Approval'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowCourseDetailsModal(true)}
                                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center gap-1.5"
                                    >
                                        <Pencil size={14} />
                                        <span>Edit Course Details & Cover</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats Bar */}
                        <div className="bg-slate-900/90 p-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                            <div>
                                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Modules</p>
                                <p className="text-xl font-black text-indigo-400">{modules.length}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Chapters</p>
                                <p className="text-xl font-black text-purple-400">{totalChaptersCount}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Topics (PDFs)</p>
                                <p className="text-xl font-black text-emerald-400">{totalTopicsCount}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Est. Duration</p>
                                <p className="text-xl font-black text-amber-400">{course.duration ? `${course.duration} hrs` : 'Self-paced'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Course Overview & Objectives Card */}
                    {(course.objectives || course.prerequisites || course.targetAudience) && (
                        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                                <h3 className="text-white font-bold text-base flex items-center gap-2">
                                    <BookOpen size={18} className="text-purple-400" />
                                    <span>Course Overview & Objectives</span>
                                </h3>
                                <button
                                    onClick={() => setShowCourseDetailsModal(true)}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                                >
                                    <Pencil size={12} />
                                    <span>Edit</span>
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-300">
                                {course.objectives && (
                                    <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                                        <p className="text-purple-300 font-bold uppercase tracking-wider mb-1">Learning Objectives</p>
                                        <p className="leading-relaxed line-clamp-4">{course.objectives}</p>
                                    </div>
                                )}
                                {course.prerequisites && (
                                    <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                                        <p className="text-blue-300 font-bold uppercase tracking-wider mb-1">Prerequisites</p>
                                        <p className="leading-relaxed line-clamp-4">{course.prerequisites}</p>
                                    </div>
                                )}
                                {course.targetAudience && (
                                    <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                                        <p className="text-emerald-300 font-bold uppercase tracking-wider mb-1">Target Audience</p>
                                        <p className="leading-relaxed line-clamp-4">{course.targetAudience}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Course Hierarchy & Structure (Modules -> Chapters -> Topics) */}
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <Layers size={22} className="text-indigo-400" />
                                    <span>Course Structure (Modules, Chapters & Topics)</span>
                                </h2>
                                <p className="text-gray-400 text-xs mt-1">
                                    Organize your curriculum in Modules → Chapters → Multiple Topics with attached PDF files.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingModule(null);
                                    setModuleForm({ title: '', description: '' });
                                    setShowModuleModal(true);
                                }}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all"
                            >
                                <Plus size={16} />
                                <span>Add New Module</span>
                            </button>
                        </div>

                        {modules.length === 0 ? (
                            <div className="glass-card p-12 text-center rounded-2xl">
                                <div className="text-5xl mb-3">📚</div>
                                <h3 className="text-lg font-bold text-white mb-2">No Modules Found</h3>
                                <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                                    Your course doesn't have any modules yet. Click &quot;Add New Module&quot; to begin building your course structure!
                                </p>
                                <button
                                    onClick={() => {
                                        setEditingModule(null);
                                        setModuleForm({ title: '', description: '' });
                                        setShowModuleModal(true);
                                    }}
                                    className="btn-primary px-6 py-3 font-bold"
                                >
                                    ➕ Add First Module
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {modules.map((module, mIdx) => {
                                    const modChapters = chapters[module.id] || [];
                                    const isModuleExpanded = expandedModules.has(module.id);

                                    return (
                                        <div key={module.id} className="bg-slate-900/90 border-2 border-indigo-500/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
                                            {/* Module Header */}
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                                                <div
                                                    className="flex items-center gap-3 flex-1 cursor-pointer"
                                                    onClick={() => toggleModuleExpand(module.id)}
                                                >
                                                    <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow shrink-0">
                                                        M{mIdx + 1}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-base sm:text-lg font-bold text-white">
                                                                {module.title}
                                                            </h3>
                                                            <span className="text-gray-400 text-xs">
                                                                {isModuleExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                            </span>
                                                        </div>
                                                        {module.description && (
                                                            <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{module.description}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedModuleId(module.id);
                                                            setEditingChapter(null);
                                                            setChapterForm({ title: '', description: '' });
                                                            setShowChapterModal(true);
                                                        }}
                                                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow"
                                                    >
                                                        <Plus size={14} />
                                                        <span>Add Chapter</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingModule(module);
                                                            setModuleForm({ title: module.title, description: module.description || '' });
                                                            setShowModuleModal(true);
                                                        }}
                                                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-gray-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                                    >
                                                        <Pencil size={12} />
                                                        <span>Edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteModule(module.id)}
                                                        className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                                    >
                                                        <Trash2 size={12} />
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Chapters inside Module */}
                                            {isModuleExpanded && (
                                                <div className="pl-2 sm:pl-4 space-y-4 border-l-2 border-indigo-500/20">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                            Chapters in Module {mIdx + 1} ({modChapters.length})
                                                        </p>
                                                    </div>

                                                    {modChapters.length === 0 ? (
                                                        <div className="p-4 bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-center space-y-2">
                                                            <p className="text-gray-400 text-xs">No chapters in this module yet.</p>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedModuleId(module.id);
                                                                    setEditingChapter(null);
                                                                    setChapterForm({ title: '', description: '' });
                                                                    setShowChapterModal(true);
                                                                }}
                                                                className="px-3 py-1.5 bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                                                            >
                                                                ➕ Add Chapter 1
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        modChapters.map((chapter, cIdx) => {
                                                            const chLessons = lessons[chapter.id] || [];
                                                            const isChapterExpanded = expandedChapters.has(chapter.id);

                                                            return (
                                                                <div key={chapter.id} className="bg-slate-950/80 p-4 sm:p-5 rounded-xl border border-slate-800 space-y-4">
                                                                    {/* Chapter Header */}
                                                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                                                                        <div
                                                                            className="flex items-center gap-2 flex-1 cursor-pointer"
                                                                            onClick={() => toggleChapterExpand(chapter.id)}
                                                                        >
                                                                            <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 font-bold text-xs whitespace-nowrap">
                                                                                Ch {mIdx + 1}.{cIdx + 1}
                                                                            </span>
                                                                            <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                                                                                <span>{chapter.title}</span>
                                                                                <span className="text-gray-400 text-xs">
                                                                                    {isChapterExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                                                </span>
                                                                            </h4>
                                                                        </div>

                                                                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                                                            <button
                                                                                onClick={() => openAddTopicModal(chapter.id)}
                                                                                className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow"
                                                                            >
                                                                                <Plus size={13} />
                                                                                <span>Add Topic</span>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingChapter(chapter);
                                                                                    setChapterForm({ title: chapter.title, description: chapter.description || '' });
                                                                                    setShowChapterModal(true);
                                                                                }}
                                                                                className="px-2.5 py-1 text-gray-400 hover:text-white text-xs font-semibold"
                                                                            >
                                                                                ✏️ Edit
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteChapter(chapter.id)}
                                                                                className="px-2.5 py-1 text-red-400 hover:text-red-300 text-xs font-semibold"
                                                                            >
                                                                                🗑️ Delete
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Topics List inside Chapter */}
                                                                    {isChapterExpanded && (
                                                                        <div className="pl-2 sm:pl-3 space-y-3 border-l-2 border-emerald-500/30">
                                                                            <div className="flex items-center justify-between">
                                                                                <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                                                                                    Topics / PDF Lessons ({chLessons.length})
                                                                                </p>
                                                                            </div>

                                                                            {chLessons.length === 0 ? (
                                                                                <div className="p-3 bg-slate-900/50 rounded-xl border border-dashed border-slate-700/80 text-center space-y-2">
                                                                                    <p className="text-gray-400 text-xs">No topics in this chapter yet.</p>
                                                                                    <button
                                                                                        onClick={() => openAddTopicModal(chapter.id)}
                                                                                        className="px-3 py-1 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-bold transition-all"
                                                                                    >
                                                                                        ➕ Add Topic 1
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                chLessons.map((topic, tIdx) => {
                                                                                    const pdfUrl = topic.contentUrl || topic.content?.pdfUrl;
                                                                                    const fileName = topic.content?.fileName || (pdfUrl ? pdfUrl.split('/').pop() : '');
                                                                                    const fileSize = topic.content?.fileSize;
                                                                                    const uploadProg = topicUploadProgress[topic.id];

                                                                                    return (
                                                                                        <div key={topic.id} className="bg-slate-900/90 p-3.5 sm:p-4 rounded-xl border border-slate-700/80 space-y-3">
                                                                                            {/* Topic Header */}
                                                                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                                                                                <div className="flex items-center gap-2 flex-1">
                                                                                                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-xs whitespace-nowrap">
                                                                                                        Topic {mIdx + 1}.{cIdx + 1}.{tIdx + 1}
                                                                                                    </span>
                                                                                                    <p className="text-white text-xs sm:text-sm font-bold line-clamp-1">
                                                                                                        {topic.title}
                                                                                                    </p>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                                                                                    <button
                                                                                                        onClick={() => openEditTopicModal(topic)}
                                                                                                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                                                                                                    >
                                                                                                        <Pencil size={12} />
                                                                                                        <span>Edit</span>
                                                                                                    </button>
                                                                                                    <button
                                                                                                        onClick={() => handleDeleteTopic(topic.id)}
                                                                                                        className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
                                                                                                    >
                                                                                                        <Trash2 size={12} />
                                                                                                        <span>Delete</span>
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* Topic PDF Section */}
                                                                                            {uploadProg !== undefined ? (
                                                                                                <div className="p-3 bg-slate-950 rounded-lg border border-indigo-500/30 space-y-1.5">
                                                                                                    <div className="flex justify-between text-xs font-bold text-indigo-300">
                                                                                                        <span>Uploading Topic PDF...</span>
                                                                                                        <span>{uploadProg}%</span>
                                                                                                    </div>
                                                                                                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                                                                                        <div
                                                                                                            className="bg-indigo-500 h-full transition-all duration-200"
                                                                                                            style={{ width: `${uploadProg}%` }}
                                                                                                        />
                                                                                                    </div>
                                                                                                </div>
                                                                                            ) : pdfUrl ? (
                                                                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-2.5 bg-indigo-950/30 rounded-lg border border-indigo-500/30 text-xs">
                                                                                                    <div className="flex items-center gap-2 text-indigo-300 font-medium min-w-0">
                                                                                                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                                                                                                        <span className="truncate max-w-sm text-gray-200 font-semibold">
                                                                                                            {fileName || 'PDF Document'}
                                                                                                        </span>
                                                                                                        {fileSize ? (
                                                                                                            <span className="text-gray-400 text-[11px] shrink-0">
                                                                                                                ({(fileSize / (1024 * 1024)).toFixed(2)} MB)
                                                                                                            </span>
                                                                                                        ) : null}
                                                                                                    </div>
                                                                                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                                                                                        <a
                                                                                                            href={pdfUrl}
                                                                                                            target="_blank"
                                                                                                            rel="noopener noreferrer"
                                                                                                            className="px-2.5 py-1 rounded bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white font-bold transition-all flex items-center gap-1"
                                                                                                        >
                                                                                                            <Eye size={12} />
                                                                                                            <span>View PDF</span>
                                                                                                        </a>
                                                                                                        <label className="cursor-pointer px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-300 hover:text-white font-bold transition-all">
                                                                                                            <span>Replace PDF</span>
                                                                                                            <input
                                                                                                                type="file"
                                                                                                                accept=".pdf"
                                                                                                                className="hidden"
                                                                                                                onChange={e => {
                                                                                                                    const file = e.target.files?.[0];
                                                                                                                    if (file) handleUploadTopicPdf(chapter.id, topic.id, file);
                                                                                                                }}
                                                                                                            />
                                                                                                        </label>
                                                                                                    </div>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <div className="p-2.5 bg-slate-950/50 rounded-lg border border-dashed border-slate-700 text-xs text-gray-400 italic flex items-center justify-between">
                                                                                                    <span>No PDF file attached to this topic yet.</span>
                                                                                                    <label className="cursor-pointer px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-300 hover:text-white rounded-lg text-xs font-bold not-italic transition-all">
                                                                                                        <span>Upload PDF</span>
                                                                                                        <input
                                                                                                            type="file"
                                                                                                            accept=".pdf"
                                                                                                            className="hidden"
                                                                                                            onChange={e => {
                                                                                                                const file = e.target.files?.[0];
                                                                                                                if (file) handleUploadTopicPdf(chapter.id, topic.id, file);
                                                                                                            }}
                                                                                                        />
                                                                                                    </label>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    );
                                                                                })
                                                                            )}

                                                                            {/* Add Topic button at bottom of Chapter */}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => openAddTopicModal(chapter.id)}
                                                                                className="w-full py-2 border border-dashed border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                                                            >
                                                                                <Plus size={13} />
                                                                                <span>Add Topic to Chapter {mIdx + 1}.{cIdx + 1}</span>
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })
                                                    )}

                                                    {/* Add Chapter button at bottom of Module */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedModuleId(module.id);
                                                            setEditingChapter(null);
                                                            setChapterForm({ title: '', description: '' });
                                                            setShowChapterModal(true);
                                                        }}
                                                        className="w-full py-2.5 border border-dashed border-purple-500/40 text-purple-400 hover:bg-purple-500/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Plus size={14} />
                                                        <span>Add Chapter to Module {mIdx + 1}</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Bottom Add Module Button */}
                        <button
                            type="button"
                            onClick={() => {
                                setEditingModule(null);
                                setModuleForm({ title: '', description: '' });
                                setShowModuleModal(true);
                            }}
                            className="w-full py-3.5 border-2 border-dashed border-indigo-500/50 bg-indigo-950/20 text-indigo-300 hover:bg-indigo-900/30 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                        >
                            <Plus size={18} />
                            <span>Add New Module</span>
                        </button>
                    </div>
                </div>

                {/* ======================= MODALS ======================= */}

                {/* 1. Edit Course Details & Cover Page Modal */}
                {showCourseDetailsModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-[var(--bg-surface)] border-2 border-indigo-500/40 rounded-2xl p-6 sm:p-8 max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl space-y-6">
                            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                                <div>
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                        <Pencil size={20} className="text-indigo-400" />
                                        <span>Edit Course Details & Cover Page</span>
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Update the course banner, title, description, category, level, and overview details.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowCourseDetailsModal(false)}
                                    className="text-gray-400 hover:text-white text-lg font-bold"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Banner / Cover Image Selection */}
                                <div className="space-y-3 pb-4 border-b border-gray-800">
                                    <label className="text-gray-300 text-sm font-semibold block">
                                        Course Banner / Cover Image
                                    </label>

                                    {/* Current Banner Preview */}
                                    {courseForm.thumbnail && (
                                        <div className="relative rounded-xl overflow-hidden h-40 border border-slate-700 bg-slate-950">
                                            <img
                                                src={courseForm.thumbnail}
                                                alt="Banner Preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded text-white text-[10px] font-bold">
                                                Active Cover
                                            </div>
                                        </div>
                                    )}

                                    {/* Presets */}
                                    <div>
                                        <p className="text-xs text-gray-400 mb-2 font-medium">Choose from curated presets:</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                            {PRESET_BANNERS.map(preset => (
                                                <button
                                                    key={preset.id}
                                                    type="button"
                                                    onClick={() => setCourseForm(p => ({ ...p, thumbnail: preset.url }))}
                                                    className={`relative rounded-xl overflow-hidden h-16 border-2 transition-all ${courseForm.thumbnail === preset.url
                                                        ? 'border-indigo-500 ring-2 ring-indigo-500/50'
                                                        : 'border-slate-800 opacity-70 hover:opacity-100'
                                                        }`}
                                                >
                                                    <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-1">
                                                        <span className="text-[10px] font-bold text-white text-center">{preset.name}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Custom Upload */}
                                    <div>
                                        <p className="text-xs text-gray-400 mb-2 font-medium">Or upload your own cover image:</p>
                                        <input
                                            type="file"
                                            ref={bannerFileInputRef}
                                            accept="image/*"
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) handleBannerUpload(file);
                                            }}
                                            className="hidden"
                                        />
                                        <div
                                            onClick={() => bannerFileInputRef.current?.click()}
                                            className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-900/60 hover:bg-slate-900 rounded-xl p-3.5 text-center cursor-pointer transition-all"
                                        >
                                            {bannerUploading ? (
                                                <div className="space-y-1.5">
                                                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                                    <p className="text-xs text-indigo-300 font-bold">Uploading Banner ({bannerUploadProgress}%)...</p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2">
                                                    <UploadCloud size={20} className="text-indigo-400" />
                                                    <span className="text-xs font-bold text-white">Click to upload custom cover image</span>
                                                    <span className="text-[10px] text-gray-400">(PNG, JPG, WebP up to 10MB)</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Title & Description */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-gray-300 text-xs font-semibold mb-1.5 block">Course Title *</label>
                                        <input
                                            type="text"
                                            value={courseForm.title}
                                            onChange={e => setCourseForm({ ...courseForm, title: e.target.value })}
                                            className="input-field w-full text-base font-bold"
                                            placeholder="e.g., Complete Python Bootcamp from Zero to Hero"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-gray-300 text-xs font-semibold mb-1.5 block">Course Description *</label>
                                        <textarea
                                            value={courseForm.description}
                                            onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
                                            rows={3}
                                            className="input-field w-full text-sm resize-none"
                                            placeholder="Detailed description of the course curriculum and takeaways..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-gray-300 text-xs font-semibold mb-1.5 block">Category</label>
                                            <select
                                                value={courseForm.category}
                                                onChange={e => setCourseForm({ ...courseForm, category: e.target.value })}
                                                className="input-field w-full text-xs font-semibold"
                                            >
                                                <option value="General">General</option>
                                                <option value="Programming">Programming</option>
                                                <option value="Web Development">Web Development</option>
                                                <option value="Data Science">Data Science</option>
                                                <option value="Artificial Intelligence - Machine Learning, Deep Learning">Artificial Intelligence - Machine Learning, Deep Learning</option>
                                                <option value="Agentic AI">Agentic AI</option>
                                                <option value="Cybersecurity">Cybersecurity</option>
                                                <option value="Management">Management</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-gray-300 text-xs font-semibold mb-1.5 block">Level</label>
                                            <select
                                                value={courseForm.level}
                                                onChange={e => setCourseForm({ ...courseForm, level: e.target.value })}
                                                className="input-field w-full text-xs font-semibold"
                                            >
                                                <option value="Beginner">Beginner</option>
                                                <option value="Intermediate">Intermediate</option>
                                                <option value="Advanced">Advanced</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-gray-300 text-xs font-semibold mb-1.5 block">Price (₹)</label>
                                            <input
                                                type="number"
                                                value={courseForm.price}
                                                onChange={e => setCourseForm({ ...courseForm, price: Number(e.target.value) || 0 })}
                                                className="input-field w-full text-xs"
                                                placeholder="0 for Free"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Objectives, Prerequisites, Target Audience */}
                                <div className="space-y-4 pt-4 border-t border-gray-800">
                                    <h3 className="text-white font-bold text-sm">Course Overview & Pedagogical Information</h3>

                                    <div>
                                        <label className="block text-gray-300 text-xs font-semibold mb-1.5">
                                            Learning Objectives
                                        </label>
                                        <textarea
                                            value={courseForm.objectives}
                                            onChange={e => setCourseForm({ ...courseForm, objectives: e.target.value })}
                                            rows={2}
                                            className="input-field w-full text-xs resize-none"
                                            placeholder="What will students master upon completing this course?"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-300 text-xs font-semibold mb-1.5">
                                            Prerequisites
                                        </label>
                                        <textarea
                                            value={courseForm.prerequisites}
                                            onChange={e => setCourseForm({ ...courseForm, prerequisites: e.target.value })}
                                            rows={2}
                                            className="input-field w-full text-xs resize-none"
                                            placeholder="Prior knowledge or prerequisites recommended..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-300 text-xs font-semibold mb-1.5">
                                                Target Audience
                                            </label>
                                            <input
                                                type="text"
                                                value={courseForm.targetAudience}
                                                onChange={e => setCourseForm({ ...courseForm, targetAudience: e.target.value })}
                                                className="input-field w-full text-xs"
                                                placeholder="e.g. Beginners, CSE Students, Job Seekers"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-gray-300 text-xs font-semibold mb-1.5">
                                                Estimated Duration (hours)
                                            </label>
                                            <input
                                                type="number"
                                                value={courseForm.duration}
                                                onChange={e => setCourseForm({ ...courseForm, duration: parseInt(e.target.value) || 0 })}
                                                className="input-field w-full text-xs"
                                                placeholder="e.g., 20"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-800">
                                <button
                                    onClick={handleUpdateCourseDetails}
                                    className="btn-success flex-1 py-3 text-sm font-bold shadow-lg"
                                >
                                    💾 Save All Changes
                                </button>
                                <button
                                    onClick={() => setShowCourseDetailsModal(false)}
                                    className="btn-danger px-6 py-3 text-sm font-bold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Module Modal */}
                {showModuleModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-[var(--bg-surface)] border-2 border-indigo-500/40 rounded-2xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-4">
                            <h2 className="text-2xl font-bold text-white">
                                {editingModule ? 'Edit Module' : 'Add New Module'}
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-gray-300 text-xs font-semibold mb-1.5">
                                        Module Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={moduleForm.title}
                                        onChange={e => setModuleForm({ ...moduleForm, title: e.target.value })}
                                        className="input-field w-full"
                                        placeholder="e.g., Module 1: Python Fundamentals"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-300 text-xs font-semibold mb-1.5">
                                        Module Description
                                    </label>
                                    <textarea
                                        value={moduleForm.description}
                                        onChange={e => setModuleForm({ ...moduleForm, description: e.target.value })}
                                        rows={3}
                                        className="input-field w-full resize-none"
                                        placeholder="Brief overview of what this module covers..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-800">
                                <button
                                    onClick={editingModule ? handleUpdateModule : handleCreateModule}
                                    className="btn-success flex-1 py-2.5 text-xs font-bold"
                                >
                                    {editingModule ? '💾 Update Module' : '➕ Create Module'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowModuleModal(false);
                                        setEditingModule(null);
                                        setModuleForm({ title: '', description: '' });
                                    }}
                                    className="btn-danger px-5 py-2.5 text-xs font-bold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Chapter Modal */}
                {showChapterModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-[var(--bg-surface)] border-2 border-purple-500/40 rounded-2xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-4">
                            <h2 className="text-2xl font-bold text-white">
                                {editingChapter ? 'Edit Chapter' : 'Add New Chapter'}
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-gray-300 text-xs font-semibold mb-1.5">
                                        Chapter Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={chapterForm.title}
                                        onChange={e => setChapterForm({ ...chapterForm, title: e.target.value })}
                                        className="input-field w-full"
                                        placeholder="e.g., Chapter 1: Variables & Data Types"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-300 text-xs font-semibold mb-1.5">
                                        Chapter Description
                                    </label>
                                    <textarea
                                        value={chapterForm.description}
                                        onChange={e => setChapterForm({ ...chapterForm, description: e.target.value })}
                                        rows={3}
                                        className="input-field w-full resize-none"
                                        placeholder="Brief description of this chapter..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-800">
                                <button
                                    onClick={editingChapter ? handleUpdateChapter : handleCreateChapter}
                                    className="btn-success flex-1 py-2.5 text-xs font-bold"
                                >
                                    {editingChapter ? '💾 Update Chapter' : '➕ Create Chapter'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowChapterModal(false);
                                        setEditingChapter(null);
                                        setChapterForm({ title: '', description: '' });
                                    }}
                                    className="btn-danger px-5 py-2.5 text-xs font-bold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Topic (Lesson) Modal with optional PDF upload */}
                {showLessonModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-[var(--bg-surface)] border-2 border-emerald-500/40 rounded-2xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <FileText size={20} className="text-emerald-400" />
                                <span>{editingLesson ? 'Edit Topic' : 'Add New Topic'}</span>
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-gray-300 text-xs font-semibold mb-1.5">
                                        Topic Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={lessonForm.title}
                                        onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })}
                                        className="input-field w-full"
                                        placeholder="e.g., Topic 1: Strings and String Slicing"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-300 text-xs font-semibold mb-1.5">
                                        Topic Description (Optional)
                                    </label>
                                    <textarea
                                        value={lessonForm.description}
                                        onChange={e => setLessonForm({ ...lessonForm, description: e.target.value })}
                                        rows={2}
                                        className="input-field w-full resize-none text-xs"
                                        placeholder="Brief notes or overview of this topic..."
                                    />
                                </div>

                                {/* PDF File Picker for Topic */}
                                <div className="space-y-2">
                                    <label className="block text-gray-300 text-xs font-semibold">
                                        Attach PDF File for this Topic (Optional)
                                    </label>
                                    <div className="p-4 border-2 border-dashed border-indigo-500/30 bg-indigo-950/20 rounded-xl space-y-2">
                                        {topicPdfFile ? (
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2 text-indigo-300">
                                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                                    <span className="font-bold truncate max-w-xs">{topicPdfFile.name}</span>
                                                    <span className="text-gray-400">({(topicPdfFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setTopicPdfFile(null)}
                                                    className="text-xs text-red-400 hover:text-red-300 font-bold"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ) : editingLesson?.contentUrl ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-xs text-gray-300">
                                                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                                                        <CheckCircle2 size={14} /> Currently Attached PDF
                                                    </span>
                                                    <a
                                                        href={editingLesson.contentUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-purple-400 hover:underline font-bold"
                                                    >
                                                        View PDF ↗
                                                    </a>
                                                </div>
                                                <label className="cursor-pointer block text-center py-2 bg-slate-900 hover:bg-slate-800 text-indigo-300 rounded-lg text-xs font-bold border border-slate-700 transition-all">
                                                    <span>Choose New PDF to Replace</span>
                                                    <input
                                                        type="file"
                                                        accept=".pdf"
                                                        className="hidden"
                                                        onChange={e => {
                                                            const file = e.target.files?.[0];
                                                            if (file) setTopicPdfFile(file);
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer flex flex-col items-center justify-center p-3 text-center">
                                                <UploadCloud size={24} className="text-indigo-400 mb-1" />
                                                <span className="text-xs font-bold text-white">Click to select PDF document</span>
                                                <span className="text-[10px] text-gray-400">PDF up to 50MB (Can also upload directly on topic card)</span>
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    className="hidden"
                                                    onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        if (file) setTopicPdfFile(file);
                                                    }}
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-800">
                                <button
                                    onClick={editingLesson ? handleUpdateTopic : handleCreateTopic}
                                    disabled={topicUploading}
                                    className="btn-success flex-1 py-2.5 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {topicUploading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Uploading PDF...</span>
                                        </>
                                    ) : (
                                        <span>{editingLesson ? '💾 Update Topic' : '➕ Create Topic'}</span>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowLessonModal(false);
                                        setEditingLesson(null);
                                        setLessonForm({ title: '', description: '', type: 'pdf', published: true });
                                        setTopicPdfFile(null);
                                    }}
                                    disabled={topicUploading}
                                    className="btn-danger px-5 py-2.5 text-xs font-bold disabled:opacity-50"
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
