"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Save,
  Upload,
  CalendarIcon,
  ArrowLeft,
  Trash2,
  AlertOctagon,
  Clock,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { useTaskManager } from "@/hooks/useTaskManager";
import { Task } from "@/types/models";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { useDropzone } from "react-dropzone";

function TaskForm() {
  const params = useSearchParams();
  const router = useRouter();
  const taskId = params.get("id")!;
  const {
    task,
    date,
    setDate,
    updateTask,
    saveTask,
    uploadImage,
    removeImage,
    error,
  } = useTaskManager(taskId);
  const { session } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  
  // Track if the original task had time (not just midnight)
  const [hasOriginalTime, setHasOriginalTime] = useState<boolean>(false);
  
  // Extract time from date or initialize empty
  // Only extract time if the original task had time explicitly set
  const getTimeFromDate = (dateValue: Date | undefined, hasTime: boolean): string => {
    if (!dateValue) return "";
    // Only extract time if the original task had time information
    // If the original task didn't have time, return empty string (even if date is at midnight)
    if (!hasTime) {
      return "";
    }
    // Use getHours() and getMinutes() which return local time
    const hours = dateValue.getHours().toString().padStart(2, "0");
    const minutes = dateValue.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };
  
  const [dueTime, setDueTime] = useState<string>("");
  
  // Update time when date changes or task loads
  useEffect(() => {
    if (task?.due_date) {
      // Check if the original due_date had time information
      const hasTime = task.due_date.includes("T") && task.due_date.includes(":") && 
                      !!task.due_date.match(/\d{2}:\d{2}/);
      setHasOriginalTime(hasTime);
    }
  }, [task?.due_date]);
  
  // Update time when date changes
  useEffect(() => {
    // Only update if date is actually loaded
    if (date) {
      setDueTime(getTimeFromDate(date, hasOriginalTime));
    } else {
      setDueTime("");
    }
  }, [date, hasOriginalTime]);

  // Combine date and time into a single Date object for saving
  const getCombinedDateTime = (): Date | undefined => {
    if (!date) return undefined;
    
    // Always create a fresh date using local time components to avoid timezone issues
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    if (dueTime) {
      const [hours, minutes] = dueTime.split(":").map(Number);
      return new Date(year, month, day, hours, minutes, 0);
    }
    
    // If no time, create at midnight local time
    return new Date(year, month, day, 0, 0, 0);
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      setDate(undefined);
      setDueTime("");
      return;
    }
    
    // Preserve the existing time when changing the date
    // Create a new date with the selected date but keep the current time
    const currentTime = dueTime ? dueTime.split(":").map(Number) : [0, 0];
    const newDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      currentTime[0],
      currentTime[1],
      0
    );
    
    setDate(newDate);
    
    // If today is selected and there's a time, validate it's not in the past
    if (isToday(selectedDate) && dueTime) {
      const [hours, minutes] = currentTime;
      const now = new Date();
      const selectedDateTime = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        hours,
        minutes,
        0
      );
      
      if (selectedDateTime < now) {
        // Clear invalid past time
        setDueTime("");
        // Update date to midnight since time was cleared
        setDate(new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          0, 0, 0
        ));
      }
    }
  };

  // Check if a date is disabled (past dates)
  const isDateDisabled = (date: Date) => {
    return isPast(date) && !isToday(date);
  };

  // Get minimum time for today (current time + 1 minute to avoid selecting past times)
  const getMinTime = (): string => {
    if (!date || !isToday(date)) {
      return ""; // No minimum if not today
    }
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = (now.getMinutes() + 1).toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // Validate time change
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    if (!date || !newTime) {
      setDueTime(newTime);
      return;
    }

    // If today, validate time is not in the past
    if (isToday(date)) {
      const [hours, minutes] = newTime.split(":").map(Number);
      const selectedDateTime = new Date(date);
      selectedDateTime.setHours(hours, minutes, 0, 0);
      const now = new Date();

      if (selectedDateTime < now) {
        // Don't allow past time
        return;
      }
    }

    setDueTime(newTime);
  };

  const handleImageUpload = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      setUploading(true);
      await uploadImage(file);
      toast({
        title: "✅ Image Uploaded",
        description: "Image uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "❌ Upload Failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleImageUpload,
    accept: {
      "image/jpeg": [],
      "image/png": [],
    },
    maxFiles: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Combine date and time before saving
      const combinedDateTime = getCombinedDateTime();
      if (combinedDateTime) {
        setDate(combinedDateTime);
      }
      await saveTask();
      toast({
        title: "✅ Task Updated",
        description: "Task updated successfully",
      });
      // Navigate back to dashboard after successful save
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const handleRemoveImage = async () => {
    try {
      await removeImage();
      toast({
        title: "✅ Image Removed",
        description: "Image removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "❌ Remove Failed",
        description: error.message || "Failed to remove image",
        variant: "destructive",
      });
    }
  };

  const renderImageDisplay = () => {
    return (
      <div className="space-y-3">
        <div className="relative w-full max-w-xs h-48 rounded-lg overflow-hidden border border-border shadow-sm transition-all hover:shadow-md">
          <Image
            src={`${
              process.env.NEXT_PUBLIC_SUPABASE_URL
            }/storage/v1/object/public/task-attachments/${task!.image_url}`}
            alt="Task attachment"
            fill
            sizes="320px"
            className="object-cover"
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleRemoveImage}
          className="transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Remove Image
        </Button>
      </div>
    );
  };

  const renderImageUpload = () => {
    return (
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
          isDragActive 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
      >
        <input {...getInputProps()} />
        <Upload className={cn(
          "w-10 h-10 mx-auto mb-3 transition-colors",
          isDragActive ? "text-primary" : "text-muted-foreground"
        )} />
        {isDragActive ? (
          <p className="text-sm font-medium text-primary">
            Drop the image here...
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Drag and drop an image here, or click to select
            </p>
            <p className="text-xs text-muted-foreground">
              Supports: JPEG, PNG (Max 5MB)
            </p>
          </div>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <Card className="max-w-3xl mx-auto border-destructive/50">
        <CardContent className="p-12 text-center">
          <div className="rounded-full bg-destructive/10 p-4 mb-4 inline-flex">
            <AlertOctagon className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Error loading task
          </h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!task) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-10 bg-muted rounded-lg w-1/3"></div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="h-10 bg-muted rounded-lg"></div>
            <div className="h-24 bg-muted rounded-lg"></div>
            <div className="h-10 bg-muted rounded-lg w-1/2"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Task Details
            </h1>
            {task.priority && (
              <Badge
                variant="outline"
                className={cn(
                  "text-sm",
                  task.priority === "High" && "text-red-600 border-red-300",
                  task.priority === "Medium" && "text-yellow-600 border-yellow-300",
                  task.priority === "Low" && "text-green-600 border-green-300"
                )}
              >
                {task.priority} Priority
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit and manage your task information
          </p>
        </div>
      </div>

      <Card className="transition-all hover:shadow-md">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={task.title || ""}
                onChange={(e) => updateTask({ title: e.target.value })}
                placeholder="Enter task title"
                className="transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={task.description || ""}
                onChange={(e) => updateTask({ description: e.target.value })}
                placeholder="Enter task description"
                rows={4}
                className="transition-all resize-none"
              />
            </div>

            <div className="flex items-center space-x-2 rounded-md border p-4 bg-muted/30">
              <Checkbox
                id="completed"
                checked={task.completed || false}
                onCheckedChange={(checked) =>
                  updateTask({ completed: checked as boolean })
                }
              />
              <Label
                htmlFor="completed"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Mark as completed
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={task.priority || "Medium"}
                onValueChange={(value) => updateTask({ priority: value })}
              >
                <SelectTrigger id="priority" className="transition-all">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date & Time</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal transition-all",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={handleDateSelect}
                      disabled={isDateDisabled}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!date}
                      className={cn(
                        "w-full justify-start text-left font-normal transition-all",
                        !dueTime && "text-muted-foreground"
                      )}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      {dueTime ? (
                        format(new Date(`2000-01-01T${dueTime}`), "h:mm a")
                      ) : (
                        <span>Pick a time (optional)</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-4">
                      <Input
                        type="time"
                        value={dueTime}
                        onChange={handleTimeChange}
                        disabled={!date}
                        min={getMinTime()}
                        className="transition-all text-base"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              {date && dueTime && (
                <p className="text-xs text-muted-foreground">
                  Due: {format(getCombinedDateTime()!, "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
              {date && isToday(date) && !dueTime && (
                <p className="text-xs text-muted-foreground">
                  Select a time in the future
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Attach Image</Label>
              <div className="space-y-3">
                {task.image_url ? renderImageDisplay() : renderImageUpload()}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
              <Button 
                type="button" 
                variant="outline" 
                asChild
                className="w-full sm:w-auto transition-all hover:shadow-sm"
              >
                <Link href="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cancel
                </Link>
              </Button>
              <Button 
                type="submit" 
                className="w-full sm:w-auto transition-all hover:shadow-md"
                disabled={uploading}
              >
                <Save className="mr-2 h-4 w-4" />
                {uploading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TaskDetail() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TaskForm />
    </Suspense>
  );
}
