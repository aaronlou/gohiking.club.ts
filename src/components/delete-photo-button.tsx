"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SpinnerIcon, TrashIcon } from "./icons";
import { useToast } from "./toast";

export function DeletePhotoButton({
  photoId,
  label = "立即删除",
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
    if (!window.confirm("确定删除这张照片吗？文件会立即从服务器移除，且无法恢复。")) return;
    setPending(true);
    try {
      const response = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      if (!response.ok) {
        push("删除没有完成，请稍后重试", "error");
        return;
      }
      push("照片已清理");
      router.push(redirectTo);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" className={className} onClick={remove} disabled={pending}>
      {pending ? <SpinnerIcon className="spinner" /> : <TrashIcon />}
      {pending ? "正在清理" : label}
    </button>
  );
}
