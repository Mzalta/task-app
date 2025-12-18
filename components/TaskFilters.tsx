"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { X, Filter, SortAsc } from "lucide-react";
import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";

export type FilterStatus = "all" | "open" | "completed";
export type SortOption = "newest" | "oldest" | "priority" | "dueDate" | "title";

interface TaskFiltersProps {
  status: FilterStatus;
  onStatusChange: (status: FilterStatus) => void;
  selectedLabels: string[];
  onLabelToggle: (label: string) => void;
  selectedPriorities: string[];
  onPriorityToggle: (priority: string) => void;
  dueDateFilter: string;
  onDueDateFilterChange: (filter: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  isMobile?: boolean;
  onClose?: () => void;
}

const TaskFilters = ({
  status,
  onStatusChange,
  selectedLabels,
  onLabelToggle,
  selectedPriorities,
  onPriorityToggle,
  dueDateFilter,
  onDueDateFilterChange,
  sortBy,
  onSortChange,
  isMobile = false,
  onClose,
}: TaskFiltersProps) => {
  const hasActiveFilters =
    status !== "all" ||
    selectedLabels.length > 0 ||
    selectedPriorities.length > 0 ||
    dueDateFilter !== "all";

  const clearAllFilters = () => {
    onStatusChange("all");
    selectedLabels.forEach(onLabelToggle);
    selectedPriorities.forEach(onPriorityToggle);
    onDueDateFilterChange("all");
  };

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Filters & Sort</h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-7 text-xs"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Status Filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Status</Label>
        <div className="flex gap-2">
          <Button
            variant={status === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => onStatusChange("all")}
            className="flex-1 text-xs"
          >
            All
          </Button>
          <Button
            variant={status === "open" ? "default" : "outline"}
            size="sm"
            onClick={() => onStatusChange("open")}
            className="flex-1 text-xs"
          >
            Open
          </Button>
          <Button
            variant={status === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => onStatusChange("completed")}
            className="flex-1 text-xs"
          >
            Done
          </Button>
        </div>
      </div>

      {/* Sort */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Sort by</Label>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="dueDate">Due date</SelectItem>
            <SelectItem value="title">Title (A-Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Priority Filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Priority</Label>
        <div className="space-y-2">
          {["High", "Medium", "Low"].map((priority) => (
            <div key={priority} className="flex items-center space-x-2">
              <Checkbox
                id={`priority-${priority}`}
                checked={selectedPriorities.includes(priority)}
                onCheckedChange={() => onPriorityToggle(priority)}
              />
              <Label
                htmlFor={`priority-${priority}`}
                className="text-sm font-normal cursor-pointer"
              >
                {priority}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Label Filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Labels</Label>
        <div className="space-y-2">
          {labels.map((label) => (
            <div key={label.value} className="flex items-center space-x-2">
              <Checkbox
                id={`label-${label.value}`}
                checked={selectedLabels.includes(label.value)}
                onCheckedChange={() => onLabelToggle(label.value)}
              />
              <Label
                htmlFor={`label-${label.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {label.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Due Date Filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Due Date</Label>
        <Select value={dueDateFilter} onValueChange={onDueDateFilterChange}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="tomorrow">Tomorrow</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-background p-4 overflow-y-auto">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Filters</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 shrink-0 border-r bg-muted/30 p-4">
      {content}
    </div>
  );
};

export default TaskFilters;
