// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "npm:openai";

// Load environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
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
    const { weeklyStats } = await req.json();

    if (!weeklyStats) {
      throw new Error("weeklyStats is required");
    }

    console.log("🔄 Generating weekly summary...");
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

    // Generate summary using OpenAI
    let summaryText = "";
    if (OPENAI_API_KEY && ENABLE_OPENAI) {
      try {
        const openai = new OpenAI({
          apiKey: OPENAI_API_KEY,
        });

        const prompt = `You are a supportive productivity coach.

Analyze the user's last 7 days of task activity.
Highlight:
- What went well
- What was challenging
- One gentle suggestion for next week

Keep the tone supportive and human.
Return plain text only.

EFFORT ESTIMATES:
- Effort estimates are approximate.
- Use them only to identify broad workload patterns.
- Do not overemphasize precision.

Weekly stats:
${JSON.stringify(weeklyStats, null, 2)}`;

        const completion = await openai.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "gpt-4o-mini",
          temperature: 0.7,
          max_tokens: 500,
        });

        summaryText = completion.choices[0].message.content?.trim() || "";
        console.log("✨ AI Generated Summary");
      } catch (openaiError: any) {
        console.error("OpenAI API Error:", openaiError);
        // Fallback to stats-based summary
        summaryText = generateFallbackSummary(weeklyStats);
      }
    } else {
      // Fallback to stats-based summary
      summaryText = generateFallbackSummary(weeklyStats);
    }

    return new Response(JSON.stringify({ summary: summaryText }), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in generate-weekly-summary:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateFallbackSummary(stats: any): string {
  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  let summary = `Weekly Summary (Last 7 Days)\n\n`;
  summary += `You had ${stats.totalTasks} total tasks this week. `;
  summary += `You completed ${stats.completedTasks} of them, `;
  summary += `giving you a ${completionRate}% completion rate. `;

  if (stats.missedDeadlines > 0) {
    summary += `You missed ${stats.missedDeadlines} deadline${stats.missedDeadlines > 1 ? "s" : ""}. `;
  }

  if (completionRate >= 80) {
    summary += `Great job staying on top of your tasks! `;
  } else if (completionRate >= 50) {
    summary += `You're making progress. `;
  } else {
    summary += `Consider breaking down larger tasks into smaller steps. `;
  }

  if (Object.keys(stats.tasksByCategory).length > 0) {
    const topCategory = Object.entries(stats.tasksByCategory)
      .sort(([, a]: any, [, b]: any) => b - a)[0];
    if (topCategory) {
      summary += `Your most active category was ${topCategory[0]} with ${topCategory[1]} tasks. `;
    }
  }

  summary += `Keep up the momentum for next week!`;

  return summary;
}

