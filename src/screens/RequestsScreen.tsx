import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Device from "expo-device";
import { LargeButton } from "../components/LargeButton";
import { RequestSelectField, type RequestSelectOption } from "../components/requests/RequestSelectField";
import { Ionicons } from "../components/ui/NavIcons";
import { PremiumCard } from "../components/ui/PremiumCard";
import { SectionIcon } from "../components/ui/SectionIcon";
import { useAppLocale } from "../i18n/LocaleContext";
import { i18n } from "../i18n";
import { getApiErrorMessage } from "../services/http";
import { requestService } from "../services/requestService";
import { leaveCancellationService, type EligibleLeave } from "../services/leaveCancellationService";
import { newIdempotencyKey } from "../utils/idempotency";
import { colors } from "../theme/colors";
import { floatingTabBarBottomInset, shadowCard } from "../theme/shadows";
import { type as typeStyles } from "../theme/typography";
import { LeaveBalanceCheckResult, RequestType } from "../types/api";
import { formatApiDate } from "../utils/formatApiDate";
import { formatMobileDate } from "../utils/mobileDateFormat";
import { localizeLeaveTypeLabel } from "../utils/leaveTypeLabel";
import { MyRequestsScreen } from "./MyRequestsScreen";

type ActiveRequestType = "leave" | "permission" | "support" | "cancel_leave";
type PickerField = "from" | "to" | "permission" | null;
type FlowTab = "new" | "mine";

const ACTIVE_REQUEST_TYPES: ActiveRequestType[] = ["leave", "permission", "cancel_leave", "support"];
const COMING_SOON_TYPES: RequestType[] = ["missed_punch", "attendance_adjustment", "device_change", "overtime"];

interface RequestsScreenProps {
  onViewMyRequests?: () => void;
}

function formatPickerDate(d: Date | null) {
  if (!d) return null;
  return formatMobileDate(d);
}

function titleForType(type: RequestType): string {
  if (type === "leave") return i18n.t("leave");
  if (type === "permission") return i18n.t("permission");
  if (type === "support") return i18n.t("support");
  if (type === "missed_punch") return i18n.t("requestTypeMissedPunch");
  if (type === "attendance_adjustment") return i18n.t("requestTypeAttendanceAdjustment");
  if (type === "device_change") return i18n.t("requestTypeDeviceChange");
  return i18n.t("requestTypeOvertime");
}

function activeTypeTitle(type: ActiveRequestType): string {
  if (type === "cancel_leave") return i18n.t("cancelLeaveTitle");
  return titleForType(type);
}

function iconForType(type: RequestType) {
  if (type === "missed_punch") return "finger-print-outline" as const;
  if (type === "attendance_adjustment") return "construct-outline" as const;
  if (type === "device_change") return "phone-portrait-outline" as const;
  return "timer-outline" as const;
}

export function RequestsScreen({ onViewMyRequests }: RequestsScreenProps = {}) {
  const { locale } = useAppLocale();
  const isAr = locale === "ar";

  const [flowTab, setFlowTab] = useState<FlowTab>("new");
  const [type, setType] = useState<ActiveRequestType>("leave");

  const [leaveType, setLeaveType] = useState("");
  const [leaveTypeOptions, setLeaveTypeOptions] = useState<RequestSelectOption[]>([]);
  const [leaveTypesLoading, setLeaveTypesLoading] = useState(false);
  const [leaveTypesLoaded, setLeaveTypesLoaded] = useState(false);
  const [leaveTypesError, setLeaveTypesError] = useState<string | null>(null);
  const [leaveBalanceLoading, setLeaveBalanceLoading] = useState(false);
  const [leaveBalanceError, setLeaveBalanceError] = useState<string | null>(null);
  const [leaveBalanceCheck, setLeaveBalanceCheck] = useState<LeaveBalanceCheckResult | null>(null);
  const [reason, setReason] = useState("");
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [permissionDate, setPermissionDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [supportSubject, setSupportSubject] = useState("");
  const [supportCategory, setSupportCategory] = useState("technical");
  const [supportPriority, setSupportPriority] = useState("medium");
  const [supportDescription, setSupportDescription] = useState("");
  // Technical-support device info, auto-filled from the device but editable.
  const [supportDevice, setSupportDevice] = useState(() =>
    [Device.manufacturer, Device.modelName].filter(Boolean).join(" ") || Device.deviceName || ""
  );
  const [supportOs, setSupportOs] = useState(() => `${Platform.OS === "ios" ? "iOS" : "Android"} ${String(Platform.Version)}`);

  // Cancel-leave: pick one of the employee's approved, not-yet-started leaves.
  const [cancelLeaveOptions, setCancelLeaveOptions] = useState<EligibleLeave[]>([]);
  const [cancelLeaveTarget, setCancelLeaveTarget] = useState("");
  const [cancelLeaveLoading, setCancelLeaveLoading] = useState(false);
  const [cancelLeaveLoaded, setCancelLeaveLoaded] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  // Stable idempotency key for the current submission attempt: generated on first
  // submit, reused across retries (so a network-lost retry is deduped by the BFF),
  // cleared on success and on form reset so a new submission gets a fresh key.
  const idempotencyKeyRef = useRef<string | null>(null);

  const [androidField, setAndroidField] = useState<PickerField>(null);
  const [iosPicker, setIosPicker] = useState<{ field: Exclude<PickerField, null>; draft: Date } | null>(null);

  const handleTypeChange = (nextType: ActiveRequestType) => {
    if (nextType === type) return;
    setType(nextType);
    setSubmitError(null);

    if (nextType !== "leave") {
      setLeaveType("");
      setFromDate(null);
      setToDate(null);
      setLeaveBalanceLoading(false);
      setLeaveBalanceError(null);
      setLeaveBalanceCheck(null);
    }

    if (nextType !== "permission") {
      setPermissionDate(null);
      setStartTime("");
      setEndTime("");
    }

    if (nextType !== "support") {
      setSupportSubject("");
      setSupportCategory("technical");
      setSupportPriority("medium");
      setSupportDescription("");
    }

    if (nextType !== "cancel_leave") {
      setCancelLeaveTarget("");
    }
  };

  const loadEligibleLeaves = async () => {
    setCancelLeaveLoading(true);
    try {
      const rows = await leaveCancellationService.eligibleLeaves();
      setCancelLeaveOptions(rows);
      setCancelLeaveLoaded(true);
      if (!rows.some((r) => r.leaveApplication === cancelLeaveTarget)) setCancelLeaveTarget("");
    } catch {
      setCancelLeaveOptions([]);
      setCancelLeaveLoaded(true);
    } finally {
      setCancelLeaveLoading(false);
    }
  };

  const supportCategoryOptions: RequestSelectOption[] = useMemo(
    () => [
      { value: "technical", label: i18n.t("supportCatTech") },
      { value: "hr", label: i18n.t("supportCatHR") },
      { value: "payroll", label: i18n.t("supportCatPayroll") },
      { value: "attendance", label: i18n.t("supportCatAttendance") },
      { value: "other", label: i18n.t("supportCatOther") },
    ],
    [locale]
  );

  const supportPriorityOptions: RequestSelectOption[] = useMemo(
    () => [
      { value: "low", label: i18n.t("supportPriLow") },
      { value: "medium", label: i18n.t("supportPriMed") },
      { value: "high", label: i18n.t("supportPriHigh") },
    ],
    [locale]
  );

  const resetForm = () => {
    setType("leave");
    setLeaveType("");
    setLeaveBalanceLoading(false);
    setLeaveBalanceError(null);
    setLeaveBalanceCheck(null);
    setReason("");
    setFromDate(null);
    setToDate(null);
    setPermissionDate(null);
    setStartTime("");
    setEndTime("");
    setSupportSubject("");
    setSupportCategory("technical");
    setSupportPriority("medium");
    setSupportDescription("");
    setCancelLeaveTarget("");
    setSubmitError(null);
    setSubmittedName(null);
    setFlowTab("new");
    idempotencyKeyRef.current = null;
  };

  const loadLeaveTypes = async () => {
    setLeaveTypesLoading(true);
    setLeaveTypesError(null);
    try {
      const rows = await requestService.getLeaveTypes();
      const options = rows.map((row) => {
        const hasBalance = row.balance != null;
        const localizedLabel = localizeLeaveTypeLabel(row.label, locale);
        return {
          value: row.name,
          label: hasBalance
            ? `${localizedLabel} — ${i18n.t("leaveBalanceLabel")} ${row.balance}`
            : localizedLabel,
        };
      });
      setLeaveTypeOptions(options);
      setLeaveTypesLoaded(true);
      if (!options.some((opt) => opt.value === leaveType)) {
        setLeaveType("");
      }
    } catch {
      setLeaveTypeOptions([]);
      setLeaveTypesLoaded(true);
      setLeaveTypesError(i18n.t("leaveTypesLoadError"));
      setLeaveType("");
    } finally {
      setLeaveTypesLoading(false);
    }
  };

  useEffect(() => {
    if (flowTab !== "new" || type !== "leave") return;
    if (!leaveTypesLoaded && !leaveTypesLoading) {
      void loadLeaveTypes();
    }
  }, [flowTab, type, leaveTypesLoaded, leaveTypesLoading]);

  // Refresh eligible leaves whenever the cancel-leave form opens (state changes over time).
  useEffect(() => {
    if (flowTab !== "new" || type !== "cancel_leave") return;
    void loadEligibleLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowTab, type]);

  useEffect(() => {
    if (flowTab !== "new" || type !== "leave") return;
    if (!leaveType || !fromDate || !toDate) {
      setLeaveBalanceLoading(false);
      setLeaveBalanceError(null);
      setLeaveBalanceCheck(null);
      return;
    }
    const fromDateApi = formatApiDate(fromDate);
    const toDateApi = formatApiDate(toDate);
    if (!fromDateApi || !toDateApi || toDateApi < fromDateApi) {
      setLeaveBalanceLoading(false);
      setLeaveBalanceError(null);
      setLeaveBalanceCheck(null);
      return;
    }
    let cancelled = false;
    setLeaveBalanceLoading(true);
    setLeaveBalanceError(null);
    const timer = setTimeout(async () => {
      try {
        const result = await requestService.checkLeaveBalance({
          leaveType: leaveType.trim(),
          fromDate: fromDateApi,
          toDate: toDateApi,
        });
        if (!cancelled) setLeaveBalanceCheck(result);
      } catch {
        if (!cancelled) {
          setLeaveBalanceCheck(null);
          setLeaveBalanceError(i18n.t("leaveCheckLoadError"));
        }
      } finally {
        if (!cancelled) setLeaveBalanceLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [flowTab, type, leaveType, fromDate, toDate]);

  const openDatePicker = (field: Exclude<PickerField, null>) => {
    const current =
      field === "from" ? fromDate || new Date() : field === "to" ? toDate || fromDate || new Date() : permissionDate || new Date();
    if (Platform.OS === "ios") setIosPicker({ field, draft: current });
    else setAndroidField(field);
  };

  const onAndroidDateChange = (field: Exclude<PickerField, null>, event: DateTimePickerEvent, d?: Date) => {
    setAndroidField(null);
    if (event.type === "dismissed" || !d) return;
    if (field === "from") setFromDate(d);
    else if (field === "to") setToDate(d);
    else setPermissionDate(d);
  };

  const commitIosPicker = () => {
    if (!iosPicker) return;
    if (iosPicker.field === "from") setFromDate(iosPicker.draft);
    else if (iosPicker.field === "to") setToDate(iosPicker.draft);
    else setPermissionDate(iosPicker.draft);
    setIosPicker(null);
  };

  const submit = async () => {
    if (loading) return;
    setSubmitError(null);

    if (type === "leave") {
      if (leaveTypeOptions.length === 0) return setSubmitError(i18n.t("leaveTypesUnavailable"));
      if (!leaveType.trim()) return setSubmitError(i18n.t("valLeaveType"));
      if (!fromDate) return setSubmitError(i18n.t("valStartDate"));
      if (!toDate) return setSubmitError(i18n.t("valEndDate"));
      if (formatApiDate(toDate) < formatApiDate(fromDate)) return setSubmitError(i18n.t("valDateOrder"));
      if (leaveBalanceLoading) return setSubmitError(i18n.t("leaveCheckLoading"));
      if (leaveBalanceCheck && !leaveBalanceCheck.canSubmit) {
        if (leaveBalanceCheck.missingReason === "NO_ALLOCATION") {
          return setSubmitError(i18n.t("leaveCheckNoAllocation"));
        }
        if (leaveBalanceCheck.missingReason === "OUTSIDE_ALLOCATION_PERIOD") {
          return setSubmitError(i18n.t("leaveCheckOutsidePeriod"));
        }
        if (leaveBalanceCheck.missingReason === "INSUFFICIENT_BALANCE") {
          return setSubmitError(i18n.t("leaveCheckInsufficient"));
        }
      }
      if (!reason.trim()) return setSubmitError(i18n.t("valReason"));
    }

    if (type === "permission") {
      if (!permissionDate) return setSubmitError(i18n.t("valPermissionDate"));
      if (!reason.trim()) return setSubmitError(i18n.t("valReason"));
    }

    if (type === "support") {
      if (!supportSubject.trim()) return setSubmitError(i18n.t("valSupportSubject"));
      if (!supportCategory.trim()) return setSubmitError(i18n.t("supportCategory"));
      if (!supportPriority.trim()) return setSubmitError(i18n.t("supportPriority"));
      if (!supportDescription.trim()) return setSubmitError(i18n.t("valSupportDescription"));
    }

    if (type === "cancel_leave") {
      if (!cancelLeaveTarget.trim()) return setSubmitError(i18n.t("valCancelLeaveTarget"));
    }

    setLoading(true);
    const idempotencyKey =
      idempotencyKeyRef.current ?? (idempotencyKeyRef.current = newIdempotencyKey());
    try {
      if (type === "leave" && fromDate && toDate) {
        const res = await requestService.createRequest(
          {
            type: "leave",
            reason: reason.trim(),
            leaveType: leaveType.trim(),
            fromDate: formatApiDate(fromDate),
            toDate: formatApiDate(toDate),
          },
          { idempotencyKey }
        );
        const resData = res?.data as { data?: { name?: string } } | undefined;
        setSubmittedName(resData?.data?.name ?? "");
      } else if (type === "permission" && permissionDate) {
        await requestService.createRequest(
          {
            type: "permission",
            reason: reason.trim(),
            permissionDate: formatApiDate(permissionDate),
            startTime: startTime.trim() || undefined,
            endTime: endTime.trim() || undefined,
          },
          { idempotencyKey }
        );
        setSubmittedName("");
      } else if (type === "support") {
        const res = await requestService.createSupportTicket(
          {
            title: supportSubject.trim(),
            description: supportDescription.trim(),
            category: supportCategory.trim(),
            priority: supportPriority.trim(),
            deviceType:
              supportCategory.trim() === "technical"
                ? [supportDevice.trim(), supportOs.trim()].filter(Boolean).join(" · ")
                : undefined,
          },
          { idempotencyKey }
        );
        const data = res?.data as { data?: { id?: string; name?: string } } | undefined;
        setSubmittedName(data?.data?.id || data?.data?.name || "");
      } else if (type === "cancel_leave") {
        const created = await leaveCancellationService.create(cancelLeaveTarget.trim(), reason.trim(), { idempotencyKey });
        setSubmittedName(created.leaveApplication || "");
      }
      // Submission succeeded — drop the key so the next request gets a fresh one.
      idempotencyKeyRef.current = null;
    } catch (error) {
      if (type === "support") {
        setSubmitError(i18n.t("supportSubmitError"));
      } else if (
        type === "leave" &&
        String(getApiErrorMessage(error)).toLowerCase().includes("application period cannot be outside leave allocation period")
      ) {
        setSubmitError(i18n.t("leaveCheckOutsidePeriod"));
      } else {
        setSubmitError(getApiErrorMessage(error));
      }
      return;
    } finally {
      setLoading(false);
    }
  };

  const segmentedControl = (
    <View style={[styles.segmented, isAr && styles.rowReverse]}>
      <Pressable
        style={[styles.segmentItem, flowTab === "new" ? styles.segmentItemActive : undefined]}
        onPress={() => {
          setFlowTab("new");
          setSubmitError(null);
        }}
      >
        <View style={[styles.segmentInner, isAr && styles.rowReverse]}>
          <Ionicons
            name="add-circle-outline"
            size={15}
            color={flowTab === "new" ? colors.white : colors.textSecondary}
          />
          <Text style={[styles.segmentText, flowTab === "new" ? styles.segmentTextActive : undefined]}>{i18n.t("newRequest")}</Text>
        </View>
      </Pressable>
      <Pressable
        style={[styles.segmentItem, flowTab === "mine" ? styles.segmentItemActive : undefined]}
        onPress={() => {
          setFlowTab("mine");
          setSubmitError(null);
          onViewMyRequests?.();
        }}
      >
        <Text style={[styles.segmentText, flowTab === "mine" ? styles.segmentTextActive : undefined]}>{i18n.t("myRequests")}</Text>
      </Pressable>
    </View>
  );

  if (submittedName !== null) {
    return (
      <View style={styles.successOuter}>
        <View style={styles.successCard}>
          <View style={styles.successIconBox}>
            <View style={styles.successCheckStem} />
            <View style={styles.successCheckFold} />
          </View>
          <Text style={styles.successTitle}>{i18n.t("requestSubmitted")}</Text>
          <Text style={styles.successHint}>{type === "support" ? i18n.t("supportSubmitSuccess") : i18n.t("requestFlowHint")}</Text>
          {submittedName ? (
            <View style={styles.idBadge}>
              <Text style={styles.idLabel}>{i18n.t("requestId")}</Text>
              <Text style={styles.idValue}>{submittedName}</Text>
            </View>
          ) : null}
          <View style={styles.successActions}>
            <LargeButton
              title={i18n.t("viewMyRequests")}
              onPress={() => {
                setFlowTab("mine");
                setSubmittedName(null);
              }}
              variant="primary"
            />
            <LargeButton title={i18n.t("newRequest")} onPress={resetForm} variant="secondary" />
          </View>
        </View>
      </View>
    );
  }

  if (flowTab === "mine") {
    return (
      <View style={styles.mineRoot}>
        <View style={styles.mineTop}>{segmentedControl}</View>
        <MyRequestsScreen focused />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.outer}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {segmentedControl}

        <View style={[styles.activeTypeRow, isAr && styles.rowReverse]}>
          {ACTIVE_REQUEST_TYPES.map((requestType) => {
            const selected = type === requestType;
            return (
              <Pressable
                key={requestType}
                style={[styles.typeChip, selected ? styles.typeChipActive : undefined]}
                onPress={() => {
                  handleTypeChange(requestType);
                }}
              >
                <Text style={[styles.typeChipText, selected ? styles.typeChipTextActive : undefined]}>{activeTypeTitle(requestType)}</Text>
              </Pressable>
            );
          })}
        </View>

        <PremiumCard style={styles.formCard}>
          {type === "leave" ? (
            <>
              <RequestSelectField
                label={i18n.t("leaveType")}
                value={leaveType}
                options={leaveTypeOptions}
                onValueChange={setLeaveType}
                placeholder={
                  leaveTypesLoading
                    ? i18n.t("leaveTypesLoading")
                    : leaveTypeOptions.length === 0
                    ? i18n.t("leaveTypesEmpty")
                    : i18n.t("tapToSelect")
                }
                isAr={isAr}
              />
              {leaveTypesError ? (
                <View style={styles.inlineNotice}>
                  <Text style={[styles.inlineNoticeText, isAr && styles.textRtl]}>{leaveTypesError}</Text>
                  <Pressable onPress={() => void loadLeaveTypes()}>
                    <Text style={[styles.inlineNoticeAction, isAr && styles.textRtl]}>{i18n.t("retry")}</Text>
                  </Pressable>
                </View>
              ) : null}
              {!leaveTypesLoading && leaveTypesLoaded && leaveTypeOptions.length === 0 ? (
                <View style={styles.inlineNotice}>
                  <Text style={[styles.inlineNoticeText, isAr && styles.textRtl]}>{i18n.t("leaveTypesEmpty")}</Text>
                </View>
              ) : null}
              <FieldRow label={i18n.t("startDate")} isAr={isAr} iconName="calendar-outline">
                <Pressable style={styles.datePicker} onPress={() => openDatePicker("from")}>
                  <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                  <Text style={fromDate ? styles.dateValue : styles.datePlaceholder}>{formatPickerDate(fromDate) ?? i18n.t("tapToSelect")}</Text>
                  <Text style={styles.dateChevron}>›</Text>
                </Pressable>
              </FieldRow>
              <FieldRow label={i18n.t("endDate")} isAr={isAr} iconName="calendar-outline">
                <Pressable style={styles.datePicker} onPress={() => openDatePicker("to")}>
                  <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                  <Text style={toDate ? styles.dateValue : styles.datePlaceholder}>{formatPickerDate(toDate) ?? i18n.t("tapToSelect")}</Text>
                  <Text style={styles.dateChevron}>›</Text>
                </Pressable>
              </FieldRow>
              {leaveBalanceLoading ? (
                <View style={styles.balanceCard}>
                  <Text style={[styles.balanceText, isAr && styles.textRtl]}>{i18n.t("leaveCheckLoading")}</Text>
                </View>
              ) : leaveBalanceError ? (
                <View style={styles.balanceCardWarn}>
                  <Text style={[styles.balanceText, isAr && styles.textRtl]}>{leaveBalanceError}</Text>
                </View>
              ) : leaveBalanceCheck ? (
                <View style={leaveBalanceCheck.canSubmit ? styles.balanceCardOk : styles.balanceCardWarn}>
                  <Text style={[styles.balanceText, isAr && styles.textRtl]}>
                    {`${i18n.t("leaveAvailableBalance")} ${leaveBalanceCheck.availableDays ?? "—"}`}
                  </Text>
                  <Text style={[styles.balanceText, isAr && styles.textRtl]}>
                    {`${i18n.t("leaveRequestedDays")} ${leaveBalanceCheck.requestedDays ?? "—"}`}
                  </Text>
                  <Text style={[styles.balanceStatus, isAr && styles.textRtl]}>
                    {leaveBalanceCheck.canSubmit
                      ? i18n.t("leaveCheckCanSubmit")
                      : leaveBalanceCheck.missingReason === "NO_ALLOCATION"
                      ? i18n.t("leaveCheckNoAllocation")
                      : leaveBalanceCheck.missingReason === "OUTSIDE_ALLOCATION_PERIOD"
                      ? i18n.t("leaveCheckOutsidePeriod")
                      : leaveBalanceCheck.missingReason === "INSUFFICIENT_BALANCE"
                      ? i18n.t("leaveCheckInsufficient")
                      : i18n.t("leaveCheckNeedsReview")}
                  </Text>
                </View>
              ) : null}
              <FieldRow label={i18n.t("reason")} isAr={isAr} iconName="create-outline">
                <TextInput
                  style={[styles.input, styles.textArea, isAr && styles.inputRtl]}
                  placeholder={i18n.t("reasonPlaceholder")}
                  placeholderTextColor={colors.muted}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </FieldRow>
            </>
          ) : type === "permission" ? (
            <>
              <FieldRow label={i18n.t("permissionDate")} isAr={isAr} iconName="calendar-outline">
                <Pressable style={styles.datePicker} onPress={() => openDatePicker("permission")}>
                  <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                  <Text style={permissionDate ? styles.dateValue : styles.datePlaceholder}>
                    {formatPickerDate(permissionDate) ?? i18n.t("tapToSelect")}
                  </Text>
                  <Text style={styles.dateChevron}>›</Text>
                </Pressable>
              </FieldRow>
              <View style={[styles.timeRow, isAr && styles.rowReverse]}>
                <View style={styles.timeHalf}>
                  <FieldRow label={i18n.t("startTime")} isAr={isAr}>
                    <TextInput
                      style={[styles.input, styles.timeInput, isAr && styles.inputRtl]}
                      placeholder="09:00"
                      placeholderTextColor={colors.muted}
                      value={startTime}
                      onChangeText={setStartTime}
                      keyboardType="numbers-and-punctuation"
                    />
                  </FieldRow>
                </View>
                <View style={styles.timeHalf}>
                  <FieldRow label={i18n.t("endTime")} isAr={isAr}>
                    <TextInput
                      style={[styles.input, styles.timeInput, isAr && styles.inputRtl]}
                      placeholder="10:00"
                      placeholderTextColor={colors.muted}
                      value={endTime}
                      onChangeText={setEndTime}
                      keyboardType="numbers-and-punctuation"
                    />
                  </FieldRow>
                </View>
              </View>
              <FieldRow label={i18n.t("reason")} isAr={isAr} iconName="create-outline">
                <TextInput
                  style={[styles.input, styles.textArea, isAr && styles.inputRtl]}
                  placeholder={i18n.t("reasonPlaceholder")}
                  placeholderTextColor={colors.muted}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </FieldRow>
            </>
          ) : type === "cancel_leave" ? (
            <>
              <Text style={[styles.cancelLeaveIntro, isAr && styles.textRtl]}>{i18n.t("cancelLeaveIntro")}</Text>
              <RequestSelectField
                label={i18n.t("cancelLeaveSelectLabel")}
                value={cancelLeaveTarget}
                options={cancelLeaveOptions.map((l) => ({
                  value: l.leaveApplication,
                  label: `${l.leaveApplication} · ${l.fromDate} → ${l.toDate}${
                    l.totalLeaveDays ? ` · ${l.totalLeaveDays} ${i18n.t("daysUnit")}` : ""
                  }`,
                }))}
                onValueChange={setCancelLeaveTarget}
                placeholder={
                  cancelLeaveLoading
                    ? i18n.t("leaveTypesLoading")
                    : cancelLeaveOptions.length === 0
                    ? i18n.t("cancelLeaveEmpty")
                    : i18n.t("tapToSelect")
                }
                isAr={isAr}
              />
              {!cancelLeaveLoading && cancelLeaveLoaded && cancelLeaveOptions.length === 0 ? (
                <View style={styles.inlineNotice}>
                  <Text style={[styles.inlineNoticeText, isAr && styles.textRtl]}>{i18n.t("cancelLeaveEmpty")}</Text>
                </View>
              ) : null}
              <FieldRow label={i18n.t("reason")} isAr={isAr} iconName="create-outline">
                <TextInput
                  style={[styles.input, styles.textArea, isAr && styles.inputRtl]}
                  placeholder={i18n.t("cancelLeaveReasonPh")}
                  placeholderTextColor={colors.muted}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </FieldRow>
            </>
          ) : (
            <>
              <FieldRow label={i18n.t("supportTitle")} isAr={isAr} iconName="document-text-outline">
                <TextInput
                  style={[styles.input, isAr && styles.inputRtl]}
                  placeholder={i18n.t("supportSubjectPh")}
                  placeholderTextColor={colors.muted}
                  value={supportSubject}
                  onChangeText={setSupportSubject}
                />
              </FieldRow>
              <RequestSelectField
                label={i18n.t("supportCategory")}
                value={supportCategory}
                options={supportCategoryOptions}
                onValueChange={setSupportCategory}
                placeholder={i18n.t("tapToSelect")}
                isAr={isAr}
              />
              <RequestSelectField
                label={i18n.t("supportPriority")}
                value={supportPriority}
                options={supportPriorityOptions}
                onValueChange={setSupportPriority}
                placeholder={i18n.t("tapToSelect")}
                isAr={isAr}
              />
              {supportCategory === "technical" ? (
                <>
                  <FieldRow label={i18n.t("supportDeviceLabel")} isAr={isAr} iconName="phone-portrait-outline">
                    <TextInput
                      style={[styles.input, isAr && styles.inputRtl]}
                      placeholder={i18n.t("supportDeviceLabel")}
                      placeholderTextColor={colors.muted}
                      value={supportDevice}
                      onChangeText={setSupportDevice}
                    />
                  </FieldRow>
                  <FieldRow label={i18n.t("supportOsLabel")} isAr={isAr} iconName="hardware-chip-outline">
                    <TextInput
                      style={[styles.input, isAr && styles.inputRtl]}
                      placeholder={i18n.t("supportOsLabel")}
                      placeholderTextColor={colors.muted}
                      value={supportOs}
                      onChangeText={setSupportOs}
                    />
                  </FieldRow>
                </>
              ) : null}
              <FieldRow label={i18n.t("supportDescription")} isAr={isAr} iconName="create-outline">
                <TextInput
                  style={[styles.input, styles.textArea, isAr && styles.inputRtl]}
                  placeholder={i18n.t("supportDescriptionPh")}
                  placeholderTextColor={colors.muted}
                  value={supportDescription}
                  onChangeText={setSupportDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </FieldRow>
            </>
          )}

          {submitError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{submitError}</Text>
            </View>
          ) : null}
        </PremiumCard>

        <LargeButton
          title={i18n.t("submit")}
          onPress={() => void submit()}
          loading={loading}
          disabled={
            type === "leave" &&
            (leaveBalanceLoading || Boolean(leaveBalanceCheck && !leaveBalanceCheck.canSubmit))
          }
          style={styles.submitBtn}
        />

        <View style={styles.comingSoonSection}>
          <View style={[styles.sectionLabelRow, isAr && styles.rowReverse]}>
            <SectionIcon name="albums-outline" />
            <Text style={[styles.sectionTitle, styles.sectionTitleInline, isAr && styles.textRtl]}>{i18n.t("comingSoonServices")}</Text>
          </View>
          <View style={[styles.comingSoonGrid, isAr && styles.rowReverse]}>
            {COMING_SOON_TYPES.map((requestType) => (
              <View key={requestType} style={styles.comingSoonCard}>
                <View style={[styles.comingSoonCardTop, isAr && styles.rowReverse]}>
                  <Ionicons name={iconForType(requestType)} size={16} color={colors.textMuted} />
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonBadgeText}>{i18n.t("comingSoon")}</Text>
                  </View>
                </View>
                <Text style={[styles.comingSoonTitle, isAr && styles.textRtl]}>{titleForType(requestType)}</Text>
              </View>
            ))}
          </View>
        </View>

        {Platform.OS === "android" && androidField === "from" && (
          <DateTimePicker value={fromDate || new Date()} mode="date" display="default" onChange={(e, d) => onAndroidDateChange("from", e, d)} />
        )}
        {Platform.OS === "android" && androidField === "to" && (
          <DateTimePicker value={toDate || fromDate || new Date()} mode="date" display="default" onChange={(e, d) => onAndroidDateChange("to", e, d)} />
        )}
        {Platform.OS === "android" && androidField === "permission" && (
          <DateTimePicker value={permissionDate || new Date()} mode="date" display="default" onChange={(e, d) => onAndroidDateChange("permission", e, d)} />
        )}

        {Platform.OS === "ios" && (
          <Modal visible={iosPicker != null} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Pressable onPress={() => setIosPicker(null)}>
                    <Text style={styles.modalBtn}>{i18n.t("cancel")}</Text>
                  </Pressable>
                  <Pressable onPress={commitIosPicker}>
                    <Text style={styles.modalBtnPrimary}>{i18n.t("done")}</Text>
                  </Pressable>
                </View>
                {iosPicker && (
                  <DateTimePicker
                    value={iosPicker.draft}
                    mode="date"
                    display="spinner"
                    onChange={(_, d) => d && setIosPicker((p) => (p ? { ...p, draft: d } : p))}
                  />
                )}
              </View>
            </View>
          </Modal>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldRow({
  label,
  children,
  isAr = false,
  iconName,
}: {
  label: string;
  children: React.ReactNode;
  isAr?: boolean;
  iconName?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View style={styles.fieldRow}>
      <View style={[styles.fieldLabelRow, isAr && styles.rowReverse]}>
        {iconName ? <SectionIcon name={iconName} /> : null}
        <Text style={[styles.fieldLabel, styles.fieldLabelInline, isAr && styles.textRtl]}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  mineRoot: { flex: 1, backgroundColor: colors.background },
  mineTop: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 },
  outer: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: floatingTabBarBottomInset + 28 },
  rowReverse: { flexDirection: "row-reverse" },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentItem: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  segmentItemActive: {
    backgroundColor: colors.ink,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.white,
  },
  sectionTitle: {
    ...typeStyles.caption,
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: 0.2,
    marginBottom: 10,
    textAlign: "left",
  },
  sectionTitleInline: {
    marginBottom: 0,
    flex: 1,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  textRtl: { textAlign: "right" },
  activeTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  typeChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.14)",
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  typeChipActive: {
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.surfaceElevated,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textSecondary,
  },
  typeChipTextActive: {
    color: colors.ink,
  },
  formCard: { marginBottom: 12, paddingVertical: 4, paddingHorizontal: 14 },
  submitBtn: { minHeight: 50, marginBottom: 18 },
  comingSoonSection: {
    marginTop: 8,
  },
  comingSoonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  comingSoonCard: {
    width: "48%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    padding: 9,
    opacity: 0.62,
  },
  comingSoonCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  comingSoonBadge: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignSelf: "flex-start",
  },
  comingSoonBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textSecondary,
  },
  comingSoonTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  timeRow: { flexDirection: "row", gap: 10 },
  timeHalf: { flex: 1, minWidth: 0 },
  fieldRow: { marginBottom: 10 },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  fieldLabel: { fontSize: 12, fontWeight: "800", color: colors.ink, textAlign: "left" },
  fieldLabelInline: { marginBottom: 0, flex: 1 },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    textAlign: "left",
  },
  inputRtl: { textAlign: "right" },
  timeInput: { textAlign: "center" },
  balanceCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  balanceCardOk: {
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.successLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  balanceCardWarn: {
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.warningLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  balanceText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
    textAlign: "left",
    marginBottom: 2,
  },
  balanceStatus: {
    fontSize: 12,
    color: colors.ink,
    fontWeight: "800",
    textAlign: "left",
    marginTop: 2,
  },
  inlineNotice: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    marginTop: -2,
  },
  cancelLeaveIntro: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  inlineNoticeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
    textAlign: "left",
  },
  inlineNoticeAction: {
    marginTop: 4,
    fontSize: 12,
    color: colors.ink,
    fontWeight: "800",
    textAlign: "left",
  },
  textArea: { minHeight: 74 },
  datePicker: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dateValue: { fontSize: 15, color: colors.text, fontWeight: "500", fontVariant: ["tabular-nums"] },
  datePlaceholder: { fontSize: 15, color: colors.muted },
  dateChevron: { fontSize: 20, color: colors.muted, lineHeight: 22 },
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(211, 47, 47, 0.18)",
    borderStartWidth: 3,
    borderStartColor: colors.danger,
  },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: "600", lineHeight: 19 },
  successOuter: { flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: 24 },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadowCard,
  },
  successIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  successCheckStem: {
    position: "absolute",
    width: 4,
    height: 26,
    borderRadius: 2,
    backgroundColor: colors.white,
    transform: [{ rotate: "52deg" }],
    top: 20,
    left: 38,
  },
  successCheckFold: {
    position: "absolute",
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.white,
    transform: [{ rotate: "-42deg" }],
    top: 42,
    left: 24,
  },
  successTitle: { fontSize: 22, fontWeight: "800", color: colors.ink, marginBottom: 8, textAlign: "center" },
  successHint: { fontSize: 13, color: colors.textSecondary, marginBottom: 14, textAlign: "center" },
  idBadge: {
    width: "100%",
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  idLabel: { fontSize: 11, fontWeight: "600", color: colors.successDark, marginBottom: 4 },
  idValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontVariant: ["tabular-nums"],
  },
  successActions: { width: "100%", marginTop: 8 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalBtn: { fontSize: 16, color: colors.muted },
  modalBtnPrimary: { fontSize: 16, fontWeight: "600", color: colors.primary },
});
