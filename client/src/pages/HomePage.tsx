import { useState } from 'react'
import { saveKeys, verifyKeysSaved } from '../utils/storage'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'
import './HomePage.css'

function HomePage() {
  const { toasts, showToast, removeToast } = useToast()
  const [openaiKey, setOpenaiKey] = useState('')
  const [ictlifeKey, setIctlifeKey] = useState('')
  const [ictlifeUserId, setIctlifeUserId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!openaiKey.trim() || !ictlifeKey.trim() || !ictlifeUserId.trim()) {
      showToast('Please fill in all fields', 'error')
      return
    }

    setLoading(true)

    try {
      const keysToSave = {
        openaiKey: openaiKey.trim(),
        ictlifeKey: ictlifeKey.trim(),
        ictlifeUserId: ictlifeUserId.trim(),
      }

      // Save to localStorage
      const saved = saveKeys(keysToSave)
      
      if (!saved) {
        throw new Error('Failed to save keys to localStorage')
      }

      // Verify the keys were saved correctly
      const verified = verifyKeysSaved(keysToSave)
      if (!verified) {
        throw new Error('Failed to verify saved keys')
      }

      // Small delay to ensure localStorage is ready and React state updates
      // Then navigate to orgs page
      setTimeout(() => {
        window.location.href = '/orgs'
      }, 1000) // 100ms delay should be sufficient
    } catch (error: any) {
      showToast(error.message || 'Failed to save keys', 'error')
      setLoading(false)
    }
    // Note: Don't set loading to false on success since we're navigating away
  }

  return (
    <div className="home-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="home-container">
        <div className="home-card">
          <h1 className="home-title">OpenAI Assistants API Demo</h1>
          <p className="home-subtitle">Enter your API keys to get started</p>

          <form className="keys-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="openai-key">OpenAI API Key</label>
              <input
                id="openai-key"
                type="text"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                required
                disabled={loading}
              />
            </div>

            <div className="form-field">
              <label htmlFor="ictlife-key">ICTLife API Key</label>
              <input
                id="ictlife-key"
                type="text"
                value={ictlifeKey}
                onChange={(e) => setIctlifeKey(e.target.value)}
                placeholder="ICTLife API Key"
                required
                disabled={loading}
              />
            </div>

            <div className="form-field">
              <label htmlFor="ictlife-user-id">ICTLife User ID</label>
              <input
                id="ictlife-user-id"
                type="number"
                value={ictlifeUserId}
                onChange={(e) => setIctlifeUserId(e.target.value)}
                placeholder="User ID (numeric)"
                required
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default HomePage
