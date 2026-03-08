import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload, FileText, ClipboardPaste, Loader2, Copy, Check, ChevronDown, Download, X, Sparkles,
} from "lucide-react";

interface DiscussionsTabProps {
  courseId: string;
  modules: Array<{ id: string; title: string }>;
}

interface SubmissionResult {
  id: string;
  student_identifier: string;
  post_content: string;
  word_count: number;
  meets_criteria: boolean;
  criteria_matched: string[];
  criteria_missed: string[];
}

interface KudosResult {
  id: string;
  student_identifier: string;
  message: string;
  is_sent: boolean;
  submission_id: string;
}

const DiscussionsTab = ({ courseId, modules }: DiscussionsTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Upload state
  const [content, setContent] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");

  // Criteria state
  const [minWordCount, setMinWordCount] = useState(150);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [qualityIndicators, setQualityIndicators] = useState<string[]>([]);
  const [qualityInput, setQualityInput] = useState("");

  // Results
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<{
    submissions: SubmissionResult[];
    kudos: KudosResult[];
    totalPosts: number;
    qualifyingCount: number;
  } | null>(null);

  // Kudos editing state
  const [editedKudos, setEditedKudos] = useState<Record<string, string>>({});
  const [sentKudos, setSentKudos] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showOther, setShowOther] = useState(false);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setContent(ev.target?.result as string);
      toast({ title: "File loaded", description: `${file.name} ready for analysis.` });
    };
    reader.readAsText(file);
  }, [toast]);

  const handlePasteConfirm = () => {
    setContent(pasteText);
    setShowPaste(false);
    setPasteText("");
    toast({ title: "Content loaded" });
  };

  const addTag = (list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) => {
    const trimmed = input.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setInput("");
    }
  };

  const removeTag = (list: string[], setList: (v: string[]) => void, idx: number) => {
    setList(list.filter((_, i) => i !== idx));
  };

  const handleAnalyze = async () => {
    if (!user || !content.trim()) return;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-kudos", {
        body: {
          course_id: courseId,
          module_id: modules[0]?.id || null,
          discussion_content: content,
          min_word_count: minWordCount,
          keywords,
          quality_indicators: qualityIndicators,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResults({
        submissions: data.submissions || [],
        kudos: data.kudos || [],
        totalPosts: data.total_posts || 0,
        qualifyingCount: data.qualifying_count || 0,
      });

      // Initialize edited kudos
      const initial: Record<string, string> = {};
      for (const k of data.kudos || []) { initial[k.id] = k.message; }
      setEditedKudos(initial);

      toast({ title: "Analysis complete", description: `${data.qualifying_count} standout posts identified.` });
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopyKudos = async (kudosId: string) => {
    const msg = editedKudos[kudosId];
    if (msg) {
      await navigator.clipboard.writeText(msg);
      setCopiedId(kudosId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleToggleSent = async (kudosId: string, sent: boolean) => {
    setSentKudos((prev) => ({ ...prev, [kudosId]: sent }));
    await supabase.from("kudos_messages").update({ is_sent: sent } as Record<string, unknown>).eq("id", kudosId);
  };

  const handleExportKudos = () => {
    if (!results) return;
    const qualifying = results.submissions.filter((s) => s.meets_criteria);
    const rows = [["Student ID", "Kudos Message"]];
    for (const sub of qualifying) {
      const kudos = results.kudos.find((k) => k.submission_id === sub.id);
      const msg = kudos ? (editedKudos[kudos.id] || kudos.message) : "";
      rows.push([sub.student_identifier, msg]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kudos-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const standoutSubs = results?.submissions.filter((s) => s.meets_criteria) ?? [];
  const otherSubs = results?.submissions.filter((s) => !s.meets_criteria) ?? [];

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div>
        <h2 className="text-lg font-semibold">Analyze Discussion Posts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload exported discussion posts from your LMS to identify standout contributions and generate kudos messages.
        </p>
      </div>

      {!results && (
        <>
          <Card>
            <CardContent className="pt-6 space-y-4">
              {!content ? (
                <>
                  <label className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 cursor-pointer hover:border-accent/50 transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium">Drop a CSV or TXT file here, or click to browse</p>
                      <p className="text-xs text-muted-foreground mt-1">Supports Canvas discussion exports</p>
                    </div>
                    <input type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 border-t border-border" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => setShowPaste(true)}>
                    <ClipboardPaste className="h-4 w-4 mr-2" /> Paste content
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Export discussions from Canvas as CSV, or paste raw discussion text with student names/IDs.
                  </p>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium">Content loaded</span>
                      <Badge variant="secondary">{content.split("\n").filter(Boolean).length} lines</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setContent("")}>
                      <X className="h-4 w-4 mr-1" /> Clear
                    </Button>
                  </div>
                  <pre className="text-xs bg-muted rounded-md p-3 max-h-32 overflow-auto whitespace-pre-wrap">
                    {content.substring(0, 500)}{content.length > 500 ? "..." : ""}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Criteria */}
          {content && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kudos Criteria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="min-words">Minimum word count</Label>
                  <Input id="min-words" type="number" value={minWordCount} onChange={(e) => setMinWordCount(Number(e.target.value))} min={1} className="max-w-32" />
                </div>

                <div className="space-y-2">
                  <Label>Keywords to look for</Label>
                  <div className="flex gap-2">
                    <Input
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(keywords, setKeywords, keywordInput, setKeywordInput))}
                      placeholder="Type and press Enter"
                    />
                    <Button variant="outline" size="sm" onClick={() => addTag(keywords, setKeywords, keywordInput, setKeywordInput)} disabled={!keywordInput.trim()}>Add</Button>
                  </div>
                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {keywords.map((kw, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {kw}
                          <button onClick={() => removeTag(keywords, setKeywords, i)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Quality indicators</Label>
                  <div className="flex gap-2">
                    <Input
                      value={qualityInput}
                      onChange={(e) => setQualityInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(qualityIndicators, setQualityIndicators, qualityInput, setQualityInput))}
                      placeholder='e.g. "cites sources", "asks follow-up question"'
                    />
                    <Button variant="outline" size="sm" onClick={() => addTag(qualityIndicators, setQualityIndicators, qualityInput, setQualityInput)} disabled={!qualityInput.trim()}>Add</Button>
                  </div>
                  {qualityIndicators.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {qualityIndicators.map((qi, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {qi}
                          <button onClick={() => removeTag(qualityIndicators, setQualityIndicators, i)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={handleAnalyze} disabled={analyzing} className="w-full sm:w-auto">
                  {analyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analyzing...</> : <><Sparkles className="h-4 w-4 mr-2" /> Analyze Discussions</>}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Analysis Results</h3>
              <p className="text-sm text-muted-foreground">{results.totalPosts} posts analyzed · {results.qualifyingCount} standout</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setResults(null); setContent(""); }}>New Analysis</Button>
              {standoutSubs.length > 0 && (
                <Button size="sm" onClick={handleExportKudos}>
                  <Download className="h-4 w-4 mr-1" /> Export All Kudos
                </Button>
              )}
            </div>
          </div>

          {/* Standout posts */}
          {standoutSubs.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase text-muted-foreground">Standout Posts ({standoutSubs.length})</h4>
              {standoutSubs.map((sub) => {
                const kudos = results.kudos.find((k) => k.submission_id === sub.id);
                return (
                  <Card key={sub.id}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{sub.student_identifier}</span>
                        <Badge variant="outline">{sub.word_count} words</Badge>
                        {sub.criteria_matched.map((c, i) => (
                          <Badge key={i} className="bg-accent/10 text-accent border-accent/30 text-xs">{c}</Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">{sub.post_content}</p>
                      {kudos && (
                        <div className="space-y-2">
                          <Label className="text-xs">AI-Drafted Kudos</Label>
                          <Textarea
                            value={editedKudos[kudos.id] ?? kudos.message}
                            onChange={(e) => setEditedKudos((prev) => ({ ...prev, [kudos.id]: e.target.value }))}
                            rows={2}
                            className="text-sm"
                          />
                          <div className="flex items-center gap-3">
                            <Button variant="outline" size="sm" onClick={() => handleCopyKudos(kudos.id)}>
                              {copiedId === kudos.id ? <><Check className="h-3 w-3 mr-1" /> Copied!</> : <><Copy className="h-3 w-3 mr-1" /> Copy kudos</>}
                            </Button>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={sentKudos[kudos.id] ?? kudos.is_sent}
                                onCheckedChange={(v) => handleToggleSent(kudos.id, v)}
                              />
                              <Label className="text-xs text-muted-foreground">Mark as sent</Label>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Other posts */}
          {otherSubs.length > 0 && (
            <Collapsible open={showOther} onOpenChange={setShowOther}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="gap-2 text-muted-foreground">
                  <ChevronDown className={`h-4 w-4 transition-transform ${showOther ? "rotate-180" : ""}`} />
                  Other Posts ({otherSubs.length})
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {otherSubs.map((sub) => (
                  <Card key={sub.id} className="bg-muted/30">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{sub.student_identifier}</span>
                        <Badge variant="outline" className="text-xs">{sub.word_count} words</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Missing: {sub.criteria_missed.join(", ") || "Did not meet minimum criteria"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}

      {/* Paste Dialog */}
      <Dialog open={showPaste} onOpenChange={setShowPaste}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Paste Discussion Content</DialogTitle>
            <DialogDescription>Paste exported discussion posts. Use "Name: content" format or CSV.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={10}
            placeholder="Student Name: Their discussion post content..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaste(false)}>Cancel</Button>
            <Button onClick={handlePasteConfirm} disabled={!pasteText.trim()}>Load Content</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiscussionsTab;
