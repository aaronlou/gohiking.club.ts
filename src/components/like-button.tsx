"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { HeartIcon } from "./icons";
import { useToast } from "./toast";

export function LikeButton({
  photoId,
  initialLiked,
  initialCount,
}: {
  photoId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  async function toggle() {
    if (pending) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((value) => Math.max(0, value + (nextLiked ? 1 : -1)));

    startTransition(async () => {
      const response = await fetch(`/api/photos/${photoId}/like`, { method: "POST" });
      if (response.status === 401) {
        setLiked(!nextLiked);
        setCount((value) => Math.max(0, value + (nextLiked ? -1 : 1)));
        push("登录后才能留下敬意", "error");
        router.push(`/login?next=/photo/${photoId}`);
        return;
      }
      if (!response.ok) {
        setLiked(!nextLiked);
        setCount((value) => Math.max(0, value + (nextLiked ? -1 : 1)));
        push("没有留下敬意，请稍后重试", "error");
        return;
      }
      const data = (await response.json()) as { liked: boolean; likeCount: number };
      setLiked(data.liked);
      setCount(data.likeCount);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      className={`like-button ${liked ? "is-liked" : ""}`}
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? "收回敬意" : "留下敬意"}
    >
      <HeartIcon filled={liked} />
      <span>{liked ? "已留下敬意" : "留下敬意"}</span>
      <strong>{count}</strong>
    </button>
  );
}
