import './GroupsList.css'

interface Group {
  id: number
  name: string
  uuid: string
  avatar?: {
    thumbnail_url?: string
  }
  description?: string
}

interface GroupsListProps {
  groups: Group[]
  selectedGroup: Group | null
  onSelect: (group: Group) => void
}

function GroupsList({ groups, selectedGroup, onSelect }: GroupsListProps) {
  return (
    <div className="groups-list-container">
      <div className="groups-list">
        {groups.map((group) => (
          <div
            key={group.id}
            className={`group-card ${selectedGroup?.id === group.id ? 'selected' : ''}`}
            onClick={() => onSelect(group)}
          >
            {group.avatar?.thumbnail_url && (
              <img
                src={group.avatar.thumbnail_url}
                alt={group.name}
                className="group-avatar"
              />
            )}
            <div className="group-info">
              <h3 className="group-name">{group.name}</h3>
              <p className="group-description">
                {group.description || 'Group information goes here...'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default GroupsList
