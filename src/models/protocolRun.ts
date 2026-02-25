export type ProtocolRun = {
  id: string;
  title: string;
  status: string;
  locked: boolean;
  runBody: string;
  interactionState: string;
  createdAt: string;
  updatedAt: string;
  sourceEntryId: string;
  runnerId?: string | null;
  sourceEntry?: {
    id: string;
    title: string;
    description: string;
  };
  runner?: {
    id: string;
    name: string | null;
    role: string;
  } | null;
};
