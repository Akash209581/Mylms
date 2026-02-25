'use client'

import { Loader2 } from 'lucide-react'

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary-600 mx-auto mb-4" />
        <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">Loading...</p>
      </div>
    </div>
  )
}
