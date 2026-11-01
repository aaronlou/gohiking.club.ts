import Link from "next/link";
import { ArrowUpRight } from "./icons";
import { ContourMark } from "./logo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__cta shell">
        <p className="eyebrow eyebrow--light">
          <span className="dot" />
          OPEN CALL / 长期征稿
        </p>
        <h2>
          下一张入选的照片，
          <br />
          可能就是你
          <br className="only-mobile" />
          <em>背上山</em>的那一张。
        </h2>
        <div className="site-footer__actions">
          <Link href="/login?next=/studio/upload" className="btn btn--signal">
            提交一张照片
            <ArrowUpRight />
          </Link>
          <Link href="/archive" className="btn btn--outline-light">
            浏览完整档案
            <ArrowUpRight />
          </Link>
        </div>
      </div>

      <div className="site-footer__grid shell">
        <div className="site-footer__brand">
          <ContourMark />
          <p>
            山行档案
            <span>GOHIKING.CLUB</span>
          </p>
          <small>为户外徒步者建立的影像档案馆。每一张留下，都有理由。</small>
        </div>
        <div className="site-footer__col">
          <span className="footer-label">EXPLORE / 浏览</span>
          <Link href="/archive">影像档案</Link>
          <Link href="/archive?view=author">摄影师</Link>
          <Link href="/archive?view=date">时间线</Link>
          <Link href="/#this-week">本期山脊</Link>
        </div>
        <div className="site-footer__col">
          <span className="footer-label">STUDIO / 工作室</span>
          <Link href="/studio">我的档案</Link>
          <Link href="/studio/upload">提交照片</Link>
          <Link href="/camera">相机工坊</Link>
          <Link href="/#standard">评审标准</Link>
        </div>
        <div className="site-footer__col site-footer__col--note">
          <span className="footer-label">A NOTE / 说明</span>
          <p>照片会被多模态视觉模型认真观看。低于 3 分的照片会说明原因，并在 24 小时后清理。</p>
          <span className="footer-coord">30°40′N · 104°04′E</span>
        </div>
      </div>

      <div className="site-footer__wordmark" aria-hidden>
        <span>GOHIKING</span>
        <span className="site-footer__dot">.</span>
        <span>CLUB</span>
      </div>
      <div className="site-footer__bottom shell">
        <span>© 2026 山行档案</span>
        <span>BUILT FOR THE LONG WAY</span>
        <span>成都 · 温哥华 · 山野</span>
      </div>
    </footer>
  );
}
