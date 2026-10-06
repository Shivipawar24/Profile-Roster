import React, { useState, useRef } from 'react'
import { analyzeProfileApi } from '../services/api'
import ResultsPreview from './ResultsPreview'
import Toast from './Toast'
import { UploadCloud, FileText, File, X, Sparkles, Info, CheckCircle2 } from 'lucide-react'

export default function AnalyzerCard() {
  const [name, setName] = useState('')
  const [inputText, setInputText] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [extractedText, setExtractedText] = useState('')
  const [fileBase64, setFileBase64] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [mode, setMode] = useState('file') // 'file' or 'text'
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef(null)
  const maxChars = 10000
  const remainingChars = maxChars - inputText.length

  const showToast = (type, message) => {
    setToast({ id: Date.now(), type, message })
  }

  const processFile = (file) => {
    if (!file) return

    const validExtensions = ['.pdf', '.txt', '.docx', '.doc', '.md', '.rtf']
    const fileExt = '.' + file.name.split('.').pop().toLowerCase()
    
    if (!validExtensions.includes(fileExt) && !file.type.includes('pdf') && !file.type.includes('text')) {
      showToast('error', 'Please upload a valid document (.pdf, .txt, .docx, .md)')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast('error', 'File size exceeds 8MB. Please select a smaller file.')
      return
    }

    setSelectedFile(file)
    setExtractedText('')
    setFileBase64('')

    const reader = new FileReader()

    if (file.type.includes('pdf') || fileExt === '.pdf') {
      // PDF handling: convert to base64 data for multimodal AI or server parsing
      reader.onload = (e) => {
        const base64String = e.target.result.split(',')[1]
        setFileBase64(base64String)
      }
      reader.readAsDataURL(file)
    } else {
      // Plain text / MD / RTF / DOC text extraction
      reader.onload = (e) => {
        const text = e.target.result
        setExtractedText(text)
      }
      reader.readAsText(file)
    }
  }

  const handleFileDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setExtractedText('')
    setFileBase64('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAnalyze = async () => {
    if (loading) return

    let profileText = ''
    let fileData = null

    if (mode === 'file') {
      if (!selectedFile) {
        showToast('error', 'Please select or drop your resume file first.')
        return
      }
      if (extractedText) {
        profileText = extractedText
      } else if (fileBase64) {
        fileData = {
          base64: fileBase64,
          mimeType: selectedFile.type || 'application/pdf',
          filename: selectedFile.name,
        }
      }
    } else {
      profileText = inputText.trim()
      if (!profileText) {
        showToast('error', 'Please paste your resume or profile text first.')
        return
      }
      if (profileText.length < 80) {
        showToast('error', 'Please paste at least 80 characters for an accurate roast.')
        return
      }
    }

    setLoading(true)
    setToast(null)
    setResults(null)

    try {
      const data = await analyzeProfileApi({
        profileText,
        fileData,
        name: name.trim(),
      })
      setResults(data)
    } catch (err) {
      const msg = err.message || 'Failed to analyze profile'
      if (msg.includes('quota') || msg.includes('429') || msg.includes('All AI providers failed')) {
        showToast('error', 'AI is at capacity right now. Please wait a minute and try again.')
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
          <div className="mb-5">
            <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
              Candidate Name (Optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 50))}
              placeholder="e.g. Alex Rivera"
              className="input-field"
              disabled={loading}
            />
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-border mb-6">
            <button
              onClick={() => setMode('file')}
              className={`flex-1 pb-4 text-sm font-semibold transition-colors duration-200 border-b-2 -mb-px flex items-center justify-center gap-2 ${
                mode === 'file'
                  ? 'text-primary border-accent'
                  : 'text-secondary border-transparent hover:text-primary'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              Upload Resume (PDF / Doc)
            </button>
            <button
              onClick={() => setMode('text')}
              className={`flex-1 pb-4 text-sm font-semibold transition-colors duration-200 border-b-2 -mb-px flex items-center justify-center gap-2 ${
                mode === 'text'
                  ? 'text-primary border-accent'
                  : 'text-secondary border-transparent hover:text-primary'
              }`}
            >
              <FileText className="w-4 h-4" />
              Paste Profile Text
            </button>
          </div>

          {/* File Upload Mode */}
          {mode === 'file' ? (
            <div className="space-y-4">
              {!selectedFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? 'border-accent bg-accent/10 shadow-lg scale-[1.01]'
                      : 'border-border hover:border-accent/60 hover:bg-surface/50'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.txt,.docx,.doc,.md,.rtf"
                    className="hidden"
                    disabled={loading}
                  />
                  <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-primary mb-1">
                    Drag & Drop your Resume here or <span className="text-accent underline">Browse file</span>
                  </p>
                  <p className="text-xs text-secondary">
                    Supports PDF, TXT, DOCX, MD (Max 8MB)
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 rounded-xl border border-accent/40 bg-accent/5">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <File className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium text-primary truncate">{selectedFile.name}</p>
                      <p className="text-xs text-secondary">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Ready for AI Roast
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeFile}
                    disabled={loading}
                    className="p-1.5 rounded-lg hover:bg-surface text-secondary hover:text-accent transition-colors"
                    title="Remove file"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Tip box for LinkedIn export */}
              <div className="p-3.5 rounded-lg border border-border bg-surface/60 flex items-start gap-3 text-xs text-secondary">
                <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-primary">Roasting a LinkedIn profile?</span> Open your profile on LinkedIn ➔ click <span className="text-primary font-medium">"More"</span> ➔ click <span className="text-primary font-medium">"Save to PDF"</span> ➔ upload the PDF here for an instant roast!
                </div>
              </div>
            </div>
          ) : (
            /* Paste Text Mode */
            <div className="space-y-4">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value.slice(0, maxChars))}
                placeholder="Paste your resume or full LinkedIn profile here — summary, experience, skills, and education. For best results, copy everything from your profile page (Ctrl+A, Ctrl+C)."
                className="input-field min-h-[220px] resize-none text-base leading-relaxed"
                disabled={loading}
              />
              <div className="flex items-center justify-between text-xs text-secondary">
                <span>Tip: The more detail you provide, the sharper the roast and ATS feedback.</span>
                <span className={remainingChars < 200 ? 'text-accent font-medium' : ''}>
                  {remainingChars} chars left
                </span>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-end mt-6">
            <button
              className="btn-primary text-sm py-2.5 px-6 flex items-center gap-2"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Roasting Resume...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Roast My Profile</span>
                </>
              )}
            </button>
          </div>

          {/* Results Display */}
          {(loading || results) && (
            <div className="mt-8 pt-8 border-t border-border">
              {loading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-secondary text-sm font-medium animate-pulse">
                    Analyzing experience & scanning for ATS red flags...
                  </span>
                </div>
              )}

              {results && <ResultsPreview results={results} />}
            </div>
          )}
        </div>
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    </section>
  )
}
