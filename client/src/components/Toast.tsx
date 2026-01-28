import { useEffect } from 'react'
import './Toast.css'

interface ToastProps {
  message: string
  type?: 'error' | 'success' | 'info'
  duration?: number
  onClose: () => void
}

export function Toast({ message, type = 'error', duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div className={`toast toast-${type}`} onClick={onClose}>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  )
}

export function ToastContainer({ toasts, removeToast }: { toasts: Array<{ id: string; message: string; type?: 'error' | 'success' | 'info' }>, removeToast: (id: string) => void }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}
