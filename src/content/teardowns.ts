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
  {
    slug: "cred-teardown-pm-lens",
    company: "CRED",
    eyebrow: "Product Teardown · India Fintech · August 2026",
    headline: "CRED built trust with India's top 1%. Two-thirds of them still don't pay for anything.",
    dek: "FY25 revenue hit ₹2,735 Cr and operating losses fell 51%, but the RBI just removed the bill-payment hook that built CRED's user base in the first place.",
    image:
      "https://uksoubgwjbgjwtaafdxo.supabase.co/storage/v1/object/public/newsletter-images/teardowns/cred-teardown-pm-lens.png",
    publishedDate: "2026-08-26",
  },
  {
    slug: "meesho-teardown-pm-lens",
    company: "Meesho",
    eyebrow: "Product Teardown · India Social Commerce · September 2026",
    headline: "Meesho never sold zero commission. It sold zero commission's marketing.",
    dek: "961,000 sellers joined in a single year, chasing a 0% commission line that hides 15-22% in fees once shipping, returns, and ads are counted. The reframe worked. The unit economics are what's being tested now.",
    image:
      "https://uksoubgwjbgjwtaafdxo.supabase.co/storage/v1/object/public/newsletter-images/teardowns/meesho-teardown-pm-lens.png",
    publishedDate: "2026-09-08",
  },
  {
    slug: "duolingo-teardown-pm-lens",
    company: "Duolingo",
    eyebrow: "Product Teardown · Consumer EdTech · September 2026",
    headline: "Duolingo won the AI-first bet on usage. It's still losing the AI-first bet on trust.",
    dek: "DAU is up 23% and revenue crossed $1B for the first time, right as the same AI strategy that unlocked that growth handed ChatGPT, Claude, and a $1B-valued rival named Speak the exact thing Duolingo used to own alone.",
    image:
      "https://uksoubgwjbgjwtaafdxo.supabase.co/storage/v1/object/public/newsletter-images/teardowns/duolingo-teardown-pm-lens.png",
    publishedDate: "2026-09-19",
  },
  {
    slug: "groww-teardown-pm-lens",
    company: "Groww",
    eyebrow: "Product Teardown · Fintech · September 2026",
    headline: "Groww has twice Zerodha's users. Zerodha still makes more money.",
    dek: "Groww overtook Zerodha to become India's largest broker by active clients, but the gap between the two companies' monetization reveals very different bets on who a retail investor actually is.",
    image:
      "https://uksoubgwjbgjwtaafdxo.supabase.co/storage/v1/object/public/newsletter-images/teardowns/groww-teardown-pm-lens.png",
    publishedDate: "2026-09-20",
  },
];

export function getTeardowns(): Teardown[] {
  return [...teardowns].sort((a, b) => {
    if (!a.publishedDate) return 1;
    if (!b.publishedDate) return -1;
    return b.publishedDate.localeCompare(a.publishedDate);
  });
}

export function getTeardown(slug: string): Teardown | null {
  return teardowns.find((t) => t.slug === slug) ?? null;
}
