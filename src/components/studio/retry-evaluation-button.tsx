"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SpinnerIcon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { evaluatePhotoRequest, UploadError } from "@/lib/upload-client";

export function RetryEvaluationButton({
  photoId,
  label = "继续评审",
  className = "studio-action",
}: {
  photoId: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, setPending] = useState(false);

  async function retry() {
    setPending(true);
    try {
      const result = await evaluatePhotoRequest(photoId);
      push(result.accepted ? "照片已入选档案" : "评审完成：这张照片未入选，已进入 24 小时隔离");
      router.refresh();
    } catch (error) {
      push(error instanceof UploadError ? error.message : "评审没有完成，请稍后重试", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" className={className} onClick={retry} disabled={pending}>
      {pending ? <SpinnerIcon className="spinner" /> : null}
      {pending ? "正在评审…" : label}
    </button>
  );
}
