"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CAMERA_BODIES,
  CAMERA_LENSES,
  FILM_STOCKS,
  STRAPS,
  getBody,
  getFilm,
  getLens,
  getStrap,
} from "@/lib/camera-presets";
import type { CameraDto } from "@/server/cameras/service";
import { cn } from "@/lib/utils";
import { ArrowUpRight, CameraIcon, CheckIcon, DownloadIcon, SpinnerIcon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { CameraIllustration } from "./camera-illustration";
import { CameraCapture } from "./camera-capture";

const DEFAULT_DESIGN = {
  name: "山脊 35",
  bodyColor: "moss",
  accentColor: "#e96b40",
  lens: "field-35",
  filmStock: "pine-400",
  strap: "canvas",
  engraving: "FIELD NOTES · 2026",
};

export function CameraBuilder({
  initialCamera,
  isAuthed,
}: {
  initialCamera: CameraDto | null;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [design, setDesign] = useState(
    initialCamera
      ? {
          name: initialCamera.name,
          bodyColor: initialCamera.bodyColor,
          accentColor: initialCamera.accentColor,
          lens: initialCamera.lens,
          filmStock: initialCamera.filmStock,
          strap: initialCamera.strap,
          engraving: initialCamera.engraving ?? "",
        }
      : DEFAULT_DESIGN,
  );
  const [saved, setSaved] = useState<CameraDto | null>(initialCamera);
  const [saving, setSaving] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);

  const body = getBody(design.bodyColor);
  const lens = getLens(design.lens);
  const film = getFilm(design.filmStock);
  const strap = getStrap(design.strap);

  function chooseBody(id: string) {
    const next = getBody(id);
    setDesign((current) => ({ ...current, bodyColor: id, accentColor: next.accent }));
  }

  async function save() {
    if (!isAuthed) {
      router.push("/login?next=/camera");
      return;
    }
    if (!design.name.trim()) {
      push("给这台相机取一个名字", "error");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/cameras", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(design),
      });
      const payload = (await response.json().catch(() => null)) as
        | { camera?: CameraDto; error?: string }
        | null;
      if (!response.ok || !payload?.camera) {
        push(payload?.error ?? "相机装配失败，请重试", "error");
        return;
      }
      setSaved(payload.camera);
      push("相机已铸造，只属于你");
      router.refresh();
    } catch {
      push("无法保存相机，请稍后重试", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="camera-builder">
      <div className="camera-workbench">
        <div className="camera-stage">
          <div className="camera-stage__top">
            <span className="mono">LIVE ASSEMBLY / 实时装配</span>
            <span className="mono">{saved ? saved.serial : "UNSAVED PROTOTYPE"}</span>
          </div>
          <div className="camera-stage__object">
            <CameraIllustration
              design={{
                ...design,
                serial: saved?.serial ?? "GH·26·PREVIEW",
              }}
            />
          </div>
          <div className="camera-stage__specs">
            <div>
              <span>BODY</span>
              <strong>{body.name}</strong>
            </div>
            <div>
              <span>LENS</span>
              <strong>{lens.name} · {lens.focal}</strong>
            </div>
            <div>
              <span>FILM</span>
              <strong>{film.name}</strong>
            </div>
            <div>
              <span>STRAP</span>
              <strong>{strap.name}</strong>
            </div>
          </div>
          <div className="camera-stage__caption">
            <span>DIGITAL FIELD CAMERA · ONE OF ONE</span>
            <span>ASSEMBLED IN THE OPEN AIR</span>
          </div>
        </div>

        <div className="camera-controls">
          <div className="camera-controls__top">
            <p className="eyebrow">
              <span className="dot" />
              FIELD CAMERA WORKSHOP / 相机工坊
            </p>
            <h2>
              装配你的
              <br />
              <em>观看方式。</em>
            </h2>
            <p>
              这不是一台真正的商品相机，而是一套属于你的观看设定：机身、镜头、胶片与刻字。
              带着它去取景，照片会以这套配方记录下来。
            </p>
          </div>

          <section className="camera-control">
            <div className="camera-control__head">
              <span>01</span>
              <h3>给它一个名字</h3>
              <small>IDENTITY</small>
            </div>
            <div className="field field--dark">
              <label htmlFor="camera-name" className="sr-only">相机名称</label>
              <input
                id="camera-name"
                value={design.name}
                onChange={(event) => setDesign((current) => ({ ...current, name: event.target.value.slice(0, 28) }))}
                maxLength={28}
                placeholder="山脊 35"
              />
            </div>
          </section>

          <section className="camera-control">
            <div className="camera-control__head">
              <span>02</span>
              <h3>机身颜色</h3>
              <small>BODY</small>
            </div>
            <div className="camera-swatches">
              {CAMERA_BODIES.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={cn("camera-swatch", design.bodyColor === item.id && "is-active")}
                  onClick={() => chooseBody(item.id)}
                  aria-label={item.name}
                  aria-pressed={design.bodyColor === item.id}
                >
                  <span style={{ background: item.body }}>
                    {design.bodyColor === item.id && <CheckIcon />}
                  </span>
                  <small>{item.latin}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="camera-control">
            <div className="camera-control__head">
              <span>03</span>
              <h3>镜头与距离</h3>
              <small>LENS</small>
            </div>
            <div className="lens-options">
              {CAMERA_LENSES.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={cn("lens-option", design.lens === item.id && "is-active")}
                  onClick={() => setDesign((current) => ({ ...current, lens: item.id }))}
                >
                  <span className="lens-option__circle" />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.focal} · {item.aperture}</small>
                  </span>
                  <em>{item.note}</em>
                </button>
              ))}
            </div>
          </section>

          <section className="camera-control">
            <div className="camera-control__head">
              <span>04</span>
              <h3>胶片配方</h3>
              <small>FILM RECIPE</small>
            </div>
            <div className="film-options">
              {FILM_STOCKS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={cn("film-option", design.filmStock === item.id && "is-active")}
                  onClick={() => setDesign((current) => ({ ...current, filmStock: item.id }))}
                >
                  <span className="film-option__swatch">
                    {item.swatch.map((color) => (
                      <i key={color} style={{ background: color }} />
                    ))}
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.latin}</small>
                  </span>
                  <em>{item.note}</em>
                </button>
              ))}
            </div>
          </section>

          <section className="camera-control">
            <div className="camera-control__head">
              <span>05</span>
              <h3>背带与刻字</h3>
              <small>DETAILS</small>
            </div>
            <div className="strap-options">
              {STRAPS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={cn("strap-option", design.strap === item.id && "is-active")}
                  onClick={() => setDesign((current) => ({ ...current, strap: item.id }))}
                >
                  <i style={{ background: item.color }} />
                  {item.name}
                </button>
              ))}
            </div>
            <div className="field field--dark">
              <label htmlFor="camera-engraving">
                机身上的刻字 <span>ENGRAVING · 最多 16 字符</span>
              </label>
              <input
                id="camera-engraving"
                value={design.engraving}
                onChange={(event) =>
                  setDesign((current) => ({ ...current, engraving: event.target.value.slice(0, 16) }))
                }
                maxLength={16}
                placeholder="FIELD NOTES · 2026"
              />
            </div>
          </section>

          <div className="camera-assembly">
            <div className="camera-assembly__head">
              <span className="mono">ASSEMBLY SUMMARY / 装配清单</span>
              <span className="mono">{saved ? `SAVED · ${saved.serial}` : "NOT SAVED YET"}</span>
            </div>
            <div className="camera-assembly__list">
              <span>{body.latin}</span>
              <span>{lens.latin}</span>
              <span>{film.latin}</span>
              <span>{strap.name}</span>
            </div>
            <p>
              保存后会得到唯一的序列号，可以下载一张相机规格卡，也可以直接打开取景器拍一张照片。
            </p>
            <div className="camera-assembly__actions">
              <button type="button" className="btn btn--signal" onClick={save} disabled={saving}>
                {saving ? <SpinnerIcon className="spinner" /> : <CameraIcon />}
                {saving ? "正在装配" : saved ? "保存为新相机" : isAuthed ? "保存这台相机" : "登录并保存"}
              </button>
              {saved && (
                <>
                  <button type="button" className="btn btn--outline-light" onClick={() => setCaptureOpen(true)}>
                    用取景器拍一张
                  </button>
                  <a
                    href={`/api/cameras/${saved.id}/card`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-link text-link--light"
                  >
                    <DownloadIcon />
                    下载规格卡
                  </a>
                </>
              )}
            </div>
            {!isAuthed && (
              <p className="camera-assembly__login">
                <Link href="/login?next=/camera">登录</Link> 后即可保存，并为它留下序列号。
              </p>
            )}
          </div>
        </div>
      </div>

      {captureOpen && saved && (
        <CameraCapture
          camera={saved}
          onClose={() => setCaptureOpen(false)}
        />
      )}
    </div>
  );
}
