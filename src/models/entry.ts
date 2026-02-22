export type Entry = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  attachments?: string[];
  authorId?: string;
  version?: number;
};

export function newEntry(data: Partial<Entry> = {}): Entry {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: data.title ?? "Untitled",
    body: data.body ?? "",
    createdAt: now,
    updatedAt: now,
    tags: data.tags ?? [],
    attachments: data.attachments ?? [],
    authorId: data.authorId,
    version: data.version ?? 1,
  };
}

function generateId(): string {
  try {
    // modern runtimes
    // @ts-ignore
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
      // @ts-ignore
      return crypto.randomUUID();
  } catch {}
  return Math.random().toString(36).slice(2, 10);
}
