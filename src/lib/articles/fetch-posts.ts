export type Article = {
  slug: string;
  title: string;
  description: string;
  date: string;
};

export type ArticleWithContent = Article & { content: string };

const REVALIDATE_SECONDS = 3600;

export async function getArticles(): Promise<Article[]> {
  const res = await fetch(`${process.env.MYSITE_API_URL}/api/posts`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getArticle(slug: string): Promise<ArticleWithContent | null> {
  const res = await fetch(`${process.env.MYSITE_API_URL}/api/posts/${slug}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) return null;
  return res.json();
}
