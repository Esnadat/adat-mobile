import type { UserSession, VerifyOtpPayload } from "../types/api";

function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function firstNonEmpty(...vals: unknown[]): string {
  for (const v of vals) {
    const s = str(v);
    if (s) return s;
  }
  return "";
}

/**
 * Normalises portal verify-otp / session user shapes into UserSession.
 */
export function normalizeUserSession(
  raw: unknown,
  payload: VerifyOtpPayload
): UserSession {
  const u = asRecord(raw) ?? {};
  const employee = asRecord(u.employee);
  const userObj = asRecord(u.user);
  const companyObj =
    asRecord(u.company) ??
    (employee ? asRecord(employee.company) : null);

  const name = firstNonEmpty(
    employee?.employee_name,
    employee?.full_name,
    employee?.employee_name_in_arabic,
    u.employee_name,
    u.full_name,
    u.fullName,
    u.display_name,
    u.name,
    userObj?.display_name,
    userObj?.full_name,
    userObj?.name
  );

  const email = firstNonEmpty(
    employee?.email,
    employee?.company_email,
    employee?.personal_email,
    u.email,
    userObj?.email,
    typeof u.user === "string" ? u.user : undefined,
    payload.email
  );

  const companyCode = firstNonEmpty(
    employee?.company_code,
    employee?.companyCode,
    u.companyCode,
    u.company_code,
    companyObj?.code,
    companyObj?.company_code,
    companyObj?.name,
    payload.companyCode
  ) || payload.companyCode;

  const companyDisplay = firstNonEmpty(
    employee?.company_name,
    companyObj?.label,
    companyObj?.company_name,
    companyObj?.name,
    companyObj?.code,
    typeof u.company === "string" ? u.company : undefined,
    u.company_name,
    u.companyName,
    u.organisation,
    u.organization
  );

  const id = firstNonEmpty(
    employee?.employeeId,
    employee?.employee_id,
    employee?.employeeNumber,
    employee?.employee,
    employee?.docname,
    employee?.id,
    u.employee_id,
    u.employeeId,
    typeof u.employee === "string" ? u.employee : undefined,
    u.id
  );

  const employeePhotoUrl = firstNonEmpty(
    employee?.image,
    employee?.user_image,
    employee?.photo,
    employee?.photo_url,
    employee?.photoUrl,
    employee?.avatar,
    employee?.avatar_url,
    employee?.avatarUrl,
    u.image,
    u.user_image,
    u.photo,
    u.photo_url,
    u.photoUrl,
    u.avatar,
    u.avatar_url,
    u.avatarUrl,
    userObj?.image,
    userObj?.user_image,
    userObj?.photo,
    userObj?.photo_url,
    userObj?.photoUrl,
    userObj?.avatar,
    userObj?.avatar_url,
    userObj?.avatarUrl
  );

  const department = firstNonEmpty(
    employee?.department,
    u.department,
    userObj?.department
  );
  const designation = firstNonEmpty(
    employee?.designation,
    employee?.designation_name,
    u.designation,
    userObj?.designation
  );
  const manager = firstNonEmpty(
    employee?.reports_to_name,
    employee?.reports_to,
    employee?.manager,
    u.manager,
    u.reports_to,
    userObj?.manager
  );
  const branch = firstNonEmpty(
    employee?.branch,
    u.branch,
    userObj?.branch
  );
  const dateOfJoining = firstNonEmpty(
    employee?.date_of_joining,
    employee?.joining_date,
    u.date_of_joining,
    u.joining_date,
    userObj?.date_of_joining
  );
  const employmentType = firstNonEmpty(
    employee?.employment_type,
    u.employment_type,
    userObj?.employment_type
  );
  const mobile = firstNonEmpty(
    employee?.cell_number,
    employee?.mobile_no,
    employee?.mobile,
    u.mobile,
    u.mobile_no,
    userObj?.mobile
  );
  const personalEmail = firstNonEmpty(
    employee?.personal_email,
    u.personal_email,
    userObj?.personal_email
  );
  const workEmail = firstNonEmpty(
    employee?.company_email,
    employee?.email,
    u.company_email,
    u.work_email,
    userObj?.company_email
  );
  const status = firstNonEmpty(
    employee?.status,
    u.status,
    userObj?.status
  );

  return {
    id,
    name: name || undefined,
    email: email || payload.email,
    companyCode: companyCode || payload.companyCode,
    companyDisplay: companyDisplay || undefined,
    employeePhotoUrl: employeePhotoUrl || undefined,
    department: department || undefined,
    designation: designation || undefined,
    manager: manager || undefined,
    branch: branch || undefined,
    dateOfJoining: dateOfJoining || undefined,
    employmentType: employmentType || undefined,
    mobile: mobile || undefined,
    personalEmail: personalEmail || undefined,
    workEmail: workEmail || undefined,
    status: status || undefined,
  };
}
