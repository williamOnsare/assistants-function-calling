import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getKeys, hasKeys } from "../utils/storage";
import { getInitials, formatDate } from "../utils/formatting";
import { useToast } from "../hooks/useToast";
import { ToastContainer } from "../components/Toast";
import "./OrgsPage.css";

interface Group {
  id: number;
  name: string;
  uuid: string;
  avatar?: {
    thumbnail_url?: string;
  };
  description?: string;
  created_at?: string;
  updated_at?: string;
  last_message_created_at?: string;
}

function OrgsPage() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!hasKeys()) {
      navigate("/");
      return;
    }

    fetchGroups(currentPage);
  }, [currentPage, navigate]);

  const fetchGroups = async (page: number) => {
    setLoading(true);
    try {
      const keys = getKeys();
      if (!keys) {
        throw new Error("API keys not found");
      }

      const response = await fetch(
        `/api/groups?page=${page}&status=active&user_id=${keys.ictlifeUserId}`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-OpenAI-Key": keys.openaiKey,
            "X-ICTLife-Key": keys.ictlifeKey,
            "X-ICTLife-User-Id": keys.ictlifeUserId,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch groups");
      }

      const data = await response.json();
      setGroups(data.groups || []);
      setTotalCount(data.pagination?.count || 0);
      const perPage = data.pagination?.per || 20;
      setTotalPages(Math.ceil((data.pagination?.count || 0) / perPage));
    } catch (error: any) {
      showToast(error.message || "Failed to load groups", "error");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupClick = (group: Group) => {
    navigate(`/org/${group.uuid}/assistants`);
  };

  if (loading && groups.length === 0) {
    return (
      <div className="orgs-page">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <div className="orgs-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading groups...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="orgs-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="orgs-container">
        <div className="orgs-header">
          <h1>Organizations</h1>
          <p className="orgs-subtitle">
            {totalCount > 0
              ? `${totalCount} organization${totalCount !== 1 ? "s" : ""} found`
              : "No organizations found"}
          </p>
        </div>

        {groups.length === 0 && !loading ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <p>No organizations available</p>
          </div>
        ) : (
          <>
            <div className="groups-list-vertical">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="group-row"
                  onClick={() => handleGroupClick(group)}
                >
                  {group.avatar?.thumbnail_url ? (
                    <img
                      src={group.avatar.thumbnail_url}
                      alt={group.name}
                      className="group-row-avatar"
                    />
                  ) : (
                    <div className="group-row-avatar-initials">
                      {getInitials(group.name)}
                    </div>
                  )}
                  <div className="group-row-content">
                    <h3 className="group-row-name">{group.name}</h3>
                    {group.description ? (
                      <p className="group-row-description">
                        {group.description}
                      </p>
                    ) : (
                      <div className="group-row-dates">
                        {group.created_at && (
                          <span>Created: {formatDate(group.created_at)}</span>
                        )}
                        {group.updated_at && (
                          <span>Updated: {formatDate(group.updated_at)}</span>
                        )}
                        {/* {group.last_message_created_at && (
                          <span>Last message: {formatDate(group.last_message_created_at)}</span>
                        )} */}
                      </div>
                    )}
                  </div>
                  <div className="group-row-arrow">→</div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="pagination-button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default OrgsPage;
