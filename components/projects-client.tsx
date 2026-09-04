"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Archive,
  CheckCircle2,
  FolderKanban,
  AlertCircle,
  Search,
  Filter,
  GitBranch,
  Check,
  Server,
  Code2,
} from "lucide-react";
import { createProjectAction, toggleProjectStatusAction, deleteProjectAction } from "@/app/actions/projects";
import { MembershipRole } from "@/types/tenant";
import { useToast } from "./toast-provider";

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;
}

interface ProjectsClientProps {
  initialProjects: ProjectItem[];
  orgSlug: string;
  userRole: MembershipRole;
  currentTier: string;
}

export function ProjectsClient({ initialProjects, orgSlug, userRole, currentTier }: ProjectsClientProps) {
  const toast = useToast();
  const [projects, setProjects] = useState(initialProjects);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canManage = userRole === "OWNER" || userRole === "ADMIN";

  async function handleCreateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set("orgSlug", orgSlug);

    const res = await createProjectAction(formData);

    if (!res.success) {
      setErrorMessage(res.error || "Failed to create project");
      toast.error("Creation Failed", res.error || "Could not initialize project");
      setIsSubmitting(false);
      return;
    }

    if (res.project) {
      setProjects([res.project as any, ...projects]);
      toast.success("Project Created", `${res.project.name} is now active in /${orgSlug}`);
    }
    setIsSubmitting(false);
    setIsModalOpen(false);
  }

  async function handleToggleStatus(projectId: string, currentStatus: string) {
    const res = await toggleProjectStatusAction(projectId, currentStatus, orgSlug);
    if (res.success) {
      const nextStatus = currentStatus === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
      setProjects(
        projects.map((p) =>
          p.id === projectId ? { ...p, status: nextStatus } : p
        )
      );
      toast.info("Status Updated", `Project marked as ${nextStatus}`);
    }
  }

  async function handleDelete(projectId: string) {
    const res = await deleteProjectAction(projectId, orgSlug);
    if (res.success) {
      setProjects(projects.filter((p) => p.id !== projectId));
      toast.error("Project Deleted", "Project permanently removed from tenant partition.");
    }
  }

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterStatus === "ALL" || p.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-950">Services & Microservices</h1>
          <p className="text-xs text-neutral-500">
            Independent services and background jobs partitioned within <span className="font-mono text-neutral-800">/{orgSlug}</span>.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-medium shadow-xs transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Deploy Service</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-white rounded-xl border border-neutral-200 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter services by name, git branch, or runtime..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg border border-neutral-200">
          {(["ALL", "ACTIVE", "ARCHIVED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                filterStatus === tab
                  ? "bg-white text-neutral-950 font-semibold shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-950"
              }`}
            >
              {tab === "ALL" ? "All Services" : tab === "ACTIVE" ? "Active" : "Paused"}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid with Production Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full p-12 rounded-2xl bg-white border border-dashed border-neutral-200 text-center space-y-3">
            <FolderKanban className="h-8 w-8 text-neutral-400 mx-auto" />
            <h3 className="text-sm font-semibold text-neutral-900">No services found</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {searchQuery
                ? "No services match your current search query. Try clearing the filter."
                : "Deploy a microservice or background pipeline to begin routing traffic."}
            </p>
          </div>
        ) : (
          filteredProjects.map((project, idx) => {
            const isProd = idx % 2 === 0;
            const branchName = isProd ? "main" : "feat/v2-refactor";
            const commitHash = `sha_${project.id.slice(-6)}`;
            const runtime = idx % 3 === 0 ? "Node.js 20" : idx % 3 === 1 ? "Go 1.22" : "Python 3.12";

            return (
              <div
                key={project.id}
                className="p-5 rounded-2xl bg-white border border-neutral-200 hover:border-neutral-300 flex flex-col justify-between space-y-4 group transition-all duration-150 shadow-2xs"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-xs text-neutral-950 group-hover:underline transition-colors font-mono">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          project.status === "ACTIVE" ? "bg-emerald-500" : "bg-neutral-400"
                        }`}
                      />
                      <span
                        className={`text-[9px] font-medium font-mono px-2 py-0.5 rounded-full ${
                          project.status === "ACTIVE"
                            ? "bg-neutral-100 text-neutral-900 border border-neutral-200"
                            : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {project.status === "ACTIVE" ? "active" : "paused"}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                    {project.description || "Microservice deployment bounded to workspace partition."}
                  </p>

                  {/* Production Git & Environment Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono text-neutral-600">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200">
                      <GitBranch className="h-3 w-3 text-neutral-500" />
                      <span>{branchName}</span>
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200">
                      <Server className="h-3 w-3 text-neutral-500" />
                      <span>{isProd ? "production" : "staging"}</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-neutral-50 text-neutral-500 border border-neutral-200">
                      {runtime}
                    </span>
                    <span className="text-neutral-400">#{commitHash}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Deployed {new Date(project.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleStatus(project.id, project.status)}
                      title={project.status === "ACTIVE" ? "Pause Service" : "Resume Service"}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      {project.status === "ACTIVE" ? (
                        <Archive className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-neutral-950" />
                      )}
                    </button>

                    {canManage && (
                      <button
                        onClick={() => handleDelete(project.id)}
                        title="Delete Service"
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">Deploy New Service</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Automatically bounded to workspace context <code className="text-neutral-950 font-mono font-medium">/{orgSlug}</code>.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-800">Service Name</label>
                <input
                  required
                  name="name"
                  type="text"
                  placeholder="e.g. auth-gateway or telemetry-sync"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white font-mono transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-800">Service Description</label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Describe service responsibilities, dependencies, or routing targets..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-neutral-950 hover:bg-neutral-800 text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Deploying..." : "Deploy Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
