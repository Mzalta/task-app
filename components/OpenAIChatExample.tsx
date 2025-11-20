"use client";

import { useState } from "react";
import { useOpenAI } from "@/hooks/useOpenAI";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/**
 * Example component demonstrating how to use the OpenAI Edge Function
 * This is a reference implementation - you can adapt it to your needs
 */
export function OpenAIChatExample() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const { chat, isLoading, error, clearError } = useOpenAI();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResponse("");
    clearError();

    try {
      // Option 1: Simple prompt (converted to messages automatically)
      const result = await chat({
        prompt: prompt,
        model: "gpt-4o-mini",
        temperature: 0.7,
      });

      setResponse(result.content);
    } catch (err) {
      // Error is already set in the hook
      console.error("Error calling OpenAI:", err);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResponse("");
    clearError();

    try {
      // Option 2: Full messages array (for conversations)
      const result = await chat({
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "gpt-4o-mini",
        temperature: 0.7,
      });

      setResponse(result.content);
    } catch (err) {
      console.error("Error calling OpenAI:", err);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h2 className="text-xl font-bold">OpenAI Chat Example</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="prompt">Your Prompt</Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            rows={4}
            required
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isLoading || !prompt}>
            {isLoading ? "Sending..." : "Send (Simple)"}
          </Button>
          <Button
            type="button"
            onClick={handleChatSubmit}
            disabled={isLoading || !prompt}
            variant="outline"
          >
            {isLoading ? "Sending..." : "Send (Chat)"}
          </Button>
        </div>
      </form>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          Error: {error}
        </div>
      )}

      {response && (
        <div className="space-y-2">
          <Label>Response</Label>
          <div className="p-3 bg-gray-50 border rounded text-sm whitespace-pre-wrap">
            {response}
          </div>
        </div>
      )}
    </div>
  );
}

