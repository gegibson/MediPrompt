type StorageLike = {
  getItem?: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
};

export const FREE_PREVIEW_STORAGE_KEY = "mp-wizard-preview-used";

export const getPreviewStorageKey = (userId: string | undefined): string => {
  return `${FREE_PREVIEW_STORAGE_KEY}-${userId ?? "anon"}`;
};

export const readPreviewUsage = (
  storage: StorageLike | null | undefined,
  key: string,
): boolean => {
  if (!storage?.getItem) {
    return false;
  }

  try {
    return storage.getItem(key) === "1";
  } catch (error) {
    console.warn("[Wizard] unable to read preview flag", error);
    return false;
  }
};

export const writePreviewUsage = (
  storage: StorageLike | null | undefined,
  key: string,
  used: boolean,
): void => {
  if (!storage) {
    return;
  }

  try {
    if (used) {
      storage.setItem?.(key, "1");
    } else {
      storage.removeItem?.(key);
    }
  } catch (error) {
    console.warn("[Wizard] unable to persist preview flag", error);
  }
};
