import { AxiosResponse } from "axios";
import { EmployeeTask, EmployeeTasksListResponse } from "../types/api";
import { http } from "./http";

function asTaskArray(value: unknown): EmployeeTask[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is EmployeeTask => Boolean(row && typeof row === "object"));
}

function normalizeStatus(status: unknown): string {
  return String(status || "").trim().toLowerCase();
}

export const taskService = {
  async listMyTasks(): Promise<EmployeeTask[]> {
    const response: AxiosResponse<EmployeeTasksListResponse> = await http.get<EmployeeTasksListResponse>("/api/tasks");
    const payload = response.data as EmployeeTasksListResponse | undefined;

    const nestedItems = asTaskArray(payload?.data?.items);
    if (nestedItems.length > 0) return nestedItems;

    return asTaskArray(payload?.items);
  },

  async listMyOpenTasks(): Promise<EmployeeTask[]> {
    const tasks = await this.listMyTasks();
    return tasks.filter((task) => {
      const status = normalizeStatus(task.status);
      return status === "open" || status === "in_progress";
    });
  },

  /**
   * Update the status of the caller's own task. Server allows only in_progress /
   * completed and enforces ownership (403 for another employee's task).
   */
  async updateTaskStatus(id: string, status: "in_progress" | "completed"): Promise<void> {
    await http.put(`/api/tasks/${encodeURIComponent(id)}/status`, { status });
  },
};
