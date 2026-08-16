import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "../ui/NavIcons";
import { SectionIcon } from "../ui/SectionIcon";
import { i18n } from "../../i18n";
import { attachmentService, type AttachmentPolicy } from "../../services/attachmentService";
import { colors } from "../../theme/colors";

/** A file the user has chosen but not yet uploaded (upload happens after the request is created). */
export interface StagedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

interface Props {
  policy: AttachmentPolicy;
  files: StagedFile[];
  onChange: (files: StagedFile[]) => void;
  isAr?: boolean;
  uploading?: boolean;
}

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
  const kb = bytes / 1024;
  return `${Math.max(1, Math.round(kb))} KB`;
}

/**
 * In-form attachment picker. Files are staged locally and uploaded by the caller
 * after the request is created (the upload endpoint needs an existing request id).
 * Client-side validation mirrors the server policy so the user gets fast feedback;
 * the server re-enforces type/size/count on upload.
 */
export function RequestAttachmentsField({ policy, files, onChange, isAr = false, uploading = false }: Props) {
  const [error, setError] = React.useState<string | null>(null);

  const limitsLine = React.useMemo(() => {
    const parts: string[] = [];
    if (policy.maxFiles > 0) parts.push(`${policy.maxFiles} ${i18n.t("attachFilesUnit")}`);
    if (policy.maxSizeBytes > 0) parts.push(`${formatSize(policy.maxSizeBytes)} ${i18n.t("attachPerFile")}`);
    parts.push(i18n.t("attachTypes"));
    return parts.join(" · ");
  }, [policy.maxFiles, policy.maxSizeBytes]);

  const atMax = policy.maxFiles > 0 && files.length >= policy.maxFiles;

  const pick = async () => {
    setError(null);
    if (atMax) {
      setError(i18n.t("attachMaxFiles"));
      return;
    }
    try {
      const picked = await attachmentService.pickDocument();
      if (!picked) return;
      if (policy.maxSizeBytes > 0 && picked.size > policy.maxSizeBytes) {
        setError(i18n.t("attachTooLarge"));
        return;
      }
      if (
        policy.allowedMimeTypes.length > 0 &&
        picked.mimeType &&
        !policy.allowedMimeTypes.includes(picked.mimeType)
      ) {
        setError(i18n.t("attachBadType"));
        return;
      }
      onChange([...files, picked]);
    } catch {
      setError(i18n.t("attachUploadFailed"));
    }
  };

  const removeAt = (idx: number) => {
    setError(null);
    onChange(files.filter((_, i) => i !== idx));
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.headerRow, isAr && styles.rowReverse]}>
        <SectionIcon name="attach-outline" />
        <Text style={[styles.title, isAr && styles.rtl]}>{i18n.t("attachTitle")}</Text>
        <View style={styles.optionalBadge}>
          <Text style={styles.optionalText}>
            {policy.mode === "required" ? i18n.t("attachRequired") : i18n.t("attachHint")}
          </Text>
        </View>
      </View>

      <Text style={[styles.limits, isAr && styles.rtl]}>{limitsLine}</Text>

      {files.map((f, idx) => (
        <View key={`${f.uri}-${idx}`} style={[styles.fileRow, isAr && styles.rowReverse]}>
          <Ionicons
            name={f.mimeType === "application/pdf" ? "document-text-outline" : "image-outline"}
            size={18}
            color={colors.textSecondary}
          />
          <View style={styles.fileMeta}>
            <Text style={[styles.fileName, isAr && styles.rtl]} numberOfLines={1}>
              {f.name}
            </Text>
            {formatSize(f.size) ? <Text style={[styles.fileSize, isAr && styles.rtl]}>{formatSize(f.size)}</Text> : null}
          </View>
          {uploading ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Pressable onPress={() => removeAt(idx)} hitSlop={8} accessibilityLabel={i18n.t("remove")}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      ))}

      {!atMax && !uploading ? (
        <Pressable style={[styles.addBtn, isAr && styles.rowReverse]} onPress={() => void pick()}>
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={styles.addText}>{i18n.t("attachAdd")}</Text>
        </Pressable>
      ) : null}

      {error ? <Text style={[styles.error, isAr && styles.rtl]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14 },
  rowReverse: { flexDirection: "row-reverse" },
  rtl: { textAlign: "right", writingDirection: "rtl" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  optionalBadge: { backgroundColor: colors.surfaceSubtle, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: colors.border },
  optionalText: { fontSize: 11, color: colors.textMuted },
  limits: { fontSize: 12, color: colors.textMuted, marginTop: 4, marginBottom: 8 },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  fileMeta: { flex: 1 },
  fileName: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
  fileSize: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 11,
  },
  addText: { fontSize: 14, fontWeight: "600", color: colors.primary },
  error: { fontSize: 12, color: colors.danger, marginTop: 8 },
});
