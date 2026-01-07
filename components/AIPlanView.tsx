"use client";

import { Task } from "@/types/models";
import { Button } from "@/components/ui/button";
import { X, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface PlanItem {
  task_id: string;
  suggested_order: number;
  short_reason: string;
  task: Task | null;
}

interface AIPlanViewProps {
  isOpen: boolean;
  onClose: () => void;
  period: "day" | "week";
  plan: PlanItem[];
  isLoading: boolean;
  error: string | null;
}

export function AIPlanView({
  isOpen,
  onClose,
  period,
  plan,
  isLoading,
  error,
}: AIPlanViewProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date";
    try {
      const hasTime = dateString.includes("T") && dateString.includes(":");
      let date: Date;

      if (hasTime) {
        const cleanString = dateString.replace(/Z$|[+-]\d{2}:\d{2}$/, "");
        const [datePart, timePart] = cleanString.split("T");
        const [year, month, day] = datePart.split("-").map(Number);
        const timeComponents = timePart.split(":");
        const hours = Number(timeComponents[0]);
        const minutes = Number(timeComponents[1]);
        date = new Date(year, month - 1, day, hours, minutes, 0);
      } else {
        const [year, month, day] = dateString.split("-").map(Number);
        date = new Date(year, month - 1, day, 0, 0, 0);
      }

      if (hasTime) {
        return format(date, "MMM d, yyyy 'at' h:mm a");
      } else {
        return format(date, "MMM d, yyyy");
      }
    } catch {
      return dateString.split("T")[0];
    }
  };

  const getPriorityColor = (priority: string | null | undefined) => {
    if (!priority) return "text-muted-foreground";
    switch (priority) {
      case "High":
        return "text-red-600 font-semibold";
      case "Medium":
        return "text-yellow-600 font-medium";
      case "Low":
        return "text-green-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Plan for My {period === "day" ? "Day" : "Week"}
          </DialogTitle>
          <DialogDescription>
            {period === "day"
              ? "Your optimized task plan for today"
              : "Your optimized task plan for the next 7 days"}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
            <p className="text-sm text-muted-foreground">
              Generating your personalized plan...
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {!isLoading && !error && plan.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No tasks found for this {period}.
            </p>
          </div>
        )}

        {!isLoading && !error && plan.length > 0 && (
          <div className="space-y-4 mt-4">
            {plan.map((item) => (
              <div
                key={item.task_id}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-sm">
                    {item.suggested_order}
                  </div>
                  <div className="flex-1 min-w-0">
                    {item.task ? (
                      <>
                        <h3 className="font-semibold text-base mb-1">
                          {item.task.title}
                        </h3>
                        {item.task.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {item.task.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {item.task.due_date && (
                            <span>{formatDate(item.task.due_date)}</span>
                          )}
                          {item.task.priority && (
                            <span className={getPriorityColor(item.task.priority)}>
                              {item.task.priority} Priority
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Task not found
                      </p>
                    )}
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-purple-700 font-medium">
                        💡 {item.short_reason}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-xs text-purple-800">
                <strong>Note:</strong> This is an advisory plan. Tasks are not
                automatically reordered. You can still manage your tasks as
                usual.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

