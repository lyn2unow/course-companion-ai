import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Trash2, ArrowRight } from "lucide-react";

interface ModuleCardProps {
  module: {
    id: string;
    title: string;
    description: string | null;
    sort_order: number;
  };
  courseId: string;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

const ModuleCard = ({ module, courseId, isFirst, isLast, onMoveUp, onMoveDown, onDelete }: ModuleCardProps) => {
  return (
    <Card>
      <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{module.title}</CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMoveUp} disabled={isFirst}>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMoveDown} disabled={isLast}>
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Link to={`/courses/${courseId}/modules/${module.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      {module.description && (
        <CardContent className="px-4 pb-3 pt-0">
          <p className="text-sm text-muted-foreground">{module.description}</p>
        </CardContent>
      )}
    </Card>
  );
};

export default ModuleCard;
