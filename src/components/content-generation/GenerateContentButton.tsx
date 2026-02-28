import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

interface GenerateContentButtonProps {
  onClick: () => void;
  isLoading: boolean;
  label?: string;
}

const GenerateContentButton = ({ onClick, isLoading, label = "Generate with AI" }: GenerateContentButtonProps) => {
  return (
    <Button onClick={onClick} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4 mr-2" />
      )}
      {isLoading ? "Generating..." : label}
    </Button>
  );
};

export default GenerateContentButton;
