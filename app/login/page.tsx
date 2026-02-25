'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, GraduationCap, ArrowRight } from 'lucide-react'
import Input from '@/components/Input'
import Button from '@/components/Button'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setApiError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setApiError(data.message || 'Login failed')
        setLoading(false)
        return
      }

      // Redirect based on role
      if (data.user.role === 'STUDENT') {
        router.push('/student/dashboard')
      } else if (data.user.role === 'INSTRUCTOR') {
        router.push('/instructor/dashboard')
      } else if (data.user.role === 'ADMIN' || data.user.role === 'SUPERADMIN') {
        router.push('/admin/dashboard')
      }
    } catch (error) {
      setApiError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Logo and Header */}
        <div className="text-center animate-fade-in">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-primary-600 to-primary-400 rounded-2xl p-4 shadow-2xl">
              <GraduationCap className="h-12 w-12 text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
            Welcome Back
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to continue your learning journey
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-6 animate-slide-up backdrop-blur-lg bg-opacity-90">
          <form onSubmit={handleSubmit} className="space-y-6">
            {apiError && (
              <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded-lg animate-slide-down">
                <p className="font-medium">{apiError}</p>
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="student@example.com"
              icon={<Mail className="h-5 w-5" />}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="h-5 w-5" />}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
              required
            />

            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={loading}
            >
              {!loading && (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                Don&apos;t have an account?
              </span>
            </div>
          </div>

          <Link href="/signup">
            <Button variant="secondary" fullWidth>
              Create Student Account
            </Button>
          </Link>
        </div>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Protected by enterprise-grade security
        </p>
      </div>
    </div>
  )
}
