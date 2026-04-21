"use client";

import { createContext, useContext, useState, useEffect } from "react";

export type ProjectSlug = "all" | "site-hustle" | "ai-agency" | "car-selling" | "music";

export const PROJECTS = [
  { slug: "all" as ProjectSlug, name: "Toate Proiectele", emoji: "🏢" },
  { slug: "site-hustle" as ProjectSlug, name: "Site Hustle", emoji: "🌐" },
  { slug: "ai-agency" as ProjectSlug, name: "AI Agency", emoji: "🤖" },
  { slug: "car-selling" as ProjectSlug, name: "Car Selling", emoji: "🚗" },
  { slug: "music" as ProjectSlug, name: "Music", emoji: "🎵" },
];

interface ProjectContextType {
  projectSlug: ProjectSlug;
  setProjectSlug: (slug: ProjectSlug) => void;
}

const ProjectContext = createContext<ProjectContextType>({
  projectSlug: "all",
  setProjectSlug: () => {},
});

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projectSlug, setProjectSlugState] = useState<ProjectSlug>("all");

  useEffect(() => {
    const saved = localStorage.getItem("selectedProject") as ProjectSlug;
    if (saved && PROJECTS.find((p) => p.slug === saved)) {
      setProjectSlugState(saved);
    }
  }, []);

  const setProjectSlug = (slug: ProjectSlug) => {
    setProjectSlugState(slug);
    localStorage.setItem("selectedProject", slug);
  };

  return (
    <ProjectContext.Provider value={{ projectSlug, setProjectSlug }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
