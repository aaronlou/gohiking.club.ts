"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SpinnerIcon, TrashIcon } from "./icons";
import { useToast } from "./toast";

export function DeletePhotoButton({
  photoId,
  label = "提前删除",
  redirectTo = "/studio",
  className = "btn btn--outline",
}: {
  photoId: string;
  label?: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!window.confirm("要现在删除这张照片吗？原图与预览会立即移除，之后无法恢复。也可以再等一等它。")) return;
    setPending(true);
    try {
      const response = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      if (!response.ok) {
        push("删除没有完成，请稍后重试", "error");
        return;
      }
      push("照片已经删除");
      router.push(redirectTo);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" className={className} onClick={remove} disabled={pending}>
      {pending ? <SpinnerIcon className="spinner" /> : <TrashIcon />}
      {pending ? "正在删除" : label}
    </button>
  );
}
