"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { CheckIcon, CloseIcon, CopyIcon, ShareIcon } from "./icons";

type ShareVariant = "header" | "menu" | "footer" | "inline" | "icon";

export function ShareButton({
  url = "/",
  title = "山行档案 · GOHIKING.CLUB",
  text = "把走过的山野，好好收起来。一个为户外徒步者建立的影像档案馆。",
  label = "分享",
  variant = "inline",
  tabIndex,
}: {
  url?: string;
  title?: string;
  text?: string;
  label?: string;
  variant?: ShareVariant;
  tabIndex?: number;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);
  const [isWeChat, setIsWeChat] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    setCanNative(typeof navigator.share === "function");
    setIsWeChat(/MicroMessenger/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (!open) return;
    setShareUrl(new URL(url, window.location.origin).toString());
    setCopied(false);
    setProblem(null);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("share-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("share-open");
    };
  }, [open, url]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setProblem(null);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setProblem("复制没有成功。可以长按上面的链接，手动复制。");
    }
  }

  async function nativeShare() {
    if (!canNative) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title, text, url: shareUrl });
      setOpen(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setProblem("系统分享没有打开。先复制链接，发给朋友也一样。");
    }
  }

  return (
    <>
      <button
        type="button"
        tabIndex={tabIndex}
        className={cn(
          "share-trigger",
          `share-trigger--${variant}`,
          variant === "footer" && "btn btn--outline-light",
          variant === "inline" && "btn btn--outline btn--sm",
        )}
        onClick={() => setOpen(true)}
        aria-label={`分享${title}`}
      >
        <ShareIcon />
        <span>{label}</span>
      </button>

      {open &&
        createPortal(
        <div
          className="share-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            className="share-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-dialog-title"
          >
            <div className="share-dialog__top">
              <span className="mono">SEND THE TRAIL ON / 分享</span>
              <button
                type="button"
                className="share-dialog__close"
                onClick={() => setOpen(false)}
                aria-label="关闭分享"
              >
                <CloseIcon />
              </button>
            </div>

            <h2 id="share-dialog-title">
              把山行档案，
              <br />
              <em>分享给同行的人。</em>
            </h2>
            <p className="share-dialog__lead">{text}</p>

            <div className="share-card">
              <span className="share-card__brand">
                山行档案
                <small>GOHIKING.CLUB</small>
              </span>
              <span className="share-card__url">{shareUrl}</span>
            </div>

            <div className="share-dialog__actions">
              {canNative && (
                <button type="button" className="btn btn--ink btn--full" onClick={nativeShare}>
                  <ShareIcon />
                  分享给朋友
                </button>
              )}
              <button
                type="button"
                className={canNative ? "btn btn--outline btn--full" : "btn btn--ink btn--full"}
                onClick={copyLink}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "链接已复制" : "复制链接"}
              </button>
            </div>

            {isWeChat ? (
              <div className="share-wechat">
                <strong>在微信里分享</strong>
                <p>
                  点右上角 <b>···</b>，选择「发送给朋友」或「分享到朋友圈」。
                  微信会读取这个页面的标题、说明和分享图。
                </p>
              </div>
            ) : (
              <p className="share-dialog__hint">
                在手机浏览器里，系统分享面板通常可以直接选择微信。
              </p>
            )}

            {problem && (
              <p className="share-dialog__problem" role="status">
                {problem}
              </p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
