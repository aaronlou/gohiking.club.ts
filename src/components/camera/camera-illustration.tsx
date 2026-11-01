import type { CSSProperties } from "react";
import { getBody, getFilm, getLens, getStrap } from "@/lib/camera-presets";
import { cn } from "@/lib/utils";

export type CameraDesignView = {
  name?: string;
  bodyColor: string;
  accentColor: string;
  lens: string;
  filmStock: string;
  strap: string;
  engraving?: string | null;
  serial?: string;
};

export function CameraIllustration({
  design,
  className,
  compact = false,
}: {
  design: CameraDesignView;
  className?: string;
  compact?: boolean;
}) {
  const body = getBody(design.bodyColor);
  const lens = getLens(design.lens);
  const film = getFilm(design.filmStock);
  const strap = getStrap(design.strap);

  const style = {
    "--cam-body": body.body,
    "--cam-top": body.top,
    "--cam-grip": body.grip,
    "--cam-accent": design.accentColor || body.accent,
    "--cam-strap": strap.color,
    "--cam-film-a": film.swatch[0],
    "--cam-film-b": film.swatch[1],
    "--cam-film-c": film.swatch[2],
  } as CSSProperties;

  return (
    <div
      className={cn("camera-object", compact && "camera-object--compact", className)}
      style={style}
      role="img"
      aria-label={`${design.name ?? "自定义"}电子相机，${body.name}机身，${lens.name}镜头`}
    >
      <div className="camera-object__strap" aria-hidden>
        <span />
      </div>
      <div className="camera-object__body">
        <div className="camera-object__top">
          <span className="camera-object__brand">GOHIKING</span>
          <span className="camera-object__model">{design.name ?? "FIELD CAMERA"}</span>
          <div className="camera-object__dial camera-object__dial--left">
            <span />
          </div>
          <div className="camera-object__dial camera-object__dial--right">
            <span />
          </div>
          <div className="camera-object__shutter" />
          <div className="camera-object__hotshoe" />
        </div>

        <div className="camera-object__front">
          <div className="camera-object__grip">
            <span>FIELD</span>
            <i />
            <i />
            <i />
          </div>
          <div className="camera-object__lens-wrap">
            <div className="camera-object__lens">
              <div className="camera-object__lens-ring">
                <div className="camera-object__lens-inner">
                  <div className="camera-object__glass">
                    <span className="camera-object__flare" />
                    <span className="camera-object__reflection" />
                  </div>
                </div>
              </div>
              <span className="camera-object__lens-text">{lens.focal}</span>
            </div>
          </div>
          <div className="camera-object__side">
            <span className="camera-object__side-label">MADE FOR THE LONG WAY</span>
            <div className="camera-object__engrave">
              {design.engraving || "NO. 001"}
            </div>
            <div className="camera-object__film">
              <span className="camera-object__film-window" />
              <span>{film.latin}</span>
            </div>
          </div>
          <div className="camera-object__viewfinder">
            <span />
          </div>
        </div>
      </div>
      <div className="camera-object__shadow" aria-hidden />
      <div className="camera-object__spec" aria-hidden>
        <span>{design.serial ?? "GH·26·FIELD"}</span>
        <span>{lens.focal} / {lens.aperture}</span>
      </div>
    </div>
  );
}
