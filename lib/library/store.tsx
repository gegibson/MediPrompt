"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type LibrarySort = "featured" | "newest" | "title";

export type LibraryState = {
  selectedCategories: string[]; // allow multi; empty = all
  query: string;
  sort: LibrarySort;
  page: number;
  expandedPromptIds: Record<string, boolean>;
  copiedPromptId: string | null;
};

export type LibraryActions = {
  setSelectedCategories: (cats: string[]) => void;
  setQuery: (q: string) => void;
  setSort: (s: LibrarySort) => void;
  setPage: (p: number) => void;
  toggleExpanded: (id: string) => void;
  setCopiedPromptId: (id: string | null) => void;
  collapseAll: () => void;
  reset: () => void;
};

const DEFAULT_STATE: LibraryState = {
  selectedCategories: [],
  query: "",
  sort: "featured",
  page: 1,
  expandedPromptIds: {},
  copiedPromptId: null,
};

const StateCtx = createContext<LibraryState | null>(null);
const ActionsCtx = createContext<LibraryActions | null>(null);

export function LibraryProvider({ children, initialState }: { children: ReactNode; initialState?: Partial<LibraryState> }) {
  const [state, setState] = useState<LibraryState>({ ...DEFAULT_STATE, ...(initialState ?? {}) });

  const actions = useMemo<LibraryActions>(() => ({
    setSelectedCategories: (cats) => setState((s) => ({ ...s, selectedCategories: cats, page: 1 })),
    setQuery: (q) => setState((s) => ({ ...s, query: q, page: 1 })),
    setSort: (sort) => setState((s) => ({ ...s, sort, page: 1 })),
    setPage: (p) => setState((s) => ({ ...s, page: p })),
    toggleExpanded: (id) =>
      setState((s) => ({
        ...s,
        expandedPromptIds: { ...s.expandedPromptIds, [id]: !s.expandedPromptIds[id] },
      })),
    setCopiedPromptId: (id) => setState((s) => ({ ...s, copiedPromptId: id })),
    collapseAll: () =>
      setState((s) => ({
        ...s,
        expandedPromptIds: {},
      })),
    reset: () => setState({ ...DEFAULT_STATE }),
  }), []);

  return (
    <StateCtx.Provider value={state}>
      <ActionsCtx.Provider value={actions}>{children}</ActionsCtx.Provider>
    </StateCtx.Provider>
  );
}

export function useLibraryState() {
  const ctx = useContext(StateCtx);
  if (!ctx) throw new Error("useLibraryState must be used within LibraryProvider");
  return ctx;
}

export function useLibraryActions() {
  const ctx = useContext(ActionsCtx);
  if (!ctx) throw new Error("useLibraryActions must be used within LibraryProvider");
  return ctx;
}
