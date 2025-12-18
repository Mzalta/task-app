import { useState, useEffect } from "react";
import { Task } from "@/types/models";
import { createBrowserClient } from '@supabase/ssr'
import {
  TaskState,
  TasksState,
  TaskOperations,
  TasksOperations,
} from "@/types/taskManager";

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const FUNCTION_ENDPOINT = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-task-with-ai`;

interface UseTaskManagerReturn
  extends TaskState,
    TasksState,
    TaskOperations,
    TasksOperations {}

export function useTaskManager(taskId?: string): UseTaskManagerReturn {
  // State for single task management
  const [task, setTask] = useState<Task | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);

  // State for task list management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch single task
  useEffect(() => {
    if (!taskId) return;

    const fetchTask = async () => {
      try {
        const { data: task, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("task_id", taskId)
          .single();

        if (error) throw error;
        setTask(task);
        // Parse due_date - it could be just a date (YYYY-MM-DD) or a full datetime
        if (task.due_date) {
          // Check if it's a datetime string (contains 'T' and ':')
          if (task.due_date.includes("T") && task.due_date.includes(":")) {
            // Always parse as local time by extracting components, ignoring timezone
            // This ensures the time displayed matches what the user entered
            // Format: YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm:ssZ or YYYY-MM-DDTHH:mm:ss+00:00
            let datePart: string;
            let timePart: string;
            
            // Remove timezone indicator if present (Z, +00:00, -05:00, etc.)
            const cleanString = task.due_date.replace(/Z$|[+-]\d{2}:\d{2}$/, "");
            [datePart, timePart] = cleanString.split("T");
            
            const [year, month, day] = datePart.split("-").map(Number);
            // Handle time part that might have seconds or milliseconds
            const timeComponents = timePart.split(":");
            const hours = Number(timeComponents[0]);
            const minutes = Number(timeComponents[1]);
            const seconds = timeComponents[2] ? Number(timeComponents[2].split(".")[0]) : 0;
            
            // Create date using local time components (no timezone conversion)
            const parsedDate = new Date(year, month - 1, day, hours, minutes, seconds || 0);
            setDate(parsedDate);
          } else {
            // Just a date, parse as date-only at midnight local time
            const [year, month, day] = task.due_date.split("-").map(Number);
            setDate(new Date(year, month - 1, day, 0, 0, 0));
          }
        } else {
          setDate(undefined);
        }
      } catch (error: any) {
        console.error(`Error fetching task ID ${taskId}:`, error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  // Fetch all tasks
  useEffect(() => {
    if (taskId) return; // Don't fetch all tasks if we're managing a single task
    fetchTasks();
  }, []);

  // Single task operations
  const updateTask = (updates: Partial<Task>) => {
    setTask((prev) => (prev ? { ...prev, ...updates } : null));
  };

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

  const saveTask = async (taskToSave?: Task) => {
    try {
      const taskData = taskToSave || task;
      if (!taskData) throw new Error("No task data to save");

      // Save full datetime if date includes time, otherwise just date
      let dueDateValue: string | null = null;
      if (date) {
        // Check if the date has time information (not midnight or has been explicitly set with time)
        const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
        if (hasTime) {
          // Save datetime with local timezone offset so Supabase knows it's local time
          dueDateValue = formatLocalDateTime(date);
        } else {
          // Save just the date part
          dueDateValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        }
      }

      const { error } = await supabase
        .from("tasks")
        .update({
          ...taskData,
          due_date: dueDateValue,
          updated_at: new Date().toISOString(),
        })
        .eq("task_id", taskData.task_id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error saving task:", error);
      setError(error.message);
      throw error;
    }
  };

  const uploadImage = async (file: File) => {
    try {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("File size must be less than 1MB");
      }

      if (!task) throw new Error("No task found");

      const fileExt = file.name.split(".").pop();
      const fileName = `${task.user_id}/${task.task_id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
          duplex: "half",
          headers: {
            "content-length": file.size.toString(),
          },
        });

      if (uploadError) throw uploadError;

      const updatedTask = { ...task, image_url: fileName };
      setTask(updatedTask);
      await saveTask(updatedTask);
    } catch (error: any) {
      console.error("Error uploading image:", error);
      setError(error.message);
      throw error;
    }
  };

  const removeImage = async () => {
    try {
      if (!task?.image_url) throw new Error("No image to remove");

      const fileName = task.image_url;
      const { error: storageError } = await supabase.storage
        .from("task-attachments")
        .remove([fileName]);

      if (storageError) throw storageError;

      const updatedTask = { ...task, image_url: null };
      setTask(updatedTask);
      await saveTask(updatedTask);
    } catch (error: any) {
      console.error("Error removing image:", error);
      setError(error.message);
      throw error;
    }
  };

  // Task list operations
  const fetchTasks = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Sort by priority (High → Medium → Low) as secondary sort
      const priorityOrder = { High: 3, Medium: 2, Low: 1 };
      const sortedTasks = (data || []).sort((a, b) => {
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        if (bPriority !== aPriority) {
          return bPriority - aPriority; // High priority first
        }
        // If priorities are equal, maintain created_at order (newest first)
        return 0;
      });
      
      setTasks(sortedTasks);
      setError(null);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createTask = async (title: string, description: string, priority: string = "Medium") => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(FUNCTION_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({ title, description, priority }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to create task";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const taskData = await response.json();
      if (!taskData) throw new Error("No data returned from server");

      setTasks([taskData, ...tasks]);
      setError(null);
      return taskData;
    } catch (error: any) {
      console.error("Error creating task:", error);
      setError(error.message);
      throw error;
    }
  };

  const deleteTask = async (taskIdToDelete: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("task_id", taskIdToDelete);

      if (error) throw error;
      setTasks(tasks.filter((t) => t.task_id !== taskIdToDelete));
      setError(null);
    } catch (error: any) {
      console.error("Error deleting task:", error);
      setError(error.message);
      throw error;
    }
  };

  const toggleTaskComplete = async (
    taskIdToToggle: string,
    completed: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ completed })
        .eq("task_id", taskIdToToggle);

      if (error) throw error;
      setTasks(
        tasks.map((t) =>
          t.task_id === taskIdToToggle ? { ...t, completed } : t
        )
      );
      setError(null);
    } catch (error: any) {
      console.error("Error updating task:", error);
      setError(error.message);
      throw error;
    }
  };

  const refreshTasks = async () => {
    setIsLoading(true);
    await fetchTasks();
  };

  return {
    // State
    task,
    tasks,
    date,
    error,
    isLoading,

    // Single task operations
    setDate,
    updateTask,
    saveTask,
    uploadImage,
    removeImage,

    // Task list operations
    createTask,
    deleteTask,
    toggleTaskComplete,
    refreshTasks,
  };
}
