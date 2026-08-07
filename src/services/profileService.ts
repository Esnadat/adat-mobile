type EmployeeProfile = {
  fullName?: string;
  employeeId?: string;
  company?: string;
  companyCode?: string;
  designation?: string;
  department?: string;
  branch?: string;
  manager?: string;
  status?: string;
  dateOfJoining?: string;
  employmentType?: string;
  workEmail?: string;
  personalEmail?: string;
  mobile?: string;
  photoUrl?: string;
};

export const profileService = {
  async getMyEmployeeProfile(): Promise<EmployeeProfile | null> {
    // Safe fallback: do not call unavailable profile endpoints.
    // ProfileScreen relies on AuthContext user values until a guaranteed mobile endpoint is available.
    return null;
  },
};

export type { EmployeeProfile };
