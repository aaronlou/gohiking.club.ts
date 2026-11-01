"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SpinnerIcon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { evaluatePhotoRequest, UploadError } from "@/lib/upload-client";

export function RetryEvaluationButton({
  photoId,
  label = "继续观看",
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
      push(
        result.accepted
          ? "这张照片已经放进公共档案"
          : "这次先留在你的暂存区，24 小时后会自动移除",
      );
      router.refresh();
    } catch (error) {
      push(error instanceof UploadError ? error.message : "这次观看还没有完成，请稍后重试", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" className={className} onClick={retry} disabled={pending}>
      {pending ? <SpinnerIcon className="spinner" /> : null}
      {pending ? "正在观看…" : label}
    </button>
  );
}
