import { useEffect, useState } from "react";
import { getKeys } from "../utils/storage";
import "./AssistantDetails.css";

interface AssistantDetailsProps {
  assistant: any;
  onAssistantUpdated?: (updatedAssistant: any) => void;
}

function AssistantDetails({
  assistant,
  onAssistantUpdated,
}: AssistantDetailsProps) {
  const [expanded, setExpanded] = useState(false);
  const [hasChatAssignmentFunction, setHasChatAssignmentFunction] =
    useState(false);
  const [showFunctionDetails, setShowFunctionDetails] = useState(false);
  const [addingFunction, setAddingFunction] = useState(false);

  // Check if function exists when assistant changes
  useEffect(() => {
    checkFunctionExists();
  }, [assistant]);

  const checkFunctionExists = () => {
    if (assistant?.tools && Array.isArray(assistant.tools)) {
      const hasFunction = assistant.tools.some(
        (tool: any) =>
          tool.type === "function" &&
          tool.function?.name === "assign_chat_to_agent",
      );
      setHasChatAssignmentFunction(hasFunction);
    } else {
      setHasChatAssignmentFunction(false);
    }
  };

  const addChatAssignmentFunction = async () => {
    if (!assistant?.id) {
      console.error("Assistant ID is required");
      return;
    }

    setAddingFunction(true);
    try {
      const keys = getKeys();
      if (!keys) {
        throw new Error("API keys not found");
      }

      const response = await fetch(`/api/assistants/${assistant.id}/tools`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OpenAI-Key": keys.openaiKey,
          "X-ICTLife-Key": keys.ictlifeKey,
          "X-ICTLife-User-Id": keys.ictlifeUserId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add function");
      }

      const updatedAssistant = await response.json();
      setHasChatAssignmentFunction(true);
      setShowFunctionDetails(false);

      if (onAssistantUpdated) {
        onAssistantUpdated(updatedAssistant);
      }
    } catch (error: any) {
      console.error("Error adding function:", error);
      alert(error.message || "Failed to add function");
    } finally {
      setAddingFunction(false);
    }
  };

  const functionSchema = {
    type: "function",
    function: {
      name: "assign_chat_to_agent",
      description:
        "Assigns the current chat conversation to a human agent when the user requests to speak with a human, or when the assistant lacks sufficient knowledge to answer the user's query. Call this function with the user_message first - the system will provide you with a list of available agents. Then analyze the user's message and each agent's role to select the most appropriate agent, and call this function again with your selected_agent to complete the assignment.",
      parameters: {
        type: "object",
        properties: {
          user_message: {
            type: "string",
            description:
              "The actual user input message that triggered the need for agent assignment. Provide this on your first call to receive the list of available agents.",
          },
          selected_agent: {
            type: "object",
            description:
              "The agent you have selected as the best match for the user's query. Provide this on your second call after receiving and analyzing the list of available agents. This must be one of the agents from the list provided by the system.",
            properties: {
              agent_id: {
                type: "string",
                description: "Unique identifier for the selected agent",
              },
              agent_name: {
                type: "string",
                description: "Full name of the selected agent",
              },
              agent_role: {
                type: "string",
                description: "Business role of the selected agent",
              },
            },
            required: ["agent_id", "agent_name", "agent_role"],
          },
        },
        required: ["user_message"],
      },
    },
  };

  return (
    <div className="assistant-details">
      <div className="details-header">
        <h3>{assistant.name || "Unnamed Assistant"}</h3>
        <span className="assistant-id">ID: {assistant.id}</span>
      </div>

      <div className="details-section">
        <h4>Model</h4>
        <p>{assistant.model || "N/A"}</p>
      </div>

      {assistant.instructions && (
        <div className="details-section">
          <h4>Instructions</h4>
          <div className="instructions-content">
            {expanded ? (
              <div>
                <pre className="instructions-text">
                  {assistant.instructions}
                </pre>
                <button
                  className="toggle-button"
                  onClick={() => setExpanded(false)}
                >
                  Show Less
                </button>
              </div>
            ) : (
              <div>
                <pre className="instructions-text">
                  {assistant.instructions.length > 300
                    ? assistant.instructions.substring(0, 300) + "..."
                    : assistant.instructions}
                </pre>
                {assistant.instructions.length > 300 && (
                  <button
                    className="toggle-button"
                    onClick={() => setExpanded(true)}
                  >
                    Show More
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {assistant.tools && assistant.tools.length > 0 && (
        <div className="details-section">
          <h4>Tools ({assistant.tools.length})</h4>
          <div className="tools-list">
            {assistant.tools.map((tool: any, index: number) => (
              <div key={index} className="tool-item">
                <strong>{tool.type}</strong>
                {tool.function && (
                  <div className="tool-function">
                    <p>
                      <strong>Function:</strong> {tool.function.name}
                    </p>
                    {tool.function.description && (
                      <p>
                        <strong>Description:</strong>{" "}
                        {tool.function.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action to Add Function to Assistant */}
      {!hasChatAssignmentFunction && (
        <div className="details-section">
          <button
            className="chat-assignment-button"
            onClick={() => setShowFunctionDetails(!showFunctionDetails)}
            disabled={addingFunction}
          >
            {showFunctionDetails ? "▼" : "▶"} Enable Chat Assignment capability
          </button>

          {showFunctionDetails && (
            <div className="function-details-accordion">
              <div className="function-details-content">
                <h5>Function: assign_chat_to_agent</h5>
                <p className="function-description">
                  {functionSchema.function.description}
                </p>

                <div className="function-schema">
                  <h6>Function Schema:</h6>
                  <pre>{JSON.stringify(functionSchema, null, 2)}</pre>
                </div>

                <div className="function-parameters">
                  <h6>Parameters:</h6>
                  <ul>
                    <li>
                      <strong>user_message</strong> (string): The actual user
                      input message that triggered the need for agent assignment
                    </li>
                    <li>
                      <strong>channel_agents</strong> (array): List of available
                      channel agents with:
                      <ul>
                        <li>
                          <strong>agent_id</strong> (string): Unique identifier
                          for the agent
                        </li>
                        <li>
                          <strong>agent_name</strong> (string): Full name of the
                          agent
                        </li>
                        <li>
                          <strong>agent_role</strong> (string): Business role or
                          specialization of the agent
                        </li>
                      </ul>
                    </li>
                  </ul>
                </div>

                <button
                  className="add-function-button"
                  onClick={addChatAssignmentFunction}
                  disabled={addingFunction}
                >
                  {addingFunction ? "Adding..." : "Add Function"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {assistant.file_ids && assistant.file_ids.length > 0 && (
        <div className="details-section">
          <h4>Files ({assistant.file_ids.length})</h4>
          <ul className="files-list">
            {assistant.file_ids.map((fileId: string, index: number) => (
              <li key={index}>{fileId}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="details-section">
        <h4>Metadata</h4>
        <pre className="metadata-text">
          {JSON.stringify(assistant.metadata || {}, null, 2)}
        </pre>
      </div>

      <div className="details-footer">
        <p>
          <strong>Created:</strong>{" "}
          {new Date(assistant.created_at * 1000).toLocaleString()}
        </p>
        {assistant.updated_at && (
          <p>
            <strong>Updated:</strong>{" "}
            {new Date(assistant.updated_at * 1000).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

export default AssistantDetails;
