import type { Metadata } from "next";
import { UploadStudio } from "@/components/upload/upload-studio";
import { requireUser } from "@/server/auth-session";
import { getLatestCamera } from "@/server/cameras/service";

export const metadata: Metadata = {
  title: "提交照片",
  description: "提交一张户外徒步照片，让多模态视觉模型认真观看，并得到具体的中文评审手记。",
};

export default async function StudioUploadPage() {
  const user = await requireUser("/studio/upload");
  const camera = await getLatestCamera(user.id);

  return (
    <div className="studio-upload-page">
      <header className="studio-head studio-head--compact">
        <div className="studio-head__meta">
          <span className="mono">STUDIO / SUBMIT</span>
          <span className="mono">SCORE THRESHOLD / 3.0</span>
        </div>
        <div className="studio-head__main">
          <div>
            <p className="eyebrow">
              <span className="dot" />
              ONE PHOTO, ONE HONEST LOOK
            </p>
            <h1>
              把山野
              <br />
              <em>放到工作台上。</em>
            </h1>
            <p className="studio-head__note">
              选择一张照片，写下一点现场，然后交给视觉评审。它会在 10–40 秒内给出 1–5 分和一份中文手记。
            </p>
          </div>
          <div className="submit-rule">
            <span className="mono">WHAT HAPPENS NEXT</span>
            <ol>
              <li><span>01</span> 原图存入隔离区</li>
              <li><span>02</span> 多模态模型观看</li>
              <li><span>03</span> 3 分以上进入档案</li>
              <li><span>04</span> 低分 24 小时后清理</li>
            </ol>
          </div>
        </div>
      </header>

      <UploadStudio camera={camera ? { name: camera.name, serial: camera.serial } : null} />
    </div>
  );
}
