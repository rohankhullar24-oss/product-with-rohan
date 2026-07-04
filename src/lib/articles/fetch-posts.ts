import { getAllPosts, getPostBySlug } from "@/lib/posts";

export type Article = {
  slug: string;
  title: string;
  description: string;
  date: string;
};

export type ArticleWithContent = Article & { content: string };

export async function getArticles(): Promise<Article[]> {
  try {
    return getAllPosts();
  } catch {
    return [];
  }
}

export async function getArticle(slug: string): Promise<ArticleWithContent | null> {
  try {
    return getPostBySlug(slug);
  } catch {
    return null;
  }
}
