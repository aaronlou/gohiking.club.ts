"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CloseIcon,
  EyeIcon,
  LockIcon,
  SpinnerIcon,
  UploadIcon,
} from "@/components/icons";
import { useToast } from "@/components/toast";
import { PHOTO_THEMES } from "@/lib/constants";
import {
  evaluatePhotoRequest,
  formatFileSize,
  todayInputValue,
  uploadPhotoWithProgress,
  UploadError,
  type EvaluationResponse,
} from "@/lib/upload-client";
import { formatScore } from "@/lib/utils";
import type { PhotoDto } from "@/server/photos/dto";

const MAX_BATCH = 9;
const MAX_MB = 20;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif";

type ActivityContext = { id: string; slug: string; title: string } | null;

type BatchStatus =
  | "queued"
  | "uploading"
  | "uploaded"
  | "evaluating"
  | "accepted"
  | "rejected"
  | "stored"
  | "error";

type BatchItem = {
  id: string;
  file: File;
  preview: string;
  title: string;
  status: BatchStatus;
  progress: number;
  photoId?: string;
  photo?: PhotoDto;
  result?: EvaluationResponse;
  error?: string;
};

type Stage = "compose" | "uploading" | "evaluating" | "done";

function titleFromFile(name: string) {
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return base.length > 1 ? base.slice(0, 80) : "未命名山野";
}

function statusLabel(item: BatchItem) {
  if (item.status === "uploading") return `上传 ${item.progress}%`;
  if (item.status === "evaluating") return "正在观看";
  if (item.status === "accepted") return "已收录";
  if (item.status === "rejected") return "未收录";
  if (item.status === "stored") return "已放进活动";
  if (item.status === "error") return "没有完成";
  if (item.status === "uploaded") return "等待观看";
  return "等待上传";
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

export function BatchUpload({ activity = null }: { activity?: ActivityContext }) {
  const { push } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef<string[]>([]);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [batchTitle, setBatchTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [theme, setTheme] = useState("auto");
  const [locationName, setLocationName] = useState("");
  const [takenAt, setTakenAt] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [stage, setStage] = useState<Stage>("compose");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    return () => {
      for (const url of previewsRef.current) URL.revokeObjectURL(url);
      previewsRef.current = [];
    };
  }, []);

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    if (incoming.length === 0) return;
    if (items.length >= MAX_BATCH) {
      push(`一次最多同时放进 ${MAX_BATCH} 张照片`, "error");
      return;
    }

    const room = MAX_BATCH - items.length;
    const valid: File[] = [];
    for (const file of incoming) {
      if (!file.type.startsWith("image/") && !file.type.includes("heic")) {
        push(`「${file.name}」不是可读取的图片`, "error");
        continue;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        push(`「${file.name}」超过了 ${MAX_MB} MB`, "error");
        continue;
      }
      valid.push(file);
    }

    if (valid.length > room) {
      push(`一次最多同时放进 ${MAX_BATCH} 张，已先留下前 ${room} 张`, "error");
    }

    const next = valid.slice(0, room).map((file) => {
      const preview = URL.createObjectURL(file);
      previewsRef.current.push(preview);
      return {
        id: crypto.randomUUID(),
        file,
        preview,
        title: titleFromFile(file.name),
        status: "queued" as const,
        progress: 0,
      };
    });

    if (next.length > 0) {
      setItems((current) => [...current, ...next]);
      setError(null);
    }
  }

  function removeItem(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (item) {
      URL.revokeObjectURL(item.preview);
      previewsRef.current = previewsRef.current.filter((url) => url !== item.preview);
    }
    setItems((current) => current.filter((entry) => entry.id !== id));
  }

  function reset() {
    for (const url of previewsRef.current) URL.revokeObjectURL(url);
    previewsRef.current = [];
    setItems([]);
    setBatchTitle("");
    setCaption("");
    setTheme("auto");
    setLocationName("");
    setTakenAt("");
    setVisibility("public");
    setStage("compose");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit() {
    if (items.length === 0) {
      push("先挑几张照片吧", "error");
      return;
    }

    setError(null);
    setStage("uploading");
    window.scrollTo({ top: 0, behavior: "smooth" });

    const working = items.map((item) => ({ ...item }));
    const sync = () => setItems(working.map((item) => ({ ...item })));
    const patch = (id: string, values: Partial<BatchItem>) => {
      const item = working.find((entry) => entry.id === id);
      if (!item) return;
      Object.assign(item, values);
      sync();
    };

    const baseTitle = batchTitle.trim();

    await runWithConcurrency(working, 2, async (item, index) => {
      patch(item.id, { status: "uploading", progress: 0 });
      try {
        const formData = new FormData();
        formData.set("photo", item.file);
        formData.set(
          "title",
          baseTitle
            ? `${baseTitle} ${String(index + 1).padStart(2, "0")}`
            : item.title,
        );
        formData.set("caption", caption.trim());
        formData.set("theme", theme);
        formData.set("locationName", locationName.trim());
        formData.set("takenAt", takenAt);
        formData.set("visibility", visibility);
        formData.set("source", "upload");
        if (activity) formData.set("activityId", activity.id);

        const uploaded = await uploadPhotoWithProgress(formData, (progress) => {
          patch(item.id, { progress });
        });
        patch(item.id, {
          status: activity ? "stored" : "uploaded",
          progress: 100,
          photoId: uploaded.photo.id,
          photo: uploaded.photo,
        });
      } catch (caught) {
        patch(item.id, {
          status: "error",
          progress: 100,
          error:
            caught instanceof UploadError
              ? caught.message
              : "这张照片没有上传成功",
        });
      }
    });

    setStage("evaluating");
    const uploaded = working.filter(
      (item) => item.photoId && item.status !== "error",
    );

    await runWithConcurrency(uploaded, 3, async (item) => {
      patch(item.id, { status: "evaluating" });
      try {
        const result = await evaluatePhotoRequest(item.photoId!);
        patch(item.id, {
          status: result.accepted ? "accepted" : "rejected",
          result,
          photo: result.photo,
        });
      } catch (caught) {
        patch(item.id, {
          status: "error",
          error:
            caught instanceof UploadError
              ? caught.message
              : "这次观看没有完成，可以稍后在工作室再试",
        });
      }
    });

    setStage("done");
  }

  if (stage === "done") {
    return <BatchResult items={items} activity={activity} onAgain={reset} />;
  }

  if (stage === "uploading" || stage === "evaluating") {
    return (
      <div className="batch-progress">
        <div className="batch-progress__head">
          <p className="eyebrow">
            <span className="dot" />
            {stage === "uploading"
              ? "SECURING THE NEGATIVES / 正在接收"
              : "THE VISUAL JURY / 正在逐张观看"}
          </p>
          <span className="mono">
            {items.filter((item) => ["accepted", "rejected", "stored", "error"].includes(item.status)).length}
            {" / "}
            {items.length}
          </span>
        </div>
        <h2>
          {stage === "uploading"
            ? "正在把这一批照片，好好收进来。"
            : "正在一张一张看，通常不会太久。"}
        </h2>
        <p>
          {stage === "uploading"
            ? "每张照片会先进入只给你看的临时区；达到邀请线的会留下，没到的不会被保存。"
            : "三张一组同时观看。没到 3 分的照片不会被保存，但会留下给下一次的建议。"}
        </p>
        <div className="batch-grid">
          {items.map((item, index) => (
            <BatchTile
              key={item.id}
              item={item}
              index={index}
              readOnly
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="batch-upload">
      <section className="batch-compose">
        <div className="batch-compose__head">
          <div>
            <span className="mono">BATCH / 一批照片</span>
            <h2>
              一次放进
              <br />
              <em>最多 9 张。</em>
            </h2>
          </div>
          <span className="batch-compose__count">
            {items.length} / {MAX_BATCH}
          </span>
        </div>

        <div
          className={`batch-dropzone ${dragging ? "is-dragging" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            addFiles(event.dataTransfer.files);
          }}
        >
          {items.length === 0 ? (
            <button
              type="button"
              className="batch-dropzone__empty"
              onClick={() => inputRef.current?.click()}
            >
              <span className="batch-dropzone__icon">
                <UploadIcon />
              </span>
              <strong>把这一批放到这里</strong>
              <p>一次最多 9 张，单张不超过 20MB</p>
              <span>JPEG · PNG · WEBP · HEIC</span>
            </button>
          ) : (
            <div className="batch-grid">
              {items.map((item, index) => (
                <BatchTile
                  key={item.id}
                  item={item}
                  index={index}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
              {items.length < MAX_BATCH && (
                <button
                  type="button"
                  className="batch-add"
                  onClick={() => inputRef.current?.click()}
                >
                  <span>＋</span>
                  <small>再加一张</small>
                </button>
              )}
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        <p className="batch-compose__hint">
          留空就用文件名；填了会变成「组名 01、02…」。没有写完的现场，可以放进右边的共同说明里。
        </p>
      </section>

      <section className="upload-form-panel batch-panel">
        <div className="upload-form-panel__head">
          <span className="mono">FIELD NOTE / 这一组</span>
          <span className="mono">ALL OPTIONAL</span>
        </div>

        <div className="field">
          <label htmlFor="batch-title">
            这一组叫什么 <span>GROUP TITLE · 可选</span>
          </label>
          <input
            id="batch-title"
            value={batchTitle}
            onChange={(event) => setBatchTitle(event.target.value)}
            placeholder="例如：四姑娘山 · 长坪沟"
            maxLength={60}
          />
          <span className="field__count">{batchTitle.length} / 60</span>
        </div>

        <div className="field">
          <label htmlFor="batch-caption">
            这一组共同发生了什么 <span>OPTIONAL</span>
          </label>
          <textarea
            id="batch-caption"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="风、海拔、同行的人。留空也可以。"
            rows={3}
            maxLength={600}
          />
          <span className="field__count">{caption.length} / 600</span>
        </div>

        <details className="upload-more">
          <summary>
            <span>
              {activity ? "补充主题与地点" : "补充主题、地点与可见性"}
              <small>
                {activity
                  ? "THEME · LOCATION · DATE"
                  : "THEME · LOCATION · DATE · VISIBILITY"}
              </small>
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
                    <span
                      className="theme-picker__dot"
                      style={{ background: item.color }}
                    />
                    <span>{item.label}</span>
                    <small>{item.latin}</small>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="form-row">
              <div className="field">
                <label htmlFor="batch-location">
                  拍摄地点 <span>LOCATION · 可选</span>
                </label>
                <input
                  id="batch-location"
                  value={locationName}
                  onChange={(event) => setLocationName(event.target.value)}
                  placeholder="例如：四姑娘山 · 长坪沟"
                  maxLength={80}
                />
              </div>
              <div className="field">
                <label htmlFor="batch-date">
                  拍摄日期 <span>DATE · 自动读取</span>
                </label>
                <input
                  id="batch-date"
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
                      <small>3 分以上进入公共档案</small>
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

        {error && <p className="form-error">{error}</p>}

        <div className="upload-submit">
          <button
            type="button"
            className="btn btn--ink btn--full"
            onClick={submit}
            disabled={items.length === 0}
          >
            <UploadIcon />
            {activity
              ? `放进这次活动（${items.length} 张）`
              : `请山野看看这 ${items.length} 张`}
          </button>
          <p>
            {activity
              ? "3 分以上会进入活动相册，只对同行者可见；没到 3 分不会保存，但会收到具体建议。"
              : "3 分以上会与大家见面；没到 3 分不会保存，但会收到具体建议。"}
          </p>
        </div>
      </section>
    </div>
  );
}

function BatchTile({
  item,
  index,
  onRemove,
  readOnly = false,
}: {
  item: BatchItem;
  index: number;
  onRemove?: () => void;
  readOnly?: boolean;
}) {
  const busy = item.status === "uploading" || item.status === "evaluating";

  return (
    <div className={`batch-tile status-${item.status}`}>
      <img src={item.preview} alt={item.title} />
      <span className="batch-tile__index">
        {String(index + 1).padStart(2, "0")}
      </span>
      {!readOnly && onRemove && (
        <button
          type="button"
          className="batch-tile__remove"
          onClick={onRemove}
          aria-label={`移除 ${item.file.name}`}
        >
          <CloseIcon />
        </button>
      )}
      <div className="batch-tile__foot">
        <span>{statusLabel(item)}</span>
        <span>{formatFileSize(item.file.size)}</span>
      </div>
      {busy && (
        <div className="batch-tile__bar">
          <span
            style={{
              width:
                item.status === "uploading"
                  ? `${item.progress}%`
                  : "100%",
            }}
          />
        </div>
      )}
    </div>
  );
}

function BatchResult({
  items,
  activity,
  onAgain,
}: {
  items: BatchItem[];
  activity: ActivityContext;
  onAgain: () => void;
}) {
  const accepted = items.filter((item) => item.status === "accepted");
  const rejected = items.filter((item) => item.status === "rejected");
  const failed = items.filter((item) => item.status === "error");
  const done = accepted.length + rejected.length;

  return (
    <div className="batch-result">
      <header className="batch-result__head">
        <p className="eyebrow">
          <span className="dot" />
          {activity ? "IN THE FIELD ROLL / 已放进活动" : "THE LOOK / 这一批的结果"}
        </p>
        <h2>
          {accepted.length} 张入选，
          <br />
          <em>还有 {rejected.length + failed.length} 张，留给下一次。</em>
        </h2>
        <p className="batch-result__lead">
          {activity
            ? `3 分以上已经进入《${activity.title}》的相册，只对同行者可见。没到 3 分的照片不会被保存，但每一张的建议都留在这里。`
            : rejected.length > 0
              ? "没到 3 分的照片不会被保存，但每一张的建议都留在这里。带上它们，再去拍一张。"
              : "每一张照片都被认真看过。想公开的，已经和山野见面了。"}
        </p>
        <div className="batch-result__stats">
          <span>
            <strong>{done}</strong> 张完成
          </span>
          {activity ? (
            <>
              <span>
                <strong>{accepted.length}</strong> 张进入活动相册
              </span>
              <span>
                <strong>{rejected.length}</strong> 张未达邀请线
              </span>
            </>
          ) : (
            <>
              <span>
                <strong>{accepted.length}</strong> 张进入公共档案
              </span>
              <span>
                <strong>{rejected.length}</strong> 张未达邀请线
              </span>
            </>
          )}
          {failed.length > 0 && (
            <span>
              <strong>{failed.length}</strong> 张需要再看一次
            </span>
          )}
        </div>
      </header>

      <div className="batch-result__grid">
        {items.map((item) => {
          const result = item.result?.photo;
          const image =
            item.status === "rejected" || item.status === "error"
              ? item.preview
              : result?.previewUrl ?? item.photo?.previewUrl ?? item.preview;
          const title = result?.title ?? item.photo?.title ?? item.title;
          const score = result?.score ?? item.photo?.score ?? null;
          const href =
            item.status === "accepted" ? `/photo/${item.photoId}` : null;

          return (
            <article className={`batch-card status-${item.status}`} key={item.id}>
              <div className="batch-card__media">
                {href ? (
                  <Link href={href}>
                    <img src={image} alt={title} />
                  </Link>
                ) : (
                  <img src={image} alt={title} />
                )}
                <span className="batch-card__badge">
                  {activity && item.status === "accepted"
                    ? "已入选"
                    : statusLabel(item)}
                </span>
                {score !== null && (
                  <span className="batch-card__score">{formatScore(score)}</span>
                )}
              </div>
              <div className="batch-card__body">
                <h3>
                  {href ? <Link href={href}>{title}</Link> : title}
                </h3>
                {item.status === "error" ? (
                  <p className="batch-card__error">
                    {item.error ?? "没有完成。可以稍后在工作室再试一次。"}
                  </p>
                ) : item.status === "rejected" && result ? (
                  <>
                    <p className="batch-card__summary">{result.summary}</p>
                    <details className="batch-card__note">
                      <summary>看看给下一次的建议</summary>
                      <ol>
                        {result.improvements.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ol>
                    </details>
                  </>
                ) : href ? (
                  <Link href={href} className="batch-card__link">
                    查看这张照片
                    <ArrowUpRight />
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className="batch-result__actions">
        <button type="button" className="btn btn--ink" onClick={onAgain}>
          再放一批
        </button>
        {activity ? (
          <Link href={`/activities/${activity.slug}`} className="btn btn--outline">
            回到活动
            <ArrowUpRight />
          </Link>
        ) : (
          <Link href="/studio" className="btn btn--outline">
            回到我的档案
            <ArrowUpRight />
          </Link>
        )}
        <Link href="/" className="text-link">
          回到山口
          <ArrowUpRight />
        </Link>
      </div>

    </div>
  );
}
