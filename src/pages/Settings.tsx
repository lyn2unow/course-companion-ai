import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/layout/AppHeader";
import PageContainer from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import SourceHierarchyEditor from "@/components/course-setup/SourceHierarchyEditor";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const LMS_OPTIONS = [
  { value: "canvas", label: "Canvas" },
  { value: "blackboard", label: "Blackboard" },
  { value: "moodle", label: "Moodle" },
  { value: "brightspace", label: "Brightspace / D2L" },
  { value: "schoology", label: "Schoology" },
  { value: "other", label: "Other" },
];

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [institution, setInstitution] = useState("");
  const [defaultPhilosophy, setDefaultPhilosophy] = useState("");

  // Course defaults
  const [defaultSemester, setDefaultSemester] = useState("");
  const [defaultSourceHierarchy, setDefaultSourceHierarchy] = useState<string[]>(["Textbook", "Syllabus", "Lecture Notes"]);
  const [defaultLms, setDefaultLms] = useState("canvas");

  // AI prefs
  const [preferredTone, setPreferredTone] = useState("balanced");
  const [defaultDifficulty, setDefaultDifficulty] = useState("intermediate");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setInstitution(data.institution ?? "");
        // Access new columns via type assertion since types.ts hasn't regenerated yet
        const d = data as Record<string, unknown>;
        setDefaultPhilosophy((d.default_teaching_philosophy as string) ?? "");
        setDefaultSemester((d.default_semester as string) ?? "");
        setDefaultSourceHierarchy(
          Array.isArray(d.default_source_hierarchy)
            ? (d.default_source_hierarchy as string[])
            : ["Textbook", "Syllabus", "Lecture Notes"]
        );
        setDefaultLms((d.default_lms as string) ?? "canvas");
        setPreferredTone((d.preferred_tone as string) ?? "balanced");
        setDefaultDifficulty((d.default_difficulty as string) ?? "intermediate");
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        institution,
        default_teaching_philosophy: defaultPhilosophy,
        default_semester: defaultSemester,
        default_source_hierarchy: defaultSourceHierarchy,
        default_lms: defaultLms,
        preferred_tone: preferredTone,
        default_difficulty: defaultDifficulty,
      } as Record<string, unknown>)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved!", description: "Your settings have been updated." });
    }
  };

  const handleDeleteAccount = async () => {
    toast({ title: "Account deletion", description: "This feature is coming soon." });
  };

  if (loading) {
    return (
      <>
        <AppHeader />
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <PageContainer>
        <div className="max-w-2xl space-y-8">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your profile and preferences.</p>
          </div>

          {/* PROFILE */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email ?? ""} readOnly className="opacity-60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="institution">Institution</Label>
                <Input id="institution" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g. University of Nevada, Las Vegas" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="philosophy">Default Teaching Philosophy</Label>
                <Textarea id="philosophy" value={defaultPhilosophy} onChange={(e) => setDefaultPhilosophy(e.target.value)} placeholder="Describe your teaching style..." rows={3} maxLength={5000} />
                <p className="text-xs text-muted-foreground">Pre-fills when creating new courses.</p>
              </div>
            </CardContent>
          </Card>

          {/* COURSE DEFAULTS */}
          <Card>
            <CardHeader>
              <CardTitle>Default Course Settings</CardTitle>
              <CardDescription>These defaults apply when you create a new course.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="semester">Default Semester</Label>
                <Input id="semester" value={defaultSemester} onChange={(e) => setDefaultSemester(e.target.value)} placeholder="e.g. Spring 2026" />
              </div>
              <div className="space-y-2">
                <Label>Default Source Hierarchy</Label>
                <SourceHierarchyEditor sources={defaultSourceHierarchy} onChange={setDefaultSourceHierarchy} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lms">Default LMS Platform</Label>
                <Select value={defaultLms} onValueChange={setDefaultLms}>
                  <SelectTrigger id="lms">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LMS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Pre-selects the export format on quiz export.</p>
              </div>
            </CardContent>
          </Card>

          {/* AI PREFERENCES */}
          <Card>
            <CardHeader>
              <CardTitle>AI Preferences</CardTitle>
              <CardDescription>Customize how AI generates content for you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Content Generation Model</Label>
                <Input value="Google Gemini 2.5 Flash" readOnly className="opacity-60" />
              </div>
              <div className="space-y-3">
                <Label>Preferred Content Tone</Label>
                <RadioGroup value={preferredTone} onValueChange={setPreferredTone} className="space-y-2">
                  <div className="flex items-center gap-2"><RadioGroupItem value="formal" id="tone-formal" /><Label htmlFor="tone-formal" className="font-normal">Formal / Academic</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="conversational" id="tone-conv" /><Label htmlFor="tone-conv" className="font-normal">Conversational</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="balanced" id="tone-bal" /><Label htmlFor="tone-bal" className="font-normal">Balanced</Label></div>
                </RadioGroup>
              </div>
              <div className="space-y-3">
                <Label>Default Quiz Difficulty</Label>
                <RadioGroup value={defaultDifficulty} onValueChange={setDefaultDifficulty} className="space-y-2">
                  <div className="flex items-center gap-2"><RadioGroupItem value="foundational" id="diff-f" /><Label htmlFor="diff-f" className="font-normal">Foundational</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="intermediate" id="diff-i" /><Label htmlFor="diff-i" className="font-normal">Intermediate</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="advanced" id="diff-a" /><Label htmlFor="diff-a" className="font-normal">Advanced</Label></div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* SAVE */}
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save Settings"}
          </Button>

          <Separator />

          {/* ACCOUNT */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Manage your plan and account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Current Plan</p>
                  <p className="text-sm text-muted-foreground">Free</p>
                </div>
                <Button variant="outline" asChild><Link to="/billing">Manage Billing</Link></Button>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-destructive mb-2">Danger Zone</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">Delete Account</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone. This will permanently delete your account and remove all your data.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount}>Delete Account</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  );
};

export default Settings;
