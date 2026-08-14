export type Teardown = {
  slug: string;
  company: string;
  eyebrow: string;
  headline: string;
  dek: string;
  image: string;
  publishedDate: string | null;
};

// Company teardowns, told as one infographic per company from a PM lens:
// the reframe, the moat, the structural threat, and the metrics I'd want
// before funding more of the roadmap. New entries just get appended here
// and a PNG dropped in /public/teardowns.
export const teardowns: Teardown[] = [
  {
    slug: "country-delight-6am-habit",
    company: "Country Delight",
    eyebrow: "Product Teardown · India D2C · August 2026",
    headline: "Country Delight never sold milk. It sold a 6 AM habit.",
    dek: "A ₹1,380 Cr subscription business built on solving a trust problem, not a delivery problem — and quick commerce is now buying into it.",
    image:
      "https://uksoubgwjbgjwtaafdxo.supabase.co/storage/v1/object/public/newsletter-images/country-delight/2026-08-08-teardown.png",
    publishedDate: "2026-08-08",
  },
  {
    slug: "zerodha-teardown-pm-lens",
    company: "Zerodha",
    eyebrow: "Product Teardown · India Fintech · August 2026",
    headline: "Zerodha never sold trading. It sold the absence of a salesperson.",
    dek: "India's largest stockbroker by profit, built with zero venture capital, now defending its moat as pricing stops being a differentiator.",
    image:
      "https://uksoubgwjbgjwtaafdxo.supabase.co/storage/v1/object/public/newsletter-images/teardowns/zerodha-teardown-pm-lens.png",
    publishedDate: "2026-08-15",
  },
];

export function getTeardowns(): Teardown[] {
  return teardowns;
}

export function getTeardown(slug: string): Teardown | null {
  return teardowns.find((t) => t.slug === slug) ?? null;
}
