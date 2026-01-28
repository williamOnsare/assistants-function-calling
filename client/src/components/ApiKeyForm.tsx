import { useState } from 'react'
import './ApiKeyForm.css'

interface ApiKeyFormProps {
  onSubmit: (keys: { openaiKey: string; ictlifeKey: string; ictlifeUserId: string }) => void
  loading: boolean
}

function ApiKeyForm({ onSubmit, loading }: ApiKeyFormProps) {
  const [openaiKey, setOpenaiKey] = useState('')
  const [ictlifeKey, setIctlifeKey] = useState('')
  const [ictlifeUserId, setIctlifeUserId] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ openaiKey, ictlifeKey, ictlifeUserId })
  }

  return (
    <form className="api-key-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="openai-key">OpenAI API Key</label>
        <input
          id="openai-key"
          type="password"
          value={openaiKey}
          onChange={(e) => setOpenaiKey(e.target.value)}
          placeholder="sk-..."
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="ictlife-key">ICTLife API Key</label>
        <input
          id="ictlife-key"
          type="password"
          value={ictlifeKey}
          onChange={(e) => setIctlifeKey(e.target.value)}
          placeholder="ICTLife API Key"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="ictlife-user-id">ICTLife User ID</label>
        <input
          id="ictlife-user-id"
          type="number"
          value={ictlifeUserId}
          onChange={(e) => setIctlifeUserId(e.target.value)}
          placeholder="User ID (numeric)"
          required
        />
      </div>

      <button type="submit" disabled={loading} className="submit-button">
        {loading ? 'Submitting...' : 'Submit & Fetch Groups'}
      </button>
    </form>
  )
}

export default ApiKeyForm
