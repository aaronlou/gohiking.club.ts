"use client";

import Link from "next/link";
import { ArrowUpRight } from "@/components/icons";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="not-found">
      <div className="not-found__inner shell">
        <p className="eyebrow">
          <span className="dot" />
          WEATHER CHANGED / 暂时无法继续
        </p>
        <h1>
          山口起了雾。
          <br />
          <em>请稍后再走一次。</em>
        </h1>
        <p>
          服务暂时没有完成这次请求。照片与档案不会因此丢失，你可以重试，或回到档案继续浏览。
        </p>
        <div className="not-found__actions">
          <button type="button" className="btn btn--ink" onClick={reset}>
            再试一次
            <ArrowUpRight />
          </button>
          <Link href="/" className="text-link">
            回到山口
            <ArrowUpRight />
          </Link>
        </div>
      </div>
    </div>
  );
}
