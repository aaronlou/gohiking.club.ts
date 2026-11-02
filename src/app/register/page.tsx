import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth/auth-frame";
import { RegisterForm } from "@/components/auth/register-form";
import { safeNextPath } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth-session";
import { getFeaturedPhotos } from "@/server/photos/queries";

export const metadata = {
  title: "建立档案",
  description: "加入山行档案，为你的户外徒步照片建立一个温柔、可检索的长期档案。",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const { next } = await searchParams;
  const destination = safeNextPath(next);
  if (user) redirect(destination);

  const featured = await getFeaturedPhotos(6);
  const image = featured.find((photo) => photo.theme === "company") ?? featured[0] ?? null;

  return (
    <AuthFrame
      eyebrow="JOIN THE ARCHIVE / 建立档案"
      title={
        <>
          给走过的路，
          <br />
          一个<em>长久的位置。</em>
        </>
      }
      note="只需要一个邮箱和密码。称呼、常走的山和一句介绍，可以之后在工作室里慢慢补。"
      image={image}
    >
      <RegisterForm next={destination} />
    </AuthFrame>
  );
}
