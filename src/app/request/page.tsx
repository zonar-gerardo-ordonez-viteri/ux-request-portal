"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { PRIORITY_OPTIONS, type Priority } from "@/lib/types";
import { Combobox } from "@/components/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { InfoIcon, Upload, X, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const AUTOCOMPLETE_FIELDS = [
  "product_name",
  "feature_name",
  "pm_name",
  "lead_name",
  "requester_name",
] as const;

type AutocompleteField = (typeof AUTOCOMPLETE_FIELDS)[number];

const FIELD_LABELS: Record<AutocompleteField, string> = {
  product_name: "Product Name",
  feature_name: "Feature Name",
  pm_name: "PM Name",
  lead_name: "Lead in Charge",
  requester_name: "Requester Name",
};

export default function RequestPage() {
  const [options, setOptions] = React.useState<Record<AutocompleteField, string[]>>({
    product_name: [],
    feature_name: [],
    pm_name: [],
    lead_name: [],
    requester_name: [],
  });

  const [form, setForm] = React.useState({
    product_name: "",
    feature_name: "",
    pm_name: "",
    lead_name: "",
    requester_name: "",
    jira_ticket_key: "",
    priority: "" as Priority | "",
    primary_user: "",
    feature_purpose: "",
    problem_description: "",
  });

  const [files, setFiles] = React.useState<File[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    loadAutocompleteOptions();
  }, []);

  async function loadAutocompleteOptions() {
    const { data } = await supabase
      .from("autocomplete_options")
      .select("field_name, value")
      .order("value");

    if (data) {
      const grouped: Record<AutocompleteField, string[]> = {
        product_name: [],
        feature_name: [],
        pm_name: [],
        lead_name: [],
        requester_name: [],
      };
      for (const row of data) {
        const field = row.field_name as AutocompleteField;
        if (grouped[field]) {
          grouped[field].push(row.value);
        }
      }
      setOptions(grouped);
    }
  }

  async function saveAutocompleteValue(field: AutocompleteField, value: string) {
    if (!value.trim()) return;
    await supabase
      .from("autocomplete_options")
      .upsert({ field_name: field, value: value.trim() }, { onConflict: "field_name,value" });
  }

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.priority) return;
    setSubmitting(true);

    try {
      // Upload attachments
      const attachmentUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("attachments").upload(path, file);
        if (!error) {
          const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);
          attachmentUrls.push(urlData.publicUrl);
        }
      }

      // Save request
      const { error } = await supabase.from("ux_requests").insert({
        ...form,
        attachments: attachmentUrls,
      });

      if (error) throw error;

      // Save autocomplete values
      for (const field of AUTOCOMPLETE_FIELDS) {
        await saveAutocompleteValue(field, form[field]);
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Submit error:", err);
      alert("There was an error submitting your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  if (submitted) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-2">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle>Request Submitted</CardTitle>
            <CardDescription>
              Your UX request has been received. The design team will review it shortly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => { setSubmitted(false); setForm({ product_name: "", feature_name: "", pm_name: "", lead_name: "", requester_name: "", jira_ticket_key: "", priority: "", primary_user: "", feature_purpose: "", problem_description: "" }); setFiles([]); }} className="w-full">
              Submit Another Request
            </Button>
            <Link href="/">
              <Button variant="outline" className="w-full">Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center p-6 pb-16">
      <div className="max-w-2xl w-full space-y-6">
        <div className="space-y-1">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            &larr; Back
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Submit a UX Request</h1>
          <p className="text-muted-foreground">
            Fill out the form below to request UX guidance from the design team.
          </p>
        </div>

        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Why context matters</AlertTitle>
          <AlertDescription>
            The UX team does not have full visibility into every project currently in progress.
            Providing clear context — including what the feature does, who uses it, and what
            specific problem you&apos;re facing — is critical for us to deliver accurate guidance.
            Incomplete requests may lead to misaligned recommendations or usability errors.
            The more detail you share, the better we can help.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {AUTOCOMPLETE_FIELDS.map((field) => (
                <div key={field} className="space-y-2">
                  <Label>{FIELD_LABELS[field]}</Label>
                  <Combobox
                    options={options[field]}
                    value={form[field]}
                    onChange={(val) => setField(field, val)}
                    placeholder={`Select or type ${FIELD_LABELS[field].toLowerCase()}...`}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label>Jira Ticket Key</Label>
                <Input
                  placeholder="e.g. PROJ-1234"
                  value={form.jira_ticket_key}
                  onChange={(e) => setField("jira_ticket_key", e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setField("priority", p.value)}
                    className="focus:outline-none"
                  >
                    <Badge
                      variant={form.priority === p.value ? "default" : "outline"}
                      className={`cursor-pointer text-sm px-3 py-1 ${
                        form.priority === p.value ? `${p.color} text-white border-transparent` : ""
                      }`}
                    >
                      {p.label}
                    </Badge>
                  </button>
                ))}
              </div>
              {!form.priority && (
                <p className="text-sm text-muted-foreground mt-2">Select a priority level</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Feature Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Who primarily uses this feature?</Label>
                <Input
                  placeholder="e.g. Fleet managers, Drivers, Admin users"
                  value={form.primary_user}
                  onChange={(e) => setField("primary_user", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>What is this feature for?</Label>
                <Textarea
                  placeholder="Describe the purpose of this feature..."
                  value={form.feature_purpose}
                  onChange={(e) => setField("feature_purpose", e.target.value)}
                  rows={3}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Problem Description</CardTitle>
              <CardDescription>
                Clearly describe the problem, question, or area where you need UX guidance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="What specific problem or question do you need help with? What kind of guidance are you looking for?"
                  value={form.problem_description}
                  onChange={(e) => setField("problem_description", e.target.value)}
                  rows={5}
                  required
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Screenshots or Videos</Label>
                <p className="text-sm text-muted-foreground">
                  Attach any screenshots or screen recordings that help illustrate the issue.
                </p>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload files or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, GIF, MP4, WebM
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {files.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {files.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <span className="truncate mr-2">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={submitting || !form.priority}
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </form>
      </div>
    </main>
  );
}
