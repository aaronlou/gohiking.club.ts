"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cameraFilter, getFilm, getLens } from "@/lib/camera-presets";
import {
  evaluatePhotoRequest,
  todayInputValue,
  uploadPhotoWithProgress,
  UploadError,
  type EvaluationResponse,
} from "@/lib/upload-client";
import type { CameraDto } from "@/server/cameras/service";
import { formatShortDate } from "@/lib/utils";
import { CameraIcon, CloseIcon, SpinnerIcon, UploadIcon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { EvaluationResult } from "@/components/upload/evaluation-result";

type Mode = "live" | "review" | "working" | "done" | "error";

export function CameraCapture({
  camera,
  onClose,
}: {
  camera: CameraDto;
  onClose: () => void;
}) {
  const { push } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewRef = useRef<string | null>(null);

  const [mode, setMode] = useState<Mode>("live");
  const [ready, setReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState(`无题 · ${formatShortDate(new Date())}`);
  const [busyLabel, setBusyLabel] = useState("正在上传原片…");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluationResponse | null>(null);
  const [photoId, setPhotoId] = useState<string | null>(null);

  const film = getFilm(camera.filmStock);
  const lens = getLens(camera.lens);
  const filter = cameraFilter(camera.filmStock);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  useEffect(() => {
    document.body.classList.add("modal-open");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKey);
      stopStream();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, [onClose, stopStream]);

  useEffect(() => {
    if (mode !== "live") {
      stopStream();
      return;
    }
    let cancelled = false;
    setCameraError(null);
    setReady(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("这个浏览器无法打开取景器，请从设备中选择一张照片。");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setCameraError("没有获得相机权限。你仍然可以从设备里选一张照片。");
      });

    return () => {
      cancelled = true;
    };
  }, [mode, stopStream]);

  function setPhotoPreview(nextFile: File) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(nextFile);
    previewRef.current = url;
    setPreview(url);
    setFile(nextFile);
    setMode("review");
  }

  async function takePhoto() {
    const video = videoRef.current;
    if (!video || !ready || !video.videoWidth) {
      push("取景器还没有准备好", "error");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.filter = filter;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((value) => resolve(value), "image/jpeg", 0.92),
    );
    if (!blob) {
      push("没有拍下这一帧，请再试一次", "error");
      return;
    }
    stopStream();
    const captured = new File([blob], `gohiking-${Date.now()}.jpg`, { type: "image/jpeg" });
    setPhotoPreview(captured);
  }

  function onFilePicked(selected: File) {
    if (!selected.type.startsWith("image/")) {
      push("请选择一张照片", "error");
      return;
    }
    stopStream();
    setPhotoPreview(selected);
  }

  async function develop() {
    if (!file) return;
    setMode("working");
    setBusyLabel("正在上传原片…");
    setError(null);
    const formData = new FormData();
    formData.set("photo", file);
    formData.set("title", title.trim() || `无题 · ${formatShortDate(new Date())}`);
    formData.set("caption", `用 ${camera.name} 拍摄。${film.name} 配方，${lens.name} 镜头。`);
    formData.set("theme", "auto");
    formData.set("takenAt", todayInputValue());
    formData.set("visibility", "public");
    formData.set("source", "camera");
    formData.set("cameraId", camera.id);

    try {
      const uploaded = await uploadPhotoWithProgress(formData, () => undefined);
      setPhotoId(uploaded.photo.id);
      setBusyLabel("正在显影，并等待视觉评审…");
      const evaluated = await evaluatePhotoRequest(uploaded.photo.id);
      setResult(evaluated);
      setMode("done");
    } catch (caught) {
      setError(caught instanceof UploadError ? caught.message : "冲印没有完成，请重试。");
      setMode("error");
    }
  }

  async function retryEvaluation() {
    if (!photoId) {
      setMode("review");
      return;
    }
    setMode("working");
    setBusyLabel("正在重新发起评审…");
    setError(null);
    try {
      const evaluated = await evaluatePhotoRequest(photoId);
      setResult(evaluated);
      setMode("done");
    } catch (caught) {
      setError(caught instanceof UploadError ? caught.message : "评审没有完成，请重试。");
      setMode("error");
    }
  }

  function retake() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreview(null);
    setFile(null);
    setResult(null);
    setError(null);
    setPhotoId(null);
    setMode("live");
    setTitle(`无题 · ${formatShortDate(new Date())}`);
  }

  return (
    <div className="aperture-modal" role="dialog" aria-modal="true" aria-label="使用电子相机拍摄">
      <button type="button" className="aperture-modal__backdrop" onClick={onClose} aria-label="关闭取景器" />
      <div className="aperture-modal__shell">
        <header className="aperture-modal__head">
          <div>
            <span className="mono">GOHIKING FIELD CAMERA · {camera.serial}</span>
            <strong>{camera.name}</strong>
          </div>
          <button type="button" className="aperture-modal__close" onClick={onClose} aria-label="关闭">
            <CloseIcon />
          </button>
        </header>

        {mode === "live" && (
          <div className="viewfinder">
            <div className="viewfinder__screen">
              <video
                ref={videoRef}
                playsInline
                muted
                aria-label="实时取景器"
                style={{ filter }}
                className={ready ? "is-ready" : ""}
              />
              {!ready && !cameraError && (
                <div className="viewfinder__loading">
                  <SpinnerIcon className="spinner" />
                  <span>正在打开取景器</span>
                </div>
              )}
              {cameraError && (
                <div className="viewfinder__fallback">
                  <CameraIcon />
                  <h3>取景器没有打开</h3>
                  <p>{cameraError}</p>
                  <button type="button" className="btn btn--paper" onClick={() => inputRef.current?.click()}>
                    <UploadIcon />
                    从设备选择照片
                  </button>
                </div>
              )}

              <div className="viewfinder__grid" aria-hidden>
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="viewfinder__corners" aria-hidden>
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="viewfinder__hud viewfinder__hud--top">
                <span>FILM · {film.latin}</span>
                <span>{lens.focal} · {lens.aperture}</span>
                <span className="viewfinder__live">● LIVE</span>
              </div>
              <div className="viewfinder__hud viewfinder__hud--bottom">
                <span>ISO 400</span>
                <span>1/250</span>
                <span>WB · DAYLIGHT</span>
              </div>
              {ready && (
                <div className="viewfinder__focus" aria-hidden>
                  <span />
                </div>
              )}
            </div>

            <div className="viewfinder__controls">
              <button type="button" className="viewfinder__library" onClick={() => inputRef.current?.click()}>
                <UploadIcon />
                <span>相册</span>
              </button>
              <button type="button" className="viewfinder__shutter" onClick={takePhoto} disabled={!ready}>
                <span />
                <small>拍摄</small>
              </button>
              <div className="viewfinder__meta">
                <span>{film.name}</span>
                <small>{film.note}</small>
              </div>
            </div>
          </div>
        )}

        {mode === "review" && preview && (
          <div className="capture-review">
            <div className="capture-review__image">
              <img src={preview} alt="刚刚拍摄的照片" />
              <span className="capture-review__stamp">{film.latin}</span>
            </div>
            <div className="capture-review__form">
              <p className="eyebrow">
                <span className="dot" />
                FRAME 01 / 冲印前
              </p>
              <h2>这一帧，<em>留下吗？</em></h2>
              <div className="field field--dark">
                <label htmlFor="capture-title">照片标题 <span>TITLE</span></label>
                <input
                  id="capture-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value.slice(0, 80))}
                  maxLength={80}
                />
              </div>
              <div className="capture-review__specs">
                <span>{camera.name}</span>
                <span>{lens.focal}</span>
                <span>{film.name}</span>
                <span>自动主题</span>
              </div>
              <div className="capture-review__actions">
                <button type="button" className="btn btn--signal" onClick={develop}>
                  冲印并交给评审
                </button>
                <button type="button" className="btn btn--outline-light" onClick={retake}>
                  重拍
                </button>
              </div>
              <p>照片会先存入隔离区；低于 3 分的照片会说明原因，并在 24 小时后清理。</p>
            </div>
          </div>
        )}

        {mode === "working" && (
          <div className="capture-working">
            {preview && <img src={preview} alt="" className="capture-working__image" />}
            <div className="capture-working__veil" />
            <div className="capture-working__body">
              <span className="capture-working__spinner">
                <SpinnerIcon className="spinner" />
              </span>
              <h2>{busyLabel}</h2>
              <p>视觉评审正在阅读这一帧的光、构图与山野气息。通常需要 10–40 秒。</p>
              <div className="capture-working__progress">
                <span />
              </div>
            </div>
          </div>
        )}

        {mode === "error" && (
          <div className="capture-error">
            <span className="capture-error__mark">!</span>
            <h2>这一帧没有冲印完成。</h2>
            <p>{error}</p>
            <div className="capture-error__actions">
              {photoId ? (
                <button type="button" className="btn btn--signal" onClick={retryEvaluation}>
                  重试评审
                </button>
              ) : (
                <button type="button" className="btn btn--signal" onClick={develop}>
                  重新冲印
                </button>
              )}
              <button type="button" className="btn btn--outline-light" onClick={() => setMode("review")}>
                回到这一帧
              </button>
            </div>
          </div>
        )}

        {mode === "done" && result && (
          <div className="capture-result">
            <EvaluationResult
              photo={result.photo}
              accepted={result.accepted}
              latencyMs={result.latencyMs}
              onAgain={retake}
              compact
            />
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) onFilePicked(selected);
          }}
        />
      </div>
    </div>
  );
}
