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

export type DeviceId = 'radar' | 'lidar' | 'camera' | 'jammer' | 'uav' | 'interceptor';

export interface StoryDevice {
  id: DeviceId;
  name: string;
  short: string;
  detail: string;
  /** Short readout shown on the device panel in the problem chapter */
  readout: string;
}

export interface Story {
  rail: string[];
  devices: StoryDevice[];
  prologue: {
    titleLines: string[];
    subtitle: string;
    scrollCue: string;
    renderNote: string;
  };
  /** Chapter 01: the C2 / C4 project teaser that links to its detail page. */
  problem: {
    label: string;
    title: string;
    body: string;
    lines: { name: string; text: string }[];
    cta: string;
  };
  /** Chapter 02: the interceptor drone project teaser that links to its detail page. */
  interceptor: {
    label: string;
    title: string;
    body: string;
    specs: { value: string; label: string }[];
    cta: string;
    /** Target lock frame that follows the drone in the scene */
    lock: { target: string; tracking: string; locked: string; destroyed: string };
  };
  nexus: {
    label: string;
    title: string;
    body: string;
    /** Integration, autonomy, one screen */
    pillars: { title: string; body: string }[];
    /** Labels of the border scenario on the relief */
    scene: {
      border: string;
      vibration: string;
      camera: string;
      /** Object class shown on the intruder frame, e.g. "Person" (rendered as "Person ×3") */
      person: string;
      alert: { title: string; status: string; range: string };
    };
    caption: string;
  };
  decide: {
    label: string;
    title: string;
    steps: { title: string; body: string; status: string }[];
    closing: string;
    confirm: string;
  };
  field: {
    label: string;
    title: string;
    cards: { title: string; body: string }[];
  };
  missions: {
    label: string;
    title: string;
    items: { id: string; title: string; body: string; tags: string[] }[];
  };
  stack: {
    label: string;
    title: string;
    items: { title: string; body: string }[];
    link: string;
  };
  epilogue: {
    title: string;
    body: string;
    primary: string;
    secondary: string;
    partnersLabel: string;
  };
}

export interface StoryBeat {
  label: string;
  title: string;
  body: string;
}

export interface ProjectC2C4 {
  metaTitle: string;
  metaDescription: string;
  breadcrumb: string;
  rail: string[];
  intro: Omit<StoryBeat, 'body'> & { scrollCue: string };
  site: StoryBeat;
  c2: StoryBeat;
  network: StoryBeat;
  c4: StoryBeat;
  c2ui: {
    title: string;
    live: string;
    status: string;
    devicesLabel: string;
    /** Camera, radar, jammer, RF sensor, lidar, in the order they rise on the site */
    devices: string[];
    connected: string;
    threat: string;
    tracked: string;
    jamming: string;
    /** Boot line shown while the screen powers on */
    linking: string;
    mapLabel: string;
    /** Name of the site this C2 runs on */
    site: string;
    tabs: string[];
    mqtt: string;
    detectionsLabel: string;
    noDetections: string;
    confidence: string;
    high: string;
    model: string;
    fields: { freq: string; rssi: string; alt: string; speed: string; dist: string; bearing: string; pilot: string };
    /** Camera, lock target, jammer focus, match frequency */
    actions: string[];
    cameraLabel: string;
    locked: string;
    jammingLabel: string;
    standby: string;
    active: string;
    spectrumLabel: string;
    /** Event log lines: RF detection, radar track, camera lock, jamming */
    log: string[];
    leaving: string;
    /** Story steps shown under the laptop: devices, detection, confirmation, response */
    steps: string[];
  };
  c4ui: {
    title: string;
    live: string;
    linking: string;
    /** Header tabs, first one active */
    tabs: string[];
    /** KPI cards: current detections, unidentified, incidents, control nodes */
    kpis: string[];
    today: string;
    online: string;
    offline: string;
    monitoring: string;
    /** Monitoring panel segments: nodes, detections */
    segments: string[];
    search: string;
    /** One name per C2 site, main site first; the third one raises the incident */
    sites: string[];
    zonesLabel: string;
    nodeUnit: string;
    confidence: string;
    unidentified: string;
    model: string;
    alt: string;
    detected: string;
    incidentsLabel: string;
    noIncidents: string;
    incidentType: string;
    openC2: string;
    devicesLabel: string;
    /** Story steps shown under the wall: sites, detection, incident, hand-off */
    steps: string[];
  };
  /** Four C4 product screens shown under the chapter: zones, roles, suppression, statistics. */
  c4screens: {
    zones: {
      title: string;
      body: string;
      panel: string;
      alert: string;
      /** City, zone name and node count, in map order: Tashkent, Samarkand, Bukhara, Termez, Nukus, Fergana */
      places: { city: string; zone: string; nodes: string }[];
    };
    roles: {
      title: string;
      body: string;
      panel: string;
      person: string;
      role: string;
      zones: string;
      authority: string;
      observer: string;
      operator: string;
      viewOnly: string;
      control: string;
      people: { name: string; role: 'observer' | 'operator'; zones: string }[];
    };
    suppress: {
      title: string;
      body: string;
      panel: string;
      selected: string;
      zone: string;
      model: string;
      confidence: string;
      alt: string;
      detected: string;
      device: string;
      ready: string;
      button: string;
      hint: string;
      bands: string;
    };
    stats: {
      title: string;
      body: string;
      panel: string;
      period: string;
      totalLabel: string;
      byZone: string;
      byType: string;
      pattern: string;
      patternBody: string;
      days: string[];
      /** Quadcopter, fixed-wing, unidentified */
      types: string[];
      /** Same order as the sample counts: border post, airfield, HQ, substation, bridge, depot */
      zoneNames: string[];
    };
  };
  caption: string;
}

export interface ProjectInterceptor {
  metaTitle: string;
  metaDescription: string;
  breadcrumb: string;
  rail: string[];
  intro: StoryBeat & { scrollCue: string };
  threat: StoryBeat;
  launch: StoryBeat;
  seeker: StoryBeat;
  impact: StoryBeat;
  specs: StoryBeat & { items: { value: string; label: string }[] };
  seekerUi: {
    title: string;
    rec: string;
    /** Onboard AI, no GPS, no radar */
    badges: string[];
    /** Search, track, lock, terminal, impact */
    stages: string[];
    target: string;
    track: string;
    confidence: string;
    range: string;
    speed: string;
    held: string;
    operator: string;
    approved: string;
    abort: string;
    terminal: string;
    destroyed: string;
    /** Story steps shown under the seeker view */
    steps: string[];
  };
  caption: string;
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
  story: Story;
  company: {
    label: string;
    title: string;
    body: string;
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
  projectsPage: {
    c2c4: ProjectC2C4;
    interceptor: ProjectInterceptor;
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
