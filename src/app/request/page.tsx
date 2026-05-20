"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { PRIORITY_OPTIONS, type Priority } from "@/lib/types";
import { Combobox } from "@/components/combobox";
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
  requester_name: "Requester Name (You)",
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
        <div className="ig-card max-w-md w-full text-center" style={{ padding: 24 }}>
          <div className="mb-6">
            <div className="mx-auto mb-2">
              <CheckCircle2
                className="h-12 w-12 mx-auto"
                style={{ color: "var(--ig-success)" }}
              />
            </div>
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--ig-fg1)" }}
            >
              Request Submitted
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--ig-fg2)" }}
            >
              Your UX request has been received. The design team will review it shortly.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="ig-btn ig-btn-md ig-btn-primary w-full"
              onClick={() => {
                setSubmitted(false);
                setForm({
                  product_name: "",
                  feature_name: "",
                  pm_name: "",
                  lead_name: "",
                  requester_name: "",
                  jira_ticket_key: "",
                  priority: "",
                  primary_user: "",
                  feature_purpose: "",
                  problem_description: "",
                });
                setFiles([]);
              }}
            >
              Submit Another Request
            </button>
            <Link href="/">
              <button type="button" className="ig-btn ig-btn-md ig-btn-secondary w-full">
                Back to Home
              </button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-8">
      <div className="ig-container max-w-2xl space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <Link
            href="/"
            className="text-sm transition-colors"
            style={{ color: "var(--ig-fg3)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--ig-fg1)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--ig-fg3)")
            }
          >
            &larr; Back
          </Link>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--ig-fg1)" }}
          >
            Submit a UX Request
          </h1>
          <p style={{ color: "var(--ig-fg2)", fontSize: 14 }}>
            Fill out the form below to request UX guidance from the design team.
          </p>
        </div>

        {/* Info Alert */}
        <div
          className="flex gap-3 p-4"
          style={{
            background: "var(--ig-info-light)",
            border: "1px solid rgba(0,91,248,0.15)",
            borderRadius: 12,
          }}
        >
          <InfoIcon
            className="h-4 w-4 shrink-0 mt-0.5"
            style={{ color: "var(--ig-primary)" }}
          />
          <div>
            <p
              className="text-sm font-semibold mb-1"
              style={{ color: "var(--ig-fg1)" }}
            >
              Why context matters
            </p>
            <p className="text-sm" style={{ color: "var(--ig-fg2)" }}>
              The UX team does not have full visibility into every project currently in progress.
              Providing clear context — including what the feature does, who uses it, and what
              specific problem you&apos;re facing — is critical for us to deliver accurate guidance.
              Incomplete requests may lead to misaligned recommendations or usability errors.
              The more detail you share, the better we can help.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Request Details Card */}
          <div className="ig-card" style={{ padding: 24 }}>
            <h3
              className="text-lg font-semibold mb-4"
              style={{ color: "var(--ig-fg1)" }}
            >
              Request details
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {AUTOCOMPLETE_FIELDS.map((field) => (
                <div key={field} className="space-y-2">
                  <label className="ig-label">{FIELD_LABELS[field]}</label>
                  <Combobox
                    options={options[field]}
                    value={form[field]}
                    onChange={(val) => setField(field, val)}
                    placeholder={`Select or type ${FIELD_LABELS[field].toLowerCase()}...`}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <label className="ig-label">Jira Ticket Key</label>
                <div className="ig-input">
                  <input
                    placeholder="e.g. PROJ-1234"
                    value={form.jira_ticket_key}
                    onChange={(e) => setField("jira_ticket_key", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="ig-label">Priority</label>
                <div className="ig-input">
                  <select
                    value={form.priority}
                    onChange={(e) => setField("priority", e.target.value)}
                    required
                    style={!form.priority ? { color: "var(--ig-fg3)" } : undefined}
                  >
                    <option value="" disabled>Select priority...</option>
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Context Card */}
          <div className="ig-card" style={{ padding: 24 }}>
            <h3
              className="text-lg font-semibold mb-4"
              style={{ color: "var(--ig-fg1)" }}
            >
              Feature Context
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="ig-label">
                  Who primarily uses this feature?
                </label>
                <div className="ig-input">
                  <input
                    placeholder="e.g. Fleet managers, Drivers, Admin users"
                    value={form.primary_user}
                    onChange={(e) => setField("primary_user", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="ig-label">
                  What is this feature for?
                </label>
                <textarea
                  className="ig-textarea"
                  placeholder="Describe the purpose of this feature..."
                  value={form.feature_purpose}
                  onChange={(e) => setField("feature_purpose", e.target.value)}
                  rows={5}
                  required
                />
              </div>
            </div>
          </div>

          {/* Problem Description Card */}
          <div className="ig-card" style={{ padding: 24 }}>
            <div className="mb-4">
              <h3
                className="text-lg font-semibold"
                style={{ color: "var(--ig-fg1)" }}
              >
                Problem Description
              </h3>
              <p className="text-sm mt-1" style={{ color: "var(--ig-fg2)" }}>
                Clearly describe the problem, question, or area where you need UX guidance.
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="ig-label">Description</label>
                <textarea
                  className="ig-textarea"
                  placeholder="What specific problem or question do you need help with? What kind of guidance are you looking for?"
                  value={form.problem_description}
                  onChange={(e) =>
                    setField("problem_description", e.target.value)
                  }
                  rows={5}
                  required
                />
              </div>

              <div className="ig-sep" />

              <div className="space-y-2">
                <label className="ig-label">Screenshots or Videos</label>
                <p className="text-sm" style={{ color: "var(--ig-fg3)" }}>
                  Attach any screenshots or screen recordings that help illustrate the issue.
                </p>
                <div
                  className="rounded-lg p-6 text-center cursor-pointer transition-colors"
                  style={{
                    border: "2px dashed var(--ig-border)",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--ig-primary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "var(--ig-border)")
                  }
                >
                  <Upload
                    className="h-8 w-8 mx-auto mb-2"
                    style={{ color: "var(--ig-fg3)" }}
                  />
                  <p className="text-sm" style={{ color: "var(--ig-fg3)" }}>
                    Click to upload files or drag and drop
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--ig-fg3)" }}
                  >
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
                        className="flex items-center justify-between rounded-md px-3 py-2 text-sm"
                        style={{
                          border: "1px solid var(--ig-border-light)",
                          color: "var(--ig-fg1)",
                        }}
                      >
                        <span className="truncate mr-2">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="transition-colors"
                          style={{ color: "var(--ig-fg3)" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "var(--ig-fg1)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color = "var(--ig-fg3)")
                          }
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="ig-btn ig-btn-lg ig-btn-primary w-full"
            disabled={submitting || !form.priority}
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>
    </main>
  );
}
