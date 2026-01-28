import { useState, useEffect, useRef } from "react";
import { getKeys } from "../utils/storage";
import "./ChatInterface.css";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: Array<{
    type: string;
    text?: {
      value: string;
    };
  }>;
  created_at: number;
}

interface ChatInterfaceProps {
  assistantId: string | null;
  assistantName?: string;
  threadId?: string | null;
  onThreadCreated?: (threadId: string) => void;
}

function ChatInterface({
  assistantId,
  assistantName,
  threadId: initialThreadId,
  onThreadCreated,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(
    initialThreadId || null,
  );
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset all local states
    setMessages([]);
    setInputValue("");
    setError(null);
    setThreadId(null);
    setSending(false);
    setLoading(false);
  }, [assistantId]);

  // Sync threadId from props - only update if values actually differ
  useEffect(() => {
    if (initialThreadId) {
      // Only update threadId if it's different from current state
      setThreadId((currentThreadId) => {
        if (initialThreadId !== currentThreadId) {
          return initialThreadId;
        }
        return currentThreadId;
      });
    }
  }, [initialThreadId]);

  useEffect(() => {
    if (threadId) {
      loadMessages(threadId);
    }
  }, [threadId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Note: Polling for messages during run is handled by pollRunStatus()
  // which fetches messages when the run reaches a terminal state (completed/failed/cancelled).
  // This is more efficient than polling every second regardless of run status.

  const sendMessage = async () => {
    if (!inputValue.trim() || !assistantId || sending) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setSending(true);
    setError(null);

    try {
      // Create thread if it doesn't exist (first message)
      let currentThreadId = threadId;
      if (!currentThreadId) {
        const keys = getKeys();
        if (!keys) {
          throw new Error("API keys not found");
        }

        const threadResponse = await fetch("/api/threads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-OpenAI-Key": keys.openaiKey,
            "X-ICTLife-Key": keys.ictlifeKey,
            "X-ICTLife-User-Id": keys.ictlifeUserId,
          },
        });

        if (!threadResponse.ok) {
          const errorData = await threadResponse.json();
          throw new Error(errorData.error || "Failed to create thread");
        }

        const thread = await threadResponse.json();
        currentThreadId = thread.id;
        setThreadId(currentThreadId);
        if (onThreadCreated && currentThreadId) {
          onThreadCreated(currentThreadId);
        }
      }

      const keys = getKeys();
      if (!keys) {
        throw new Error("API keys not found");
      }

      // Add user message to thread
      const messageResponse = await fetch(
        `/api/threads/${currentThreadId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-OpenAI-Key": keys.openaiKey,
            "X-ICTLife-Key": keys.ictlifeKey,
            "X-ICTLife-User-Id": keys.ictlifeUserId,
          },
          body: JSON.stringify({
            role: "user",
            content: userMessage, // OpenAI SDK will handle the format
          }),
        },
      );

      if (!messageResponse.ok) {
        const errorData = await messageResponse.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      // Append the newly created message to local state instead of refetching all messages
      const newMessage = await messageResponse.json();
      setMessages((prevMessages) => [...prevMessages, newMessage]);

      // Ensure we have a thread ID before creating run
      if (!currentThreadId) {
        throw new Error("Thread ID is required");
      }

      // Create and run assistant
      setLoading(true);
      const runResponse = await fetch(`/api/threads/${currentThreadId}/runs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OpenAI-Key": keys.openaiKey,
          "X-ICTLife-Key": keys.ictlifeKey,
          "X-ICTLife-User-Id": keys.ictlifeUserId,
        },
        body: JSON.stringify({
          assistantId: assistantId,
        }),
      });

      if (!runResponse.ok) {
        const errorData = await runResponse.json();
        throw new Error(errorData.error || "Failed to run assistant");
      }

      const run = await runResponse.json();

      // Poll for run completion
      await pollRunStatus(run.id, currentThreadId);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    } finally {
      setSending(false);
    }
  };

  const handleRequiresAction = async (
    run: any,
    threadIdToUse: string,
  ): Promise<any> => {
    const keys = getKeys();
    if (!keys) {
      throw new Error("API keys not found");
    }

    if (
      !run.required_action ||
      !run.required_action.submit_tool_outputs ||
      !run.required_action.submit_tool_outputs.tool_calls
    ) {
      return run;
    }

    const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
    const toolOutputs = [];

    // Process each tool call
    for (const toolCall of toolCalls) {
      if (toolCall.type === "function" && toolCall.function) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments || "{}");

        if (functionName === "assign_chat_to_agent") {
          try {
            // Execute the function - it handles two scenarios:
            // 1. First call: Assistant provides user_message, system returns agents
            // 2. Second call: Assistant provides selected_agent, system executes assignment
            const functionResponse = await fetch(
              "/api/functions/assign_chat_to_agent",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-OpenAI-Key": keys.openaiKey,
                  "X-ICTLife-Key": keys.ictlifeKey,
                  "X-ICTLife-User-Id": keys.ictlifeUserId,
                },
                body: JSON.stringify({
                  user_message: functionArgs.user_message || "",
                  selected_agent: functionArgs.selected_agent || null,
                }),
              },
            );

            if (!functionResponse.ok) {
              const errorData = await functionResponse.json();
              throw new Error(errorData.error || "Failed to execute function");
            }

            const functionResult = await functionResponse.json();
            toolOutputs.push({
              tool_call_id: toolCall.id,
              output: functionResult.output || functionResult,
            });
          } catch (err: any) {
            console.error("Error executing assign_chat_to_agent:", err);
            toolOutputs.push({
              tool_call_id: toolCall.id,
              output: `Error: ${err.message}`,
            });
          }
        } else {
          // Unknown function
          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: "Function not implemented",
          });
        }
      }
    }

    // Submit all tool outputs
    if (toolOutputs.length > 0) {
      const submitResponse = await fetch(
        `/api/threads/${threadIdToUse}/runs/${run.id}/submit-tool-outputs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-OpenAI-Key": keys.openaiKey,
            "X-ICTLife-Key": keys.ictlifeKey,
            "X-ICTLife-User-Id": keys.ictlifeUserId,
          },
          body: JSON.stringify({
            tool_outputs: toolOutputs,
          }),
        },
      );

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json();
        throw new Error(errorData.error || "Failed to submit tool outputs");
      }

      const updatedRun = await submitResponse.json();
      return updatedRun;
    }

    return run;
  };

  const pollRunStatus = async (runId: string, threadIdToUse: string) => {
    if (!threadIdToUse) return;

    const keys = getKeys();
    if (!keys) {
      setLoading(false);
      setError("API keys not found");
      return;
    }

    const maxAttempts = 60; // 60 seconds max
    let attempts = 0;

    const checkStatus = async (): Promise<void> => {
      try {
        const response = await fetch(
          `/api/threads/${threadIdToUse}/runs/${runId}`,
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
          throw new Error("Failed to check run status");
        }

        let run = await response.json();

        // Handle requires_action status
        if (run.status === "requires_action") {
          try {
            run = await handleRequiresAction(run, threadIdToUse);
            // Continue polling after submitting tool outputs
            if (attempts < maxAttempts) {
              attempts++;
              setTimeout(checkStatus, 3000);
              return;
            }
          } catch (err: any) {
            setLoading(false);
            setError(err.message);
            return;
          }
        }

        if (run.status === "completed") {
          setLoading(false);
          // Fetch updated messages
          const messagesResponse = await fetch(
            `/api/threads/${threadIdToUse}/messages`,
            {
              headers: {
                "Content-Type": "application/json",
                "X-OpenAI-Key": keys.openaiKey,
                "X-ICTLife-Key": keys.ictlifeKey,
                "X-ICTLife-User-Id": keys.ictlifeUserId,
              },
            },
          );
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();
            setMessages((messagesData.data || []).reverse());
          }
          return;
        } else if (run.status === "failed" || run.status === "cancelled") {
          setLoading(false);
          setError(
            `Run ${run.status}: ${run.last_error?.message || "Unknown error"}`,
          );
          return;
        } else if (attempts < maxAttempts) {
          // Still in progress, poll again
          attempts++;
          setTimeout(checkStatus, 3000);
        } else {
          setLoading(false);
          setError("Run timed out");
        }
      } catch (err: any) {
        setLoading(false);
        setError(err.message);
      }
    };

    checkStatus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!assistantId) {
    return (
      <div className="chat-interface empty">
        <div className="empty-state">
          <p>Select an assistant to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h3>THREAD</h3>
        {assistantName && (
          <span className="assistant-name">{assistantName}</span>
        )}
      </div>

      {error && <div className="chat-error">{error}</div>}

      <div className="chat-messages">
        {messages.length === 0 && !loading && (
          <div className="empty-chat">
            <p>No messages yet. Start a conversation!</p>
          </div>
        )}

        {messages.map((message) => {
          const textContent =
            message.content.find((c) => c.type === "text")?.text?.value || "";

          return (
            <div
              key={message.id}
              className={`message ${message.role === "user" ? "user-message" : "assistant-message"}`}
            >
              <div className="message-content">
                <div className="message-role">
                  {message.role === "user" ? "You" : "Assistant"}
                </div>
                <div className="message-text">{textContent}</div>
                <div className="message-time">
                  {new Date(message.created_at * 1000).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="message assistant-message">
            <div className="message-content">
              <div className="message-role">Assistant</div>
              <div className="message-text loading">
                <span className="typing-indicator">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <input
            type="text"
            className="chat-input"
            placeholder="Enter your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending || loading || !assistantId}
          />
          <button
            className="send-button"
            onClick={sendMessage}
            disabled={sending || loading || !assistantId || !inputValue.trim()}
          >
            {sending ? "Sending..." : "Run"}
          </button>
        </div>
        <div className="chat-input-hint">Press Enter to send • ⌘ + ⏎</div>
      </div>
    </div>
  );

  async function loadMessages(threadIdToLoad: string) {
    try {
      const keys = getKeys();
      if (!keys) return;

      const response = await fetch(`/api/threads/${threadIdToLoad}/messages`, {
        headers: {
          "Content-Type": "application/json",
          "X-OpenAI-Key": keys.openaiKey,
          "X-ICTLife-Key": keys.ictlifeKey,
          "X-ICTLife-User-Id": keys.ictlifeUserId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((data.data || []).reverse());
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  }
}

export default ChatInterface;
