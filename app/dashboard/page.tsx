"use client";

import { useState } from "react";
import { useTaskManager } from "@/hooks/useTaskManager";
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

export default function Dashboard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { createTask, refreshTasks, tasks, deleteTask, toggleTaskComplete } =
    useTaskManager();

  const handleCreateTask = async (title: string, description: string) => {
    await createTask(title, description);
    await refreshTasks();
    console.log(`New Task Created: ${title}`);
    setIsDialogOpen(false);
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
          <DialogContent className="sm:max-w-[500px]">
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
