import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Upload, CalendarIcon, Trash2, Clock } from "lucide-react";
import { format, startOfToday, isToday, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateTaskFormProps {
  onSubmit: (
    title: string,
    description: string,
    dueDate: Date | undefined,
    imageFile: File | null,
    priority: string
  ) => Promise<void>;
}

export function CreateTaskForm({ onSubmit }: CreateTaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dueTime, setDueTime] = useState<string>("");
  const [priority, setPriority] = useState<string>("Medium");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combine date and time into a single Date object
  const getCombinedDateTime = (): Date | undefined => {
    if (!dueDate) return undefined;
    
    if (dueTime) {
      const [hours, minutes] = dueTime.split(":").map(Number);
      // Create a fresh date using local time components to avoid timezone issues
      const year = dueDate.getFullYear();
      const month = dueDate.getMonth();
      const day = dueDate.getDate();
      const combinedDate = new Date(year, month, day, hours, minutes, 0);
      return combinedDate;
    }
    
    // Create a fresh date at midnight to avoid timezone issues
    const year = dueDate.getFullYear();
    const month = dueDate.getMonth();
    const day = dueDate.getDate();
    return new Date(year, month, day, 0, 0, 0);
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDueDate(selectedDate);
    // If date is cleared, clear time too
    if (!selectedDate) {
      setDueTime("");
    } else if (isToday(selectedDate) && dueTime) {
      // If today is selected and there's a time, validate it's not in the past
      const [hours, minutes] = dueTime.split(":").map(Number);
      const now = new Date();
      const selectedDateTime = new Date(selectedDate);
      selectedDateTime.setHours(hours, minutes, 0, 0);
      
      if (selectedDateTime < now) {
        // Clear invalid past time
        setDueTime("");
      }
    }
  };

  // Check if a date is disabled (past dates)
  const isDateDisabled = (date: Date) => {
    return isPast(date) && !isToday(date);
  };

  // Get minimum time for today (current time + 1 minute to avoid selecting past times)
  const getMinTime = (): string => {
    if (!dueDate || !isToday(dueDate)) {
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
    if (!dueDate || !newTime) {
      setDueTime(newTime);
      return;
    }

    // If today, validate time is not in the past
    if (isToday(dueDate)) {
      const [hours, minutes] = newTime.split(":").map(Number);
      const selectedDateTime = new Date(dueDate);
      selectedDateTime.setHours(hours, minutes, 0, 0);
      const now = new Date();

      if (selectedDateTime < now) {
        // Don't allow past time
        return;
      }
    }

    setDueTime(newTime);
  };

  const handleImageUpload = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setError(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleImageUpload,
    accept: {
      "image/jpeg": [],
      "image/png": [],
    },
    maxFiles: 1,
  });

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      // Get combined datetime with both date and time
      const combinedDateTime = getCombinedDateTime();
      await onSubmit(title, description, combinedDateTime, imageFile, priority);
      // Reset form
      setTitle("");
      setDescription("");
      setDueDate(undefined);
      setDueTime("");
      setPriority("Medium");
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
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
        <input {...getInputProps()} disabled={isSubmitting} />
        <Upload
          className={cn(
            "w-10 h-10 mx-auto mb-3 transition-colors",
            isDragActive ? "text-primary" : "text-muted-foreground"
          )}
        />
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

  const renderImageDisplay = () => {
    if (!imagePreview) return null;
    return (
      <div className="space-y-3">
        <div className="relative w-full max-w-xs h-48 rounded-lg overflow-hidden border border-border shadow-sm transition-all hover:shadow-md">
          <Image
            src={imagePreview}
            alt="Task image preview"
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
          disabled={isSubmitting}
          className="transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Remove Image
        </Button>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title"
          required
          disabled={isSubmitting}
          className="transition-all"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter task description (optional)"
          rows={4}
          disabled={isSubmitting}
          className="transition-all resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label>Priority</Label>
        <Select
          value={priority}
          onValueChange={setPriority}
          disabled={isSubmitting}
        >
          <SelectTrigger className="transition-all">
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
                disabled={isSubmitting}
                className={cn(
                  "w-full justify-start text-left font-normal transition-all",
                  !dueDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
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
                disabled={isSubmitting || !dueDate}
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
                  disabled={isSubmitting || !dueDate}
                  min={getMinTime()}
                  className="transition-all text-base"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {dueDate && dueTime && (
          <p className="text-xs text-muted-foreground">
            Due: {format(getCombinedDateTime()!, "MMM d, yyyy 'at' h:mm a")}
          </p>
        )}
        {dueDate && isToday(dueDate) && !dueTime && (
          <p className="text-xs text-muted-foreground">
            Select a time in the future
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Attach Image</Label>
        <div className="space-y-3">
          {imagePreview ? renderImageDisplay() : renderImageUpload()}
        </div>
      </div>

      {error && (
        <div
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-w-[120px] transition-all hover:shadow-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Task"
          )}
        </Button>
      </div>
    </form>
  );
}
