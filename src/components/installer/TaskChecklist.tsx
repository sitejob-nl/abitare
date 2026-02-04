import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Task {
  id: string;
  description: string;
  is_completed: boolean;
}

interface TaskChecklistProps {
  tasks: Task[];
  onAddTask: (description: string) => Promise<void>;
  onToggleTask: (taskId: string, isCompleted: boolean) => Promise<void>;
  disabled?: boolean;
}

export function TaskChecklist({
  tasks,
  onAddTask,
  onToggleTask,
  disabled,
}: TaskChecklistProps) {
  const [newTask, setNewTask] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAddTask = async () => {
    if (!newTask.trim()) return;

    setAdding(true);
    try {
      await onAddTask(newTask.trim());
      setNewTask("");
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !adding) {
      handleAddTask();
    }
  };

  const completedCount = tasks.filter((t) => t.is_completed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Taken ({completedCount}/{tasks.length})
        </Label>
      </div>

      {/* Add Task Input */}
      {!disabled && (
        <div className="flex gap-2">
          <Input
            placeholder="Nieuwe taak toevoegen..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={adding}
            className="min-h-[44px]"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleAddTask}
            disabled={adding || !newTask.trim()}
            className="h-11 w-11 flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-2">
        {tasks.map((task) => (
          <Card
            key={task.id}
            className="flex items-center gap-3 p-3 transition-colors"
          >
            <Checkbox
              id={task.id}
              checked={task.is_completed}
              onCheckedChange={(checked) =>
                onToggleTask(task.id, checked as boolean)
              }
              disabled={disabled}
              className="h-5 w-5"
            />
            <label
              htmlFor={task.id}
              className={`flex-1 cursor-pointer text-sm ${
                task.is_completed ? "text-muted-foreground line-through" : ""
              }`}
            >
              {task.description}
            </label>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {tasks.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nog geen taken toegevoegd
          </p>
          <p className="text-xs text-muted-foreground">
            Voeg taken toe om de voortgang bij te houden
          </p>
        </Card>
      )}
    </div>
  );
}
