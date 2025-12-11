import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { Edit, Trash2 } from "lucide-react";
import { getLabelColors } from "@/lib/labels";
import { Task } from "@/types/models";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TaskRowProps {
  task: Task;
  onDelete: (taskId: string) => void;
  onToggleComplete: (taskId: string, completed: boolean) => void;
}

const TaskRow = ({ task, onDelete, onToggleComplete }: TaskRowProps) => {
  const formatDate = (dateString: string) => {
    try {
      // Check if the date includes time information
      const hasTime = dateString.includes("T") && dateString.includes(":") && 
                      dateString.match(/\d{2}:\d{2}/);
      
      if (hasTime) {
        // Always parse as local time by extracting components, ignoring timezone
        // This ensures the time displayed matches what the user entered
        // Format: YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm:ssZ or YYYY-MM-DDTHH:mm:ss+00:00
        let datePart: string;
        let timePart: string;
        
        // Remove timezone indicator if present (Z, +00:00, -05:00, etc.)
        const cleanString = dateString.replace(/Z$|[+-]\d{2}:\d{2}$/, "");
        [datePart, timePart] = cleanString.split("T");
        
        const [year, month, day] = datePart.split("-").map(Number);
        // Handle time part that might have seconds or milliseconds
        const timeComponents = timePart.split(":");
        const hours = Number(timeComponents[0]);
        const minutes = Number(timeComponents[1]);
        const seconds = timeComponents[2] ? Number(timeComponents[2].split(".")[0]) : 0;
        
        // Create date using local time components (no timezone conversion)
        const date = new Date(year, month - 1, day, hours, minutes, seconds || 0);
        
        // Format with date and time
        return format(date, "MMM d, yyyy 'at' h:mm a");
      } else {
        // Just a date, parse it as local midnight
        const [year, month, day] = dateString.split("-").map(Number);
        const date = new Date(year, month - 1, day, 0, 0, 0);
        return format(date, "MMM d, yyyy");
      }
    } catch {
      return dateString.split("T")[0];
    }
  };

  const isCompleted = task.completed || false;

  return (
    <TableRow 
      className={cn(
        "transition-colors hover:bg-muted/50 border-b",
        isCompleted && "opacity-60"
      )}
    >
      <TableCell className="py-4">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={(checked) =>
            onToggleComplete(task.task_id, checked as boolean)
          }
          className="transition-all"
        />
      </TableCell>
      <TableCell className="py-4 hidden sm:table-cell">
        {task.image_url && (
          <Link 
            href={`/task?id=${task.task_id}`}
            className="block transition-transform hover:scale-105"
          >
            <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border shadow-sm">
              <Image
                src={`${
                  process.env.NEXT_PUBLIC_SUPABASE_URL
                }/storage/v1/object/public/task-attachments/${task.image_url}`}
                alt={task.title || "Task image"}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
          </Link>
        )}
      </TableCell>
      <TableCell className="py-4">
        <Link
          href={`/task?id=${task.task_id}`}
          className={cn(
            "font-medium text-foreground transition-colors hover:text-primary",
            isCompleted && "line-through"
          )}
        >
          {task.title}
        </Link>
        {task.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
            {task.description}
          </p>
        )}
      </TableCell>
      <TableCell className="py-4 hidden md:table-cell">
        {task.label && (
          <Badge
            variant="outline"
            className={cn(
              "transition-all hover:shadow-sm",
              getLabelColors(task.label)["bg-color"],
              getLabelColors(task.label)["text-color"],
              getLabelColors(task.label)["border-color"]
            )}
          >
            {task.label}
          </Badge>
        )}
      </TableCell>
      <TableCell className="py-4 hidden lg:table-cell">
        {task.due_date ? (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {formatDate(task.due_date)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right py-4">
        <div className="flex items-center justify-end gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            asChild 
            className="h-8 w-8 transition-all hover:bg-primary/10 hover:text-primary"
          >
            <Link href={`/task?id=${task.task_id}`}>
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 transition-all hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(task.task_id)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default TaskRow;
