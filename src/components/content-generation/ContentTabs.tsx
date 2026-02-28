import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, BookOpen, MessageSquare } from "lucide-react";
import ContentCard from "./ContentCard";
import GenerateContentButton from "./GenerateContentButton";

interface ContentItem {
  id: string;
  content: string;
  content_type: string;
  is_approved: boolean;
  created_at: string;
}

interface ContentTabsProps {
  contents: ContentItem[];
  onGenerate: (contentType: string) => void;
  onUpdate: (id: string, content: string) => void;
  onToggleApproval: (id: string, approved: boolean) => void;
  onDelete: (id: string) => void;
  generatingType: string | null;
}

const TABS = [
  { value: "lecture_notes", label: "Lecture Notes", icon: FileText },
  { value: "key_terms", label: "Key Terms", icon: BookOpen },
  { value: "discussion_prompt", label: "Discussion Prompts", icon: MessageSquare },
];

const ContentTabs = ({ contents, onGenerate, onUpdate, onToggleApproval, onDelete, generatingType }: ContentTabsProps) => {
  return (
    <Tabs defaultValue="lecture_notes" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        {TABS.map(({ value, label, icon: Icon }) => (
          <TabsTrigger key={value} value={value} className="gap-2">
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {TABS.map(({ value, label }) => {
        const filtered = contents.filter((c) => c.content_type === value);
        return (
          <TabsContent key={value} value={value} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                {filtered.length} {label.toLowerCase()} generated
              </h3>
              <GenerateContentButton
                onClick={() => onGenerate(value)}
                isLoading={generatingType === value}
                label={`Generate ${label}`}
              />
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No {label.toLowerCase()} yet. Click generate to create content with AI.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((item) => (
                  <ContentCard
                    key={item.id}
                    content={item}
                    onUpdate={onUpdate}
                    onToggleApproval={onToggleApproval}
                    onDelete={onDelete}
                    onRegenerate={() => onGenerate(value)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
};

export default ContentTabs;
