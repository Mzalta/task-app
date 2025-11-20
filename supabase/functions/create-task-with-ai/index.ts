// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "npm:openai";

// Load environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
// Set to "false" to temporarily disable OpenAI calls (useful when hitting quota limits)
const ENABLE_OPENAI = Deno.env.get("ENABLE_OPENAI") !== "false";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { title, description } = await req.json();

    console.log("🔄 Creating task with AI suggestions...");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Initialize Supabase client
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get user session
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("No user found");

    // Create the task
    const { data, error } = await supabaseClient
      .from("tasks")
      .insert({
        title,
        description,
        completed: false,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Try to get label suggestion from OpenAI (optional - don't fail if it errors)
    // Skip OpenAI if API key is not configured, disabled, or if we're hitting quota issues
    let label = null;
    if (OPENAI_API_KEY && ENABLE_OPENAI) {
      try {
        const openai = new OpenAI({
          apiKey: OPENAI_API_KEY,
        });

        const prompt = `Based on this task title: "${title}" and description: "${description}", suggest ONE of these labels: work, personal, priority, shopping, home. Reply with just the label word and nothing else.`;

        const completion = await openai.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "gpt-4o-mini",
          temperature: 0.3,
          max_tokens: 16,
        });

        const suggestedLabel = completion.choices[0].message.content
          ?.toLowerCase()
          .trim();

        console.log(`✨ AI Suggested Label: ${suggestedLabel}`);

        // Validate the label
        const validLabels = ["work", "personal", "priority", "shopping", "home"];
        label = validLabels.includes(suggestedLabel) ? suggestedLabel : null;

        // Update the task with the suggested label if we got one
        if (label) {
          const { data: updatedTask, error: updateError } = await supabaseClient
            .from("tasks")
            .update({ label })
            .eq("task_id", data.task_id)
            .select()
            .single();

          if (updateError) {
            console.error("Error updating task with label:", updateError);
            // Don't throw - return the task without the label
          } else {
            return new Response(JSON.stringify(updatedTask), {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }
        }
      } catch (openaiError: any) {
        // Log full error details for debugging
        const errorStatus = openaiError.status || openaiError.response?.status || openaiError.statusCode;
        const errorMessage = openaiError.message || JSON.stringify(openaiError);
        const errorCode = openaiError.code || openaiError.response?.data?.error?.code;
        const errorType = openaiError.type || openaiError.response?.data?.error?.type;
        
        console.error("OpenAI API Error Details:", {
          status: errorStatus,
          code: errorCode,
          type: errorType,
          message: errorMessage,
          fullError: openaiError
        });
        
        // Check if it's a quota/rate limit error (429)
        const isQuotaError = 
          errorStatus === 429 || 
          errorMessage?.toLowerCase().includes("quota") ||
          errorMessage?.toLowerCase().includes("429") ||
          errorCode === "rate_limit_exceeded";
        
        if (isQuotaError) {
          // Log quota error but don't fail - task will be created without label
          console.warn("⚠️ OpenAI quota exceeded - task created without AI label");
        } else {
          // Log other OpenAI errors with full details
          console.error(`❌ OpenAI error (task will be created without label): Status ${errorStatus}, Code: ${errorCode}, Message: ${errorMessage}`);
        }
        // Don't throw - task creation should succeed even if OpenAI fails
      }
    }

    // Return the task (with or without label)
    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error in create-task-with-ai:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
