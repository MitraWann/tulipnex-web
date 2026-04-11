export interface Article {
  id: string;
  title: string;
  category: string;
  image: string;
  excerpt: string;
  content: string;
  date: string;
  createdAt: number;
  updatedAt: number;
}

export interface SiteSettings {
  heroSubtitle: string;
  heroTitle: string;
  heroImage: string;
  heroDesc: string;
  aboutDesc: string;
  botDesc: string;
}
