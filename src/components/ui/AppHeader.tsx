import React from "react";
import { SectionTitle } from "./SectionTitle";

/** In-screen page header (title + optional subtitle). */
export function AppHeader(props: React.ComponentProps<typeof SectionTitle>) {
  return <SectionTitle {...props} />;
}
