"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SpinnerIcon } from "@/components/icons";
import { useToast } from "@/components/toast";
import type { EvaluationResponse } from "@/lib/upload-client";

export function PublishPhotoButton({
  photoId,
  published,
}: {
  photoId: string;
  published: boolean;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, setPending] = useState(false);

  async function publish() {
    setPending(true);
    try {
      const response = await fetch(`/api/photos/${photoId}/publish`, { method: "POST" });
      const data = (await response.json().catch(() => null)) as
        | (EvaluationResponse & { error?: string })
        | null;

      if (!response.ok) {
        push(data?.error ?? "这次公开没有完成，照片仍然留在活动里", "error");
        return;
      }

      if (data?.accepted) {
        push("这张照片已经放进公共档案");
      } else {
        push("这次还差一点，照片仍然留在活动里");
      }
      router.refresh();
    } catch {
      push("网络中断，照片仍然留在活动里", "error");
    } finally {
      setPending(false);
    }
  }

  async function unpublish() {
    if (!window.confirm("要把这张照片收回，只给活动里的同行者看吗？")) return;
    setPending(true);
    try {
      const response = await fetch(`/api/photos/${photoId}/publish`, { method: "DELETE" });
      if (!response.ok) {
        push("收回没有完成，请稍后重试", "error");
        return;
      }
      push("已经收回，现在只有活动里的同行者能看到");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className={published ? "btn btn--outline" : "btn btn--ink"}
      onClick={published ? unpublish : publish}
      disabled={pending}
    >
      {pending ? <SpinnerIcon className="spinner" /> : null}
      {pending
        ? published
          ? "正在收回…"
          : "正在认真观看，约 10–40 秒…"
        : published
          ? "收回公开，只给同行看"
          : "请山野看看，放进公共档案"}
    </button>
  );
}
