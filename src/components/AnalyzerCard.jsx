import React, { useState } from 'react'
import { analyzeProfileApi } from '../services/api'
import ResultsPreview from './ResultsPreview'
import Toast from './Toast'

export default function AnalyzerCard() {
   const [name, setName] = useState('')
   const [inputText, setInputText] = useState('')
   const [url, setUrl] = useState('')
   const [results, setResults] = useState(null)
   const [loading, setLoading] = useState(false)
   const [toast, setToast] = useState(null)
   const [mode, setMode] = useState('text')

  const maxChars = 8000
  const remainingChars = maxChars - inputText.length

  const showToast = (type, message) => {
    setToast({ id: Date.now(), type, message })
  }

  const handleAnalyze = async () => {
     if (loading) return

      const profileText = mode === 'url' ? url : inputText
      if (!profileText.trim()) {
        showToast('error', mode === 'url' ? 'Paste your LinkedIn URL first.' : 'Paste your profile text first.')
        return
      }
      if (mode === 'text' && profileText.trim().length < 100) {
        showToast('error', 'Paste at least 100 characters for an accurate roast.')
       return
     }

     setLoading(true)
     setToast(null)
     setResults(null)

     try {
        const data = await analyzeProfileApi({ profileText, name: name.trim() })
       setResults(data)
     } catch (err) {
      const msg = err.message || 'Failed to analyze profile'
      if (msg.includes('quota') || msg.includes('429') || msg.includes('All AI providers failed')) {
        showToast('error', 'AI is at capacity right now. Please wait a few minutes and try again. Free tiers reset automatically.')
      } else {
        showToast('error', msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="analyzer" className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="card">
          <div className="mb-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 50))}
              placeholder="Your name "
              className="input-field"
              disabled={loading}
              required={true}
            />
            {/* <p className="text-xs text-secondary mt-1">
              Adding your name makes the roast more personal and fun
            </p> */}
          </div>
          <div className="flex border-b border-border mb-6">
            <button
              onClick={() => setMode('text')}
              className={`flex-1 pb-4 text-sm font-semibold transition-colors duration-200 border-b-2 -mb-px ${mode === 'text'
                  ? 'text-primary border-accent'
                  : 'text-secondary border-transparent hover:text-primary'
                }`}
            >
              Paste Profile Text
            </button>
            <button
              onClick={() => setMode('url')}
              className={`flex-1 pb-4 text-sm font-semibold transition-colors duration-200 border-b-2 -mb-px ${mode === 'url'
                  ? 'text-primary border-accent'
                  : 'text-secondary border-transparent hover:text-primary'
                }`}
            >
              LinkedIn URL
            </button>
          </div>

          {mode === 'url' ? (
            <div className="space-y-4">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value.slice(0, 200))}
                placeholder="https://www.linkedin.com/in/your-profile"
                className="input-field"
                disabled={loading}
              />
              {/* <p className="text-xs text-secondary">
                URL Analysis (Beta): We’ll try to fetch the public profile. Best results require a profile extraction API key.
              </p> */}
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value.slice(0, maxChars))}
                placeholder="Paste your full LinkedIn profile here — headline, About section, experience, skills, and education. For best results, copy everything from your profile page (Ctrl+A, Ctrl+C)."
                className="input-field min-h-[200px] resize-none text-base leading-relaxed"
                disabled={loading}
              />
              <p className="text-xs text-secondary">
                Tip: Go to your LinkedIn profile, select all text (Ctrl+A or Cmd+A), copy, and paste it here. The more detail you provide, the better the roast.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mt-6">
            <span className={`text-sm ${((mode === 'text' ? remainingChars : 200 - url.length) < 200) ? 'text-accent font-medium' : 'text-secondary'}`}>
              {mode === 'text' ? `${remainingChars} characters remaining` : `${200 - url.length} characters remaining`}
            </span>

            <button
              className="btn-primary text-sm py-2.5 px-6"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? 'Analyzing...' : 'Analyze Now'}
            </button>
          </div>

          {((mode === 'text' ? inputText.trim() : url.trim()) || loading || results) && (
            <div className="mt-8 pt-8 border-t border-border">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <span className="text-secondary text-sm font-medium">Analyzing...</span>
                  </div>
                </div>
              )}

              {results && (
                <ResultsPreview results={results} />
              )}
            </div>
          )}
        </div>
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    </section>
  )
}
