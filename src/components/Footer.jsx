import React from 'react'

export default function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">R</span>
            </div>
            <span className="text-sm font-semibold text-primary">Roast & Boost</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
