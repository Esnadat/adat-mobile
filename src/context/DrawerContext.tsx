import React, { createContext, useContext } from "react";

/** Lets ScreenShell render a ☰ that opens the app drawer, without prop-threading.
 * Only provided around the main tab screens, so sub-views (which have a back button)
 * don't show a hamburger. */
export const DrawerContext = createContext<{ openDrawer: () => void } | null>(null);

export function useDrawer() {
  return useContext(DrawerContext);
}
