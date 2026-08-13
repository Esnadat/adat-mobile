import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { HomeAnnouncements } from "../components/home/HomeAnnouncements";
import { HomeHeroBand } from "../components/home/HomeHeroBand";
import { HomeTodaySections } from "../components/home/HomeTodaySections";
import { EmployeeAvatar } from "../components/ui/EmployeeAvatar";
import { ScreenShell } from "../components/ui/ScreenShell";
import { useAuth } from "../context/AuthContext";
import { useAppLocale } from "../i18n/LocaleContext";
import { i18n } from "../i18n";
import { announcementService } from "../services/announcementService";
import { attendanceService } from "../services/attendanceService";
import { getApiErrorMessage } from "../services/http";
import { taskService } from "../services/taskService";
import { colors } from "../theme/colors";
import { floatingTabBarBottomInset } from "../theme/shadows";
import { type as typeStyles } from "../theme/typography";
import { formatMobileDate, formatMobileTimeFromDate } from "../utils/mobileDateFormat";
import { EmployeeTask, EstablishmentAnnouncement } from "../types/api";

const DEBUG_ATTENDANCE_LOCATION = false;
const DEBUG_ATTENDANCE_DIAG = false;
const LOCATION_ACTION_TIMEOUT_MS = 20000;
const ATTENDANCE_API_TIMEOUT_MS = 20000;
// Enable only for Android emulator testing when Expo Location cannot return coordinates.
const DEV_EMULATOR_LOCATION_ENABLED = false;
const DEV_EMULATOR_LATITUDE = 26.3592;
const DEV_EMULATOR_LONGITUDE = 43.9818;

type AttendanceDiagState = {
  permission: string;
  services: string;
  lastKnown: string;
  current: string;
  selectedSource: "lastKnown" | "currentPosition" | "devEmulatorFallback" | "none";
};

function attendanceDiag(label: string, data?: unknown) {
  if (!DEBUG_ATTENDANCE_DIAG || !__DEV__) return;
  console.log("[attendance-diag]", label, data ?? "");
}

function diagSummary(diag: AttendanceDiagState): string {
  return `permission=${diag.permission}, services=${diag.services}, lastKnown=${diag.lastKnown}, current=${diag.current}`;
}

export type AttendanceScreenProps = {
  onGoRequests: () => void;
  onGoCalendar: () => void;
  onGoProfile: () => void;
  onOpenPayroll: () => void;
};

/** Local calendar day key (YYYY-MM-DD) for comparing successful ops to "today" without new APIs. */
function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function attendanceCompletedTitle(locale: string): string {
  return locale === "ar"
    ? "تم تسجيل الحضور والانصراف اليوم"
    : "Check-in and check-out are complete for today.";
}

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export function AttendanceScreen({
  onGoRequests: _onGoRequests,
  onGoCalendar: _onGoCalendar,
  onGoProfile,
  onOpenPayroll: _onOpenPayroll,
}: AttendanceScreenProps) {
  const { user } = useAuth();
  const { locale } = useAppLocale();
  const isAr = locale === "ar";
  const [loading, setLoading] = useState(false);
  const actionInFlightRef = useRef(false);
  const isMountedRef = useRef(true);
  const [now, setNow] = useState(() => new Date());
  /** Set only after a successful check-in for that calendar day (device local). */
  const [lastSuccessfulInDayKey, setLastSuccessfulInDayKey] = useState<string | null>(null);
  /** Set only after a successful check-out for that calendar day (device local). */
  const [lastSuccessfulOutDayKey, setLastSuccessfulOutDayKey] = useState<string | null>(null);
  const [lastCheckInTimeLabel, setLastCheckInTimeLabel] = useState<string | null>(null);
  const [lastCheckOutTimeLabel, setLastCheckOutTimeLabel] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<EstablishmentAnnouncement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [openTasks, setOpenTasks] = useState<EmployeeTask[]>([]);
  const [openTasksLoading, setOpenTasksLoading] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const loadAnnouncements = async () => {
      setAnnouncementsLoading(true);
      try {
        const rows = await announcementService.getCurrentAnnouncements();
        if (!active) return;
        setAnnouncements(rows);
      } catch (error) {
        if (__DEV__) {
          console.warn("[announcements] failed:", getApiErrorMessage(error));
        }
        if (!active) return;
        setAnnouncements([]);
      } finally {
        if (active) setAnnouncementsLoading(false);
      }
    };

    void loadAnnouncements();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadOpenTasks = async () => {
      setOpenTasksLoading(true);
      try {
        const rows = await taskService.listMyOpenTasks();
        if (!active) return;
        setOpenTasks(rows);
      } catch (error) {
        if (__DEV__) {
          console.warn("[tasks] failed:", getApiErrorMessage(error));
        }
        if (!active) return;
        setOpenTasks([]);
      } finally {
        if (active) setOpenTasksLoading(false);
      }
    };

    void loadOpenTasks();
    return () => {
      active = false;
    };
  }, []);

  const getLocation = async (diag?: AttendanceDiagState): Promise<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: string;
  } | null> => {
    attendanceDiag("permission.request.start");
    const perm = await withTimeout(
      Location.requestForegroundPermissionsAsync(),
      LOCATION_ACTION_TIMEOUT_MS,
      "LOCATION_TIMEOUT"
    );
    if (diag) diag.permission = perm.status;
    attendanceDiag("permission.request.result", { status: perm.status });
    if (__DEV__ && DEBUG_ATTENDANCE_LOCATION) {
      console.warn("[attendance-loc] foreground permission status:", perm.status);
    }
    if (perm.status !== "granted") {
      Alert.alert(i18n.t("locationRequired"), i18n.t("locationRequiredBody"));
      return null;
    }

    if (typeof Location.hasServicesEnabledAsync === "function") {
      try {
        attendanceDiag("services.check.start");
        const servicesEnabled = await withTimeout(
          Location.hasServicesEnabledAsync(),
          LOCATION_ACTION_TIMEOUT_MS,
          "LOCATION_TIMEOUT"
        );
        if (diag) diag.services = servicesEnabled ? "enabled" : "disabled";
        attendanceDiag("services.check.result", { enabled: servicesEnabled });
        if (__DEV__ && DEBUG_ATTENDANCE_LOCATION) {
          console.warn("[attendance-loc] location services enabled:", servicesEnabled);
        }
        if (!servicesEnabled) {
          Alert.alert(i18n.t("locationUnavailable"), i18n.t("locationUnavailableBody"));
          return null;
        }
      } catch (e) {
        if (diag) diag.services = "error";
        attendanceDiag("services.check.error", e instanceof Error ? e.message : String(e));
        if (__DEV__ && DEBUG_ATTENDANCE_LOCATION) {
          console.warn("[attendance-loc] hasServicesEnabledAsync error:", e instanceof Error ? e.message : String(e));
        }
      }
    } else if (diag) {
      diag.services = "unknown";
    }

    const isValidCoords = (coords: Location.LocationObject["coords"] | undefined): boolean => {
      if (!coords) return false;
      const { latitude, longitude } = coords;
      return (
        typeof latitude === "number" &&
        typeof longitude === "number" &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
      );
    };

    try {
      attendanceDiag("lastKnown.attempt.start");
      const lastKnown = await withTimeout(
        Location.getLastKnownPositionAsync({ maxAge: 60_000 }),
        LOCATION_ACTION_TIMEOUT_MS,
        "LOCATION_TIMEOUT"
      );
      const hasCoords = Boolean(lastKnown && isValidCoords(lastKnown.coords));
      if (diag) diag.lastKnown = hasCoords ? "ok" : "empty";
      attendanceDiag("lastKnown.attempt.result", {
        hasCoords,
        latitude: hasCoords ? lastKnown?.coords.latitude : undefined,
        longitude: hasCoords ? lastKnown?.coords.longitude : undefined,
        timestamp: lastKnown?.timestamp ?? null,
      });
      if (lastKnown && isValidCoords(lastKnown.coords)) {
        if (diag) diag.selectedSource = "lastKnown";
        attendanceDiag("location.selected.source", { source: "lastKnown" });
        return {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          accuracy: lastKnown.coords.accuracy ?? undefined,
          timestamp: new Date(lastKnown.timestamp).toISOString(),
        };
      }
    } catch (e) {
      if (diag) diag.lastKnown = "error";
      attendanceDiag("lastKnown.attempt.error", e instanceof Error ? e.message : String(e));
      if (__DEV__ && DEBUG_ATTENDANCE_LOCATION) {
        console.warn("[attendance-loc] getLastKnownPositionAsync failed:", e instanceof Error ? e.message : String(e));
      }
    }

    try {
      attendanceDiag("currentPosition.attempt.start", { accuracy: "Balanced", timeoutMs: LOCATION_ACTION_TIMEOUT_MS });
      const current = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        LOCATION_ACTION_TIMEOUT_MS,
        "LOCATION_TIMEOUT"
      );
      const hasCoords = Boolean(current && isValidCoords(current.coords));
      if (diag) diag.current = hasCoords ? "ok" : "empty";
      attendanceDiag("currentPosition.attempt.result", {
        hasCoords,
        latitude: hasCoords ? current?.coords.latitude : undefined,
        longitude: hasCoords ? current?.coords.longitude : undefined,
        timestamp: current?.timestamp ?? null,
      });
      if (current && isValidCoords(current.coords)) {
        if (diag) diag.selectedSource = "currentPosition";
        attendanceDiag("location.selected.source", { source: "currentPosition" });
        return {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
          accuracy: current.coords.accuracy ?? undefined,
          timestamp: new Date(current.timestamp).toISOString(),
        };
      }
    } catch (e) {
      if (e instanceof Error && e.message === "LOCATION_TIMEOUT") {
        if (diag) diag.current = "timeout";
        attendanceDiag("currentPosition.attempt.timeout");
      } else {
        if (diag) diag.current = "error";
        attendanceDiag("currentPosition.attempt.error", e instanceof Error ? e.message : String(e));
        if (__DEV__ && DEBUG_ATTENDANCE_LOCATION) {
          console.warn(
            "[attendance-loc] getCurrentPositionAsync failed:",
            e instanceof Error ? e.message : String(e)
          );
        }
      }
    }

    if (
      __DEV__ &&
      DEV_EMULATOR_LOCATION_ENABLED &&
      Number.isFinite(DEV_EMULATOR_LATITUDE) &&
      Number.isFinite(DEV_EMULATOR_LONGITUDE)
    ) {
      if (diag) diag.selectedSource = "devEmulatorFallback";
      attendanceDiag("location.selected.source", { source: "devEmulatorFallback" });
      return {
        latitude: DEV_EMULATOR_LATITUDE,
        longitude: DEV_EMULATOR_LONGITUDE,
      };
    }

    if (__DEV__ && DEBUG_ATTENDANCE_LOCATION) {
      console.warn("[attendance-loc] location unavailable: null or invalid coords");
    }
    if (diag) {
      diag.selectedSource = "none";
      attendanceDiag("location.selected.source", { source: "none", diag: diagSummary(diag) });
    }
    Alert.alert(i18n.t("locationUnavailable"), i18n.t("locationUnavailableBody"));
    return null;
  };

  const handleAction = async (type: "in" | "out") => {
    if (actionInFlightRef.current || loading) return;
    attendanceDiag("handleAction.start", { type });
    actionInFlightRef.current = true;
    if (isMountedRef.current) setLoading(true);
    const diag: AttendanceDiagState = {
      permission: "not-run",
      services: "not-run",
      lastKnown: "not-run",
      current: "not-run",
      selectedSource: "none",
    };
    try {
      const coords = await getLocation(diag);
      if (!coords) return;
      attendanceDiag("attendance.api.start", { type, source: diag.selectedSource });
      if (type === "in") {
        await withTimeout(attendanceService.checkIn(coords), ATTENDANCE_API_TIMEOUT_MS, "ATTENDANCE_API_TIMEOUT");
      } else {
        await withTimeout(attendanceService.checkOut(coords), ATTENDANCE_API_TIMEOUT_MS, "ATTENDANCE_API_TIMEOUT");
      }
      attendanceDiag("attendance.api.success", { type });
      const timeStr = formatMobileTimeFromDate(new Date());
      const title = i18n.t("success");
      const body =
        type === "in"
          ? `${i18n.t("attendanceSuccessIn")} ${timeStr}`
          : `${i18n.t("attendanceSuccessOut")} ${timeStr}`;
      const dayKey = localDayKey(new Date());
      if (isMountedRef.current) {
        if (type === "in") {
          setLastSuccessfulInDayKey(dayKey);
          setLastCheckInTimeLabel(timeStr);
        } else {
          setLastSuccessfulOutDayKey(dayKey);
          setLastCheckOutTimeLabel(timeStr);
        }
      }
      try {
        Alert.alert(title, body);
      } catch {
        // Alert failure should never crash attendance action flow.
      }
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      if (rawMessage === "LOCATION_TIMEOUT") {
        const timeoutMessage =
          locale === "ar"
            ? "تعذر تحديد موقعك. تأكد من تفعيل الموقع وحاول مرة أخرى."
            : "Could not detect your location. Please enable location and try again.";
        if (__DEV__) {
          console.warn("[attendance-action] location timeout", rawMessage);
        }
        attendanceDiag("handleAction.locationTimeout", { diag: diagSummary(diag) });
        try {
          Alert.alert(i18n.t("error"), timeoutMessage);
        } catch {
          // Ignore alert failures; do not rethrow.
        }
        return;
      }
      if (rawMessage === "ATTENDANCE_API_TIMEOUT") {
        const timeoutMessage =
          locale === "ar"
            ? "استغرق تسجيل الحضور وقتًا أطول من المتوقع. حاول مرة أخرى."
            : "Attendance request took too long. Please try again.";
        if (__DEV__) {
          console.warn("[attendance-action] api timeout", rawMessage);
        }
        attendanceDiag("handleAction.apiTimeout", { type });
        try {
          Alert.alert(i18n.t("error"), timeoutMessage);
        } catch {
          // Ignore alert failures; do not rethrow.
        }
        return;
      }
      const safeMessage = getApiErrorMessage(error);
      attendanceDiag("attendance.api.failure", { type, message: safeMessage });
      console.error("[attendance-action] failed", safeMessage);
      try {
        Alert.alert(i18n.t("error"), safeMessage);
      } catch {
        // Ignore alert failures; do not rethrow.
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
      actionInFlightRef.current = false;
    }
  };

  const timeStr = formatMobileTimeFromDate(now);
  const dateStr = formatMobileDate(now);
  const todayKey = localDayKey(now);

  const checkedInToday = lastSuccessfulInDayKey === todayKey;
  const checkedOutToday = lastSuccessfulOutDayKey === todayKey;

  let fingerprintPhase: "checkIn" | "checkOut" | "completed";
  if (checkedInToday && checkedOutToday) {
    fingerprintPhase = "completed";
  } else if (checkedInToday) {
    fingerprintPhase = "checkOut";
  } else {
    fingerprintPhase = "checkIn";
  }

  const phaseSummary =
    fingerprintPhase === "completed"
      ? attendanceCompletedTitle(locale)
      : fingerprintPhase === "checkOut"
        ? i18n.t("checkOut")
        : i18n.t("checkIn");

  const initialSource = user?.name?.trim() || user?.email?.trim() || "?";
  const displayName = user?.name?.trim();
  const companyLabel = user?.companyDisplay?.trim() || user?.companyCode?.trim() || "";
  const taskRows = openTasks.slice(0, 3).map((task) => ({
    id: task.id,
    title: task.title,
    due: task.due_date || undefined,
  }));

  return (
    <ScreenShell
      title={i18n.t("home")}
      subtitle={i18n.t("homeSubtitle")}
      headerDensity="default"
      contentContainerStyle={{
        paddingTop: 6,
        paddingBottom: floatingTabBarBottomInset + 16,
      }}
      headerContent={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={i18n.t("profileTab")}
          onPress={onGoProfile}
          hitSlop={8}
          style={({ pressed }) => [
            styles.identityChip,
            isAr ? styles.identityRowAr : styles.identityRowEn,
            pressed && styles.identityChipPressed,
          ]}
        >
          <View style={[styles.identityText, { alignItems: isAr ? "flex-end" : "flex-start" }]}>
            {displayName ? (
              <Text style={[styles.identityName, isAr && styles.noTrack]} numberOfLines={1}>
                {displayName}
              </Text>
            ) : null}
            {companyLabel ? (
              <Text style={[styles.identityCompany, isAr && styles.noTrack]} numberOfLines={1}>
                {companyLabel}
              </Text>
            ) : null}
          </View>
          <View style={styles.avatarRingHeader}>
            <EmployeeAvatar photoUrl={user?.employeePhotoUrl} initialSource={initialSource} size={34} />
          </View>
        </Pressable>
      }
    >
      <HomeHeroBand
        isAr={isAr}
        timeLabel={timeStr}
        dateLabel={dateStr}
        phaseSummary={phaseSummary}
        phase={fingerprintPhase}
        loading={loading}
        onActionPress={() => {
          if (fingerprintPhase === "checkIn") void handleAction("in");
          else if (fingerprintPhase === "checkOut") void handleAction("out");
        }}
        actionLabel={fingerprintPhase === "checkOut" ? i18n.t("checkOut") : i18n.t("checkIn")}
        todayLabel={i18n.t("todayStatus")}
        lastCheckInTime={lastCheckInTimeLabel}
        lastCheckOutTime={lastCheckOutTimeLabel}
        gpsNote={i18n.t("gpsNote")}
        checkInFooterHint={i18n.t("attendanceReadyHint")}
      />

      <HomeAnnouncements items={announcements} loading={announcementsLoading} isAr={isAr} />

      <View style={styles.feedWrap}>
        <HomeTodaySections isAr={isAr} taskRows={taskRows} tasksLoading={openTasksLoading} />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  noTrack: { letterSpacing: 0 },
  identityRowEn: { flexDirection: "row" },
  identityRowAr: { flexDirection: "row-reverse" },
  identityChipPressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },
  identityChip: {
    width: "100%",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 1,
  },
  identityName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
    lineHeight: 18,
  },
  identityCompany: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    lineHeight: 15,
    fontVariant: ["tabular-nums"],
  },
  avatarRingHeader: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  feedWrap: {
    marginTop: 4,
  },
  feedHeading: {
    ...typeStyles.label,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 6,
  },
});
