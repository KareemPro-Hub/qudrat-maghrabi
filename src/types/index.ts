export type UserRole = 'student' | 'parent' | 'teacher' | 'content_manager' | 'student_manager' | 'admin' | 'quiz_manager'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  avatar_url?: string
  phone?: string
  created_at: string
}

export interface Course {
  id: string
  title: string
  description: string
  thumbnail_url?: string
  price: number
  currency: string
  is_published: boolean
  created_at: string
  lessons_count?: number
  enrolled_count?: number
  parent_course_id?: string | null
}

export interface Chapter {
  id: string
  course_id: string
  title: string
  cover_url?: string | null
  order_index: number
  created_at: string
}

export interface Lesson {
  id: string
  course_id: string
  chapter_id?: string | null
  title: string
  description?: string
  video_id: string // Bunny Stream video ID
  order_index: number
  duration_minutes?: number
  is_free_preview: boolean
  created_at: string
}

export interface Enrollment {
  id: string
  student_id: string
  course_id: string
  payment_status: 'pending' | 'paid' | 'failed'
  enrolled_at: string
  expires_at?: string
}

export interface LessonProgress {
  id: string
  student_id: string
  lesson_id: string
  completed: boolean
  watch_percentage: number
  last_watched_at: string
}

export interface Quiz {
  id: string
  course_id: string
  title: string
  total_marks: number
  pass_marks: number
}

export interface QuizResult {
  id: string
  student_id: string
  quiz_id: string
  score: number
  total_marks: number
  passed: boolean
  taken_at: string
}
