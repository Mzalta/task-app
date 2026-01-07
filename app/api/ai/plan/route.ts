import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();
    const { period } = body;

    // Validate period
    if (period !== "day" && period !== "week") {
      return NextResponse.json(
        { error: "Invalid period. Must be 'day' or 'week'" },
        { status: 400 }
      );
    }

    // Create Supabase client for server-side
    const cookieStore = await cookies();
    const authHeader = request.headers.get("Authorization");
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
        global: authHeader
          ? {
              headers: { Authorization: authHeader },
            }
          : undefined,
      }
    );

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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
    let query = supabase
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
      return NextResponse.json(
        { error: "Failed to fetch tasks" },
        { status: 500 }
      );
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        plan: [],
        message: `No tasks found for this ${period}.`,
      });
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

    if (process.env.OPENAI_API_KEY) {
      try {
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
      } catch (error) {
        console.error("OpenAI error:", error);
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

    return NextResponse.json({
      plan: planWithTasks,
      period,
    });
  } catch (error: any) {
    console.error("Error generating plan:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

