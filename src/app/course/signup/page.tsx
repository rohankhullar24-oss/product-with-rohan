'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronLeft, CheckCircle, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CourseSignup() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !name) {
      toast.error('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      // Simulate API call (in production, send to your backend)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Store in localStorage for this demo
      const students = JSON.parse(localStorage.getItem('courseStudents') || '[]')
      students.push({ id: Date.now(), name, email, enrolledAt: new Date().toISOString() })
      localStorage.setItem('courseStudents', JSON.stringify(students))
      
      setSubmitted(true)
      toast.success('Enrolled! Welcome to the course 🎉')
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = '/course/dashboard'
      }, 2000)
    } catch (error) {
      toast.error('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/course" className="flex items-center gap-2 text-blue-400 hover:text-blue-300">
            <ChevronLeft size={20} /> Back to Course
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-20">
        {!submitted ? (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Join 1000+ Builders</h1>
              <p className="text-xl text-slate-300">
                Learn to build AI apps in 6 weeks. No prerequisites. Free forever.
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Your Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Email Address</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                    disabled={loading}
                  />
                  <p className="text-xs text-slate-400 mt-2">We'll send course updates here (unsubscribe anytime)</p>
                </div>

                <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-lg space-y-3">
                  <h3 className="font-semibold mb-3">You'll get access to:</h3>
                  <div className="space-y-2">
                    {[
                      '6 weeks of interactive lessons',
                      '5+ hands-on AI projects',
                      'Python starter code & templates',
                      'Community Slack channel',
                      'Lifetime course access'
                    ].map((item) => (
                      <div key={item} className="flex gap-2 text-sm">
                        <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  {loading ? 'Enrolling...' : 'Enroll Now'}
                  {!loading && <Mail size={20} />}
                </button>

                <p className="text-xs text-slate-400 text-center">
                  By enrolling, you agree to receive course updates. We respect your inbox.
                </p>
              </form>

              <div className="mt-8 pt-8 border-t border-slate-700 space-y-4">
                <h4 className="font-semibold text-sm">Questions?</h4>
                <div className="text-sm text-slate-400 space-y-2">
                  <p><strong>No card required?</strong> Correct, this course is free forever.</p>
                  <p><strong>When does it start?</strong> Immediately after enrollment. Learn at your pace.</p>
                  <p><strong>What if I don't finish?</strong> No pressure. Access is lifetime.</p>
                </div>
              </div>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              {[
                { number: '1000+', label: 'Students' },
                { number: '5', label: 'Projects' },
                { number: '100%', label: 'Free' }
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-blue-400">{stat.number}</div>
                  <div className="text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} className="text-green-400" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Welcome to Applied AI! 🎉</h2>
            <p className="text-xl text-slate-300 mb-8">
              Check your email for the welcome message.
            </p>
            <p className="text-slate-400 mb-8">
              Redirecting to your dashboard...
            </p>
            <Link href="/course/dashboard" className="inline-block bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition">
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
