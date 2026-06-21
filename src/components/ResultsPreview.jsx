import React from 'react'
import { Flame, TrendingUp, Lightbulb, Wrench } from 'lucide-react'

const cards = [
  { key: 'roast', label: 'Roast', emoji: '🔥', icon: Flame, color: 'text-orange-500', bgColor: 'bg-orange-50', fullWidth: true },
  { key: 'score', label: 'Profile Score', emoji: '📈', icon: TrendingUp, color: 'text-blue-500', bgColor: 'bg-blue-50', fullWidth: false },
  { key: 'headline', label: 'Better Headline', emoji: '💡', icon: Lightbulb, color: 'text-emerald-500', bgColor: 'bg-emerald-50', fullWidth: false },
  { key: 'skills', label: 'Missing Skills', emoji: '🛠', icon: Wrench, color: 'text-purple-500', bgColor: 'bg-purple-50', fullWidth: true },
]

export default function ResultsPreview({ results }) {
  const items = cards.map((card) => {
    let title = ''
    let description = ''

    if (card.key === 'score') {
      title = results.score != null ? `${results.score}/100` : 'Analyzing...'
      description = results.strengths?.length ? results.strengths[0] : ''
    } else if (card.key === 'skills') {
      title = results.missingSkills?.length ? `${results.missingSkills.length} skills to add` : 'Analyzing...'
      description = results.missingSkills?.slice(0, 3).join(', ') || ''
    } else if (card.key === 'headline') {
      title = results.headline || 'Generating...'
      description = 'Try this new headline on your profile'
    } else if (card.key === 'roast') {
      title = 'Roast'
      description = results.roast || 'Loading...'
    }

    return { ...card, title, description }
  })

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-4"> Results</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={`bg-white rounded-2xl border border-border p-5 hover:border-accent/30 hover:shadow-md transition-all duration-200 group ${item.fullWidth ? 'sm:col-span-2' : ''
              }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl ${item.bgColor} flex items-center justify-center flex-shrink-0`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-secondary">{item.label}</span>
                </div>
                <h4 className="text-sm font-semibold text-primary mb-1">
                  {item.title}
                </h4>
                <p className="text-xs text-secondary leading-relaxed ">
                  {item.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
