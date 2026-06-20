import React, { useState } from 'react'
import { Sparkles, ChevronRight } from 'lucide-react'

export default function Hero() {
  return (
    <section className="pt-32 pb-16 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-border shadow-sm mb-8">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-secondary">AI Career Assistant</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold text-primary mb-6 tracking-tight text-balance">
          Get Roasted.<br />
          <span className="text-accent">Get Better.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          Analyze your LinkedIn profile and get honest feedback, profile scores, headline suggestions, and improvement tips.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="#analyzer" className="btn-primary inline-flex items-center justify-center gap-2">
            Analyze Profile
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  )
}
