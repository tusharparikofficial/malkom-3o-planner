import { createContext, useContext } from "react";

/** Lets nested block renderers (group children) know which section they belong to. */
export const SectionIdContext = createContext<string>("");

export function useSectionId() {
  return useContext(SectionIdContext);
}
