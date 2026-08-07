import React from "react";
import { ScreenShell } from "../components/ui/ScreenShell";
import { i18n } from "../i18n";
import { RequestsScreen } from "./RequestsScreen";

export function RequestsHubScreen() {
  return (
    <ScreenShell
      title={i18n.t("requestsTab")}
      subtitle={i18n.t("requestsSubtitle")}
      headerDensity="compact"
      scrollable={false}
      contentContainerStyle={{ paddingTop: 6, paddingHorizontal: 0, flex: 1 }}
    >
      <RequestsScreen />
    </ScreenShell>
  );
}
