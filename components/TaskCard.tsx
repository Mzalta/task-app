"use client";

import { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { Edit2, Trash2, Calendar, Flag } from "lucide-react";
import { getLabelColors } from "@/lib/labels";
import { Task } from "@/types/models";
import { cn } from "@/lib/utils";
import { format, isToday, isPast, isTomorrow } from "date-fns";

interface TaskCardProps {
  task: Task;
  onDelete: (taskId: string) => Promise<void>;
  onToggleComplete: (taskId: string, completed: boolean) => Promise<void>;
  onUpdateTitle?: (taskId: string, title: string) => Promise<void>;
}

const TaskCard = ({ task, onDelete, onToggleComplete, onUpdateTitle }: TaskCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title || "");
  const inputRef = useRef<HTMLInputElement>(null);

  const isCompleted = task.completed || false;

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editTitle.trim() && editTitle !== task.title && onUpdateTitle) {
      await onUpdateTitle(task.task_id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(task.title || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const hasTime = dateString.includes("T") && dateString.includes(":") && 
                      !!dateString.match(/\d{2}:\d{2}/);
      
      if (hasTime) {
        let datePart: string;
        let timePart: string;
        const cleanString = dateString.replace(/Z$|[+-]\d{2}:\d{2}$/, "");
        [datePart, timePart] = cleanString.split("T");
        
        const [year, month, day] = datePart.split("-").map(Number);
        const timeComponents = timePart.split(":");
        const hours = Number(timeComponents[0]);
        const minutes = Number(timeComponents[1]);
        const seconds = timeComponents[2] ? Number(timeComponents[2].split(".")[0]) : 0;
        
        const date = new Date(year, month - 1, day, hours, minutes, seconds || 0);
        
        if (isToday(date)) {
          return format(date, "'Today at' h:mm a");
        } else if (isTomorrow(date)) {
          return format(date, "'Tomorrow at' h:mm a");
        } else if (isPast(date)) {
          return format(date, "MMM d, yyyy 'at' h:mm a");
        }
        return format(date, "MMM d 'at' h:mm a");
      } else {
        const [year, month, day] = dateString.split("-").map(Number);
        const date = new Date(year, month - 1, day, 0, 0, 0);
        
        if (isToday(date)) {
          return "Today";
        } else if (isTomorrow(date)) {
          return "Tomorrow";
        } else if (isPast(date)) {
          return format(date, "MMM d, yyyy");
        }
        return format(date, "MMM d");
      }
    } catch {
      return dateString.split("T")[0];
    }
  };

  const getDateStatus = (dateString: string) => {
    try {
      const hasTime = dateString.includes("T");
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
      
      if (isPast(date) && !isToday(date)) return "overdue";
      if (isToday(date)) return "today";
      if (isTomorrow(date)) return "tomorrow";
      return "upcoming";
    } catch {
      return "upcoming";
    }
  };

  const getPriorityColor = (priority: string | null | undefined) => {
    if (!priority) return "text-muted-foreground";
    switch (priority) {
      case "High":
        return "text-red-600";
      case "Medium":
        return "text-amber-600";
      case "Low":
        return "text-emerald-600";
      default:
        return "text-muted-foreground";
    }
  };

  const getPriorityDot = (priority: string | null | undefined) => {
    if (!priority) return "bg-muted";
    switch (priority) {
      case "High":
        return "bg-red-500";
      case "Medium":
        return "bg-amber-500";
      case "Low":
        return "bg-emerald-500";
      default:
        return "bg-muted";
    }
  };

  const dateStatus = task.due_date ? getDateStatus(task.due_date) : null;

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card transition-all duration-200",
        "hover:border-border hover:shadow-sm",
        isCompleted && "opacity-60",
        !isCompleted && "hover:shadow-md"
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox */}
        <div className="pt-0.5">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={(checked) =>
              onToggleComplete(task.task_id, checked as boolean)
            }
            className="transition-all"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-start gap-2 mb-2">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="flex-1 text-base font-medium bg-transparent border-none outline-none focus:ring-0 p-0"
              />
            ) : (
              <Link
                href={`/task?id=${task.task_id}`}
                className={cn(
                  "flex-1 text-base font-medium text-foreground transition-colors",
                  "hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded px-1 -mx-1",
                  isCompleted && "line-through text-muted-foreground"
                )}
                onClick={(e) => {
                  if (e.detail === 2) {
                    // Double click to edit
                    e.preventDefault();
                    setIsEditing(true);
                  }
                }}
              >
                {task.title}
              </Link>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* Label */}
            {task.label && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-normal",
                  getLabelColors(task.label)["bg-color"],
                  getLabelColors(task.label)["text-color"],
                  getLabelColors(task.label)["border-color"]
                )}
              >
                {task.label}
              </Badge>
            )}

            {/* Priority */}
            {task.priority && (
              <div className="flex items-center gap-1.5 text-xs">
                <div className={cn("w-1.5 h-1.5 rounded-full", getPriorityDot(task.priority))} />
                <span className={cn("font-medium", getPriorityColor(task.priority))}>
                  {task.priority}
                </span>
              </div>
            )}

            {/* Due Date */}
            {task.due_date && (
              <div
                className={cn(
                  "flex items-center gap-1.5 text-xs",
                  dateStatus === "overdue" && !isCompleted
                    ? "text-red-600 font-medium"
                    : dateStatus === "today"
                    ? "text-amber-600 font-medium"
                    : "text-muted-foreground"
                )}
              >
                <Calendar className="h-3 w-3" />
                <span>{formatDate(task.due_date)}</span>
              </div>
            )}

            {/* Image indicator */}
            {task.image_url && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="relative w-8 h-8 rounded overflow-hidden border border-border">
                  <Image
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/task-attachments/${task.image_url}`}
                    alt=""
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsEditing(true)}
            title="Edit title"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(task.task_id)}
            title="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
