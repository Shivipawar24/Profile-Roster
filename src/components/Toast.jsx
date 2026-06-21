import { useEffect } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

const variants = {
  error: {
    icon: AlertCircle,
    title: 'Something went wrong',
    container: 'bg-red-50 border-red-200',
    iconContainer: 'bg-red-100 text-red-600',
    titleText: 'text-red-900',
    messageText: 'text-red-700',
  },
  success: {
    icon: CheckCircle2,
    title: 'Done',
    container: 'bg-emerald-50 border-emerald-200',
    iconContainer: 'bg-emerald-100 text-emerald-600',
    titleText: 'text-emerald-900',
    messageText: 'text-emerald-700',
  },
  info: {
    icon: Info,
    title: 'Heads up',
    container: 'bg-blue-50 border-blue-200',
    iconContainer: 'bg-blue-100 text-blue-600',
    titleText: 'text-blue-900',
    messageText: 'text-blue-700',
  },
}

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return

    const timer = setTimeout(() => {
      onClose()
    }, 5000)

    return () => clearTimeout(timer)
  }, [toast, onClose])

  if (!toast) return null

  const variant = variants[toast.type] || variants.error
  const Icon = variant.icon

  return (
    <div className="fixed top-6 right-6 z-50 max-w-sm w-[calc(100%-2rem)]">
      <div className={`flex gap-3 rounded-2xl border p-4 shadow-xl ${variant.container}`}>
        <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${variant.iconContainer}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${variant.titleText}`}>
            {variant.title}
          </p>
          <p className={`mt-1 text-sm leading-relaxed ${variant.messageText}`}>
            {toast.message}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/70 ${variant.titleText}`}
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
