import type { PhotoDto } from "@/server/photos/dto";

export class UploadError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status = 0, code?: string) {
    super(message);
    this.name = "UploadError";
    this.status = status;
    this.code = code;
  }
}

export type EvaluationResponse = {
  photo: PhotoDto;
  accepted: boolean;
  latencyMs: number;
};

type ApiError = { error?: string; code?: string };

export function uploadPhotoWithProgress(
  formData: FormData,
  onProgress: (value: number) => void,
): Promise<{ photo: PhotoDto }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/photos");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onerror = () => reject(new UploadError("网络中断，照片没有传完。"));
    xhr.onabort = () => reject(new UploadError("上传已取消。"));
    xhr.onload = () => {
      let payload: unknown = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload as { photo: PhotoDto });
        return;
      }
      const error = payload as ApiError | null;
      reject(new UploadError(error?.error ?? "照片没有传上去，请重试。", xhr.status, error?.code));
    };
    xhr.send(formData);
  });
}

export async function evaluatePhotoRequest(photoId: string): Promise<EvaluationResponse> {
  const response = await fetch(`/api/photos/${photoId}/evaluate`, {
    method: "POST",
    headers: { accept: "application/json" },
  });
  const payload = (await response.json().catch(() => null)) as (ApiError & Partial<EvaluationResponse>) | null;
  if (!response.ok) {
    throw new UploadError(payload?.error ?? "评审没有完成，请重试。", response.status, payload?.code);
  }
  return payload as EvaluationResponse;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
