export default function StructuredData() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Rohan Khullar",
    url: "https://productwithrohan.online",
    sameAs: [
      "https://www.linkedin.com/in/rohan-khullar",
      "https://twitter.com/rohankhullar24",
    ],
    jobTitle: "Product Manager",
    worksFor: {
      "@type": "Organization",
      name: "B2B Fintech",
    },
    description: "Product Manager with 4+ years driving product strategy for B2B fintech",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
