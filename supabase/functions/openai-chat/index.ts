// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "npm:openai";

// Load environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIRequest {
  messages?: ChatMessage[];
  prompt?: string; // For backward compatibility - converts to messages format
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client to verify user
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if OpenAI API key is configured
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const requestData: OpenAIRequest = await req.json();

    // Validate request
    if (!requestData.messages && !requestData.prompt) {
      return new Response(
        JSON.stringify({ error: "Either 'messages' or 'prompt' is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Convert prompt to messages format if needed
    let messages: ChatMessage[];
    if (requestData.prompt) {
      messages = [{ role: "user", content: requestData.prompt }];
    } else {
      messages = requestData.messages!;
    }

    // Validate messages format
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid messages format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Prepare OpenAI request
    const openaiRequest: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      model: requestData.model || "gpt-4o-mini",
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: requestData.temperature ?? 0.7,
      max_tokens: requestData.max_tokens,
    };

    // Call OpenAI API
    const completion = await openai.chat.completions.create(openaiRequest);

    // Extract response
    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      return new Response(
        JSON.stringify({ error: "No response from OpenAI" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return response
    return new Response(
      JSON.stringify({
        content: responseContent,
        model: completion.model,
        usage: completion.usage,
        finish_reason: completion.choices[0]?.finish_reason,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in openai-chat function:", error);

    // Handle OpenAI-specific errors
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data || {};

      return new Response(
        JSON.stringify({
          error: errorData.error?.message || error.message || "OpenAI API error",
          code: errorData.error?.code,
          type: errorData.error?.type,
        }),
        {
          status: status || 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Handle other errors
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

