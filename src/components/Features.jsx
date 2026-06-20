import React from 'react'
import { Flame, TrendingUp, Lightbulb, Wrench, Zap } from 'lucide-react'

const features = [
  {
    icon: Flame,
    title: 'Honest Roast',
    description: 'Get direct, unfiltered feedback on what\'s holding your profile back. No sugarcoating.',
    stat: '92%',
    statLabel: 'users improve after roast',
  },
  {
    icon: TrendingUp,
    title: 'Profile Score',
    description: 'Comprehensive scoring across visual appeal, content quality, keyword optimization, and completeness.',
    stat: '4.8/5',
    statLabel: 'average accuracy score',
  },
  {
    icon: Lightbulb,
    title: 'Smart Suggestions',
    description: 'AI-generated headline rewrites and about section improvements tailored to your industry.',
    stat: '15+',
    statLabel: 'suggestions per analysis',
  },
  {
    icon: Wrench,
    title: 'Skill Gap Analysis',
    description: 'Identify missing skills compared to top performers in your target roles.',
    stat: '3.2x',
    statLabel: 'faster skill discovery',
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
            Stop guessing what recruiters want. Get data-driven insights powered by AI.
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
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                <span className="text-lg font-bold text-primary">{feature.stat}</span>
                <span className="text-xs text-secondary ml-1">{feature.statLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
