import { useEffect } from "react";
import { useLocation } from "wouter";

const SITE_URL = "https://mution.tech";
const SITE_NAME = "Mution";
const DEFAULT_IMAGE = `${SITE_URL}/opengraph.jpg`;
const DEFAULT_DESCRIPTION =
  "Mution adalah platform PaaS dan AI gateway untuk deploy aplikasi, kelola API key, pantau usage, dan operasional produk digital dari satu workspace.";

type SeoEntry = {
  title: string;
  description: string;
  robots?: string;
  image?: string;
  jsonLd?: unknown[];
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/mution-logo.png`,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "supportmution@gmail.com",
    telephone: "+62-857-0955-7572",
    areaServed: "ID",
    availableLanguage: ["id", "en"],
  },
  sameAs: [
    "https://www.instagram.com/mution.tech",
    "https://www.tiktok.com/@mution.tech",
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "id-ID",
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description: DEFAULT_DESCRIPTION,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "IDR",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Apa itu Mution?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Mution adalah platform untuk deploy aplikasi, mengelola API key AI, memantau usage, dan mengatur kredit dari satu workspace.",
      },
    },
    {
      "@type": "Question",
      name: "Runtime apa saja yang didukung Mution?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Mution mendukung Node.js, Python, PHP, Go, Ruby, Java, Rust, Deno, Bun, .NET, dan Docker.",
      },
    },
    {
      "@type": "Question",
      name: "Apakah bisa menggunakan domain sendiri?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Bisa. Kamu dapat menghubungkan custom domain ke proyek dan mengaktifkan HTTPS tanpa konfigurasi server manual.",
      },
    },
    {
      "@type": "Question",
      name: "Bagaimana cara kerja sistem kredit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Kredit adalah saldo usage. Saat resource hosting, database, atau API digunakan, kredit akan berkurang sesuai pemakaian.",
      },
    },
    {
      "@type": "Question",
      name: "Apakah Mution bisa mengelola API key AI?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Bisa. Kamu dapat membuat API key, mengatur akses model, melihat pemakaian token, dan menghubungkan usage AI ke sistem kredit yang sama.",
      },
    },
  ],
};

const publicSeo: Record<string, SeoEntry> = {
  "/": {
    title: "Mution - Deploy Aplikasi dan AI Gateway",
    description: DEFAULT_DESCRIPTION,
    jsonLd: [organizationJsonLd, websiteJsonLd, softwareApplicationJsonLd],
  },
  "/harga": {
    title: "Harga Mution - Plan Hosting dan AI Gateway",
    description:
      "Lihat plan Mution, estimasi biaya hosting, penggunaan kredit, dan harga model AI untuk kebutuhan deploy aplikasi dan API gateway.",
    jsonLd: [organizationJsonLd, softwareApplicationJsonLd],
  },
  "/faq": {
    title: "FAQ Mution - Pertanyaan Seputar Deploy, Billing, dan API Key",
    description:
      "Temukan jawaban tentang deploy aplikasi, runtime, domain, billing kredit, keamanan, dan pengelolaan API key AI di Mution.",
    jsonLd: [organizationJsonLd, faqJsonLd],
  },
  "/tentang-kami": {
    title: "Tentang Mution - PaaS dan AI Gateway untuk Produk Digital",
    description:
      "Kenali Mution, platform untuk membantu developer dan tim produk menjalankan hosting, deployment, API key AI, dan billing kredit.",
    jsonLd: [organizationJsonLd],
  },
  "/changelog": {
    title: "Changelog Mution - Update Produk dan Rilis Fitur",
    description:
      "Ikuti catatan rilis Mution untuk update fitur platform, perbaikan, dan peningkatan layanan hosting serta AI gateway.",
    jsonLd: [organizationJsonLd],
  },
  "/privacy-policy": {
    title: "Kebijakan Privasi Mution",
    description:
      "Pelajari bagaimana Mution mengelola data pengguna, keamanan akun, dan informasi yang diproses saat menggunakan layanan.",
    jsonLd: [organizationJsonLd],
  },
  "/terms-and-conditions": {
    title: "Syarat dan Ketentuan Mution",
    description:
      "Baca syarat penggunaan Mution untuk layanan hosting, AI gateway, billing kredit, akun, dan operasional platform.",
    jsonLd: [organizationJsonLd],
  },
  "/refund-policy": {
    title: "Kebijakan Refund Mution",
    description:
      "Pelajari ketentuan refund Mution untuk transaksi, top up kredit, dan layanan berbayar yang digunakan di platform.",
    jsonLd: [organizationJsonLd],
  },
};

const privatePrefixes = [
  "/admin",
  "/api-keys",
  "/api-usage",
  "/activity",
  "/billing",
  "/dashboard",
  "/docs",
  "/github-callback",
  "/profile",
  "/projects",
  "/providers",
  "/referral",
  "/usage",
];

const authRoutes = ["/login", "/register"];

function normalizePath(path: string) {
  const cleanPath = path.split("?")[0]?.split("#")[0] || "/";
  if (cleanPath === "/") return cleanPath;
  return cleanPath.replace(/\/+$/, "");
}

function canonicalUrl(path: string) {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

function getSeoEntry(path: string): SeoEntry & { canonical: string } {
  const normalizedPath = normalizePath(path);
  const publicEntry = publicSeo[normalizedPath];

  if (publicEntry) {
    return {
      ...publicEntry,
      robots: publicEntry.robots ?? "index, follow",
      canonical: canonicalUrl(normalizedPath),
    };
  }

  const isPrivate =
    authRoutes.includes(normalizedPath) ||
    privatePrefixes.some((prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`));

  return {
    title: isPrivate ? "Mution App" : "Halaman Tidak Ditemukan - Mution",
    description: isPrivate
      ? "Area akun Mution untuk mengelola proyek, billing, API key, usage, dan pengaturan platform."
      : "Halaman yang kamu cari tidak ditemukan di Mution.",
    robots: "noindex, nofollow",
    canonical: canonicalUrl(normalizedPath),
    jsonLd: [],
  };
}

function ensureMeta(attribute: "name" | "property", key: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  return element;
}

function setMeta(attribute: "name" | "property", key: string, content: string) {
  ensureMeta(attribute, key).setAttribute("content", content);
}

function ensureCanonicalLink() {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  return element;
}

function setJsonLd(jsonLd: unknown[] = []) {
  const id = "mution-seo-jsonld";
  let element = document.getElementById(id) as HTMLScriptElement | null;

  if (jsonLd.length === 0) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement("script");
    element.id = id;
    element.type = "application/ld+json";
    document.head.appendChild(element);
  }

  element.text = JSON.stringify(jsonLd);
}

export function SeoController() {
  const [location] = useLocation();

  useEffect(() => {
    const seo = getSeoEntry(location);
    const title = seo.title.includes(SITE_NAME) ? seo.title : `${seo.title} | ${SITE_NAME}`;
    const image = seo.image ?? DEFAULT_IMAGE;

    document.documentElement.lang = "id";
    document.title = title;

    ensureCanonicalLink().href = seo.canonical;
    setMeta("name", "description", seo.description);
    setMeta("name", "robots", seo.robots ?? "index, follow");
    setMeta("name", "theme-color", "#f97316");

    setMeta("property", "og:title", title);
    setMeta("property", "og:description", seo.description);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", seo.canonical);
    setMeta("property", "og:image", image);
    setMeta("property", "og:image:alt", "Mution platform PaaS dan AI gateway");
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:locale", "id_ID");

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", seo.description);
    setMeta("name", "twitter:image", image);
    setMeta("name", "twitter:image:alt", "Mution platform PaaS dan AI gateway");
    setMeta("name", "twitter:domain", "mution.tech");

    setJsonLd(seo.jsonLd);
  }, [location]);

  return null;
}
