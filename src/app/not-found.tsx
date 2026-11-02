import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDown, ArrowUpRight } from "@/components/icons";
import { ContourField } from "@/components/contour-field";

export const metadata: Metadata = {
  title: "这条路径暂时没有通向任何地方",
};

export default function NotFound() {
  return (
    <div className="not-found">
      <ContourField className="not-found__contours" />
      <div className="not-found__inner shell">
        <p className="eyebrow">
          <span className="dot" />
          LOST ON THE TRAIL / 404
        </p>
        <h1>
          这条路径暂时
          <br />
          <em>没有通向任何地方。</em>
        </h1>
        <p>
          你要找的照片、档案或页面可能已经去了别的地方，也可能从来没有出现在这张地图上。
          下山的路还在这里。
        </p>
        <div className="not-found__actions">
          <Link href="/" className="btn btn--ink">
            回到山口
            <ArrowUpRight />
          </Link>
          <Link href="/archive" className="text-link">
            浏览公共档案
            <ArrowDown />
          </Link>
        </div>
        <div className="not-found__coord">
          <span>30°40′N</span>
          <span>104°04′E</span>
          <span>ALT. 3,842 M</span>
        </div>
      </div>
    </div>
  );
}
