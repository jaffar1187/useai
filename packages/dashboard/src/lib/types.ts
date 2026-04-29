export interface Filters {
  category: string;
  tool: string;
  project: string;
  language: string;
}

export type ActiveTab = "prompts" | "insights" | "settings" | "faqs" | "logs";

export interface ExternalNavLink {
  label: string;
  href: string;
}
