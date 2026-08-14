import { AxiosError } from "axios";

export type MappedAttendanceError = {
  tone: "info" | "danger";
  title: string;
  message: string;
  /** True for the "already has an open check-in" case → offer a check-out action. */
  offerCheckout?: boolean;
};

/** Best-effort extraction of the BFF `{ code, message }` from an axios error. */
function extract(error: unknown): { code: string; message: string } {
  const ax = error as AxiosError<{ code?: string; message?: string }> | undefined;
  const data = ax?.response?.data;
  const code = String(data?.code ?? "").trim().toUpperCase();
  const message = String(data?.message ?? (error instanceof Error ? error.message : "") ?? "").trim();
  return { code, message };
}

/**
 * Maps a BFF attendance error to an Arabic-first, user-friendly alert. Recognizes the
 * known codes/messages from the check-in/out endpoints; falls back to a generic
 * localized message so a raw English string never reaches the user.
 */
export function resolveAttendanceError(error: unknown, locale: string): MappedAttendanceError {
  const isAr = locale === "ar";
  const { code, message } = extract(error);
  const m = message.toLowerCase();

  const already = code === "ALREADY_CHECKED_IN" || code === "ATTENDANCE_ALREADY_MARKED" || m.includes("open check-in") || m.includes("already checked in");
  if (already) {
    return {
      tone: "info",
      title: isAr ? "تنبيه" : "Notice",
      message: isAr
        ? "لديك تسجيل حضور مفتوح بالفعل — هل تريد تسجيل الانصراف؟"
        : "You already have an open check-in — do you want to check out?",
      offerCheckout: true,
    };
  }

  if (code === "CHECKOUT_WITHOUT_CHECKIN" || m.includes("without an open check-in")) {
    return {
      tone: "info",
      title: isAr ? "تنبيه" : "Notice",
      message: isAr ? "لا يوجد تسجيل حضور مفتوح لتسجيل الانصراف." : "There is no open check-in to check out from.",
    };
  }

  if (m.includes("already checked out")) {
    return {
      tone: "info",
      title: isAr ? "تنبيه" : "Notice",
      message: isAr ? "سجّلت انصرافك بالفعل." : "You have already checked out.",
    };
  }

  if (code === "LOCATION_OUT_OF_RANGE" || m.includes("outside the allowed")) {
    return {
      tone: "danger",
      title: isAr ? "خارج النطاق" : "Out of range",
      message: isAr
        ? "أنت خارج نطاق الحضور المسموح. اقترب من موقع العمل وحاول مرة أخرى."
        : "You are outside the allowed attendance range. Move closer to your work location and try again.",
    };
  }

  if (code === "LOCATION_COORDINATES_REQUIRED" || m.includes("coordinates")) {
    return {
      tone: "danger",
      title: isAr ? "الموقع مطلوب" : "Location required",
      message: isAr ? "تعذّر تحديد موقعك. فعّل خدمة الموقع وحاول مرة أخرى." : "Could not read your location. Enable location services and try again.",
    };
  }

  return {
    tone: "danger",
    title: isAr ? "تعذّر إتمام العملية" : "Something went wrong",
    message: isAr ? "حدث خطأ غير متوقع. حاول مرة أخرى." : "An unexpected error occurred. Please try again.",
  };
}
