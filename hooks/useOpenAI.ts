import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIRequest {
  messages?: ChatMessage[];
  prompt?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

interface OpenAIResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason?: string;
}

interface UseOpenAIReturn {
  chat: (request: OpenAIRequest) => Promise<OpenAIResponse>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useOpenAI(): UseOpenAIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const chat = async (request: OpenAIRequest): Promise<OpenAIResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated");
      }

      // Construct endpoint with validation
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
      }
      const OPENAI_ENDPOINT = `${supabaseUrl}/functions/v1/openai-chat`;

      // Make request to Edge Function
      const response = await fetch(OPENAI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        let errorMessage = "Failed to get response from OpenAI";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data: OpenAIResponse = await response.json();
      return data;
    } catch (err: any) {
      const errorMessage = err.message || "An error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    chat,
    isLoading,
    error,
    clearError,
  };
}

