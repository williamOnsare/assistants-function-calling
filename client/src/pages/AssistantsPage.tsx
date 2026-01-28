import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getKeys, clearKeys, hasKeys } from "../utils/storage";
import { useToast } from "../hooks/useToast";
import { ToastContainer } from "../components/Toast";
import AssistantDetails from "../components/AssistantDetails";
import ChatInterface from "../components/ChatInterface";
import "./AssistantsPage.css";

interface Assistant {
  id: number;
  ai_assistant_id: number;
  ai_assistant: {
    id: number;
    name: string;
    openai_assistant_id: string;
    instructions?: string;
  } | null;
  group_id: number;
}

function AssistantsPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toasts, showToast, removeToast } = useToast();

  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(
    searchParams.get("assistant") || null,
  );
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    searchParams.get("thread") || null,
  );
  const [assistantDetails, setAssistantDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAssistant, setLoadingAssistant] = useState(false);

  useEffect(() => {
    if (!hasKeys()) {
      navigate("/");
      return;
    }

    if (!uuid) {
      navigate("/orgs");
      return;
    }

    fetchAssistants();
  }, [uuid, navigate]);

  useEffect(() => {
    if (selectedAssistantId) {
      fetchAssistantDetails(selectedAssistantId);
    } else {
      setAssistantDetails(null);
    }
  }, [selectedAssistantId]);

  const fetchAssistants = async () => {
    setLoading(true);
    try {
      const keys = getKeys();
      if (!keys) {
        throw new Error("API keys not found");
      }

      const response = await fetch(`/api/groups/${uuid}/assistants?per=100`, {
        headers: {
          "Content-Type": "application/json",
          "X-OpenAI-Key": keys.openaiKey,
          "X-ICTLife-Key": keys.ictlifeKey,
          "X-ICTLife-User-Id": keys.ictlifeUserId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch assistants");
      }

      const data = await response.json();
      setAssistants(data.group_ai_assistants || []);

      // If there's a selected assistant in URL, fetch it
      if (selectedAssistantId) {
        const assistant = data.group_ai_assistants?.find(
          (a: Assistant) =>
            a.ai_assistant?.openai_assistant_id === selectedAssistantId,
        );
        if (
          assistant?.ai_assistant?.openai_assistant_id !== selectedAssistantId
        ) {
          fetchAssistantDetails(assistant.ai_assistant.openai_assistant_id);
        }
      }
    } catch (error: any) {
      showToast(error.message || "Failed to load assistants", "error");
      setAssistants([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssistantDetails = async (assistantId: string) => {
    setLoadingAssistant(true);
    try {
      const keys = getKeys();
      if (!keys) {
        throw new Error("API keys not found");
      }

      const response = await fetch(`/api/assistants/${assistantId}`, {
        headers: {
          "Content-Type": "application/json",
          "X-OpenAI-Key": keys.openaiKey,
          "X-ICTLife-Key": keys.ictlifeKey,
          "X-ICTLife-User-Id": keys.ictlifeUserId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch assistant details");
      }

      const data = await response.json();
      setAssistantDetails(data);
      setSearchParams({ assistant: assistantId });
    } catch (error: any) {
      showToast(error.message || "Failed to load assistant details", "error");
    } finally {
      setLoadingAssistant(false);
    }
  };

  const handleAssistantSelect = (assistant: Assistant) => {
    if (!assistant.ai_assistant?.openai_assistant_id) {
      showToast("Assistant does not have an OpenAI assistant ID", "error");
      return;
    }

    setSelectedAssistantId(assistant.ai_assistant.openai_assistant_id);
  };

  const handleThreadCreated = (threadId: string) => {
    setSelectedThreadId(threadId);
    setSearchParams((params) => {
      params.set("thread", threadId);
      return params;
    });
  };

  const handleLogout = () => {
    clearKeys();
    navigate("/");
  };

  const validAssistants = assistants.filter((a) => a.ai_assistant !== null);

  return (
    <div className="assistants-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="assistants-layout">
        <aside className="assistants-sidebar">
          <div className="sidebar-header">
            <button
              className="back-button"
              onClick={() => navigate("/orgs")}
              title="Back to organizations"
            >
              ←
            </button>
            <h2>Assistants</h2>
          </div>

          {loading ? (
            <div className="sidebar-loading">
              <div className="spinner-small"></div>
              <p>Loading assistants...</p>
            </div>
          ) : validAssistants.length === 0 ? (
            <div className="sidebar-empty">
              <p>No assistants available</p>
            </div>
          ) : (
            <div className="sidebar-assistants">
              {validAssistants.map((assistant) => {
                const isSelected =
                  assistant.ai_assistant?.openai_assistant_id ===
                  selectedAssistantId;
                return (
                  <div
                    key={assistant.id}
                    className={`sidebar-assistant ${isSelected ? "selected" : ""}`}
                    onClick={() => handleAssistantSelect(assistant)}
                  >
                    <div className="sidebar-assistant-content">
                      <h3 className="sidebar-assistant-name">
                        {assistant.ai_assistant?.name || "Unnamed Assistant"}
                      </h3>
                      <p className="sidebar-assistant-preview">
                        {assistant.ai_assistant?.instructions
                          ? assistant.ai_assistant.instructions.substring(
                              0,
                              80,
                            ) + "..."
                          : "No description"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="sidebar-footer">
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>

        <main className="assistants-main">
          {loadingAssistant ? (
            <div className="main-loading">
              <div className="spinner"></div>
              <p>Loading assistant details...</p>
            </div>
          ) : assistantDetails ? (
            <div className="main-content">
              <div className="assistant-details-section">
                <h2>Assistant Details</h2>
                <AssistantDetails
                  assistant={assistantDetails}
                  onAssistantUpdated={(updatedAssistant) => {
                    setAssistantDetails(updatedAssistant);
                    showToast(
                      "Chat assignment function added successfully",
                      "success",
                    );
                  }}
                />
              </div>
              <div className="chat-section">
                <ChatInterface
                  assistantId={assistantDetails.id}
                  assistantName={assistantDetails.name}
                  threadId={selectedThreadId}
                  onThreadCreated={handleThreadCreated}
                />
              </div>
            </div>
          ) : (
            <div className="main-empty">
              <div className="empty-icon">🤖</div>
              <p>Select an assistant to view details and start chatting</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default AssistantsPage;
