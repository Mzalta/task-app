"use client";

import { useState } from "react";
import { useTaskManager } from "@/hooks/useTaskManager";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import TaskList from "@/components/TaskList";
import { CreateTaskForm } from "@/components/CreateTaskForm";
import { PlusCircle, ClipboardList, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function Dashboard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { 
    createTask, 
    refreshTasks, 
    tasks, 
    deleteTask, 
    toggleTaskComplete
  } = useTaskManager();

  const handleCreateTask = async (
    title: string,
    description: string,
    dueDate: Date | undefined,
    imageFile: File | null,
    priority: string
  ) => {
    try {
      // Create the task first (this calls the AI function)
      const newTask = await createTask(title, description, priority);
      
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      // Get user session for image upload
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      // Helper function to format date in local time with timezone offset
      const formatLocalDateTime = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");
        
        // Get timezone offset in minutes and convert to HH:MM format
        const offsetMinutes = date.getTimezoneOffset();
        const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
        const offsetMins = Math.abs(offsetMinutes) % 60;
        const offsetSign = offsetMinutes <= 0 ? "+" : "-";
        const offsetString = `${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMins).padStart(2, "0")}`;
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetString}`;
      };

      // Prepare updates
      const updates: any = {};
      if (dueDate) {
        // dueDate is already the combined datetime from getCombinedDateTime()
        // Always use explicit local time components to avoid any timezone issues
        const year = dueDate.getFullYear();
        const month = dueDate.getMonth();
        const day = dueDate.getDate();
        const hours = dueDate.getHours();
        const minutes = dueDate.getMinutes();
        
        // Check if it has time information (not midnight)
        const hasTime = hours !== 0 || minutes !== 0 || dueDate.getSeconds() !== 0;
        if (hasTime) {
          // Save datetime with local timezone offset so Supabase knows it's local time
          // Get timezone offset in minutes and convert to HH:MM format
          const offsetMinutes = dueDate.getTimezoneOffset();
          const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
          const offsetMins = Math.abs(offsetMinutes) % 60;
          const offsetSign = offsetMinutes <= 0 ? "+" : "-";
          const offsetString = `${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMins).padStart(2, "0")}`;
          
          updates.due_date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00${offsetString}`;
        } else {
          // Save just the date part
          updates.due_date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        }
      }

      // Upload image if provided
      let fileName: string | undefined;
      if (imageFile) {
        if (imageFile.size > MAX_FILE_SIZE) {
          throw new Error("Image size must be less than 5MB");
        }

        const fileExt = imageFile.name.split(".").pop();
        fileName = `${session.user.id}/${newTask.task_id}.${fileExt}`;
        
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

      // Update task with all additional fields if any
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        const { error } = await supabase
          .from("tasks")
          .update(updates)
          .eq("task_id", newTask.task_id);

        if (error) throw error;
      }

      await refreshTasks();
      console.log(`New Task Created: ${title}`);
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating task:", error);
      throw error;
    }
  };

  const completedTasks = tasks.filter((task) => task.completed).length;
  const totalTasks = tasks.length;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage and track your tasks efficiently
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="transition-all hover:shadow-md">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new task to your list. Fill in the details below.
              </DialogDescription>
            </DialogHeader>
            <CreateTaskForm onSubmit={handleCreateTask} />
          </DialogContent>
        </Dialog>
      </div>

      {totalTasks > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="transition-all hover:shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Tasks
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {totalTasks}
                  </p>
                </div>
                <div className="rounded-full bg-primary/10 p-3">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="transition-all hover:shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Completed
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {completedTasks}
                  </p>
                </div>
                <div className="rounded-full bg-green-500/10 p-3">
                  <Sparkles className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="transition-all hover:shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Progress
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {totalTasks > 0 
                      ? Math.round((completedTasks / totalTasks) * 100)
                      : 0}%
                  </p>
                </div>
                <div className="rounded-full bg-blue-500/10 p-3">
                  <div className="h-5 w-5 rounded-full bg-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tasks.length > 0 ? (
        <Card className="transition-all hover:shadow-md">
          <CardContent className="p-0">
            <TaskList
              tasks={tasks}
              onDelete={deleteTask}
              onToggleComplete={toggleTaskComplete}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed transition-all hover:shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No tasks yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Get started by creating your first task. Click the button above to add one.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(true)}
              className="transition-all hover:shadow-sm"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create your first task
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
