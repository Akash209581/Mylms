import { BookOpen, Code2, GraduationCap, LineChart } from 'lucide-react'

const highlights = [
  { icon: Code2, title: 'Practice IDE', text: 'Write and run code in five languages, right in the browser.' },
  { icon: LineChart, title: 'Instant grading', text: 'Assessments are scored the moment you submit.' },
  { icon: GraduationCap, title: 'Recognised progress', text: 'Earn certificates as you complete each course.' },
]

export default function AuthLayout({
  title,
  subtitle,
  children,
  wide = false,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className="auth-page">
      <aside className="auth-panel">
        <div className="auth-brand">
          <span className="auth-brand-mark"><BookOpen /></span>
          <span>
            Applied STEM Labs
            <small>Learning Management System</small>
          </span>
        </div>

        <div className="auth-panel-body">
          <p className="auth-eyebrow">Est. for ambitious learners</p>
          <h1>
            Learn today,
            <br />
            <em>lead tomorrow.</em>
          </h1>
          <p className="auth-lede">
            A focused place to study, practise and prove what you know, built for colleges and the students they shape.
          </p>
          <ul className="auth-highlights">
            {highlights.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <Icon />
                <div>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <blockquote className="auth-quote">
          “The beautiful thing about learning is that no one can take it away from you.”
          <cite>B.B. King</cite>
        </blockquote>
      </aside>

      <main className="auth-main">
        <div className={`auth-card${wide ? ' auth-card-wide' : ''}`}>
          <div className="auth-mobile-brand">
            <span className="auth-brand-mark"><BookOpen /></span>
            <span>Applied STEM Labs</span>
          </div>
          <header className="auth-card-header">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </header>
          {children}
        </div>
      </main>
    </div>
  )
}
