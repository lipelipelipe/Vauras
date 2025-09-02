// app/[locale]/category/[slug]/[postSlug]/head.tsx
type HeadProps = {
  params: { locale: string; slug: string; postSlug: string };
};

export default function Head({ params }: HeadProps) {
  const base =
    (process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:3000')
      .replace(/\/+$/, '');
  const ampHref = `${base}/${params.locale}/story/${params.postSlug}`;

  return <link rel="amphtml" href={ampHref} />;
}