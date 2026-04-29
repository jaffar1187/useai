import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { LocalConfig, HealthInfo, UpdateInfo } from "./lib/api";
import {
  fetchConfig,
  fetchHealth,
  fetchUpdateCheck,
  deleteSession as apiDeleteSession,
  deleteConversation as apiDeleteConversation,
  deleteMilestone as apiDeleteMilestone,
} from "./lib/api";
import type { TimeScale } from "./components/time-travel/types";
import { ALL_SCALES } from "./components/time-travel/types";
import type { Filters, ActiveTab } from "./lib/types";

export type { TimeScale, Filters, ActiveTab };

export interface DashboardState {
  config: LocalConfig | null;
  health: HealthInfo | null;
  updateInfo: UpdateInfo | null;
  loading: boolean;
  timeTravelTime: number | null;
  timeScale: TimeScale;
  filters: Filters;
  activeTab: ActiveTab;

  loadConfig: () => Promise<void>;
  loadHealth: () => Promise<void>;
  loadUpdateCheck: () => Promise<void>;
  setTimeTravelTime: (t: number | null) => void;
  setTimeScale: (s: TimeScale) => void;
  setFilter: (key: keyof Filters, value: string) => void;
  setActiveTab: (tab: ActiveTab) => void;
  deleteSession: (sessionId: string) => Promise<void>;
  deleteConversation: (connectionId: string) => Promise<void>;
  deleteMilestone: (milestoneId: string) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set) => ({
      config: null,
      health: null,
      updateInfo: null,
      loading: true,
      timeTravelTime: null,
      timeScale: (() => {
        try {
          const saved = localStorage.getItem("useai-time-scale");
          const valid: TimeScale[] = [...ALL_SCALES];
          if (saved && valid.includes(saved as TimeScale))
            return saved as TimeScale;
        } catch {
          /* ignore */
        }
        return "day" as TimeScale;
      })(),

      //Category(Coding, Debugging, Planning, etc.)
      //Client(claude, openai, etc.)
      //Project(All, Project1, Project2, etc.)
      //Language(typescript, python, etc.)
      filters: {
        category: "all",
        tool: "all",
        project: "all",
        language: "all",
      },

      activeTab: (() => {
        try {
          const allTabs = ["prompts", "insights", "settings", "logs", "faqs"];
          const saved = localStorage.getItem("useai-active-tab");
          if (saved && allTabs.includes(saved)) {
            return saved as ActiveTab;
          }
        } catch {
          /* ignore */
        }
        return "prompts" as ActiveTab;
      })(),

      loadConfig: async () => {
        try {
          const config = await fetchConfig();
          set({ config, loading: false }, false, "loadConfig");
        } catch {
          set({ loading: false }, false, "loadConfig/error");
        }
      },

      loadHealth: async () => {
        try {
          const health = await fetchHealth();
          set({ health }, false, "loadHealth");
        } catch {
          /* ignore */
        }
      },

      loadUpdateCheck: async () => {
        try {
          const updateInfo = await fetchUpdateCheck();
          set({ updateInfo }, false, "loadUpdateCheck");
        } catch {
          /* ignore */
        }
      },

      setTimeTravelTime: (t) =>
        set({ timeTravelTime: t }, false, "setTimeTravelTime"),

      setTimeScale: (s) => {
        try {
          localStorage.setItem("useai-time-scale", s);
        } catch {
          /* ignore */
        }
        set({ timeScale: s }, false, "setTimeScale");
      },

      setFilter: (key, value) =>
        set(
          (state) => ({ filters: { ...state.filters, [key]: value } }),
          false,
          `setFilter/${key}`,
        ),

      setActiveTab: (tab) => {
        try {
          localStorage.setItem("useai-active-tab", tab);
        } catch {
          /* ignore */
        }
        set({ activeTab: tab }, false, "setActiveTab");
      },

      deleteSession: async (sessionId) => {
        try {
          await apiDeleteSession(sessionId);
        } catch (err) {
          console.error("Failed to delete session:", sessionId, err);
        }
      },

      deleteConversation: async (connectionId) => {
        try {
          await apiDeleteConversation(connectionId);
        } catch (err) {
          console.error("Failed to delete conversation:", connectionId, err);
        }
      },

      deleteMilestone: async (milestoneId) => {
        try {
          await apiDeleteMilestone(milestoneId);
        } catch (err) {
          console.error("Failed to delete milestone:", milestoneId, err);
        }
      },
    }),
    { name: "useai-dashboard", enabled: true },
  ),
);
