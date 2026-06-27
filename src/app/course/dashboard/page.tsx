import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CheckCircle, Circle, BookOpen, Users, Settings, LogOut, ArrowRight } from 'lucide-react'

interface Student {
  id: number
  name: string
  email: string
  enrolledAt: string
}

export default function CourseDashboard() {
  const [student, setStudent] = useState<Student | null>(null)
  const [weekProgress, setWeekProgress] = useState<{ [key: number]: boolean }>({})

  useEffect(() => {
    // Get student from localStorage
    const students = JSON.parse(localStorage.getItem('courseStudents') || '[]')
    if (students.length > 0) {
      setStudent(students[students.length - 1])
    }

    // Get week progress
    const progress = JSON.parse(localStorage.getItem('weekProgress') || '{}')
    setWeekProgress(progress)
  }, [])

  const weeks = [
    { id: 1, title: 'AI Chatbots & LLM Basics', hours: 8, completed: false },
    { id: 2, title: 'Autonomous Agents', hours: 10, completed: false },
    { id: 3, title: 'ML Models & Classification', hours: 12, completed: false },
    { id: 4, title: 'RAG & Knowledge Systems', hours: 10, completed: false },
    { id: 5, title: 'Production & Deployment', hours: 8, completed: false },
    { id: 6, title: 'Capstone & Portfolio', hours: 16, completed: false }
  ]

  const completedWeeks = weeks.filter(w => weekProgress[w.id]).length
  const totalHours = weeks.reduce((sum, w) => sum + w.hours, 0)
  const completedHours = weeks.filter(w => weekProgress[w.id]).reduce((sum, w) => sum + w.hours, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-slate-400">{student?.name || 'Student'}</p>
          </div>
          <div className="flex gap-4 items-center">
            <Link href="/course" className="text-slate-400 hover:text-blue-400 transition">
              <BookOpen size={24} />
            </Link>
            <Link href="/" className="text-slate-400 hover:text-blue-400 transition">
              <LogOut size={24} />
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Progress Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-lg">
            <div className="text-sm text-slate-400 mb-2">Weeks Completed</div>
            <div className="text-3xl font-bold text-blue-400">{completedWeeks}/6</div>
            <div className="mt-4 h-2 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                style={{ width: `${(completedWeeks / 6) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-lg">
            <div className="text-sm text-slate-400 mb-2">Learning Hours</div>
            <div className="text-3xl font-bold text-cyan-400">{completedHours}/{totalHours}</div>
            <p className="text-xs text-slate-400 mt-2">hours completed</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-lg">
            <div className="text-sm text-slate-400 mb-2">Projects Built</div>
            <div className="text-3xl font-bold text-green-400">{completedWeeks}</div>
            <p className="text-xs text-slate-400 mt-2">on GitHub</p>
          </div>
        </div>

        {/* Curriculum Weeks */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">6-Week Curriculum</h2>
          
          <div className="space-y-4">
            {weeks.map((week) => {
              const isCompleted = weekProgress[week.id] || false
              
              return (
                <Link
                  key={week.id}
                  href={`/course/week/${week.id}`}
                  className="block group"
                >
                  <div className="bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 p-6 rounded-lg transition">
                    <div className="flex items-start gap-4">
                      {isCompleted ? (
                        <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={24} />
                      ) : (
                        <Circle className="text-slate-500 flex-shrink-0 mt-1" size={24} />
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-1 group-hover:text-blue-400 transition">
                          Week {week.id}: {week.title}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {week.hours} hours • {week.id === 1 ? '4 lessons + 1 project' : '3-4 lessons + 1 project'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 group-hover:text-blue-400 transition">
                        {isCompleted && <CheckCircle size={20} className="text-green-400" />}
                        <ArrowRight size={20} />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Resources Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-blue-500/10 border border-blue-500/30 p-6 rounded-lg">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <BookOpen size={20} /> Resources
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><a href="#" className="hover:text-blue-400 transition">📖 Documentation</a></li>
              <li><a href="#" className="hover:text-blue-400 transition">🐍 Python Setup Guide</a></li>
              <li><a href="#" className="hover:text-blue-400 transition">🔑 API Keys Setup</a></li>
              <li><a href="#" className="hover:text-blue-400 transition">🚀 Deployment Checklist</a></li>
            </ul>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/30 p-6 rounded-lg">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Users size={20} /> Community
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><a href="#" className="hover:text-cyan-400 transition">💬 Slack Community</a></li>
              <li><a href="#" className="hover:text-cyan-400 transition">📝 Share Your Project</a></li>
              <li><a href="#" className="hover:text-cyan-400 transition">🤝 Find Study Groups</a></li>
              <li><a href="#" className="hover:text-cyan-400 transition">❓ Ask Questions</a></li>
            </ul>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-lg">
          <h3 className="text-xl font-bold mb-4">Next Steps</h3>
          <p className="text-slate-300 mb-6">
            {completedWeeks === 0 
              ? 'Start with Week 1 to learn the fundamentals of LLMs and build your first AI chatbot.'
              : `You're making great progress! Keep going with Week ${completedWeeks + 1}.`
            }
          </p>
          <Link
            href={`/course/week/${completedWeeks + 1 || 1}`}
            className="inline-block bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition"
          >
            {completedWeeks === 0 ? 'Start Week 1' : `Continue to Week ${completedWeeks + 1}`}
            <ArrowRight size={16} className="inline ml-2" />
          </Link>
        </div>
      </div>
    </div>
  )
}
