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
import { ArrowRight, CloseIcon, EyeIcon, LockIcon, SpinnerIcon, UploadIcon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { BatchUpload } from "./batch-upload";
import { EvaluationResult } from "./evaluation-result";

const MAX_MB = 20;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif";

type Stage = "compose" | "uploading" | "evaluating" | "done" | "stored" | "error";

type ActivityContext = { id: string; slug: string; title: string } | null;

const reviewMessages = [
  "正在看画面里的光…",
  "正在感受当时的空气…",
  "正在找这张照片打动人的地方…",
  "正在判断它和山野的距离…",
  "正在写一份只属于这张照片的手记…",
];

export function UploadStudio({ activity = null }: { activity?: ActivityContext }) {
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
  const [takenAt, setTakenAt] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [stage, setStage] = useState<Stage>("compose");
  const [progress, setProgress] = useState(0);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluationResponse | null>(null);
  const [storedPhoto, setStoredPhoto] = useState<PhotoDto | null>(null);
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
    if (activity) formData.set("activityId", activity.id);

    try {
      const uploaded = await uploadPhotoWithProgress(formData, setProgress);
      setPhotoId(uploaded.photo.id);
      if (activity) {
        setStoredPhoto(uploaded.photo);
        setStage("stored");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setStage("evaluating");
      const evaluated = await evaluatePhotoRequest(uploaded.photo.id);
      if (!evaluated.accepted && preview) {
        // A rejected standalone photo is removed on the server. Keep showing
        // the local preview so the handnote still has the image it talks about.
        evaluated.photo = {
          ...evaluated.photo,
          previewUrl: preview,
          thumbUrl: preview,
          imageUrl: preview,
          fullUrl: preview,
        };
      }
      setResult(evaluated);
      setStage("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      const uploadError = caught instanceof UploadError ? caught : null;
      setError(uploadError?.message ?? "照片没有顺利进来，再试一次吧。");
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
      setError(caught instanceof UploadError ? caught.message : "观看还没有完成，稍后再试一次吧。");
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
    setTakenAt("");
    setVisibility("public");
    setStage("compose");
    setResult(null);
    setStoredPhoto(null);
    setPhotoId(null);
    setError(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (stage === "stored" && activity && storedPhoto) {
    return (
      <div className="upload-result upload-stored">
        <div className="stored-panel">
          <div className="stored-panel__media">
            <img src={storedPhoto.previewUrl} alt={storedPhoto.title} />
            <span className="stored-panel__badge">仅同行可见</span>
          </div>
          <div className="stored-panel__body">
            <p className="eyebrow">
              <span className="dot" />
              IN THE FIELD ROLL / 已放进活动
            </p>
            <h2>
              已经放进
              <br />
              <em>《{activity.title}》</em>
            </h2>
            <p className="stored-panel__note">
              这张照片只有活动里的同行者能看到，不会自动进入公共档案。
              以后想公开时，可以在照片页由你本人决定。
            </p>
            <div className="stored-panel__actions">
              <button type="button" className="btn btn--ink" onClick={reset}>
                再放一张
              </button>
              <Link href={`/photo/${storedPhoto.id}`} className="btn btn--outline">
                查看这张照片
              </Link>
              <Link href={`/activities/${activity.slug}`} className="text-link">
                回到活动
                <ArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
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
          {preview && <img src={preview} alt="正在观看的照片预览" />}
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
                : "A SMALL PAUSE / 先停一下"}
          </p>

          {stage === "uploading" && (
            <>
              <h2>正在把这张照片，好好地收进来。</h2>
              <div className="progress-bar">
                <span style={{ width: `${progress}%` }} />
              </div>
              <p className="review-stage__note">原图会先进入只给你看的临时区。看完之后，达到邀请线的照片会留下，没到的不会被保存。</p>
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
                通常需要 10–40 秒。谢谢你愿意等它看完。
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
              <h2>这次观看，先停在这里。</h2>
              <p className="review-stage__error">{error}</p>
              <div className="review-stage__actions">
                {photoId ? (
                  <button type="button" className="btn btn--ink" onClick={retryEvaluation}>
                    再看一次
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
                  照片还安全地保留着。你可以稍后再看一次，或直接删除。
                </p>
              )}
            </>
          )}

          <div className="review-stage__foot">
            <span>GOHIKING FIELD ARCHIVE</span>
            <span>SCORE THRESHOLD / 3.0</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="upload-mode-switch" role="tablist" aria-label="上传方式">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "single"}
          className={mode === "single" ? "is-active" : ""}
          onClick={() => setMode("single")}
        >
          单张
          <small>ONE</small>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "batch"}
          className={mode === "batch" ? "is-active" : ""}
          onClick={() => setMode("batch")}
        >
          批量 · 最多 9 张
          <small>UP TO 9</small>
        </button>
      </div>

      {mode === "batch" ? (
        <BatchUpload activity={activity} />
      ) : (
    <form className="upload-layout" onSubmit={submit}>
      <section className="upload-compose">
        {activity && (
          <div className="upload-activity">
            <span className="mono">FIELD ROLL / 活动相册</span>
            <strong>《{activity.title}》</strong>
            <small>这些照片只对活动里的同行者可见</small>
          </div>
        )}

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
              <img src={preview} alt="准备放进档案的照片预览" className="dropzone__preview" />
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
              <strong>把这一张放到这里</strong>
              <p>点一下，从相册里挑一张山野</p>
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

        <div className="field upload-title">
          <label htmlFor="photo-title">
            给这张照片一个名字 <span>TITLE · 可留空</span>
          </label>
          <input
            id="photo-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="留空也没关系，我们会用照片的文件名"
            maxLength={80}
          />
          <span className="field__count">{title.length} / 80</span>
        </div>

        <p className="upload-compose__hint">
          {activity
            ? "照片会直接进入活动相册，不会自动公开，也不用等待观看。"
            : "原图会先进入只给你看的临时区。主题、地点和可见性都可以之后再补。"}
        </p>
      </section>

      <section className="upload-form-panel">
        <div className="upload-form-panel__head">
          <span className="mono">FIELD NOTE / 现场记录</span>
          <span className="mono">ALL OPTIONAL</span>
        </div>

        <div className="field">
          <label htmlFor="photo-caption">
            写一点当时的风 <span>OPTIONAL</span>
          </label>
          <textarea
            id="photo-caption"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="风、海拔、同行的人，或者你为什么按下快门。留空也可以。"
            rows={3}
            maxLength={600}
          />
          <span className="field__count">{caption.length} / 600</span>
        </div>

        <details className="upload-more">
          <summary>
            <span>
              {activity ? "补充主题与地点" : "补充主题、地点与可见性"}
              <small>{activity ? "THEME · LOCATION · DATE" : "THEME · LOCATION · DATE · VISIBILITY"}</small>
            </span>
            <span className="upload-more__mark" aria-hidden />
          </summary>

          <div className="upload-more__body">
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
                  拍摄地点 <span>LOCATION · 可选</span>
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
                  拍摄日期 <span>DATE · 自动读取</span>
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

            {!activity && (
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
                    <small>3 分以上进入公共山脊</small>
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
            )}
          </div>
        </details>

        {error && stage === "compose" && <p className="form-error">{error}</p>}

        <div className="upload-submit">
          <button type="submit" className="btn btn--ink btn--full">
            <UploadIcon />
            {activity ? "放进这次活动" : "请山野认真看看"}
          </button>
          <p>
            {activity
              ? "照片只对同行者可见。以后想公开某一张，再由你本人在照片页决定。"
              : "3.0 分以上会与大家见面；没到 3 分不会保存，但会收到具体、温柔的拍摄建议。"}
          </p>
        </div>
      </section>
    </form>
      )}
    </>
  );
}
