import express from "express";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to get keys from request
function getKeysFromRequest(req) {
  // Try to get from headers first (for security)
  const openaiApiKey = req.headers["x-openai-key"] || req.body?.openaiKey;
  const ictlifeApiKey = req.headers["x-ictlife-key"] || req.body?.ictlifeKey;
  const ictlifeUserId =
    req.headers["x-ictlife-user-id"] || req.body?.ictlifeUserId;

  return { openaiApiKey, ictlifeApiKey, ictlifeUserId };
}

// Helper function to create OpenAI client
function createOpenAIClient(apiKey) {
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

// Helper function to make ICTLife API requests
async function makeICTLifeRequest(url, apiKey) {
  const response = await fetch(url, {
    headers: {
      "X-ICTLIFE-TOKEN": apiKey,
      "X-CLIENT-IDENTIFIER": "web",
      "X-ICTLIFE-APPLICATION": "group",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ICTLife API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// API Routes

// Get groups from ICTLife API
app.get("/api/groups", async (req, res) => {
  try {
    const { ictlifeApiKey, ictlifeUserId } = getKeysFromRequest(req);

    if (!ictlifeApiKey || !ictlifeUserId) {
      return res.status(400).json({
        error:
          "ICTLife API key and user ID are required. Please provide them in headers or body.",
      });
    }

    const page = req.query.page || 1;
    const status = req.query.status || "active";
    const url = `https://stage.api.ictlife.com/v1/groups?page=${page}&status=${status}&user_id=${ictlifeUserId}`;

    const data = await makeICTLifeRequest(url, ictlifeApiKey);
    res.json(data);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get assistants for a specific group
app.get("/api/groups/:groupUuid/assistants", async (req, res) => {
  try {
    const { ictlifeApiKey } = getKeysFromRequest(req);

    if (!ictlifeApiKey) {
      return res.status(400).json({
        error: "ICTLife API key is required",
      });
    }

    const { groupUuid } = req.params;
    const per = req.query.per || 100;
    const url = `https://stage.api.ictlife.com/v1/group/${groupUuid}/ai_assistants?per=${per}`;

    const data = await makeICTLifeRequest(url, ictlifeApiKey);
    res.json(data);
  } catch (error) {
    console.error("Error fetching assistants:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get assistant details from OpenAI
app.get("/api/assistants/:assistantId", async (req, res) => {
  try {
    const { openaiApiKey } = getKeysFromRequest(req);

    if (!openaiApiKey) {
      return res.status(400).json({
        error: "OpenAI API key is required",
      });
    }

    const openai = createOpenAIClient(openaiApiKey);
    const { assistantId } = req.params;
    const assistant = await openai.beta.assistants.retrieve(assistantId);
    res.json(assistant);
  } catch (error) {
    console.error("Error fetching assistant from OpenAI:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add tool to assistant
app.post("/api/assistants/:assistantId/tools", async (req, res) => {
  try {
    const { openaiApiKey } = getKeysFromRequest(req);

    if (!openaiApiKey) {
      return res.status(400).json({
        error: "OpenAI API key is required",
      });
    }

    const openai = createOpenAIClient(openaiApiKey);
    const { assistantId } = req.params;

    // Retrieve current assistant
    const currentAssistant = await openai.beta.assistants.retrieve(assistantId);

    // Define the new function
    // Step 1: Assistant calls with user_message, system returns agents
    // Step 2: Assistant calls again with selected_agent, system executes assignment
    const newFunction = {
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

    // Check if function already exists
    const existingTools = currentAssistant.tools || [];
    const functionExists = existingTools.some(
      (tool) =>
        tool.type === "function" &&
        tool.function?.name === "assign_chat_to_agent",
    );

    if (functionExists) {
      return res.status(400).json({
        error: "Function assign_chat_to_agent already exists",
      });
    }

    // Merge existing tools with new function
    const updatedTools = [...existingTools, newFunction];

    // Update assistant
    const updatedAssistant = await openai.beta.assistants.update(assistantId, {
      tools: updatedTools,
    });

    res.json(updatedAssistant);
  } catch (error) {
    console.error("Error adding tool to assistant:", error);
    res.status(500).json({ error: error.message });
  }
});

// Thread Management Routes

// Create a new thread
app.post("/api/threads", async (req, res) => {
  try {
    const { openaiApiKey } = getKeysFromRequest(req);

    if (!openaiApiKey) {
      return res.status(400).json({
        error: "OpenAI API key is required",
      });
    }

    const openai = createOpenAIClient(openaiApiKey);
    const thread = await openai.beta.threads.create();
    res.json(thread);
  } catch (error) {
    console.error("Error creating thread:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get thread messages
app.get("/api/threads/:threadId/messages", async (req, res) => {
  try {
    const { openaiApiKey } = getKeysFromRequest(req);

    if (!openaiApiKey) {
      return res.status(400).json({
        error: "OpenAI API key is required",
      });
    }

    const openai = createOpenAIClient(openaiApiKey);
    const { threadId } = req.params;
    const messages = await openai.beta.threads.messages.list(threadId);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add a message to a thread
app.post("/api/threads/:threadId/messages", async (req, res) => {
  try {
    const { openaiApiKey } = getKeysFromRequest(req);

    if (!openaiApiKey) {
      return res.status(400).json({
        error: "OpenAI API key is required",
      });
    }

    const openai = createOpenAIClient(openaiApiKey);
    const { threadId } = req.params;
    const { content, role = "user" } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // OpenAI API expects content as an array of objects
    const message = await openai.beta.threads.messages.create(threadId, {
      role: role,
      content: typeof content === "string" ? content : content,
    });

    res.json(message);
  } catch (error) {
    console.error("Error adding message:", error);
    res.status(500).json({ error: error.message });
  }
});

// Run the assistant on a thread
app.post("/api/threads/:threadId/runs", async (req, res) => {
  try {
    const { openaiApiKey } = getKeysFromRequest(req);

    if (!openaiApiKey) {
      return res.status(400).json({
        error: "OpenAI API key is required",
      });
    }

    const openai = createOpenAIClient(openaiApiKey);
    const { threadId } = req.params;
    const { assistantId } = req.body;

    if (!assistantId) {
      return res.status(400).json({ error: "assistantId is required" });
    }

    // Check if assistant has assign_chat_to_agent function
    const assistant = await openai.beta.assistants.retrieve(assistantId);
    const hasChatAssignmentFunction =
      assistant.tools &&
      Array.isArray(assistant.tools) &&
      assistant.tools.some(
        (tool) =>
          tool.type === "function" &&
          tool.function?.name === "assign_chat_to_agent",
      );

    // Prepare run options
    const runOptions = {
      assistant_id: assistantId,
    };

    // Add additional instructions if function exists
    if (hasChatAssignmentFunction) {
      runOptions.additional_instructions =
        "When you need to assign a chat to a human agent (when user asks to speak with a human or when you lack sufficient knowledge), use the assign_chat_to_agent function in two steps: 1) First, call it with just the user_message - the system will return a list of available agents. 2) Then, analyze the user's message and each agent's role/expertise to select the most appropriate agent, and call the function again with your selected_agent. After the second call, you will receive a confirmation message. Use this confirmation to inform the customer about the specific agent (include their name and role) who has been assigned and will be in touch with them shortly.";
    }

    const run = await openai.beta.threads.runs.create(threadId, runOptions);

    res.json(run);
  } catch (error) {
    console.error("Error creating run:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get run status
app.get("/api/threads/:threadId/runs/:runId", async (req, res) => {
  try {
    const { openaiApiKey } = getKeysFromRequest(req);

    if (!openaiApiKey) {
      return res.status(400).json({
        error: "OpenAI API key is required",
      });
    }

    const openai = createOpenAIClient(openaiApiKey);
    const { threadId, runId } = req.params;
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);
    res.json(run);
  } catch (error) {
    console.error("Error fetching run:", error);
    res.status(500).json({ error: error.message });
  }
});

// Submit tool outputs
app.post(
  "/api/threads/:threadId/runs/:runId/submit-tool-outputs",
  async (req, res) => {
    try {
      const { openaiApiKey } = getKeysFromRequest(req);

      if (!openaiApiKey) {
        return res.status(400).json({
          error: "OpenAI API key is required",
        });
      }

      const openai = createOpenAIClient(openaiApiKey);
      const { threadId, runId } = req.params;
      const { tool_outputs } = req.body;

      if (!tool_outputs || !Array.isArray(tool_outputs)) {
        return res.status(400).json({
          error: "tool_outputs array is required",
        });
      }

      // Submit tool outputs and poll for completion
      const run = await openai.beta.threads.runs.submitToolOutputsAndPoll(
        threadId,
        runId,
        {
          tool_outputs: tool_outputs,
        },
      );

      res.json(run);
    } catch (error) {
      console.error("Error submitting tool outputs:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Get agents (mock data)
app.get("/api/agents", async (req, res) => {
  try {
    // Mock agent data
    const agents = [
      {
        agent_id: "agent_1",
        agent_name: "John Smith",
        agent_role: "Technical Support Specialist",
      },
      {
        agent_id: "agent_2",
        agent_name: "Sarah Johnson",
        agent_role: "Sales Representative",
      },
      {
        agent_id: "agent_3",
        agent_name: "Mike Davis",
        agent_role: "Billing Specialist",
      },
      {
        agent_id: "agent_4",
        agent_name: "Emily Chen",
        agent_role: "Customer Success Manager",
      },
      {
        agent_id: "agent_5",
        agent_name: "David Wilson",
        agent_role: "Product Specialist",
      },
    ];

    res.json(agents);
  } catch (error) {
    console.error("Error fetching agents:", error);
    res.status(500).json({ error: error.message });
  }
});

// Execute assign_chat_to_agent function
// This handles two scenarios:
// 1. First call: Assistant provides user_message, system returns list of agents
// 2. Second call: Assistant provides selected_agent, system executes assignment
app.post("/api/functions/assign_chat_to_agent", async (req, res) => {
  try {
    const { user_message, selected_agent } = req.body;

    if (!user_message) {
      return res.status(400).json({ error: "user_message is required" });
    }

    // Step 1: Assistant called with just user_message - return list of agents
    if (!selected_agent || !selected_agent.agent_id) {
      // Fetch available agents from the system
      // In a real scenario, this would query the database
      // For now, we use the same mock data as the GET /api/agents endpoint
      const availableAgents = [
        {
          agent_id: "agent_1",
          agent_name: "John Smith",
          agent_role: "Technical Support Specialist",
        },
        {
          agent_id: "agent_2",
          agent_name: "Sarah Johnson",
          agent_role: "Sales Representative",
        },
        {
          agent_id: "agent_3",
          agent_name: "Mike Davis",
          agent_role: "Billing Specialist",
        },
        {
          agent_id: "agent_4",
          agent_name: "Emily Chen",
          agent_role: "Customer Success Manager",
        },
        {
          agent_id: "agent_5",
          agent_name: "David Wilson",
          agent_role: "Product Specialist",
        },
      ];

      return res.json({
        output: JSON.stringify({
          message:
            "Here are the available agents. Please analyze the user's message and select the most appropriate agent based on their role and expertise.",
          available_agents: availableAgents,
          user_message: user_message,
        }),
        available_agents: availableAgents,
      });
    }

    // Step 2: Assistant called with selected_agent - execute assignment
    // Mock: Internal function to perform actual assignment (simulating DB operations)
    const performAssignment = async (agent) => {
      // Simulate database operations
      // In real scenario: Update chat record, assign agent, create assignment log, etc.
      console.log(
        `[MOCK DB] Assigning chat to agent: ${agent.agent_id} (${agent.agent_name})`,
      );
      console.log(`[MOCK DB] Creating assignment record in database...`);
      console.log(`[MOCK DB] Updating chat status to 'assigned'...`);
      console.log(`[MOCK DB] Notifying agent ${agent.agent_name}...`);

      // Simulate async operation
      await new Promise((resolve) => setTimeout(resolve, 100));

      return {
        success: true,
        assignment_id: `assignment_${Date.now()}`,
        assigned_at: new Date().toISOString(),
      };
    };

    // Execute assignment with the agent selected by the Assistant
    const assignmentResult = await performAssignment(selected_agent);

    if (!assignmentResult.success) {
      return res.status(500).json({ error: "Failed to assign chat to agent" });
    }

    // Return success message that the Assistant can use to inform the customer
    const successMessage = `Assignment successful. ${selected_agent.agent_name} (${selected_agent.agent_role}) has been assigned to this conversation. Assignment ID: ${assignmentResult.assignment_id}. Please inform the customer that ${selected_agent.agent_name} will be in touch with them shortly.`;

    res.json({
      output: successMessage,
      assigned_agent: selected_agent,
      assignment_id: assignmentResult.assignment_id,
    });
  } catch (error) {
    console.error("Error executing assign_chat_to_agent function:", error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
