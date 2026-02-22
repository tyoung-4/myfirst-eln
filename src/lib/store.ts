import type { Entry } from "@/models/entry";
import { newEntry } from "@/models/entry";

type Store = {
  entries: Entry[];
};

const globalAny = global as any;

if (!globalAny.__ELN_STORE__) {
  globalAny.__ELN_STORE__ = {
    entries: [newEntry({ title: "Welcome", body: "This is your first entry." })],
  } as Store;
}

export const store = globalAny.__ELN_STORE__ as Store;
