import fs from "fs";
import path from "path";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "src/content/blog");

export type PostFrontmatter = {
  title: string;
  description: string;
  date: string;
};

export type Post = PostFrontmatter & {
  slug: string;
};

export type PostWithContent = Post & {
  content: string;
};

export function getAllPosts(): Post[] {
  const filenames = fs.readdirSync(postsDirectory).filter((f) => f.endsWith(".md"));

  const posts = filenames.map((filename) => {
    const slug = filename.replace(/\.md$/, "");
    const fileContents = fs.readFileSync(path.join(postsDirectory, filename), "utf8");
    const { data } = matter(fileContents);
    return { slug, ...(data as PostFrontmatter) };
  });

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): PostWithContent {
  const fileContents = fs.readFileSync(path.join(postsDirectory, `${slug}.md`), "utf8");
  const { data, content } = matter(fileContents);
  return { slug, content, ...(data as PostFrontmatter) };
}
