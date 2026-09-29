'use client'

import { useState, useRef, useEffect } from 'react'
import { apiFetch } from '@/lib/apiFetch'
import { API_URL } from '@/lib/api'
import { getAuthHeaders } from '@/lib/authHeaders'
import { toast } from '@/lib/toast'
import {
    X,
    Upload,
    FileSpreadsheet,
    Download,
    Copy,
    Check,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    Users,
    KeyRound,
    RefreshCw,
    Search
} from 'lucide-react'

interface CreatedUserResult {
    id: number
    sNo: string
    registrationNo: string
    name: string
    email: string
    generatedPassword: string
    collegeName: string
    department: string
    section: string
    academicYear: string
    currentYear: string
    batchNo: string
    mobileNumber: string
}

interface SkippedUserResult {
    sNo: string
    registrationNo: string
    name: string
    email: string
    reason: string
}

interface BulkUploadResponse {
    success: boolean
    totalProcessed: number
    createdCount: number
    skippedCount: number
    createdUsers: CreatedUserResult[]
    skippedUsers: SkippedUserResult[]
}

interface BulkStudentUploadModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

const TEMPLATE_COLUMNS = [
    'S.No',
    'Registration No',
    'Department',
    'Section',
    'Full Name',
    'Email ID',
    'Mobile Number',
    'Academic Year',
    'Current Year',
    'college name',
    'Batch No'
]

export default function BulkStudentUploadModal({ isOpen, onClose, onSuccess }: BulkStudentUploadModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [loading, setLoading] = useState(false)
    const [downloadingTemplate, setDownloadingTemplate] = useState(false)
    const [results, setResults] = useState<BulkUploadResponse | null>(null)
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
    const [copiedAll, setCopiedAll] = useState(false)
    const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({})
    const [showAllPasswords, setShowAllPasswords] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && !loading) {
                handleModalClose()
            }
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, loading])

    if (!isOpen) return null

    const handleModalClose = () => {
        if (results && results.createdCount > 0 && onSuccess) {
            onSuccess()
        }
        setFile(null)
        setResults(null)
        setShowPasswords({})
        setSearchQuery('')
        onClose()
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0])
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0])
        }
    }

    const validateAndSetFile = (selectedFile: File) => {
        const validExtensions = ['.xlsx', '.xls', '.csv']
        const fileName = selectedFile.name.toLowerCase()
        const isValid = validExtensions.some(ext => fileName.endsWith(ext))

        if (!isValid) {
            toast.error('Please select a valid Excel (.xlsx, .xls) or CSV file.')
            return
        }
        setFile(selectedFile)
    }

    const handleDownloadTemplate = async () => {
        setDownloadingTemplate(true)
        try {
            const res = await apiFetch(`${API_URL}/superadmin/users/bulk-template`, {
                headers: getAuthHeaders(),
            })

            if (!res.ok) {
                throw new Error('Failed to download template')
            }

            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'Student_Bulk_Import_Template.xlsx'
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
            toast.success('Excel template downloaded successfully!')
        } catch (err: any) {
            toast.error(err.message || 'Failed to download template')
        } finally {
            setDownloadingTemplate(false)
        }
    }

    const handleUpload = async () => {
        if (!file) {
            toast.error('Please select an Excel file to upload.')
            return
        }

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            const authHeaders = getAuthHeaders()
            // Remove Content-Type header if present so browser sets boundary automatically for FormData
            const headersObj: Record<string, string> = { ...authHeaders }
            delete headersObj['Content-Type']

            const res = await apiFetch(`${API_URL}/superadmin/users/bulk-upload`, {
                method: 'POST',
                headers: headersObj,
                body: formData,
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.message || 'Failed to process bulk student upload')
            }

            setResults(data)
            toast.success(`Successfully created ${data.createdCount} student account(s)!`)
            if (onSuccess) onSuccess()
        } catch (err: any) {
            toast.error(err.message || 'Error uploading file')
        } finally {
            setLoading(false)
        }
    }

    const togglePasswordVisibility = (index: number) => {
        setShowPasswords(prev => ({
            ...prev,
            [index]: !prev[index]
        }))
    }

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text)
        setCopiedIndex(index)
        toast.success('Password copied to clipboard!')
        setTimeout(() => setCopiedIndex(null), 2000)
    }

    const copyAllCredentialsText = () => {
        if (!results || results.createdUsers.length === 0) return

        let text = `REGISTRATION NO\tFULL NAME\tEMAIL ID\tPASSWORD\tCOLLEGE\tDEPARTMENT\tSECTION\n`
        results.createdUsers.forEach(u => {
            text += `${u.registrationNo || '-'}\t${u.name}\t${u.email}\t${u.generatedPassword}\t${u.collegeName || '-'}\t${u.department || '-'}\t${u.section || '-'}\n`
        })

        navigator.clipboard.writeText(text)
        setCopiedAll(true)
        toast.success('All student credentials copied to clipboard!')
        setTimeout(() => setCopiedAll(false), 2500)
    }

    const exportCredentialsCSV = () => {
        if (!results || results.createdUsers.length === 0) return

        const headers = [
            'S.No',
            'Registration No',
            'Full Name',
            'Email ID',
            'Generated Password',
            'College Name',
            'Department',
            'Section',
            'Academic Year',
            'Current Year',
            'Batch No',
            'Mobile Number'
        ]

        const csvRows = [
            headers.join(','),
            ...results.createdUsers.map((u, idx) => [
                `"${u.sNo || idx + 1}"`,
                `"${(u.registrationNo || '').replace(/"/g, '""')}"`,
                `"${(u.name || '').replace(/"/g, '""')}"`,
                `"${(u.email || '').replace(/"/g, '""')}"`,
                `"${(u.generatedPassword || '').replace(/"/g, '""')}"`,
                `"${(u.collegeName || '').replace(/"/g, '""')}"`,
                `"${(u.department || '').replace(/"/g, '""')}"`,
                `"${(u.section || '').replace(/"/g, '""')}"`,
                `"${(u.academicYear || '').replace(/"/g, '""')}"`,
                `"${(u.currentYear || '').replace(/"/g, '""')}"`,
                `"${(u.batchNo || '').replace(/"/g, '""')}"`,
                `"${(u.mobileNumber || '').replace(/"/g, '""')}"`
            ].join(','))
        ]

        const csvString = csvRows.join('\n')
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `Student_Credentials_Export_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Credentials CSV exported successfully!')
    }

    const filteredCreatedUsers = results?.createdUsers.filter(u => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.registrationNo.toLowerCase().includes(q) ||
            u.collegeName.toLowerCase().includes(q) ||
            u.department.toLowerCase().includes(q)
        )
    }) || []

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <div
                className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                                Bulk Create Student Accounts
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Upload a roster file to generate student accounts with unique passwords
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleModalClose}
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-5">
                    {!results ? (
                        <>
                            {/* Template Download & Format Info */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                            <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                                            Expected columns
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            Headers should match: {TEMPLATE_COLUMNS.join(', ')}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleDownloadTemplate}
                                        disabled={downloadingTemplate}
                                        className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 shrink-0"
                                    >
                                        {downloadingTemplate ? (
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Download className="w-3.5 h-3.5" />
                                        )}
                                        Download template
                                    </button>
                                </div>
                            </div>

                            {/* Drop Zone */}
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center ${isDragging
                                        ? 'border-slate-400 bg-slate-50 dark:bg-slate-800/50'
                                        : file
                                            ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/5'
                                            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                                    }`}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".xlsx,.xls,.csv"
                                    className="hidden"
                                />

                                {file ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                            <FileSpreadsheet className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{file.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {(file.size / 1024).toFixed(1)} KB — ready for processing
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setFile(null)
                                            }}
                                            className="text-xs text-red-500 hover:underline"
                                        >
                                            Remove file
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                            <Upload className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                                Click to upload or drag and drop
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                Supports .xlsx, .xls, or .csv files up to 10MB
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Info Callout */}
                            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
                                <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    A unique 8-character password is generated for each student, stored securely, and shown once in the results below — save or export it before closing this window.
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Results View */
                        <div className="space-y-5">
                            {/* Summary Stat Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Total rows processed</p>
                                        <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{results.totalProcessed}</p>
                                    </div>
                                    <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                                </div>

                                <div className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-emerald-700 dark:text-emerald-300">Accounts created</p>
                                        <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-400">{results.createdCount}</p>
                                    </div>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                </div>

                                <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-amber-700 dark:text-amber-300">Skipped / exists</p>
                                        <p className="text-xl font-semibold text-amber-700 dark:text-amber-400">{results.skippedCount}</p>
                                    </div>
                                    <AlertCircle className="w-4 h-4 text-amber-500" />
                                </div>
                            </div>

                            {/* Action Bar & Search */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search created accounts..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={copyAllCredentialsText}
                                        className="px-3 py-2 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                                    >
                                        {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedAll ? 'Copied' : 'Copy table'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={exportCredentialsCSV}
                                        className="px-3.5 py-2 text-xs font-medium rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Export CSV
                                    </button>
                                </div>
                            </div>

                            {/* Credentials Table */}
                            {results.createdUsers.length > 0 && (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                        <h4 className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                            Generated credentials ({filteredCreatedUsers.length})
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => setShowAllPasswords(!showAllPasswords)}
                                            className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
                                        >
                                            {showAllPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            {showAllPasswords ? 'Hide passwords' : 'Show passwords'}
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                                                <tr>
                                                    <th className="py-2.5 px-3 font-medium">#</th>
                                                    <th className="py-2.5 px-3 font-medium">Reg No</th>
                                                    <th className="py-2.5 px-3 font-medium">Full Name</th>
                                                    <th className="py-2.5 px-3 font-medium">Email ID</th>
                                                    <th className="py-2.5 px-3 font-medium">Password</th>
                                                    <th className="py-2.5 px-3 font-medium">College</th>
                                                    <th className="py-2.5 px-3 font-medium">Dept / Sec</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                                {filteredCreatedUsers.map((u, i) => {
                                                    const isVisible = showAllPasswords || showPasswords[i]
                                                    return (
                                                        <tr key={u.id ?? `${u.email}-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                            <td className="py-2.5 px-3 text-slate-400 font-mono">{i + 1}</td>
                                                            <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                                                                {u.registrationNo || '-'}
                                                            </td>
                                                            <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{u.name}</td>
                                                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                                                            <td className="py-2.5 px-3 font-mono">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 tracking-wider">
                                                                        {isVisible ? u.generatedPassword : '••••••••'}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => togglePasswordVisibility(i)}
                                                                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                                                                        title={isVisible ? 'Hide' : 'Show'}
                                                                    >
                                                                        {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => copyToClipboard(u.generatedPassword, i)}
                                                                        className="p-1 text-slate-400 hover:text-emerald-500 transition-colors"
                                                                        title="Copy password"
                                                                    >
                                                                        {copiedIndex === i ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                                                                {u.collegeName || '-'}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                                                                {u.department ? `${u.department}${u.section ? ` (${u.section})` : ''}` : '-'}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Skipped Rows Section */}
                            {results.skippedUsers.length > 0 && (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-medium text-xs flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-500" />
                                        Skipped rows ({results.skippedUsers.length})
                                    </div>
                                    <div className="p-3 max-h-[160px] overflow-y-auto space-y-2">
                                        {results.skippedUsers.map((su, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-xs p-2 rounded border border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <span className="font-medium text-slate-700 dark:text-slate-200">{su.name}</span>{' '}
                                                    <span className="text-slate-400">({su.email})</span>
                                                </div>
                                                <span className="px-2 py-0.5 rounded text-[11px] bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                                                    {su.reason}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={handleModalClose}
                        disabled={loading}
                        className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50"
                    >
                        {results ? 'Close' : 'Cancel'}
                    </button>

                    {!results ? (
                        <button
                            type="button"
                            onClick={handleUpload}
                            disabled={!file || loading}
                            className="px-5 py-2 text-xs font-medium rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    Creating accounts...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-3.5 h-3.5" />
                                    Upload and create accounts
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setResults(null)}
                            className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Upload another sheet
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
