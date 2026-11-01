import Link from "next/link";
import type { Metadata } from "next";
import { CameraBuilder } from "@/components/camera/camera-builder";
import { ArrowDown, ArrowUpRight, CameraIcon } from "@/components/icons";
import { getCurrentUser } from "@/server/auth-session";
import { getLatestCamera } from "@/server/cameras/service";

export const metadata: Metadata = {
  title: "相机工坊",
  description: "选择机身、镜头与胶片配方，装配一台只属于你的电子相机，并用它拍下下一段山野。",
};

export default async function CameraPage() {
  const user = await getCurrentUser();
  const camera = user ? await getLatestCamera(user.id) : null;

  return (
    <div className="camera-page">
      <header className="camera-hero">
        <div className="camera-hero__grain" aria-hidden />
        <div className="camera-hero__inner shell">
          <div className="camera-hero__top">
            <span className="page-hero__crumb">INDEX 04 / FIELD CAMERA WORKSHOP</span>
            <span className="page-hero__crumb">NOT A PRODUCT · A POINT OF VIEW</span>
          </div>
          <div className="camera-hero__main">
            <div>
              <p className="eyebrow eyebrow--light">
                <span className="dot" />
                BUILD YOUR OWN DIGITAL FIELD CAMERA
              </p>
              <h1>
                造一台
                <br />
                只属于你的
                <br />
                <em>电子相机。</em>
              </h1>
            </div>
            <div className="camera-hero__aside">
              <p>
                机身是你在山里的样子，镜头是你习惯的距离，胶片是你记住颜色的方式。
                把这套观看方式装进一台相机，给它一个名字、一串序列号，然后带它出门。
              </p>
              <div className="camera-hero__specs">
                <div><strong>05</strong><span>机身</span></div>
                <div><strong>03</strong><span>镜头</span></div>
                <div><strong>05</strong><span>胶片配方</span></div>
                <div><strong>01</strong><span>只属于你</span></div>
              </div>
              <a href="#workbench" className="camera-hero__scroll">
                <span><ArrowDown /></span>
                进入装配台
              </a>
            </div>
          </div>
        </div>
      </header>

      <div id="workbench">
        <CameraBuilder initialCamera={camera} isAuthed={Boolean(user)} />
      </div>

      <section className="camera-manifesto">
        <div className="camera-manifesto__inner shell">
          <div>
            <p className="eyebrow">
              <span className="dot" />
              05 / A CAMERA IS A WAY OF LOOKING
            </p>
            <h2>
              相机不是装备清单。
              <br />
              它是你<em>如何看</em>的方式。
            </h2>
          </div>
          <div className="camera-manifesto__notes">
            <div>
              <span>01</span>
              <h3>一台，而不是很多台</h3>
              <p>选定一套机身、镜头与胶片配方，让观看有连续性。你不需要每一次都重新决定怎么看。</p>
            </div>
            <div>
              <span>02</span>
              <h3>配方会被带进照片</h3>
              <p>用你的相机拍摄时，胶片配方会应用到取景画面，并自动关联到照片的档案信息。</p>
            </div>
            <div>
              <span>03</span>
              <h3>序列号只属于你</h3>
              <p>每台相机都有唯一的 GH 序列号。你可以下载一张规格卡，或者把它当作自己的山野名片。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="camera-closing">
        <div className="shell camera-closing__inner">
          <CameraIcon />
          <p>你的下一张照片，应该由你自己的相机拍下。</p>
          <div>
            <Link href={user ? "#workbench" : "/login?next=/camera"} className="btn btn--signal">
              {camera ? "继续装配另一台" : "开始装配"}
              <ArrowUpRight />
            </Link>
            <Link href="/archive" className="text-link text-link--light">
              先看看别人的山
              <ArrowUpRight />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
