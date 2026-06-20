import React, { useState } from 'react'
import { analyzeProfileApi } from '../services/api'
import ResultsPreview from './ResultsPreview'

export default function AnalyzerCard() {
   const [name, setName] = useState('')
   const [inputText, setInputText] = useState('')
   const [results, setResults] = useState(null)
   const [loading, setLoading] = useState(false)
   const [error, setError] = useState(null)

   const maxChars = 8000
   const remainingChars = maxChars - inputText.length

   const handleAnalyze = async () => {
      if (loading) return

      if (!inputText.trim()) return
      if (inputText.trim().length < 100) {
        setError('Please paste more profile content for an accurate roast (at least 100 characters).')
        return
      }

      setLoading(true)
      setError(null)
      setResults(null)

      try {
        const data = await analyzeProfileApi({ profileText: inputText, name: name.trim() })
        setResults(data)
      } catch (err) {
       const msg = err.message || 'Failed to analyze profile'
       if (msg.includes('quota') || msg.includes('429') || msg.includes('All AI providers failed')) {
         setError('AI is at capacity right now. Please wait a few minutes and try again. Free tiers reset automatically.')
       } else {
         setError(msg)
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
               placeholder="Your name (optional, for personalized roast)"
               className="input-field"
               disabled={loading}
             />
             <p className="text-xs text-secondary mt-1">
               Adding your name makes the roast more personal and fun
             </p>
           </div>
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

           <div className="flex items-center justify-between mt-6">
             <span className={`text-sm ${remainingChars < 200 ? 'text-accent font-medium' : 'text-secondary'}`}>
               {remainingChars} characters remaining
             </span>

             <button
               className="btn-primary text-sm py-2.5 px-6"
               onClick={handleAnalyze}
               disabled={!inputText.trim() || inputText.trim().length < 100 || loading}
             >
               {loading ? 'Analyzing...' : 'Analyze Now'}
             </button>
           </div>

           {inputText.trim() || loading || error || results ? (
             <div className="mt-8 pt-8 border-t border-border">
               {loading && (
                 <div className="flex items-center justify-center py-12">
                   <div className="flex items-center gap-3">
                     <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                     <span className="text-secondary text-sm font-medium">Analyzing...</span>
                   </div>
                 </div>
               )}

               {error && (
                 <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                   <p className="text-sm text-red-600">{error}</p>
                 </div>
               )}

               {results && (
                 <ResultsPreview results={results} />
               )}
             </div>
           ) : null}
         </div>
       </div>
     </section>
   )
}