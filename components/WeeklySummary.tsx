"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { RefreshCw, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklySummaryData {
  summary: string;
  weekStart: string;
  weekEnd: string;
  cached: boolean;
}

export function WeeklySummary() {
  const [summaryData, setSummaryData] = useState<WeeklySummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRegenerateTime, setLastRegenerateTime] = useState<number | null>(null);

  const RATE_LIMIT_MS = 60000; // 1 minute rate limit

  const fetchSummary = async (regenerate = false) => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Not authenticated");
        setIsLoading(false);
        return;
      }

      const url = regenerate
        ? "/api/ai/weekly-summary?regenerate=true"
        : "/api/ai/weekly-summary";

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Unauthorized");
        } else {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.error || "Failed to fetch summary");
        }
        setIsLoading(false);
        setIsRegenerating(false);
        return;
      }

      const data = await response.json();
      setSummaryData(data);
      setError(null);
      
      if (regenerate) {
        setLastRegenerateTime(Date.now());
      }
    } catch (err: any) {
      console.error("Error fetching weekly summary:", err);
      setError(err.message || "Failed to fetch summary");
    } finally {
      setIsLoading(false);
      setIsRegenerating(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleRegenerate = () => {
    const now = Date.now();
    if (lastRegenerateTime && now - lastRegenerateTime < RATE_LIMIT_MS) {
      const remainingSeconds = Math.ceil(
        (RATE_LIMIT_MS - (now - lastRegenerateTime)) / 1000
      );
      setError(`Please wait ${remainingSeconds} seconds before regenerating`);
      return;
    }

    setIsRegenerating(true);
    setError(null);
    fetchSummary(true);
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Weekly Summary</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error && !summaryData) {
    return (
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Weekly Summary</h2>
        </div>
        <div className="text-sm text-destructive mb-4">{error}</div>
        <Button onClick={() => fetchSummary()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!summaryData) {
    return null;
  }

  return (
    <div className="border rounded-lg p-6 bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Weekly Summary</h2>
        </div>
        <Button
          onClick={handleRegenerate}
          variant="outline"
          size="sm"
          disabled={isRegenerating}
          className="gap-2"
        >
          {isRegenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Regenerating...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Regenerate</span>
            </>
          )}
        </Button>
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        {summaryData.weekStart} - {summaryData.weekEnd}
      </div>

      {error && (
        <div className="text-sm text-destructive mb-4">{error}</div>
      )}

      <div className="prose prose-sm max-w-none">
        <p className="whitespace-pre-line text-sm leading-relaxed">
          {summaryData.summary}
        </p>
      </div>
    </div>
  );
}

