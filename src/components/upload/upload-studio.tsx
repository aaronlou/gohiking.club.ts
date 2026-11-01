"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PHOTO_THEMES } from "@/lib/constants";
import {
  evaluatePhotoRequest,
  formatFileSize,
  todayInputValue,
  uploadPhotoWithProgress,
  UploadError,
  type EvaluationResponse,
} from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import type { PhotoDto } from "@/server/photos/dto";
import { ArrowUpRight, CloseIcon, EyeIcon, LockIcon, SpinnerIcon, UploadIcon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { EvaluationResult } from "./evaluation-result";

const MAX_MB = 30;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif";

type Stage = "compose" | "uploading" | "evaluating" | "done" | "error";

const reviewMessages = [
  "正在读取画面里的光…",
  "检查构图与视觉重心…",
  "判断它是否真正属于山野…",
  "寻找值得留下的那个瞬间…",
  "写下这一张的评审手记…",
];

export function UploadStudio({ camera }: { camera: { name: string; serial: string } | null }) {
  const { push } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [theme, setTheme] = useState("auto");
  const [locationName, setLocationName] = useState("");
  const [takenAt, setTakenAt] = useState(todayInputValue());
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [stage, setStage] = useState<Stage>("compose");
  const [progress, setProgress] = useState(0);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  useEffect(() => {
    if (stage !== "evaluating") return;
    const started = Date.now();
    setElapsed(0);
    const messageTimer = window.setInterval(() => {
      setMessageIndex((index) => (index + 1) % reviewMessages.length);
    }, 3600);
    const clock = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => {
      window.clearInterval(messageTimer);
      window.clearInterval(clock);
    };
  }, [stage]);

  function setSelectedFile(selected: File) {
    if (!selected.type.startsWith("image/") && !selected.type.includes("heic")) {
      push("请选择一张 JPEG、PNG、WebP 或 HEIC 照片", "error");
      return;
    }
    if (selected.size > MAX_MB * 1024 * 1024) {
      push(`照片不能超过 ${MAX_MB} MB`, "error");
      return;
    }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(selected);
    previewRef.current = url;
    setPreview(url);
    setFile(selected);
    setError(null);
    if (!title) {
      const guessed = selected.name
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]+/g, " ")
        .trim();
      setTitle(guessed.length > 1 ? guessed.slice(0, 80) : "");
    }
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) setSelectedFile(dropped);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      push("先选择一张照片", "error");
      inputRef.current?.click();
      return;
    }
    if (!title.trim()) {
      push("给这张照片一个名字", "error");
      return;
    }

    setError(null);
    setResult(null);
    setStage("uploading");
    setProgress(0);
    setPhotoId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });

    const formData = new FormData();
    formData.set("photo", file);
    formData.set("title", title.trim());
    formData.set("caption", caption.trim());
    formData.set("theme", theme);
    formData.set("locationName", locationName.trim());
    formData.set("takenAt", takenAt);
    formData.set("visibility", visibility);
    formData.set("source", "upload");

    try {
      const uploaded = await uploadPhotoWithProgress(formData, setProgress);
      setPhotoId(uploaded.photo.id);
      setStage("evaluating");
      const evaluated = await evaluatePhotoRequest(uploaded.photo.id);
      setResult(evaluated);
      setStage("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      const uploadError = caught instanceof UploadError ? caught : null;
      setError(uploadError?.message ?? "上传或评审没有完成，请重试。");
      setStage("error");
    }
  }

  async function retryEvaluation() {
    if (!photoId) {
      setStage("compose");
      return;
    }
    setError(null);
    setStage("evaluating");
    try {
      const evaluated = await evaluatePhotoRequest(photoId);
      setResult(evaluated);
      setStage("done");
    } catch (caught) {
      setError(caught instanceof UploadError ? caught.message : "评审仍未完成，请稍后重试。");
      setStage("error");
    }
  }

  function reset() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreview(null);
    setFile(null);
    setTitle("");
    setCaption("");
    setTheme("auto");
    setLocationName("");
    setTakenAt(todayInputValue());
    setVisibility("public");
    setStage("compose");
    setResult(null);
    setPhotoId(null);
    setError(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (stage === "done" && result) {
    return (
      <div className="upload-result">
        <EvaluationResult
          photo={result.photo}
          accepted={result.accepted}
          latencyMs={result.latencyMs}
          onAgain={reset}
        />
      </div>
    );
  }

  if (stage === "uploading" || stage === "evaluating" || stage === "error") {
    return (
      <div className="review-stage">
        <div className="review-stage__media">
          {preview && <img src={preview} alt="正在评审的照片预览" />}
          {stage === "uploading" && (
            <div className="review-stage__uploading">
              <span>{progress}%</span>
              <small>UPLOADING</small>
            </div>
          )}
          {stage !== "error" && <div className="review-stage__scan" />}
          <div className="review-stage__corners" aria-hidden>
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>

        <div className="review-stage__panel">
          <p className="eyebrow">
            <span className="dot" />
            {stage === "uploading"
              ? "SECURING THE NEGATIVE / 正在接收"
              : stage === "evaluating"
                ? "THE VISUAL JURY / 正在观看"
                : "REVIEW INTERRUPTED / 评审中断"}
          </p>

          {stage === "uploading" && (
            <>
              <h2>正在把这张照片，安全地放上工作台。</h2>
              <div className="progress-bar">
                <span style={{ width: `${progress}%` }} />
              </div>
              <p className="review-stage__note">原图会先存入隔离区，只有通过评审后才会进入公开档案。</p>
            </>
          )}

          {stage === "evaluating" && (
            <>
              <h2>{reviewMessages[messageIndex]}</h2>
              <div className="review-stage__indicator">
                <span className="spinner-wrap">
                  <SpinnerIcon className="spinner" />
                </span>
                <span>{elapsed}s</span>
                <span className="review-stage__dots">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
              <p className="review-stage__note">
                视觉模型正在从光影、构图、山野叙事与独特观看四个维度阅读这张照片。
                通常需要 10–40 秒，请让它认真看完。
              </p>
              <div className="review-stage__skeleton">
                <span />
                <span />
                <span />
              </div>
            </>
          )}

          {stage === "error" && (
            <>
              <h2>这次评审没有走完。</h2>
              <p className="review-stage__error">{error}</p>
              <div className="review-stage__actions">
                {photoId ? (
                  <button type="button" className="btn btn--ink" onClick={retryEvaluation}>
                    重新发起评审
                  </button>
                ) : (
                  <button type="button" className="btn btn--ink" onClick={() => setStage("compose")}>
                    返回修改
                  </button>
                )}
                <button type="button" className="btn btn--outline" onClick={reset}>
                  重新选择照片
                </button>
              </div>
              {photoId && (
                <p className="review-stage__note">
                  照片仍安全保存在隔离区。你可以稍后从工作室重新发起评审，或直接删除。
                </p>
              )}
            </>
          )}

          <div className="review-stage__foot">
            <span>{camera ? `FIELD CAMERA · ${camera.name}` : "GOHIKING FIELD ARCHIVE"}</span>
            <span>SCORE THRESHOLD / 3.0</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="upload-layout" onSubmit={submit}>
      <section className="upload-compose">
        <div className="upload-steps">
          <div className="is-active">
            <span>01</span>
            <p>选择照片</p>
          </div>
          <div>
            <span>02</span>
            <p>填写现场</p>
          </div>
          <div>
            <span>03</span>
            <p>交给评审</p>
          </div>
        </div>

        <div
          className={cn("dropzone", dragging && "is-dragging", preview && "has-image")}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {preview ? (
            <>
              <img src={preview} alt="待提交照片预览" className="dropzone__preview" />
              <div className="dropzone__overlay">
                <button type="button" onClick={() => inputRef.current?.click()} className="btn btn--paper btn--sm">
                  换一张
                </button>
                <button type="button" className="dropzone__remove" onClick={reset} aria-label="移除照片">
                  <CloseIcon />
                </button>
              </div>
              <div className="dropzone__file">
                <span>{file?.name}</span>
                <span>{file ? formatFileSize(file.size) : ""}</span>
              </div>
            </>
          ) : (
            <button type="button" className="dropzone__empty" onClick={() => inputRef.current?.click()}>
              <span className="dropzone__icon">
                <UploadIcon />
              </span>
              <strong>把照片放到这里</strong>
              <p>或点击选择一张山野照片</p>
              <span className="dropzone__formats">JPEG · PNG · WEBP · HEIC / MAX {MAX_MB}MB</span>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (selected) setSelectedFile(selected);
            }}
          />
        </div>

        <div className="upload-tips">
          <span className="mono">BEFORE YOU SUBMIT / 提交之前</span>
          <ul>
            <li>原图越完整，评审越准确。避免二次压缩和截图。</li>
            <li>尽量保留 EXIF。拍摄时间与器材会自动写入档案。</li>
            <li>低分照片会说明原因，并在 24 小时后自动清理。</li>
          </ul>
        </div>

        {camera && (
          <div className="upload-camera-note">
            <span>你的电子相机</span>
            <strong>{camera.name}</strong>
            <small>{camera.serial}</small>
            <Link href="/camera">去取景器里拍一张 <ArrowUpRight /></Link>
          </div>
        )}
      </section>

      <section className="upload-form-panel">
        <div className="upload-form-panel__head">
          <span className="mono">FIELD NOTE / 现场记录</span>
          <span className="mono">01 — 01</span>
        </div>

        <div className="field">
          <label htmlFor="photo-title">
            照片标题 <span>TITLE</span>
          </label>
          <input
            id="photo-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：向雪线以上"
            maxLength={80}
            required
          />
          <span className="field__count">{title.length} / 80</span>
        </div>

        <div className="field">
          <label htmlFor="photo-caption">
            拍摄时发生了什么 <span>FIELD NOTE</span>
          </label>
          <textarea
            id="photo-caption"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="写下一点现场：风、海拔、同行的人，或者你为什么按下快门。"
            rows={4}
            maxLength={600}
          />
          <span className="field__count">{caption.length} / 600</span>
        </div>

        <fieldset className="field theme-picker">
          <legend>
            山野主题 <span>THEME</span>
          </legend>
          <div className="theme-picker__grid">
            <button
              type="button"
              className={theme === "auto" ? "is-active" : ""}
              onClick={() => setTheme("auto")}
            >
              <span className="theme-picker__auto">✦</span>
              <span>让山野判断</span>
              <small>AUTO</small>
            </button>
            {PHOTO_THEMES.map((item) => (
              <button
                type="button"
                key={item.id}
                className={theme === item.id ? "is-active" : ""}
                onClick={() => setTheme(item.id)}
              >
                <span className="theme-picker__dot" style={{ background: item.color }} />
                <span>{item.label}</span>
                <small>{item.latin}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="form-row">
          <div className="field">
            <label htmlFor="photo-location">
              拍摄地点 <span>LOCATION</span>
            </label>
            <input
              id="photo-location"
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              placeholder="例如：四姑娘山 · 长坪沟"
              maxLength={80}
            />
          </div>
          <div className="field">
            <label htmlFor="photo-date">
              拍摄日期 <span>DATE</span>
            </label>
            <input
              id="photo-date"
              type="date"
              value={takenAt}
              max={todayInputValue()}
              onChange={(event) => setTakenAt(event.target.value)}
            />
          </div>
        </div>

        <fieldset className="field visibility-picker">
          <legend>
            档案可见性 <span>VISIBILITY</span>
          </legend>
          <div>
            <button
              type="button"
              className={visibility === "public" ? "is-active" : ""}
              onClick={() => setVisibility("public")}
            >
              <EyeIcon />
              <span>
                公开
                <small>进入公共山脊选集</small>
              </span>
            </button>
            <button
              type="button"
              className={visibility === "private" ? "is-active" : ""}
              onClick={() => setVisibility("private")}
            >
              <LockIcon />
              <span>
                仅自己
                <small>只留在我的档案</small>
              </span>
            </button>
          </div>
        </fieldset>

        {error && stage === "compose" && <p className="form-error">{error}</p>}

        <div className="upload-submit">
          <button type="submit" className="btn btn--ink btn--full">
            <UploadIcon />
            交给山野评审
          </button>
          <p>
            提交即表示你确认拥有这张照片的发布权。多模态模型会给出 1–5 分与中文评审手记，
            3.0 分以上进入档案。
          </p>
        </div>
      </section>
    </form>
  );
}
