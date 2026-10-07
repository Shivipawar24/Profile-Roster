import React from 'react'
import { Flame, TrendingUp, Lightbulb, Wrench } from 'lucide-react'

const features = [
  {
    icon: Flame,
    title: 'Honest AI Roast',
    description: 'Get direct, witty, and unfiltered feedback on what\'s holding your resume or LinkedIn profile back.',
  },
  {
    icon: TrendingUp,
    title: 'ATS & Quality Score',
    description: 'Comprehensive scoring based on formatting, keyword coverage, role relevance, and overall impact.',
  },
  {
    icon: Lightbulb,
    title: 'Headline & Summary Fixes',
    description: 'AI-generated headline rewrites and objective section improvements tailored to your target industry.',
  },
  {
    icon: Wrench,
    title: 'Missing Skills Analysis',
    description: 'Identify high-demand technical and soft skills missing from your profile compared to recruiter standards.',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Everything you need to level up
          </h2>
          <p className="text-secondary max-w-xl mx-auto">
            Upload your PDF resume or paste your profile text for instant AI feedback.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="card group hover:border-accent/30 transition-all duration-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-primary mb-2">{feature.title}</h3>
                  <p className="text-secondary text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
