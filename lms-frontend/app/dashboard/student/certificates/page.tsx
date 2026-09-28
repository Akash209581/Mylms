'use client'

import { apiFetch } from '@/lib/apiFetch'
import { API_URL } from '@/lib/api'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Award, CalendarCheck, Download, GraduationCap } from 'lucide-react'
import StudentReferenceShell from '@/components/layout/StudentReferenceShell'
import { getAuthHeaders } from '@/lib/authHeaders'
import { EmptyState, Loading, PageHeader } from '@/components/ui'

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
    const escape = (value: string) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
    const date = certificate.completedAt ? new Date(certificate.completedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : ''
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850" viewBox="0 0 1200 850">
<rect width="1200" height="850" fill="#f7f5f0"/>
<rect x="30" y="30" width="1140" height="790" fill="none" stroke="#1f3a5f" stroke-width="6"/>
<rect x="48" y="48" width="1104" height="754" fill="none" stroke="#9a7a43" stroke-width="1.5"/>
<g text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" fill="#161a23">
<text x="600" y="150" font-size="20" letter-spacing="8" fill="#9a7a43">APPLIED STEM LABS</text>
<text x="600" y="245" font-size="56" fill="#1f3a5f">Certificate of Completion</text>
<line x1="520" y1="280" x2="680" y2="280" stroke="#9a7a43" stroke-width="2"/>
<text x="600" y="345" font-size="22" font-style="italic" fill="#3d4250">This is to certify that</text>
<text x="600" y="425" font-size="46">${escape(certificate.studentName)}</text>
<text x="600" y="485" font-size="22" font-style="italic" fill="#3d4250">has successfully completed the course</text>
<foreignObject x="120" y="510" width="960" height="120"><div xmlns="http://www.w3.org/1999/xhtml" style="text-align:center;font-family:Georgia,serif;font-size:34px;color:#1f3a5f">${escape(certificate.title)}</div></foreignObject>
<text x="330" y="720" font-size="18">${escape(date)}</text>
<line x1="220" y1="735" x2="440" y2="735" stroke="#c9c1b2"/>
<text x="330" y="760" font-size="13" letter-spacing="3" fill="#5f6370">DATE</text>
<text x="870" y="720" font-size="16">${escape(certificate.id)}</text>
<line x1="760" y1="735" x2="980" y2="735" stroke="#c9c1b2"/>
<text x="870" y="760" font-size="13" letter-spacing="3" fill="#5f6370">CERTIFICATE ID</text>
</g></svg>`
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const link = document.createElement('a'); link.href = url; link.download = `${certificate.id}.svg`; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="portal-page">
      <StudentReferenceShell active="certificates" />
      <main id="student-main" tabIndex={-1} className="portal-main">
        <PageHeader eyebrow="Achievements" title="Certificates" description="Every course you complete earns a certificate you can download and share." />

        {loading ? <Loading label="Loading certificates" /> : error ? (
          <div className="ui-alert is-danger" role="alert">{error}</div>
        ) : certificates.length ? (
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {certificates.map((certificate: any) => (
              <article key={certificate.id} className="ui-card overflow-hidden">
                <div className="relative grid place-items-center h-40 bg-[#1f3a5f] text-center px-6" style={{ boxShadow: 'inset 0 -3px 0 #9a7a43' }}>
                  <div className="absolute inset-3 border border-[#d2b27c]/40 rounded" aria-hidden="true" />
                  <div>
                    <Award className="w-8 h-8 mx-auto text-[#d2b27c]" aria-hidden="true" />
                    <p className="mt-2 text-[11px] tracking-[0.2em] uppercase text-[#d2b27c] font-semibold">Certificate of completion</p>
                  </div>
                </div>
                <div className="ui-card-pad flex flex-col flex-1">
                  <h2 className="ui-card-title">{certificate.title || certificate.name}</h2>
                  <ul className="ui-meta mt-3">
                    {certificate.completedAt && <li><CalendarCheck /> {new Date(certificate.completedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</li>}
                    <li className="ui-num">{certificate.id}</li>
                  </ul>
                  <div className="ui-card-footer">
                    <button onClick={() => download(certificate)} className="ui-btn ui-btn-primary ui-btn-block"><Download aria-hidden="true" /> Download certificate</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={GraduationCap} title="No certificates yet" action={<Link href="/dashboard/student/my-learning" className="ui-btn ui-btn-primary">Continue learning</Link>}>
            Complete every lesson in a course to earn your first certificate.
          </EmptyState>
        )}
      </main>
    </div>
  )
}
