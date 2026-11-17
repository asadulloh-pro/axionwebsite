import type { Dictionary } from './types';

const en: Dictionary = {
  meta: {
    siteName: 'Axionlab',
    title: 'Axionlab: UAV monitoring and countermeasure systems',
    description:
      'Axionlab connects radars, lidars, cameras, jammers, drones and IoT into one operational picture, with C2 and C4 software for defense, security and critical infrastructure.',
    ogLocale: 'en_US',
  },
  nav: {
    home: 'Home',
    about: 'About',
    solutions: 'Solutions',
    technologies: 'Technologies',
    contact: 'Contact',
    cta: 'Contact',
  },
  story: {
    rail: ['Prologue', 'Projects', 'Interceptor', 'Nexus', 'C2 / C4', 'Engineering', 'Missions', 'Technology', 'Contact'],
    devices: [
      { id: 'radar', name: 'Radar', short: 'Radar', detail: 'Tracks, range, bearing and speed.', readout: 'TRACK 041' },
      { id: 'lidar', name: 'Lidar', short: 'Lidar', detail: 'Point clouds and precise 3D geometry.', readout: '3D POINTS' },
      { id: 'camera', name: 'EO/IR camera', short: 'EO/IR', detail: 'Video, thermal imagery and detections.', readout: 'OBJECT ?' },
      { id: 'jammer', name: 'RF sensor and jammer', short: 'RF / Jammer', detail: 'Signal detection and controlled response.', readout: '2.4 GHz' },
      { id: 'uav', name: 'UAV', short: 'UAV', detail: 'Telemetry, payload video and mission control.', readout: 'TELEMETRY' },
      { id: 'interceptor', name: 'Interceptor drone', short: 'Interceptor', detail: 'Launches on command to intercept hostile drones.', readout: 'TGT LOCK' },
    ],
    prologue: {
      titleLines: ['Detection and suppression devices', 'in one control system'],
      subtitle:
        'Radars, cameras, radio detectors, and radio and navigation suppression systems. Different types of devices, combined and controlled from a single interface.',
      scrollCue: 'Scroll to begin',
      renderNote: 'Illustrative visualization',
    },
    problem: {
      label: 'Our projects',
      title: 'C2 and C4.',
      body: 'Two systems, one chain of protection: from a single site to one command center.',
      lines: [
        { name: 'C2', text: 'Connects every device at a site and protects it under one dome.' },
        { name: 'C4', text: 'Brings every protected site into one command picture.' },
      ],
      cta: 'How it works',
    },
    interceptor: {
      label: 'Our projects',
      title: 'Interceptor drone.',
      body: 'An AI interceptor that detects, identifies, tracks and destroys hostile UAVs.',
      specs: [
        { value: '200 km/h', label: 'Top speed' },
        { value: '5 km', label: 'Range' },
        { value: '5 s', label: 'Launch readiness' },
        { value: '2.5/3 kg', label: 'Mass' },
      ],
      cta: 'How it works',
      lock: { target: 'Shahed-type UAV', tracking: 'Tracking', locked: 'Target locked', destroyed: 'Target destroyed' },
    },
    nexus: {
      label: 'Our projects',
      title: 'Nexus.',
      body: 'One platform for autonomous border control: from scattered sensors to one operational picture.',
      pillars: [
        { title: 'Integration', body: 'Works with the equipment already in place.' },
        { title: 'Autonomy', body: 'AI takes over routine watching and analysis.' },
        { title: 'One screen', body: 'The operator sees everything in one interface.' },
      ],
      scene: {
        border: 'Border',
        vibration: 'Vibration sensor',
        camera: 'Camera',
        person: 'Person',
        alert: { title: 'Intrusion detected', status: 'Warning', range: 'Range' },
      },
      caption: 'Illustrative visualization · sample data',
    },
    decide: {
      label: 'C2 / C4',
      title: 'From detection to decision.',
      steps: [
        { title: 'Detect', body: 'Data from different sensors is combined to identify the object or signal.', status: 'Track created' },
        { title: 'Classify', body: 'Radio-protocol decoding and movement-pattern analysis with an ML model set the classification confidence for each object.', status: 'Classified' },
        { title: 'Control', body: 'The operator receives a consolidated picture and the parameters of each object.', status: 'Under control' },
        { title: 'Decision', body: 'In the same system interface, the operator applies countermeasures and follows how the situation develops.', status: 'Decision made' },
      ],
      closing: 'Machines handle the speed. People keep the authority.',
      confirm: 'Confirm',
    },
    field: {
      label: 'Engineering',
      title: 'The system is deployed and operating across the Republic of Uzbekistan.',
      cards: [
        { title: 'Real-time', body: 'Streams are processed as they arrive, for work where seconds matter.' },
        { title: 'Resilient', body: 'Keeps operating on unstable links and degraded infrastructure.' },
        { title: 'Secure', body: 'Protection is part of every integration, transfer and store.' },
        { title: 'Scalable', body: 'A distributed architecture that grows from one post to a network.' },
      ],
    },
    missions: {
      label: 'Missions',
      title: 'Two missions. One platform.',
      items: [
        {
          id: 'defense',
          title: 'Defense and security',
          body: 'C2 and C4 systems for armed forces and security services.',
          tags: ['Airspace monitoring', 'Perimeter and border protection', 'Counter-drone operations'],
        },
        {
          id: 'civil',
          title: 'Critical infrastructure',
          body: 'Monitoring and control for sites that need a live, trustworthy picture.',
          tags: ['Energy', 'Transport', 'Industry and cities'],
        },
      ],
    },
    stack: {
      label: 'Technology',
      title: 'The engineering underneath.',
      items: [
        { title: 'Computer vision', body: 'Detection and tracking on video and thermal streams.' },
        { title: 'Machine learning', body: 'Models trained and tuned on real sensor data.' },
        { title: 'Simulation', body: 'Virtual scenarios to test systems before the field does.' },
        { title: 'Real-time processing', body: 'Live streams handled with immediate response.' },
        { title: 'Distributed systems', body: 'High-load architecture for many devices and sites.' },
        { title: 'IoT and telemetry', body: 'Continuous data from sensors and equipment.' },
      ],
      link: 'All technologies',
    },
    epilogue: {
      title: 'We will secure control and safety of the airspace around your sites.',
      body: 'State your requirements and the configuration of your infrastructure, and we will propose a solution.',
      primary: 'Contact us',
      secondary: 'About Axionlab',
      partnersLabel: 'Working with',
    },
  },
  company: {
    label: '[02]',
    title: 'Company',
    body: 'Axionlab specializes in developing and deploying integrated solutions based on unmanned systems and real-time monitoring for the security domain.',
  },
  solutions: {
    label: '[04]',
    title: 'Focus areas',
    subtitle:
      'Axionlab specializes in defense-grade and civilian monitoring and control systems, with seamless integration of unmanned platforms.',
    learnMore: 'Learn more',
    items: [
      {
        id: 'defense',
        index: '[001]',
        title: 'Defense & security',
        description:
          'We develop advanced unmanned-technology systems that support security and defense missions in demanding operational conditions.',
        image: '/images/defence-security.jpg',
        points: [
          'Unmanned platform integration',
          'Real-time monitoring and alerting',
          'Resilient operation in harsh conditions',
        ],
      },
      {
        id: 'civil',
        index: '[002]',
        title: 'Civil & commercial',
        description:
          'From parks to dense urban areas, Axionlab applies its technologies to improve safety, situational awareness, and quality of life.',
        image: '/images/civil-commercial.jpg',
        points: [
          'Urban and infrastructure monitoring',
          'Situational awareness systems',
          'Efficiency and transparency',
        ],
      },
    ],
  },
  technologies: {
    label: '[05]',
    title: 'Technologies & expertise',
    subtitle:
      'The Axionlab team has deep experience designing and deploying complex technological systems.',
    items: [
      {
        id: 'computer-vision',
        index: '[001]',
        title: 'Computer Vision',
        description:
          'Vision systems that boost efficiency and transparency through aerial monitoring in civil and commercial domains.',
        icon: '/icons/computer-vision.svg',
      },
      {
        id: 'ml',
        index: '[002]',
        title: 'Machine Learning & ML Training',
        description:
          'Training and tuning models to analyze complex data streams.',
        icon: '/icons/machine-learning.svg',
      },
      {
        id: 'simulation',
        index: '[003]',
        title: 'Simulation & Modeling',
        description:
          'Virtual environments to test, verify, and analyze system behavior across scenarios.',
        icon: '/icons/simulation.svg',
      },
      {
        id: 'realtime',
        index: '[004]',
        title: 'Real-time Data Processing',
        description:
          'Fast processing of live data streams with immediate response capability.',
        icon: '/icons/real-time-data-processing.svg',
      },
      {
        id: 'distributed',
        index: '[005]',
        title: 'High-load & Distributed Systems',
        description:
          'Stable, scalable architectures for large data volumes and parallel workloads.',
        icon: '/icons/distributed-systems.svg',
      },
      {
        id: 'iot',
        index: '[006]',
        title: 'IoT & Telemetry',
        description:
          'Collecting and transmitting sensor and device data for continuous system observation.',
        icon: '/icons/telemetry.svg',
      },
    ],
  },
  partners: {
    label: '[06]',
    title: 'Partnerships with technology and industry leaders',
    items: [
      {
        id: 'cyberpark',
        name: 'Cyberpark',
        description:
          'Cyberpark is an IT cluster in Uzbekistan where technology companies and startups collaborate, ideas grow, and digital products become real solutions.',
        logo: '/icons/cyber-park.svg',
      },
      {
        id: 'eas',
        name: 'Electronic Autonomous Solutions',
        description:
          'EAS builds modern unmanned platforms and control systems for security and industry, grounded in real-time monitoring and field-proven aero technologies.',
        logo: '/icons/eas.svg',
      },
    ],
  },
  cta: {
    title: 'Partner with specialists who work in real operational contexts',
    body: 'Monitoring, control, or integration — we build systems tailored to real-world conditions with you.',
    button: 'Get in touch',
  },
  aboutPage: {
    metaTitle: 'About — Axionlab',
    metaDescription:
      'Mission, approach, and engineering principles of Axionlab — specialists in unmanned systems and real-time monitoring.',
    label: '[01]',
    title: 'About us',
    missionTitle: 'Mission',
    missionBody:
      'We create reliable technological systems that enable security, monitoring, and rapid decision-making in complex environments. Every solution is designed to operate, scale, and integrate securely in real conditions.',
    approachTitle: 'Approach',
    principles: [
      {
        title: 'Systems engineering',
        body: 'We design hardware, software, and data flows as one coherent system.',
      },
      {
        title: 'Built for reality',
        body: 'Solutions are shaped by operational environments — not just the lab.',
      },
      {
        title: 'Security first',
        body: 'Protection is a baseline requirement across integration, transmission, and storage.',
      },
      {
        title: 'Long-term partnership',
        body: 'We do more than deliver — we support and evolve the systems we build.',
      },
    ],
  },
  projectsPage: {
    c2c4: {
      metaTitle: 'C2 and C4: how Axion protects sites',
      metaDescription:
        'How Axion C2 connects the devices of one site under a protective dome, and how Axion C4 brings every site into one command picture.',
      breadcrumb: 'C2 and C4',
      rail: ['Intro', 'Site', 'C2', 'Network', 'C4'],
      intro: {
        label: 'Project · C2 / C4',
        title: 'From one site to one command center.',
        body: 'Scroll to see how Axion C2 and C4 work together.',
        scrollCue: 'Scroll',
      },
      site: {
        label: 'The site',
        title: 'Every site starts with its devices.',
        body: 'A camera, radar, jammer, RF sensor and lidar take their places and form one protective dome.',
      },
      c2: {
        label: 'C2',
        title: 'C2 turns them into one picture.',
        body: 'Data from every device flows into the site computer. The operator sees the drone and responds from the same screen.',
      },
      network: {
        label: 'Network',
        title: 'Every site runs its own C2.',
        body: 'Each protected site keeps working on its own, and reports what it sees.',
      },
      c4: {
        label: 'C4',
        title: 'C4 sees every site at once.',
        body: 'All sites report to one command center. C4 identifies drones, records incidents and hands control back to the right site.',
      },
      c2ui: {
        title: 'Axion C2',
        live: 'Live',
        status: 'Site protected',
        devicesLabel: 'Devices',
        devices: ['EO/IR camera', 'Radar', 'Jammer', 'RF sensor', 'Lidar'],
        connected: 'Connected',
        threat: 'UAV · inbound',
        tracked: 'Tracked',
        jamming: 'Jamming sector',
        linking: 'Linking site devices',
        mapLabel: 'Site picture',
        site: 'Airfield',
        tabs: ['Map', 'Monitoring', 'History'],
        mqtt: 'MQTT online',
        detectionsLabel: 'Detections',
        noDetections: 'No active detections',
        confidence: 'Confidence',
        high: 'High',
        model: 'Quadcopter UAV',
        fields: { freq: 'Freq', rssi: 'RSSI', alt: 'Alt', speed: 'Speed', dist: 'Dist', bearing: 'Bearing', pilot: 'Pilot' },
        actions: ['Camera', 'Lock', 'Jam', 'Freq'],
        cameraLabel: 'PTZ camera · EO/IR',
        locked: 'Target locked',
        jammingLabel: 'Jamming',
        standby: 'Standby',
        active: 'Active',
        spectrumLabel: 'RF spectrum',
        log: ['RF signal 2.4 GHz', 'Radar track TRK-0217', 'Camera locked on target', 'Jamming 2.4 / 5.8 GHz'],
        leaving: 'UAV leaving zone',
        steps: ['Devices connect', 'Drone detected', 'Camera confirms', 'Jammer responds'],
      },
      c4ui: {
        title: 'Axion C4',
        live: 'Live',
        linking: 'Linking C2 sites',
        tabs: ['Dashboard', 'Administration', 'Telemetry'],
        kpis: ['Current UAV detections', 'Unidentified UAVs', 'Incidents', 'Control nodes'],
        today: 'For today',
        online: 'Online',
        offline: 'Offline',
        monitoring: 'Monitoring panel',
        segments: ['Nodes', 'Detections'],
        search: 'Zones / objects',
        sites: ['Airfield', 'Substation', 'Border post', 'Depot', 'Port', 'Bridge', 'HQ'],
        zonesLabel: 'Control zones',
        nodeUnit: '1 node',
        confidence: 'Confidence',
        unidentified: 'Unidentified',
        model: 'Quadcopter UAV',
        alt: 'Alt',
        detected: 'Detected',
        incidentsLabel: 'Incident log',
        noIncidents: 'No incidents',
        incidentType: 'Unidentified UAV',
        openC2: 'Go to control',
        devicesLabel: 'Devices',
        steps: ['Sites connect', 'Drone detected', 'Incident logged', 'Control goes to site C2'],
      },
      caption: 'Illustrative interface · sample data',
    },
    interceptor: {
      metaTitle: 'Interceptor drone: how Axion stops hostile drones',
      metaDescription: 'How the Axion interceptor drone finds, tracks and kinetically destroys Shahed-type and other hostile drones with onboard AI vision.',
      breadcrumb: 'Interceptor drone',
      rail: ['Intro', 'Threat', 'Launch', 'Seeker', 'Impact', 'Specs'],
      intro: {
        label: 'Project · Interceptor',
        title: 'From launch to impact in minutes.',
        body: 'Scroll to see how the Axion interceptor stops a hostile drone.',
        scrollCue: 'Scroll',
      },
      threat: {
        label: 'The threat',
        title: 'A Shahed-type drone heads for the site.',
        body: 'It flies low and fast toward a protected site. Radar detects it.',
      },
      launch: {
        label: 'Launch',
        title: 'Coordinates in. Launch.',
        body: 'Radar sends the target coordinates to the interceptor. The operator approves, and it flies to that point. Launch readiness: 5 s.',
      },
      seeker: {
        label: 'AI seeker',
        title: 'Then the AI takes over.',
        body: 'Near the coordinates, the onboard camera and AI find the drone, lock on and guide the interceptor into it.',
      },
      impact: {
        label: 'Impact',
        title: 'A direct, kinetic hit.',
        body: 'The interceptor closes in at up to 200 km/h and destroys the target with its built-in warhead.',
      },
      specs: {
        label: 'Specifications',
        title: 'Small, fast, ready.',
        body: 'The operator keeps control at every stage of the intercept.',
        items: [
          { value: '200 km/h', label: 'Top speed' },
          { value: '150 km/h', label: 'Cruise speed' },
          { value: '5 km', label: 'Range' },
          { value: '< 5 min', label: 'Mission time' },
          { value: '< 10 min', label: 'Field deployment' },
          { value: '5 s', label: 'Launch readiness' },
          { value: '2.5/3 kg', label: 'Mass' },
          { value: 'Built-in', label: 'Kinetic warhead' },
        ],
      },
      seekerUi: {
        title: 'Seeker · onboard camera',
        rec: 'REC',
        badges: ['Radar cue', 'Onboard AI', 'Camera homing'],
        stages: ['Coordinates', 'Search', 'Lock', 'Terminal', 'Impact'],
        target: 'Shahed-type UAV',
        track: 'Track',
        confidence: 'Confidence',
        range: 'Range',
        speed: 'Speed',
        held: 'Track held',
        operator: 'Operator',
        approved: 'Launch approved',
        abort: 'Abort',
        terminal: 'Terminal phase',
        destroyed: 'Target destroyed',
        steps: ['Target found', 'Target locked', 'Track held', 'Impact'],
      },
      caption: 'Illustrative interface · sample data',
    },
  },
  solutionsPage: {
    metaTitle: 'Solutions — Axionlab',
    metaDescription:
      'Monitoring and control solutions for defense, security, and civil & commercial environments.',
    label: '[02]',
    title: 'Solutions',
    subtitle:
      'Monitoring and control systems integrated with unmanned platforms — for defense and civilian environments.',
  },
  technologiesPage: {
    metaTitle: 'Technologies — Axionlab',
    metaDescription:
      'Axionlab expertise in Computer Vision, Machine Learning, real-time processing, IoT, and distributed systems.',
    label: '[03]',
    title: 'Technologies',
    subtitle:
      'From sensors to analytics — a complete technology stack for designing and deploying complex systems.',
    integrationTitle: 'Unified sensor and system integration',
    integrationBody:
      'Coordinated systems between software solutions and technical components for continuous observation.',
  },
  contactPage: {
    metaTitle: 'Contact — Axionlab',
    metaDescription:
      'Get in touch with Axionlab. Send a question, idea, or proposal — we will respond soon.',
    label: '[05]',
    title: 'Contact',
    subtitle:
      'We are here to support your growth. Have a question, idea, or proposal? Leave a message.',
    officeTitle: 'Head office',
    officeAddress: 'Sarikul 2/4, Tashkent, Uzbekistan',
    salesTitle: 'Sales contact',
    email: 'info@axionlab.io',
    form: {
      fields: [
        { name: 'name', label: 'Name', placeholder: 'Your name', type: 'text', required: true },
        { name: 'email', label: 'Email', placeholder: 'email@example.com', type: 'email', required: true },
        { name: 'phone', label: 'Phone', placeholder: '+998 XX XXX XX XX', type: 'tel', required: true },
        { name: 'company', label: 'Company', placeholder: 'Company name', type: 'text', required: true },
        { name: 'region', label: 'Region', placeholder: 'Region / city', type: 'text', required: true },
        { name: 'message', label: 'Message', placeholder: 'Write your message...', type: 'textarea', required: true },
      ],
      submit: 'Send',
      submitting: 'Sending...',
      success: 'Your message has been sent. We will contact you soon.',
      error: 'Something went wrong. Please try again or email us directly.',
    },
  },
  footer: {
    tagline: 'Device integration and C2/C4 software for defense, security and critical infrastructure.',
    rights: 'All rights reserved.',
    links: 'Pages',
    contact: 'Contact',
  },
  notFound: {
    title: 'Page not found',
    body: 'The page you are looking for does not exist or has been moved.',
    cta: 'Back to home',
  },
};

export default en;
