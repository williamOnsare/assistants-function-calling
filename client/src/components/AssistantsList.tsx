import './AssistantsList.css'

interface Assistant {
  id: number
  ai_assistant_id: number
  ai_assistant: {
    id: number
    name: string
    openai_assistant_id: string
    instructions?: string
  } | null
  group_id: number
}

interface AssistantsListProps {
  assistants: Assistant[]
  selectedAssistant: Assistant | null
  onSelect: (assistant: Assistant) => void
}

function AssistantsList({ assistants, selectedAssistant, onSelect }: AssistantsListProps) {
  // Filter out assistants without ai_assistant data
  const validAssistants = assistants.filter(a => a.ai_assistant !== null)

  if (validAssistants.length === 0) {
    return (
      <div className="assistants-list-container">
        <p className="no-assistants">No assistants available for this group</p>
      </div>
    )
  }

  return (
    <div className="assistants-list-container">
      <div className="assistants-list">
        {validAssistants.map((assistant) => (
          <div
            key={assistant.id}
            className={`assistant-card ${selectedAssistant?.id === assistant.id ? 'selected' : ''}`}
            onClick={() => onSelect(assistant)}
          >
            <div className="assistant-info">
              <h3 className="assistant-name">
                {assistant.ai_assistant?.name || 'Unnamed Assistant'}
              </h3>
              <p className="assistant-preview">
                {assistant.ai_assistant?.instructions 
                  ? assistant.ai_assistant.instructions.substring(0, 150) + '...'
                  : 'Preview of information goes here...'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AssistantsList
