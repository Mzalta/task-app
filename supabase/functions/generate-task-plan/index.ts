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

interface Task {
  task_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  completed: boolean | null;
}

interface PlanItem {
  task_id: string;
  suggested_order: number;
  short_reason: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { period } = await req.json();

    // Validate period
    if (period !== "day" && period !== "week") {
      return new Response(
        JSON.stringify({ error: "Invalid period. Must be 'day' or 'week'" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`🔄 Generating ${period} plan...`);
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

    // Calculate date range based on period
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = new Date(today);

    if (period === "day") {
      // Tasks due today or overdue
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Tasks due within the next 7 days
      endDate.setDate(endDate.getDate() + 7);
      endDate.setHours(23, 59, 59, 999);
    }

    // Fetch relevant tasks
    let query = supabaseClient
      .from("tasks")
      .select("task_id, title, description, due_date, priority, completed")
      .eq("user_id", user.id)
      .eq("completed", false);

    if (period === "day") {
      // Tasks due today or overdue (due_date <= end of today)
      query = query.lte("due_date", endDate.toISOString());
    } else {
      // Tasks due within the next 7 days
      query = query
        .gte("due_date", today.toISOString())
        .lte("due_date", endDate.toISOString());
    }

    const { data: tasks, error: tasksError } = await query;

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tasks" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({
          plan: [],
          message: `No tasks found for this ${period}.`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Sort tasks by due_date asc, priority desc
    const sortedTasks = [...tasks].sort((a, b) => {
      // First sort by due_date (ascending)
      if (a.due_date && b.due_date) {
        const dateA = new Date(a.due_date).getTime();
        const dateB = new Date(b.due_date).getTime();
        if (dateA !== dateB) {
          return dateA - dateB;
        }
      } else if (a.due_date && !b.due_date) {
        return -1;
      } else if (!a.due_date && b.due_date) {
        return 1;
      }

      // Then sort by priority (descending: High > Medium > Low)
      const priorityOrder: Record<string, number> = {
        High: 3,
        Medium: 2,
        Low: 1,
      };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      return bPriority - aPriority;
    });

    // Prepare task list for OpenAI
    const taskListJson = JSON.stringify(
      sortedTasks.map((task) => ({
        task_id: task.task_id,
        title: task.title,
        description: task.description || "",
        due_date: task.due_date || "",
        priority: task.priority,
      }))
    );

    // Call OpenAI to generate plan
    let plan: PlanItem[] = [];
    let aiError = false;

    if (OPENAI_API_KEY && ENABLE_OPENAI) {
      try {
        const openai = new OpenAI({
          apiKey: OPENAI_API_KEY,
        });

        const prompt = `You are a productivity assistant.

Given the tasks below, generate a realistic and achievable plan for the ${period}.
Prioritize urgency and impact.
Do not over-schedule.
Return ONLY valid JSON.

Each item must include:
- task_id
- suggested_order
- short_reason

Tasks:
${taskListJson}

Return a JSON object with a "plan" array containing objects with this exact structure:
{
  "plan": [
    {
      "task_id": "uuid",
      "suggested_order": 1,
      "short_reason": "Brief explanation"
    }
  ]
}`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a productivity assistant. Always return valid JSON only, no markdown, no commentary. Return a JSON object with a 'plan' array.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          // Parse the JSON response
          const parsed = JSON.parse(content);
          // Extract plan array from response
          plan = parsed.plan || parsed.items || [];

          // Validate plan structure
          if (
            Array.isArray(plan) &&
            plan.every(
              (item) =>
                item.task_id &&
                typeof item.suggested_order === "number" &&
                typeof item.short_reason === "string"
            )
          ) {
            // Sort by suggested_order
            plan.sort((a, b) => a.suggested_order - b.suggested_order);
          } else {
            aiError = true;
          }
        } else {
          aiError = true;
        }
      } catch (openaiError: any) {
        console.error("OpenAI error:", openaiError);
        aiError = true;
      }
    } else {
      aiError = true;
    }

    // Fallback: if AI fails, return sorted tasks without AI reasoning
    if (aiError || plan.length === 0) {
      plan = sortedTasks.map((task, index) => ({
        task_id: task.task_id,
        suggested_order: index + 1,
        short_reason: `Task ${index + 1} based on due date and priority`,
      }));
    }

    // Merge plan with full task data
    const planWithTasks = plan.map((item) => {
      const task = sortedTasks.find((t) => t.task_id === item.task_id);
      return {
        ...item,
        task: task || null,
      };
    });

    return new Response(
      JSON.stringify({
        plan: planWithTasks,
        period,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error generating plan:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

