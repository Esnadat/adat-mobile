import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { http } from "./http";

/**
 * Pick a profile photo (gallery or camera), square-crop, resize to 512px and
 * JPEG-compress before upload. Returns a local uri, or null if the user cancelled
 * or denied permission (caller shows the appropriate message).
 */
export async function pickAndCompressPhoto(source: "gallery" | "camera"): Promise<{ uri: string } | { denied: true } | null> {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { denied: true };
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { denied: true };
  }

  const opts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  };
  const result = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (result.canceled || !result.assets || !result.assets[0]) return null;

  const manipulated = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 512 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  return { uri: manipulated.uri };
}

/** Uploads the compressed photo; returns the new absolute image URL. Server enforces type/size. */
export async function uploadEmployeePhoto(uri: string): Promise<string> {
  const form = new FormData();
  // React Native FormData file shape.
  form.append("photo", { uri, name: "photo.jpg", type: "image/jpeg" } as unknown as Blob);
  const res = await http.post<{ data?: { image_url?: string } }>("/api/employee/photo", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  const url = res.data?.data?.image_url;
  if (!url) throw new Error("Upload succeeded but no image URL returned");
  return url;
}
