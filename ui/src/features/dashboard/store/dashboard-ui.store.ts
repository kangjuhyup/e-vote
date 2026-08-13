"use client";

import { create } from "zustand";

import type {
  DashboardDensity,
  VoteStatusFilter,
} from "../model/dashboard.types";

interface DashboardUiState {
  density: DashboardDensity;
  statusFilter: VoteStatusFilter;
  setDensity: (density: DashboardDensity) => void;
  setStatusFilter: (statusFilter: VoteStatusFilter) => void;
}

export const useDashboardUiStore = create<DashboardUiState>((set) => ({
  density: "comfortable",
  statusFilter: "open",
  setDensity: (density) => set({ density }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
}));
