'use client'

import { Course } from '@/lib/types'
import { Clock, BarChart, DollarSign } from 'lucide-react'
import Image from 'next/image'

interface CourseCardProps {
  course: Course & { instructor?: { name: string } }
  onEnroll?: (courseId: string) => void
  enrolled?: boolean
}

export default function CourseCard({ course, onEnroll, enrolled }: CourseCardProps) {
  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'BEGINNER':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'INTERMEDIATE':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'ADVANCED':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
      <div className="relative h-48 bg-gradient-to-br from-primary-400 to-primary-600 overflow-hidden">
        {course.thumbnail_url ? (
          <Image
            src={course.thumbnail_url}
            alt={course.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-6xl text-white/30">📚</span>
          </div>
        )}
        {course.level && (
          <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold ${getLevelColor(course.level)}`}>
            {course.level}
          </span>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
          {course.title}
        </h3>
        
        {course.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
            {course.description}
          </p>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            {course.duration_hours && (
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{course.duration_hours}h</span>
              </div>
            )}
            {course.category && (
              <div className="flex items-center space-x-1">
                <BarChart className="h-4 w-4" />
                <span>{course.category}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-primary-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {course.price === 0 ? 'Free' : `$${course.price}`}
            </span>
          </div>

          {!enrolled && onEnroll && (
            <button
              onClick={() => onEnroll(course.id)}
              className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg hover:from-primary-700 hover:to-primary-600 transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
            >
              Enroll Now
            </button>
          )}

          {enrolled && (
            <button className="px-6 py-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg font-semibold">
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
