'use client'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'

import { useEffect, useState } from 'react'
import { Award, Download, GraduationCap } from 'lucide-react'
import StudentReferenceShell from '@/components/layout/StudentReferenceShell'
import { getAuthHeaders } from '@/lib/authHeaders'

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    apiFetch(`${API_URL}/student/stats`, { headers: getAuthHeaders() })
      .then(async response => { if (!response.ok) throw new Error('Could not load certificates. Please refresh and try again.'); return response.json() })
      .then(data => setCertificates(data.certificatesList || []))
      .catch(err => setError(err.message)).finally(() => setLoading(false))
  }, [])
  const download = (certificate: any) => {
    const escape = (value: string) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850" viewBox="0 0 1200 850"><rect width="1200" height="850" fill="#f8faff"/><rect x="35" y="35" width="1130" height="780" rx="8" fill="white" stroke="#4f46e5" stroke-width="3"/><g text-anchor="middle" font-family="Georgia,serif" fill="#102142"><text x="600" y="170" font-size="28" fill="#4f46e5">EDUVERSE</text><text x="600" y="260" font-size="48">Certificate of Completion</text><text x="600" y="340" font-size="22">This acknowledges that</text><text x="600" y="420" font-size="42">${escape(certificate.studentName)}</text><text x="600" y="485" font-size="22">has completed all published lessons in</text><foreignObject x="120" y="515" width="960" height="130"><div xmlns="http://www.w3.org/1999/xhtml" style="text-align:center;font-size:32px;color:#102142">${escape(certificate.title)}</div></foreignObject><text x="600" y="710" font-size="18">${certificate.completedAt ? escape(new Date(certificate.completedAt).toLocaleDateString()) : ''}</text><text x="600" y="750" font-size="16">Certificate ${escape(certificate.id)}</text></g></svg>`
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const link = document.createElement('a'); link.href = url; link.download = `${certificate.id}.svg`; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <div className="student-certificates-page min-h-screen bg-[#f8faff]"><StudentReferenceShell active="certificates" /><main id="student-main" tabIndex={-1} className="page-content pt-24 pb-12"><section className="rounded-xl bg-white p-8 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs text-slate-500">Home / <span className="font-semibold text-indigo-600">Certificates</span></p><h1 className="mt-4 font-serif text-4xl font-bold text-[#0b193a]">Your Certificates</h1><p className="mt-2 text-slate-500">Celebrate and download the achievements you have earned.</p></div><Award className="h-12 w-12 text-indigo-500" /></div>{loading ? <p role="status" className="py-12 text-slate-500">Loading your achievements...</p> : error ? <p role="alert" className="py-12 text-red-600">{error}</p> : certificates.length ? <div className="mt-8 grid gap-4 md:grid-cols-2">{certificates.map((certificate: any) => <div key={certificate.id} className="rounded-lg border border-slate-200 p-5"><h2 className="font-serif text-xl font-bold text-[#102142]">{certificate.title || certificate.name}</h2><p className="mt-2 text-sm text-slate-500">Completed course certificate</p><button onClick={() => download(certificate)} className="mt-4 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-bold text-white"><Download className="h-4 w-4" />Download</button></div>)}</div> : <div className="py-20 text-center"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-indigo-50"><GraduationCap className="h-10 w-10 text-indigo-500" /></span><h2 className="mt-5 font-serif text-2xl font-bold text-[#102142]">No certificates yet</h2><p className="mt-2 text-slate-500">Complete a course to earn your first certificate.</p></div>}</section></main></div>
}
