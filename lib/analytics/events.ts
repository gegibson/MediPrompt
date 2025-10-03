export type LibraryFilterEvent = {
  query: string;
  categories: string[];
  situations: string[];
  audiences: string[];
  sort: string;
};

export type LibraryZeroResultEvent = {
  query: string;
  categories: string[];
  situations: string[];
  audiences: string[];
};

const shouldLog = () => typeof window !== "undefined" && process.env.NEXT_PUBLIC_ANALYTICS !== "off";

export function trackLibraryFilters(event: LibraryFilterEvent) {
  if (!shouldLog()) return;
  if (process.env.NODE_ENV !== "production") {
    console.debug("[analytics] library_filters", event);
  }
  // TODO: replace with real analytics transport
}

export function trackLibraryZeroResult(event: LibraryZeroResultEvent) {
  if (!shouldLog()) return;
  if (process.env.NODE_ENV !== "production") {
    console.debug("[analytics] library_zero_results", event);
  }
  // TODO: replace with real analytics transport
}
