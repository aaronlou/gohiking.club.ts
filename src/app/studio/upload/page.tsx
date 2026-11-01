import type { Metadata } from "next";
import { UploadStudio } from "@/components/upload/upload-studio";
import { requireUser } from "@/server/auth-session";

export const metadata: Metadata = {
  title: "放进一张照片",
  description: "放进一张户外徒步照片，让多模态视觉模型认真观看，并得到一份温柔、具体的中文手记。",
};

export default async function StudioUploadPage() {
  await requireUser("/studio/upload");

  return (
    <div className="studio-upload-page">
      <header className="studio-head studio-head--compact">
        <div className="studio-head__meta">
          <span className="mono">STUDIO / SUBMIT</span>
          <span className="mono">AN INVITATION / 3.0</span>
        </div>
        <div className="studio-head__main">
          <div>
            <p className="eyebrow">
              <span className="dot" />
              ONE PHOTO, ONE GENTLE LOOK
            </p>
            <h1>
              把这一路的
              <br />
              <em>山野，放进来。</em>
            </h1>
            <p className="studio-head__note">
              挑一张你愿意再看的照片，写下一点当时的风。我们会认真看，
              然后在 10–40 秒里给你一份属于这张照片的手记。
            </p>
          </div>
          <div className="submit-rule">
            <span className="mono">WHAT HAPPENS NEXT</span>
            <ol>
              <li><span>01</span> 先只给你看</li>
              <li><span>02</span> 认真看一遍</li>
              <li><span>03</span> 3 分以上与大家见面</li>
              <li><span>04</span> 还没到时，也留 24 小时</li>
            </ol>
          </div>
        </div>
      </header>

      <UploadStudio />
    </div>
  );
}
