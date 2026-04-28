export type RequestType = "leave" | "permission";
export type RequestStatus = "pending" | "approved" | "rejected";

export interface UserSession {
  id: string;
  name?: string;
  email: string;
  companyCode: string;
}

export interface LoginOtpPayload {
  companyCode: string;
  email: string;
}

export interface VerifyOtpPayload extends LoginOtpPayload {
  otp: string;
}

export interface CheckInOutPayload {
  latitude: number;
  longitude: number;
}

export interface CreateRequestPayload {
  type: RequestType;
  reason: string;
  fromDate?: string;
  toDate?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}

export interface EmployeeRequest extends CreateRequestPayload {
  id: string;
  status: RequestStatus;
  createdAt: string;
}
