import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface WeeklyStats {
  totalTasks: number;
  completedTasks: number;
  incompleteTasks: number;
  completionRate: number;
  missedDeadlines: number;
  tasksByCategory: Record<string, number>;
}

function getWeekBounds(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setHours(23, 59, 59, 999);
  
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  
  return { weekStart, weekEnd };
}

function formatDateForDB(date: Date): string {
  return date.toISOString();
}

function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function authenticateUser(
  request: NextRequest
): Promise<{ supabase: any; userId: string }> {
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader) {
    throw new Error("No authorization header");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return { supabase, userId: user.id };
}

async function fetchTasks(
  supabase: any,
  userId: string,
  weekStart: Date,
  weekEnd: Date
) {
  // Fetch tasks created in the last 7 days
  // We use created_at to determine which tasks were active during this period
  const weekEndWithTime = new Date(weekEnd);
  weekEndWithTime.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", formatDateForDB(weekStart))
    .lte("created_at", formatDateForDB(weekEndWithTime))
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

function computeStats(tasks: any[]): WeeklyStats {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const incompleteTasks = totalTasks - completedTasks;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Count missed deadlines (tasks with due_date that passed and are incomplete)
  const now = new Date();
  const missedDeadlines = tasks.filter((task) => {
    if (task.completed || !task.due_date) return false;
    const dueDate = new Date(task.due_date);
    return dueDate < now;
  }).length;

  // Count tasks by category (label)
  const tasksByCategory: Record<string, number> = {};
  tasks.forEach((task) => {
    const category = task.label || "uncategorized";
    tasksByCategory[category] = (tasksByCategory[category] || 0) + 1;
  });

  return {
    totalTasks,
    completedTasks,
    incompleteTasks,
    completionRate,
    missedDeadlines,
    tasksByCategory,
  };
}

async function getCachedSummary(
  supabase: any,
  userId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<string | null> {
  const { data, error } = await supabase
    .from("weekly_summaries")
    .select("summary_text")
    .eq("user_id", userId)
    .eq("week_start", weekStart.toISOString().split("T")[0])
    .eq("week_end", weekEnd.toISOString().split("T")[0])
    .maybeSingle();

  if (error) {
    console.error("Error fetching cached summary:", error);
    return null;
  }

  return data?.summary_text || null;
}

async function cacheSummary(
  supabase: any,
  userId: string,
  weekStart: Date,
  weekEnd: Date,
  summaryText: string
) {
  const weekStartStr = weekStart.toISOString().split("T")[0];
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  // Try to update first
  const { data: existing, error: selectError } = await supabase
    .from("weekly_summaries")
    .select("summary_id")
    .eq("user_id", userId)
    .eq("week_start", weekStartStr)
    .eq("week_end", weekEndStr)
    .maybeSingle();

  if (selectError) {
    console.error("Error checking for existing summary:", selectError);
    return;
  }

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from("weekly_summaries")
      .update({ summary_text: summaryText })
      .eq("summary_id", existing.summary_id);

    if (error) {
      console.error("Error updating cached summary:", error);
    }
  } else {
    // Insert new
    const { error } = await supabase.from("weekly_summaries").insert({
      user_id: userId,
      week_start: weekStartStr,
      week_end: weekEndStr,
      summary_text: summaryText,
    });

    if (error) {
      console.error("Error caching summary:", error);
      // Don't throw - caching failure shouldn't break the response
    }
  }
}

function generateFallbackSummary(stats: WeeklyStats): string {
  let summary = `Weekly Summary (Last 7 Days)\n\n`;
  summary += `You had ${stats.totalTasks} total tasks this week. `;
  summary += `You completed ${stats.completedTasks} of them, `;
  summary += `giving you a ${stats.completionRate}% completion rate. `;

  if (stats.missedDeadlines > 0) {
    summary += `You missed ${stats.missedDeadlines} deadline${stats.missedDeadlines > 1 ? "s" : ""}. `;
  }

  if (stats.completionRate >= 80) {
    summary += `Great job staying on top of your tasks! `;
  } else if (stats.completionRate >= 50) {
    summary += `You're making progress. `;
  } else {
    summary += `Consider breaking down larger tasks into smaller steps. `;
  }

  if (Object.keys(stats.tasksByCategory).length > 0) {
    const topCategory = Object.entries(stats.tasksByCategory).sort(
      ([, a], [, b]) => b - a
    )[0];
    if (topCategory) {
      summary += `Your most active category was ${topCategory[0]} with ${topCategory[1]} tasks. `;
    }
  }

  summary += `Keep up the momentum for next week!`;

  return summary;
}

async function generateAISummary(
  stats: WeeklyStats,
  authHeader: string
): Promise<string> {
  try {
    const FUNCTION_ENDPOINT = `${SUPABASE_URL}/functions/v1/generate-weekly-summary`;

    const response = await fetch(FUNCTION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ weeklyStats: stats }),
    });

    if (!response.ok) {
      throw new Error(`Edge Function failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.summary || generateFallbackSummary(stats);
  } catch (error) {
    console.error("Error calling Edge Function:", error);
    return generateFallbackSummary(stats);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, userId } = await authenticateUser(request);
    const { weekStart, weekEnd } = getWeekBounds();
    const regenerate = request.nextUrl.searchParams.get("regenerate") === "true";

    // Check cache first (unless regenerating)
    if (!regenerate) {
      const cachedSummary = await getCachedSummary(
        supabase,
        userId,
        weekStart,
        weekEnd
      );
      if (cachedSummary) {
        return NextResponse.json({
          summary: cachedSummary,
          weekStart: formatDateForDisplay(weekStart),
          weekEnd: formatDateForDisplay(weekEnd),
          cached: true,
        });
      }
    }

    // Fetch tasks from last 7 days
    const tasks = await fetchTasks(supabase, userId, weekStart, weekEnd);

    // Compute stats
    const stats = computeStats(tasks);

    // Generate summary
    const authHeader = request.headers.get("authorization") || "";
    const summaryText = await generateAISummary(stats, authHeader);

    // Cache the summary
    await cacheSummary(supabase, userId, weekStart, weekEnd, summaryText);

    return NextResponse.json({
      summary: summaryText,
      weekStart: formatDateForDisplay(weekStart),
      weekEnd: formatDateForDisplay(weekEnd),
      cached: false,
    });
  } catch (error: any) {
    console.error("Error in weekly-summary API:", error);
    
    if (error.message === "Unauthorized" || error.message === "No authorization header") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

