import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth/auth-frame";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth-session";
import { getFeaturedPhotos } from "@/server/photos/queries";

export const metadata = {
  title: "成员入口",
  description: "登录山行档案，上传照片、查看评审手记并管理你的山野影像档案。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const { next } = await searchParams;
  const destination = safeNextPath(next);
  if (user) redirect(destination);

  const featured = await getFeaturedPhotos(6);
  const image = featured.find((photo) => photo.theme === "water") ?? featured[0] ?? null;

  return (
    <AuthFrame
      eyebrow="MEMBER ACCESS / 成员入口"
      title={
        <>
          回到你的
          <br />
          <em>山行档案。</em>
        </>
      }
      note="登录后可以提交照片、查看完整的评审手记，继续整理那些从山上带回来的光。"
      image={image}
    >
      <LoginForm next={destination} />
    </AuthFrame>
  );
}
