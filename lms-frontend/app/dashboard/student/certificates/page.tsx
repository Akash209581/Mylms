'use client'

import { useEffect, useState } from 'react'
import { Award, Download, GraduationCap } from 'lucide-react'
import StudentReferenceShell from '@/components/layout/StudentReferenceShell'
import { getAuthHeaders } from '@/lib/authHeaders'

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([])
  useEffect(() => { const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'; fetch(`${api}/student/stats`, { headers: getAuthHeaders() }).then(r => r.ok ? r.json() : null).then(data => setCertificates(data?.certificatesList || [])).catch(() => {}) }, [])
  return <div className="student-certificates-page min-h-screen bg-[#f8faff]"><StudentReferenceShell active="certificates" /><main className="page-content pt-24 pb-12"><section className="rounded-xl bg-white p-8 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs text-slate-500">Home / <span className="font-semibold text-indigo-600">Certificates</span></p><h1 className="mt-4 font-serif text-4xl font-bold text-[#0b193a]">Your Certificates</h1><p className="mt-2 text-slate-500">Celebrate and download the achievements you have earned.</p></div><Award className="h-12 w-12 text-indigo-500" /></div>{certificates.length ? <div className="mt-8 grid gap-4 md:grid-cols-2">{certificates.map((certificate: any) => <div key={certificate.id} className="rounded-lg border border-slate-200 p-5"><h2 className="font-serif text-xl font-bold text-[#102142]">{certificate.title || certificate.name}</h2><p className="mt-2 text-sm text-slate-500">Completed course certificate</p><button className="mt-4 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-bold text-white"><Download className="h-4 w-4" />Download</button></div>)}</div> : <div className="py-20 text-center"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-indigo-50"><GraduationCap className="h-10 w-10 text-indigo-500" /></span><h2 className="mt-5 font-serif text-2xl font-bold text-[#102142]">No certificates yet</h2><p className="mt-2 text-slate-500">Complete a course to earn your first certificate.</p></div>}</section></main></div>
}
