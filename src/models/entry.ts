export type Entry = {
  id: string;
  title: string;
  description: string;
  technique?: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  attachments?: string[];
  authorId?: string;
  author?: {
    id: string;
    name: string | null;
    role: string;
  } | null;
  version?: number;
};

export const TECHNIQUE_OPTIONS = [
  "General",
  "Cloning",
  "Flow Cytometry",
  "Purification",
  "Bacterial Expression",
  "Mammalian Expression",
  "Other",
] as const;

export function newEntry(data: Partial<Entry> = {}): Entry {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: data.title ?? "Untitled",
    description: data.description ?? "",
    technique: data.technique ?? "General",
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
    const runtimeCrypto = globalThis.crypto as Crypto | undefined;
    if (runtimeCrypto && typeof runtimeCrypto.randomUUID === "function") {
      return runtimeCrypto.randomUUID();
    }
  } catch {}
  return Math.random().toString(36).slice(2, 10);
}
