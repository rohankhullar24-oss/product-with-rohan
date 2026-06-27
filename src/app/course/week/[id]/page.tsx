'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronLeft, CheckCircle, BookOpen, Code2, FileText, Download, Play } from 'lucide-react'
import toast from 'react-hot-toast'

const weekContent: { [key: number]: any } = {
  1: {
    title: 'AI Chatbots & LLM Basics',
    description: 'Build your first AI chatbot using Claude API and learn the fundamentals of large language models.',
    hours: 8,
    lessons: [
      {
        num: 1,
        title: 'What are LLMs?',
        duration: '5 min',
        description: 'Understand how large language models work, their capabilities, and limitations.'
      },
      {
        num: 2,
        title: 'Prompt Engineering Fundamentals',
        duration: '8 min',
        description: 'Learn to write effective prompts and understand temperature, tokens, and parameters.'
      },
      {
        num: 3,
        title: 'API Basics & Setup',
        duration: '5 min',
        description: 'Set up the Claude API, get your keys, and make your first API call.'
      },
      {
        num: 4,
        title: 'Real-World Use Cases',
        duration: '7 min',
        description: 'See how companies use chatbots in production for customer support and automation.'
      }
    ],
    project: {
      title: 'Build a Customer Support Chatbot',
      description: 'Create an AI chatbot that answers questions about a product. Include context about the product, handle follow-ups, and provide helpful responses.',
      requirements: [
        'Takes user questions as input',
        'Maintains conversation context',
        'Returns relevant product information',
        'Handles edge cases gracefully',
        'Works in under 100 lines of code'
      ],
      starterCode: 'week1-chatbot-starter'
    }
  },
  2: {
    title: 'Autonomous Agents',
    description: 'Create AI agents that take actions, use tools, and automate workflows.',
    hours: 10,
    lessons: [
      {
        num: 1,
        title: 'Agent Architecture',
        duration: '10 min',
        description: 'Understand the agent loop: observation, reasoning, action, reflection.'
      },
      {
        num: 2,
        title: 'Tool Integration',
        duration: '8 min',
        description: 'Teach agents to use APIs, databases, and external tools.'
      },
      {
        num: 3,
        title: 'Decision Trees & Logic',
        duration: '8 min',
        description: 'Build decision logic for agents to choose between actions.'
      },
      {
        num: 4,
        title: 'Production Agents',
        duration: '8 min',
        description: 'Deploy agents that handle errors, scale, and work reliably.'
      }
    ],
    project: {
      title: 'Build a Research Agent',
      description: 'Create an agent that can search the web, summarize articles, and answer research questions.',
      requirements: [
        'Uses web search tool',
        'Summarizes multiple sources',
        'Formats results clearly',
        'Handles errors gracefully',
        'Completes tasks in < 2 minutes'
      ],
      starterCode: 'week2-research-agent'
    }
  },
  3: {
    title: 'ML Models & Classification',
    description: 'Build and train machine learning models for predictions and classification.',
    hours: 12,
    lessons: [
      {
        num: 1,
        title: 'ML Fundamentals',
        duration: '10 min',
        description: 'Supervised vs unsupervised learning, training vs test data.'
      },
      {
        num: 2,
        title: 'Data Preparation',
        duration: '12 min',
        description: 'Clean, normalize, and prepare datasets for training.'
      },
      {
        num: 3,
        title: 'Training & Evaluation',
        duration: '10 min',
        description: 'Train models, evaluate performance, optimize hyperparameters.'
      },
      {
        num: 4,
        title: 'Deployment',
        duration: '8 min',
        description: 'Deploy models to production with proper versioning and monitoring.'
      }
    ],
    project: {
      title: 'Sentiment Classification Model',
      description: 'Build a model that classifies text as positive, negative, or neutral sentiment.',
      requirements: [
        'Trained on labeled dataset',
        'Achieves >85% accuracy',
        'Handles edge cases',
        'Can classify new text',
        'Saved model for reuse'
      ],
      starterCode: 'week3-sentiment-classifier'
    }
  },
  4: {
    title: 'RAG & Knowledge Systems',
    description: 'Build domain-specific AI assistants with your own data.',
    hours: 10,
    lessons: [
      {
        num: 1,
        title: 'RAG Architecture',
        duration: '8 min',
        description: 'Retrieval-Augmented Generation: combining vectors and LLMs.'
      },
      {
        num: 2,
        title: 'Embeddings & Vectors',
        duration: '10 min',
        description: 'Create embeddings, store them, and search semantically.'
      },
      {
        num: 3,
        title: 'Knowledge Bases',
        duration: '8 min',
        description: 'Build and maintain knowledge bases with your documents.'
      },
      {
        num: 4,
        title: 'Production RAG',
        duration: '8 min',
        description: 'Scale RAG systems, handle large datasets, optimize latency.'
      }
    ],
    project: {
      title: 'Document Q&A System',
      description: 'Build an AI assistant that answers questions about your documents using RAG.',
      requirements: [
        'Indexes multiple documents',
        'Retrieves relevant context',
        'Generates accurate answers',
        'Cites sources',
        'Handles 100+ page documents'
      ],
      starterCode: 'week4-document-qa'
    }
  },
  5: {
    title: 'Production & Deployment',
    description: 'Ship AI applications to production and scale for real traffic.',
    hours: 8,
    lessons: [
      {
        num: 1,
        title: 'Cloud Deployment',
        duration: '10 min',
        description: 'Deploy to Vercel, AWS, or your preferred cloud platform.'
      },
      {
        num: 2,
        title: 'Monitoring & Observability',
        duration: '8 min',
        description: 'Monitor performance, debug issues, track usage.'
      },
      {
        num: 3,
        title: 'Scaling & Performance',
        duration: '8 min',
        description: 'Optimize for speed, handle concurrent users, reduce costs.'
      },
      {
        num: 4,
        title: 'Production Readiness',
        duration: '6 min',
        description: 'Security, error handling, versioning, and rollbacks.'
      }
    ],
    project: {
      title: 'Deploy Your App',
      description: 'Take your favorite project from weeks 1-4 and deploy it to production.',
      requirements: [
        'Deployed on live domain',
        'Handles production traffic',
        'Proper error handling',
        'Monitoring enabled',
        'Can scale automatically'
      ],
      starterCode: 'week5-deployment-guide'
    }
  },
  6: {
    title: 'Capstone & Portfolio',
    description: 'Build and showcase your own AI product.',
    hours: 16,
    lessons: [
      {
        num: 1,
        title: 'Ideation & Planning',
        duration: '15 min',
        description: 'Choose your AI product idea and plan the architecture.'
      },
      {
        num: 2,
        title: 'Full-Stack Development',
        duration: '180 min',
        description: 'Build your complete AI application with frontend, backend, and AI components.'
      },
      {
        num: 3,
        title: 'Polish & Testing',
        duration: '60 min',
        description: 'Test thoroughly, fix bugs, improve UX.'
      },
      {
        num: 4,
        title: 'Presentation & Launch',
        duration: '30 min',
        description: 'Create a demo, write a launch post, share with the world.'
      }
    ],
    project: {
      title: 'Your AI Product',
      description: 'Build a complete AI application combining what you learned in weeks 1-5.',
      requirements: [
        'Novel use case',
        'Full-stack application',
        'Deployed and live',
        'Good documentation',
        'Shareable on GitHub'
      ],
      starterCode: 'week6-capstone-template'
    }
  }
}

export default function WeekModule() {
  const params = useParams()
  const id = params.id as string
  const weekNum = parseInt(id) || 1
  const week = weekContent[weekNum] || weekContent[1]
  const [completed, setCompleted] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (id) {
      const progress = JSON.parse(localStorage.getItem('weekProgress') || '{}')
      setCompleted(progress[weekNum] || false)
    }
  }, [id, weekNum])

  const handleMarkComplete = () => {
    const progress = JSON.parse(localStorage.getItem('weekProgress') || '{}')
    progress[weekNum] = true
    localStorage.setItem('weekProgress', JSON.stringify(progress))
    setCompleted(true)
    toast.success('Week completed! Great work! 🎉')
  }

  const handleDownloadCode = async () => {
    try {
      const filePath = `/projects/week${weekNum}-chatbot/app.py`
      const response = await fetch(filePath)
      if (!response.ok) throw new Error('File not found')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `week${weekNum}-chatbot.py`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Starter code downloaded! 📥')
    } catch (error) {
      toast.error('Failed to download starter code')
      console.error(error)
    }
  }

  const handleWatchLesson = (lesson: any) => {
    setSelectedLesson(lesson)
    setShowModal(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/course/dashboard" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4">
            <ChevronLeft size={20} /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Week {weekNum}: {week.title}</h1>
          <p className="text-slate-400 mt-2">{week.hours} hours • {week.lessons.length} lessons • 1 project</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Overview */}
        <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-lg mb-12">
          <p className="text-lg text-slate-300 mb-6">{week.description}</p>
          {completed && (
            <div className="inline-flex items-center gap-2 text-green-400">
              <CheckCircle size={20} /> Week completed!
            </div>
          )}
        </div>

        {/* Lessons */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <BookOpen size={28} />
            Lessons
          </h2>
          
          <div className="space-y-4">
            {week.lessons.map((lesson: any) => (
              <div key={lesson.num} className="bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 p-6 rounded-lg transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-2">
                      {lesson.num}. {lesson.title}
                    </h3>
                    <p className="text-slate-400 mb-3">{lesson.description}</p>
                    <div className="flex gap-2 text-sm text-slate-400">
                      <Play size={16} className="flex-shrink-0" />
                      <span>{lesson.duration}</span>
                    </div>
                  </div>
                  <button onClick={() => handleWatchLesson(lesson)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-sm whitespace-nowrap transition">
                    Watch
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project Brief */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Code2 size={28} />
            Project
          </h2>
          
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-8">
            <h3 className="text-xl font-bold mb-4">{week.project.title}</h3>
            <p className="text-slate-300 mb-6">{week.project.description}</p>
            
            <h4 className="font-semibold mb-3">Requirements:</h4>
            <ul className="space-y-2 mb-8">
              {week.project.requirements.map((req: string, i: number) => (
                <li key={i} className="flex gap-3">
                  <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">{req}</span>
                </li>
              ))}
            </ul>

            <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-lg mb-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Download size={20} /> Get Started
              </h4>
              <p className="text-slate-400 mb-4">Clone the starter code and customize it for your use case.</p>
              <button onClick={handleDownloadCode} className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition">
                Download Starter Code ({week.project.starterCode})
              </button>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-lg">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <FileText size={20} /> Next Steps
              </h4>
              <ol className="space-y-2 text-sm text-slate-400 list-decimal list-inside">
                <li>Download or clone the starter code</li>
                <li>Set up your environment (Python + dependencies)</li>
                <li>Customize the code for your use case</li>
                <li>Test thoroughly with sample inputs</li>
                <li>Push to GitHub and share the repo</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Resources */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-lg">
            <h3 className="font-bold mb-4">Learning Resources</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#" className="hover:text-blue-400">📚 Full Documentation</a></li>
              <li><a href="#" className="hover:text-blue-400">🎥 Video Walkthrough</a></li>
              <li><a href="#" className="hover:text-blue-400">💻 Code Examples</a></li>
              <li><a href="#" className="hover:text-blue-400">🔧 Troubleshooting</a></li>
            </ul>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-lg">
            <h3 className="font-bold mb-4">Get Help</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#" className="hover:text-blue-400">💬 Ask in Slack</a></li>
              <li><a href="#" className="hover:text-blue-400">🤝 Study Groups</a></li>
              <li><a href="#" className="hover:text-blue-400">❓ FAQ</a></li>
              <li><a href="#" className="hover:text-blue-400">📧 Contact Instructor</a></li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-between">
          <div>
            {!completed && (
              <button
                onClick={handleMarkComplete}
                className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2"
              >
                <CheckCircle size={20} /> Mark Week Complete
              </button>
            )}
          </div>
          <div className="flex gap-4">
            {weekNum > 1 && (
              <Link
                href={`/course/week/${weekNum - 1}`}
                className="border border-slate-600 hover:border-blue-400 px-6 py-3 rounded-lg font-semibold transition"
              >
                ← Previous Week
              </Link>
            )}
            {weekNum < 6 && (
              <Link
                href={`/course/week/${weekNum + 1}`}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition"
              >
                Next Week →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {showModal && selectedLesson && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold">{selectedLesson.title}</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="bg-slate-900 rounded-lg p-12 text-center mb-6">
                <div className="inline-block bg-slate-700 rounded-full p-6 mb-4">
                  <Play size={48} className="text-blue-400" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Video Player</h4>
                <p className="text-slate-400 mb-6">Add your video URL to display here</p>
                <div className="bg-slate-800 rounded p-4 text-left">
                  <p className="text-sm text-slate-400 mb-2">To add video content:</p>
                  <code className="text-xs text-slate-300 bg-slate-900 p-2 rounded block">
                    Edit lesson content and add videoUrl property
                  </code>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold">Lesson Details</h4>
                <p className="text-slate-300">{selectedLesson.description}</p>
                <p className="text-slate-400 text-sm">Duration: {selectedLesson.duration}</p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
