import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCustomerProjects, useCreateProject, type Project } from "@/hooks/useProjects";

interface CustomerProjectsTabProps {
  customerId: string;
}

export function CustomerProjectsTab({ customerId }: CustomerProjectsTabProps) {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useCustomerProjects(customerId);
  const createProject = useCreateProject();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    await createProject.mutateAsync({
      customer_id: customerId,
      name: newProjectName.trim(),
    });
    setNewProjectName("");
    setShowNewDialog(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {projects?.length || 0} project(en)
        </h3>
        <Button size="sm" onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nieuw project
        </Button>
      </div>

      {projects && projects.length > 0 ? (
        <div className="space-y-2">
          {projects.map((project) => (
            <Card key={project.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <FolderOpen className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      P-{project.project_number}
                    </span>
                    <Badge variant={project.status === "actief" ? "default" : "secondary"} className="text-xs">
                      {project.status}
                    </Badge>
                  </div>
                  {project.name && (
                    <p className="text-sm text-muted-foreground truncate">
                      {project.name}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nog geen projecten voor deze klant
          </p>
        </Card>
      )}

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nieuw project</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="projectName">Projectnaam</Label>
            <Input
              id="projectName"
              placeholder="bijv. Keukenrenovatie"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreate}
              disabled={!newProjectName.trim() || createProject.isPending}
            >
              {createProject.isPending ? "Aanmaken..." : "Aanmaken"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
