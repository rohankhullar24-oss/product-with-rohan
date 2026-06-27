import Link from 'next/link'
import { ArrowRight, CheckCircle, Code2, Zap, Users, GitBranch, BookOpen, Rocket } from 'lucide-react'
import { useState } from 'react'

export default function CourseLanding() {
  const [email, setEmail] = useState('')

  const curriculum = [
    {
      week: 1,
      title: 'AI Chatbots & LLM Basics',
      description: 'Build a customer support chatbot using Claude API',
      topics: ['LLM fundamentals', 'Prompt engineering', 'API integration', 'Error handling'],
      hours: 8,
      project: 'Support Chatbot'
    },
    {
      week: 2,
      title: 'Autonomous Agents',
      description: 'Create AI agents that automate workflows and make decisions',
      topics: ['Agent architecture', 'Tool integration', 'Decision trees', 'Feedback loops'],
      hours: 10,
      project: 'Research Agent'
    },
    {
      week: 3,
      title: 'ML Models & Classification',
      description: 'Build and train machine learning models for predictions',
      topics: ['Data preparation', 'Model training', 'Evaluation metrics', 'Deployment'],
      hours: 12,
      project: 'Sentiment Classifier'
    },
    {
      week: 4,
      title: 'RAG & Knowledge Systems',
      description: 'Deploy domain-specific AI assistants with your own data',
      topics: ['Vector embeddings', 'Retrieval systems', 'Knowledge bases', 'Fine-tuning'],
      hours: 10,
      project: 'Document Q&A System'
    },
    {
      week: 5,
      title: 'Production & Deployment',
      description: 'Ship AI applications to production and scale for real traffic',
      topics: ['Cloud deployment', 'Monitoring', 'Scaling', 'Cost optimization'],
      hours: 8,
      project: 'Deploy to Vercel'
    },
    {
      week: 6,
      title: 'Capstone & Portfolio',
      description: 'Build and showcase your own AI product',
      topics: ['Product ideation', 'Full-stack development', 'Presentation', 'Launch'],
      hours: 16,
      project: 'Your AI Product'
    }
  ]

  const benefits = [
    {
      icon: Code2,
      title: 'Learn by Building',
      description: 'Real projects deployed to production, not theoretical exercises'
    },
    {
      icon: Rocket,
      title: 'Ship in 6 Weeks',
      description: '5+ working AI applications with code you can deploy immediately'
    },
    {
      icon: BookOpen,
      title: 'Hands-on Coding',
      description: 'Interactive lessons with live code examples and sandbox environments'
    },
    {
      icon: Users,
      title: 'Community & Support',
      description: 'Learn alongside peers, share projects, get feedback'
    },
    {
      icon: GitBranch,
      title: 'Build in Public',
      description: 'Portfolio-ready projects on GitHub, showcase your AI skills'
    },
    {
      icon: Zap,
      title: 'Zero Prerequisites',
      description: 'No AI experience needed. If you can code, you can learn AI'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Rocket size={24} className="text-blue-400" />
            <span className="text-xl font-bold">Applied AI</span>
          </div>
          <div className="flex gap-4 items-center">
            <a href="#curriculum" className="hover:text-blue-400 transition text-sm">Curriculum</a>
            <a href="#why" className="hover:text-blue-400 transition text-sm">Why Take This</a>
            <Link href="/course/signup" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition font-semibold text-sm">
              Enroll Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Build AI Apps in{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                6 Weeks
              </span>
            </h1>
            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
              Ship 5+ working AI applications. Master LLMs, agents, ML models, RAG systems, and deployment. 
              No prerequisites. Free forever. Learn the same patterns used in production at top companies.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/course/signup" className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition">
                Start Learning Free <ArrowRight size={20} />
              </Link>
              <a href="#curriculum" className="border border-slate-600 hover:border-blue-400 px-8 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition">
                See Curriculum
              </a>
            </div>
            <div className="mt-8 pt-8 border-t border-slate-700 flex gap-6">
              <div>
                <div className="text-2xl font-bold text-blue-400">6</div>
                <div className="text-sm text-slate-400">weeks</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">5+</div>
                <div className="text-sm text-slate-400">projects</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">100%</div>
                <div className="text-sm text-slate-400">free</div>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-8 aspect-square flex items-center justify-center">
              <Code2 size={120} className="text-blue-400/40" />
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum Section */}
      <section id="curriculum" className="border-t border-slate-700 bg-slate-800/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-4xl font-bold mb-12 text-center">6-Week Curriculum</h2>
          
          <div className="grid gap-6">
            {curriculum.map((item) => (
              <div key={item.week} className="group bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 p-6 rounded-lg transition">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-semibold text-blue-400 bg-blue-500/20 px-3 py-1 rounded-full">
                        Week {item.week}
                      </span>
                      <span className="text-sm text-slate-400">{item.hours} hours</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition">{item.title}</h3>
                    <p className="text-slate-400 mb-3">{item.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {item.topics.map((topic) => (
                        <span key={topic} className="text-xs bg-slate-900/50 px-2 py-1 rounded text-slate-300">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="md:text-right">
                    <div className="text-sm text-slate-400 mb-1">Build:</div>
                    <div className="font-semibold text-blue-400">{item.project}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="why" className="border-t border-slate-700">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-4xl font-bold mb-12 text-center">Why This Course?</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, i) => {
              const Icon = benefit.icon
              return (
                <div key={i} className="bg-slate-800/50 border border-slate-700 p-6 rounded-lg hover:border-blue-500/50 transition">
                  <Icon size={32} className="text-blue-400 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{benefit.title}</h3>
                  <p className="text-slate-400 text-sm">{benefit.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-slate-700 bg-gradient-to-r from-blue-600/20 to-cyan-600/20">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Build AI?</h2>
          <p className="text-xl text-slate-300 mb-8">
            No experience necessary. Just curiosity and code.
          </p>
          <Link href="/course/signup" className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg font-semibold inline-flex items-center gap-2 transition">
            Enroll Now (Free) <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4">Course</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#curriculum" className="hover:text-blue-400">Curriculum</a></li>
                <li><a href="/course/signup" className="hover:text-blue-400">Enroll</a></li>
                <li><a href="#why" className="hover:text-blue-400">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Community</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-blue-400">Slack Community</a></li>
                <li><a href="#" className="hover:text-blue-400">GitHub</a></li>
                <li><a href="#" className="hover:text-blue-400">Discord</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-blue-400">Documentation</a></li>
                <li><a href="#" className="hover:text-blue-400">API Docs</a></li>
                <li><a href="#" className="hover:text-blue-400">Support</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 text-center text-sm text-slate-400">
            <p>© 2024 Applied AI Course. Free forever. No paywalls. No BS.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
