"use client";

import { useState, useMemo } from "react";
import { useTaskManager } from "@/hooks/useTaskManager";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import TaskCard from "@/components/TaskCard";
import { CreateTaskForm } from "@/components/CreateTaskForm";
import TaskFilters, { FilterStatus, SortOption } from "@/components/TaskFilters";
import { Plus, Filter, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Task } from "@/types/models";
import { cn } from "@/lib/utils";
import { isToday, isPast, isTomorrow } from "date-fns";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function Dashboard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [dueDateFilter, setDueDateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const {
    createTask,
    refreshTasks,
    tasks,
    deleteTask,
    toggleTaskComplete,
    updateTask,
    saveTask,
  } = useTaskManager();

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered: Task[] = [...tasks];

    // Status filter
    if (statusFilter === "open") {
      filtered = filtered.filter((task) => !task.completed);
    } else if (statusFilter === "completed") {
      filtered = filtered.filter((task) => task.completed);
    }

    // Label filter
    if (selectedLabels.length > 0) {
      filtered = filtered.filter(
        (task) => task.label && selectedLabels.includes(task.label)
      );
    }

    // Priority filter
    if (selectedPriorities.length > 0) {
      filtered = filtered.filter(
        (task) => task.priority && selectedPriorities.includes(task.priority)
      );
    }

    // Due date filter
    if (dueDateFilter !== "all") {
      filtered = filtered.filter((task) => {
        if (!task.due_date) return false;
        try {
          const hasTime = task.due_date.includes("T");
          let date: Date;
          
          if (hasTime) {
            const cleanString = task.due_date.replace(/Z$|[+-]\d{2}:\d{2}$/, "");
            const [datePart, timePart] = cleanString.split("T");
            const [year, month, day] = datePart.split("-").map(Number);
            const timeComponents = timePart.split(":");
            const hours = Number(timeComponents[0]);
            const minutes = Number(timeComponents[1]);
            date = new Date(year, month - 1, day, hours, minutes, 0);
          } else {
            const [year, month, day] = task.due_date.split("-").map(Number);
            date = new Date(year, month - 1, day, 0, 0, 0);
          }

          switch (dueDateFilter) {
            case "overdue":
              return isPast(date) && !isToday(date);
            case "today":
              return isToday(date);
            case "tomorrow":
              return isTomorrow(date);
            case "upcoming":
              return !isPast(date) || isToday(date);
            default:
              return true;
          }
        } catch {
          return false;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          );
        case "oldest":
          return (
            new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
          );
        case "priority": {
          const priorityOrder = { High: 3, Medium: 2, Low: 1 };
          const aPriority =
            priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          const bPriority =
            priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          if (bPriority !== aPriority) return bPriority - aPriority;
          return (
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          );
        }
        case "dueDate": {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        case "title":
          return (a.title || "").localeCompare(b.title || "");
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    tasks,
    statusFilter,
    selectedLabels,
    selectedPriorities,
    dueDateFilter,
    sortBy,
  ]);

  const handleCreateTask = async (
    title: string,
    description: string,
    dueDate: Date | undefined,
    imageFile: File | null,
    priority: string
  ) => {
    try {
      const newTask = await createTask(title, description, priority);

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      const formatLocalDateTime = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");

        const offsetMinutes = date.getTimezoneOffset();
        const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
        const offsetMins = Math.abs(offsetMinutes) % 60;
        const offsetSign = offsetMinutes <= 0 ? "+" : "-";
        const offsetString = `${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMins).padStart(2, "0")}`;

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetString}`;
      };

      const updates: any = {};
      if (dueDate) {
        const year = dueDate.getFullYear();
        const month = dueDate.getMonth();
        const day = dueDate.getDate();
        const hours = dueDate.getHours();
        const minutes = dueDate.getMinutes();

        const hasTime = hours !== 0 || minutes !== 0 || dueDate.getSeconds() !== 0;
        if (hasTime) {
          const offsetMinutes = dueDate.getTimezoneOffset();
          const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
          const offsetMins = Math.abs(offsetMinutes) % 60;
          const offsetSign = offsetMinutes <= 0 ? "+" : "-";
          const offsetString = `${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMins).padStart(2, "0")}`;

          updates.due_date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00${offsetString}`;
        } else {
          updates.due_date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        }
      }

      if (imageFile) {
        if (imageFile.size > MAX_FILE_SIZE) {
          throw new Error("Image size must be less than 5MB");
        }

        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${session.user.id}/${newTask.task_id}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("task-attachments")
          .upload(fileName, imageFile, {
            upsert: true,
            contentType: imageFile.type,
            duplex: "half",
            headers: {
              "content-length": imageFile.size.toString(),
            },
          });

        if (uploadError) throw uploadError;
        updates.image_url = fileName;
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        const { error } = await supabase
          .from("tasks")
          .update(updates)
          .eq("task_id", newTask.task_id);

        if (error) throw error;
      }

      await refreshTasks();
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating task:", error);
      throw error;
    }
  };

  const handleUpdateTitle = async (taskId: string, title: string) => {
    const task = tasks.find((t) => t.task_id === taskId);
    if (!task) return;

    updateTask({ ...task, title });
    await saveTask({ ...task, title });
    await refreshTasks();
  };

  const handleLabelToggle = (label: string) => {
    setSelectedLabels((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
  };

  const handlePriorityToggle = (priority: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority)
        ? prev.filter((p) => p !== priority)
        : [...prev, priority]
    );
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Main Container */}
      <div className="mx-auto max-w-7xl">
        <div className="flex">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block">
            <TaskFilters
              status={statusFilter}
              onStatusChange={setStatusFilter}
              selectedLabels={selectedLabels}
              onLabelToggle={handleLabelToggle}
              selectedPriorities={selectedPriorities}
              onPriorityToggle={handlePriorityToggle}
              dueDateFilter={dueDateFilter}
              onDueDateFilterChange={setDueDateFilter}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="p-4 sm:p-6 lg:p-8">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      Tasks
                    </h1>
                    {totalCount > 0 && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {completedCount} of {totalCount} completed
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Mobile Filters */}
                    <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="lg:hidden">
                          <Filter className="h-4 w-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-80 p-0">
                        <div className="p-4">
                          <TaskFilters
                            status={statusFilter}
                            onStatusChange={setStatusFilter}
                            selectedLabels={selectedLabels}
                            onLabelToggle={handleLabelToggle}
                            selectedPriorities={selectedPriorities}
                            onPriorityToggle={handlePriorityToggle}
                            dueDateFilter={dueDateFilter}
                            onDueDateFilterChange={setDueDateFilter}
                            sortBy={sortBy}
                            onSortChange={setSortBy}
                            isMobile
                            onClose={() => setIsMobileFiltersOpen(false)}
                          />
                        </div>
                      </SheetContent>
                    </Sheet>

                    {/* Create Task Button */}
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="default" className="gap-2">
                          <Plus className="h-4 w-4" />
                          <span className="hidden sm:inline">New Task</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Create New Task</DialogTitle>
                          <DialogDescription>
                            Add a new task to your list
                          </DialogDescription>
                        </DialogHeader>
                        <CreateTaskForm onSubmit={handleCreateTask} />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>

              {/* Task List */}
              {filteredAndSortedTasks.length > 0 ? (
                <div className="space-y-3">
                  {filteredAndSortedTasks.map((task) => (
                    <TaskCard
                      key={task.task_id}
                      task={task}
                      onDelete={deleteTask}
                      onToggleComplete={toggleTaskComplete}
                      onUpdateTitle={handleUpdateTitle}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-lg">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {tasks.length === 0 ? "No tasks yet" : "No tasks match your filters"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    {tasks.length === 0
                      ? "Get started by creating your first task"
                      : "Try adjusting your filters to see more tasks"}
                  </p>
                  {tasks.length === 0 && (
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create your first task
                    </Button>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Floating Action Button - Mobile */}
      <div className="fixed bottom-6 right-6 lg:hidden z-40">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>Add a new task to your list</DialogDescription>
            </DialogHeader>
            <CreateTaskForm onSubmit={handleCreateTask} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
