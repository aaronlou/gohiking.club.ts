export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { ensureStorage } = await import("@/server/media/storage");
  await ensureStorage().catch((error) => {
    console.error("[storage] could not create media directories", error);
  });

  if (!process.env.DISABLE_INTERNAL_CRON) {
    const { cleanupExpiredMedia } = await import("@/server/photos/service");
    const run = () =>
      cleanupExpiredMedia().catch((error) => {
        console.error("[cleanup] failed", error);
      });
    const timer = setInterval(run, 60 * 60 * 1000);
    timer.unref?.();
    void run();
  }
}
