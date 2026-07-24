"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUi } from "./ui-context";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { newProject } from "@/lib/constants";
import { nowISO } from "@/lib/helpers";

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function ProjectDialog({ project }) {
  const { actions } = useStore();
  const ui = useUi();
  const toast = useToast();
  const editing = !!project;

  const [f, setF] = useState(() => ({
    name: project?.name || "",
    client: project?.client || "",
    description: project?.description || "",
  }));
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const save = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    const data = { name: f.name.trim(), client: f.client.trim(), description: f.description.trim() };
    actions.update((d) => {
      if (!Array.isArray(d.projects)) d.projects = [];
      if (editing) {
        const p = d.projects.find((x) => x.id === project.id);
        if (p) Object.assign(p, data, { updatedAt: nowISO() });
      } else {
        d.projects.unshift(newProject(data));
      }
    });
    toast(editing ? "Project updated." : "Project added.");
    ui.closeProjectForm();
  };

  return (
    <Dialog open onClose={ui.closeProjectForm} className="p-0">
      <div className="border-b border-border px-6 pb-4 pt-6">
        <DialogTitle>{editing ? "Edit project" : "Add an ongoing project"}</DialogTitle>
        <DialogDescription>{editing ? "Update the details below." : "Track a project you're actively working on. You'll take a daily update on it."}</DialogDescription>
      </div>

      <form id="project-form" onSubmit={save} className="space-y-4 px-6 py-5">
        <Field label="Project name *">
          <Input required value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Aurora Skincare — social + paid ads" autoFocus />
        </Field>
        <Field label="Client / company">
          <Input value={f.client} onChange={(e) => set("client", e.target.value)} placeholder="e.g. Aurora Skincare" />
        </Field>
        <Field label="Description (optional)">
          <Input value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Short note about scope or goal" />
        </Field>
      </form>

      <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" onClick={ui.closeProjectForm}>Cancel</Button>
        <Button type="submit" form="project-form">{editing ? "Save changes" : "Add project"}</Button>
      </div>
    </Dialog>
  );
}
