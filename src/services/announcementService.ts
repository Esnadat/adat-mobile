import { AxiosResponse } from "axios";
import { AnnouncementsCurrentResponse, EstablishmentAnnouncement } from "../types/api";
import { http } from "./http";

function asAnnouncementArray(value: unknown): EstablishmentAnnouncement[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is EstablishmentAnnouncement => Boolean(row && typeof row === "object"));
}

export const announcementService = {
  async getCurrentAnnouncements(): Promise<EstablishmentAnnouncement[]> {
    const response: AxiosResponse<AnnouncementsCurrentResponse> = await http.get<AnnouncementsCurrentResponse>(
      "/api/announcements/current"
    );

    const payload = response.data as AnnouncementsCurrentResponse | undefined;
    const nestedItems = asAnnouncementArray(payload?.data?.items);
    if (nestedItems.length > 0) return nestedItems;

    return asAnnouncementArray(payload?.items);
  },
};
