export type Locale = 'uz' | 'en' | 'ru';

export const locales: Locale[] = ['uz', 'en', 'ru'];
export const defaultLocale: Locale = 'uz';

export const localeLabels: Record<Locale, string> = {
  uz: 'UZ',
  en: 'EN',
  ru: 'RU',
};

export const localeHtmlLang: Record<Locale, string> = {
  uz: 'uz',
  en: 'en',
  ru: 'ru',
};

export interface NavItem {
  key: string;
  href: string;
}

export interface Capability {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface Solution {
  id: string;
  index: string;
  title: string;
  description: string;
  image: string;
  points: string[];
}

export interface Technology {
  id: string;
  index: string;
  title: string;
  description: string;
  icon: string;
}

export interface Partner {
  id: string;
  name: string;
  description: string;
  logo: string;
}

export interface FormField {
  name: string;
  label: string;
  placeholder: string;
  type: 'text' | 'email' | 'tel' | 'textarea';
  required: boolean;
}

export interface Dictionary {
  meta: {
    siteName: string;
    title: string;
    description: string;
    ogLocale: string;
  };
  nav: {
    home: string;
    about: string;
    solutions: string;
    technologies: string;
    contact: string;
    cta: string;
  };
  hero: {
    label: string;
    title: string;
    /** Preferred visual line breaks for the hero headline */
    titleLines: string[];
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
  company: {
    label: string;
    title: string;
    body: string;
  };
  capabilities: {
    label: string;
    title: string;
    items: Capability[];
  };
  solutions: {
    label: string;
    title: string;
    subtitle: string;
    items: Solution[];
    learnMore: string;
  };
  technologies: {
    label: string;
    title: string;
    subtitle: string;
    items: Technology[];
  };
  partners: {
    label: string;
    title: string;
    items: Partner[];
  };
  cta: {
    title: string;
    body: string;
    button: string;
  };
  aboutPage: {
    metaTitle: string;
    metaDescription: string;
    label: string;
    title: string;
    missionTitle: string;
    missionBody: string;
    approachTitle: string;
    principles: { title: string; body: string }[];
  };
  solutionsPage: {
    metaTitle: string;
    metaDescription: string;
    label: string;
    title: string;
    subtitle: string;
  };
  technologiesPage: {
    metaTitle: string;
    metaDescription: string;
    label: string;
    title: string;
    subtitle: string;
    integrationTitle: string;
    integrationBody: string;
  };
  contactPage: {
    metaTitle: string;
    metaDescription: string;
    label: string;
    title: string;
    subtitle: string;
    officeTitle: string;
    officeAddress: string;
    salesTitle: string;
    email: string;
    form: {
      fields: FormField[];
      submit: string;
      submitting: string;
      success: string;
      error: string;
    };
  };
  footer: {
    tagline: string;
    rights: string;
    links: string;
    contact: string;
  };
  notFound: {
    title: string;
    body: string;
    cta: string;
  };
}
