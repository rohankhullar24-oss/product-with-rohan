import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Applied AI Course | Learn AI in 6 Weeks | Free',
  description: 'Learn to build AI apps in 6 weeks. Master LLMs, agents, ML models, RAG systems, and deployment. 5+ projects. Free forever. No prerequisites.',
  keywords: ['AI course', 'machine learning', 'LLM', 'AI education', 'free course', 'AI agents'],
  openGraph: {
    type: 'website',
    url: 'https://productwithrohan.online/course',
    title: 'Applied AI Course | Learn AI in 6 Weeks',
    description: 'Learn to build AI apps in 6 weeks. Master LLMs, agents, ML models, RAG systems, and deployment.',
  },
}

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
