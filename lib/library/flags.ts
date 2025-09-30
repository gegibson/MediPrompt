export function isLibraryEnabled(): boolean {
  const raw = (process.env.NEXT_PUBLIC_LIBRARY_ENABLED ?? "").toString().trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

