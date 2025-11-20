import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TaskRow from "./TaskRow";
import { Task } from "@/types/models";

interface TaskListProps {
  tasks: Task[];
  onDelete: (taskId: string) => Promise<void>;
  onToggleComplete: (taskId: string, completed: boolean) => Promise<void>;
}

const TaskList = ({ tasks, onDelete, onToggleComplete }: TaskListProps) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b">
            <TableHead className="w-[50px] py-4 font-semibold text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="w-[100px] py-4 font-semibold text-muted-foreground hidden sm:table-cell">
              Image
            </TableHead>
            <TableHead className="py-4 font-semibold text-muted-foreground">
              Title
            </TableHead>
            <TableHead className="w-[120px] py-4 font-semibold text-muted-foreground hidden md:table-cell">
              Label
            </TableHead>
            <TableHead className="w-[140px] py-4 font-semibold text-muted-foreground hidden lg:table-cell">
              Due Date
            </TableHead>
            <TableHead className="w-[120px] text-right py-4 font-semibold text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TaskRow
              key={task.task_id}
              task={task}
              onDelete={onDelete}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TaskList;
