export interface PageMeta {
  total: number;
  page: number;
  limit: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: PageMeta;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: import("./roles.js").Role;
}
