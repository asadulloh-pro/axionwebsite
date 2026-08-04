import type { Dictionary } from './types';

const uz: Dictionary = {
  meta: {
    siteName: 'Axionlab',
    title: 'Axionlab — Real vaqt monitoring va aqlli boshqaruv tizimlari',
    description:
      'Axionlab xavfsizlik sohasida uchuvchisiz tizimlar, real vaqt monitoringi va integratsiyalashgan muhandislik yechimlarini ishlab chiqadi.',
    ogLocale: 'uz_UZ',
  },
  nav: {
    home: 'Bosh sahifa',
    about: 'Biz haqimizda',
    solutions: 'Yechimlar',
    technologies: 'Texnologiyalar',
    contact: "Bog'lanish",
    cta: "Bog'lanish",
  },
  hero: {
    label: 'Axionlab',
    title: 'Real vaqt rejimida nazorat va tezkor qarorlar',
    titleLines: ['Real vaqt rejimida nazorat', 'va tezkor qarorlar'],
    subtitle:
      "Muhim jarayonlarni real vaqt rejimida kuzatish, samarali boshqarish va aqlli tahlillar asosida tezkor javob qaytarish imkonini beruvchi yagona platforma.",
    primaryCta: "Bog'lanish",
    secondaryCta: 'Biz haqimizda',
  },
  company: {
    label: '[02]',
    title: 'Kompaniya',
    body: "Axionlab xavfsizlik sohasida uchuvchisiz tizimlar va real vaqt monitoringiga tayangan integratsiyalashgan yechimlarni ishlab chiqish va joriy etishga ixtisoslashgan.",
  },
  capabilities: {
    label: '[03]',
    title: 'Murakkab tizimlar uchun professional muhandislik yechimlari',
    items: [
      {
        id: 'systems-engineering',
        title: 'Tizimli darajadagi muhandislik',
        description:
          "Uskuna va dasturiy yechimlarni uyg'unlashtirib, aniq va boshqarilishi oson tizimlar yaratamiz.",
        icon: '/icons/cap-01.svg',
      },
      {
        id: 'realtime-data',
        title: "Real vaqt rejimida ma'lumotlar bilan ishlash",
        description:
          "Ma'lumotlarni darhol qayta ishlash va tezkor qarorlar uchun tahlil qilish.",
        icon: '/icons/cap-02.svg',
      },
      {
        id: 'secure-integration',
        title: 'Xavfsiz integratsiya',
        description:
          "Ichki va tashqi tizimlar o'rtasida barqaror va himoyalangan integratsiya.",
        icon: '/icons/cap-03.svg',
      },
      {
        id: 'resilience',
        title: 'Tashqi sharoitlarga chidamlilik',
        description:
          'Murakkab muhit va beqaror infratuzilma sharoitida barqaror ishlash.',
        icon: '/icons/cap-04.svg',
      },
      {
        id: 'situational-awareness',
        title: "Operatsion holat haqida to'liq tasavvur",
        description:
          "Tizimning joriy holati, ichki jarayonlar va sodir bo'layotgan voqealar bo'yicha aniq va to'liq tasavvur.",
        icon: '/icons/cap-05.svg',
      },
    ],
  },
  solutions: {
    label: '[04]',
    title: "Asosiy yo'nalishlar",
    subtitle:
      "Axionlab mudofaa darajasidagi va fuqarolik yo'nalishidagi monitoring hamda boshqaruv tizimlariga ixtisoslashgan bo'lib, ularni uchuvchisiz platformalar bilan integratsiya qilish imkonini beradi.",
    learnMore: "Batafsil",
    items: [
      {
        id: 'defense',
        index: '[001]',
        title: 'Mudofaa va xavfsizlik',
        description:
          "Axionlab murakkab ekspluatatsiya sharoitlarida xavfsizlik va mudofaa vazifalarini qo'llab-quvvatlash uchun uchuvchisiz texnologiyalar asosidagi ilg'or tizimlarni ishlab chiqadi.",
        image: '/images/defence-security.jpg',
        points: [
          'Uchuvchisiz platformalar integratsiyasi',
          'Real vaqt monitoringi va ogohlantirish',
          "Murakkab sharoitlarda barqaror ishlash",
        ],
      },
      {
        id: 'civil',
        index: '[002]',
        title: "Fuqarolik va tijorat yo'nalishlari",
        description:
          "Parklardan tortib gavjum shahar hududlarigacha, Axionlab fuqarolik muhitida xavfsizlikni oshirish, vaziyatdan xabardorlikni kuchaytirish va hayot sifatini yaxshilash uchun o'z texnologiyalarini qo'llaydi.",
        image: '/images/civil-commercial.jpg',
        points: [
          'Shahar va infratuzilma monitoringi',
          'Vaziyatdan xabardorlik tizimlari',
          'Samaradorlik va shaffoflik',
        ],
      },
    ],
  },
  technologies: {
    label: '[05]',
    title: 'Texnologiyalar va mutaxassislik',
    subtitle:
      'Axionlab jamoasi murakkab texnologik tizimlarni loyihalash va amaliyotga tatbiq etishda katta tajribaga ega.',
    items: [
      {
        id: 'computer-vision',
        index: '[001]',
        title: 'Computer Vision',
        description:
          "Fuqarolik va tijorat sohalarida aero-monitoring orqali samaradorlik va shaffoflikni oshiruvchi ko'rish tizimlari.",
        icon: '/icons/computer-vision.svg',
      },
      {
        id: 'ml',
        index: '[002]',
        title: 'Machine Learning & ML Training',
        description:
          "Murakkab ma'lumotlar oqimini tahlil qilish uchun modellarni o'qitish va sozlash.",
        icon: '/icons/machine-learning.svg',
      },
      {
        id: 'simulation',
        index: '[003]',
        title: 'Simulation & Modeling',
        description:
          "Tizimlar xatti-harakatini sinovdan o'tkazish, tekshirish va turli ssenariylar asosida tahlil qilish uchun virtual muhitlar.",
        icon: '/icons/simulation.svg',
      },
      {
        id: 'realtime',
        index: '[004]',
        title: 'Real-time Data Processing',
        description:
          "Ma'lumotlar oqimini real vaqt rejimida tez qayta ishlash va zudlik bilan javob berish imkoniyati.",
        icon: '/icons/real-time-data-processing.svg',
      },
      {
        id: 'distributed',
        index: '[005]',
        title: 'High-load & Distributed Systems',
        description:
          "Katta hajmdagi ma'lumotlar va parallel jarayonlar uchun barqaror va kengaytiriladigan arxitekturalar.",
        icon: '/icons/distributed-systems.svg',
      },
      {
        id: 'iot',
        index: '[006]',
        title: 'IoT & Telemetry',
        description:
          "Tizimlarni uzluksiz kuzatish uchun sensorlar va qurilmalardan ma'lumotlarni yig'ish hamda uzatish.",
        icon: '/icons/telemetry.svg',
      },
    ],
  },
  partners: {
    label: '[06]',
    title: 'Texnologik va soha vakillari bilan hamkorlik',
    items: [
      {
        id: 'cyberpark',
        name: 'Cyberpark',
        description:
          "Cyberpark — O'zbekistonda texnologik kompaniyalar va startaplar bir joyga jamlanadigan IT-klaster. Bu muhitda jamoalar hamkorlik qiladi, g'oyalar rivojlanadi va raqamli mahsulotlar real yechimlarga aylanadi.",
        logo: '/icons/cyber-park.svg',
      },
      {
        id: 'eas',
        name: 'Electronic Autonomous Solutions',
        description:
          "EAS xavfsizlik va sanoat sohalari uchun zamonaviy uchuvchisiz platformalar va boshqaruv tizimlarini yaratadi. Ular real vaqt monitoringi, ishonchli texnik yechimlar va amalda sinovdan o'tgan aero-texnologiyalarga tayangan.",
        logo: '/icons/eas.svg',
      },
    ],
  },
  cta: {
    title: 'Amaliy vaziyatlarda tajribali mutaxassislar bilan hamkorlik qiling',
    body: "Monitoring, boshqaruv yoki integratsiya — siz bilan hamkorlikda real sharoitlarga mos tizimlar ustida ishlaymiz.",
    button: "Bog'lanish",
  },
  aboutPage: {
    metaTitle: 'Biz haqimizda — Axionlab',
    metaDescription:
      "Axionlab missiyasi, yondashuvi va muhandislik tamoyillari. Uchuvchisiz tizimlar va real vaqt monitoringi bo'yicha mutaxassislar.",
    label: '[01]',
    title: 'Biz haqimizda',
    missionTitle: 'Missiya',
    missionBody:
      "Biz murakkab muhitlarda xavfsizlik, monitoring va tezkor qaror qabul qilishni ta'minlovchi ishonchli texnologik tizimlarni yaratamiz. Har bir yechim real sharoitlarda ishlashi, kengayishi va himoyalangan holda integratsiya qilinishi uchun loyihalanadi.",
    approachTitle: 'Yondashuv',
    principles: [
      {
        title: 'Tizimli muhandislik',
        body: "Uskuna, dasturiy ta'minot va ma'lumotlar oqimini bir butun sifatida loyihalaymiz.",
      },
      {
        title: 'Real sharoitlarga moslashuv',
        body: 'Yechimlar laboratoriyadan emas, ekspluatatsiya muhitidan kelib chiqib yaratiladi.',
      },
      {
        title: 'Xavfsizlik birinchi o\'rinda',
        body: "Integratsiya, uzatish va saqlash jarayonlarida himoya qatlami asosiy talab hisoblanadi.",
      },
      {
        title: 'Uzoq muddatli hamkorlik',
        body: "Biz faqat yetkazib bermaymiz — tizimlarni qo'llab-quvvatlaymiz va rivojlantiramiz.",
      },
    ],
  },
  solutionsPage: {
    metaTitle: 'Yechimlar — Axionlab',
    metaDescription:
      "Mudofaa, xavfsizlik hamda fuqarolik va tijorat yo'nalishlaridagi monitoring va boshqaruv yechimlari.",
    label: '[02]',
    title: 'Yechimlar',
    subtitle:
      "Uchuvchisiz platformalar bilan integratsiyalashgan monitoring va boshqaruv tizimlari — mudofaa va fuqarolik muhitlari uchun.",
  },
  technologiesPage: {
    metaTitle: 'Texnologiyalar — Axionlab',
    metaDescription:
      "Computer Vision, Machine Learning, real vaqt ma'lumotlarni qayta ishlash, IoT va tarqatilgan tizimlar bo'yicha Axionlab mutaxassisligi.",
    label: '[03]',
    title: 'Texnologiyalar',
    subtitle:
      "Sensorlardan tahlilgacha — murakkab tizimlarni loyihalash va joriy etish uchun to'liq texnologik stack.",
    integrationTitle: "Sensorlar va tizimlarning yagona integratsiyasi",
    integrationBody:
      "Dasturiy yechimlar va texnik qismlar o'rtasidagi muvofiqlashtirilgan tizimlar.",
  },
  contactPage: {
    metaTitle: "Bog'lanish — Axionlab",
    metaDescription:
      "Axionlab bilan bog'laning. Savol, g'oya yoki taklifingizni yuboring — tez orada javob beramiz.",
    label: '[05]',
    title: "Bog'lanish",
    subtitle:
      "Rivojlanish yo'lida sizni qo'llab-quvvatlash uchun shu yerdamiz. Savol, g'oya yoki taklifingiz bormi? Xabar qoldiring.",
    officeTitle: 'Bosh ofis',
    officeAddress: 'Sarikul 2/4, Tashkent, Uzbekistan',
    salesTitle: "Savdo bo'limi bilan bog'lanish",
    email: 'info@axionlab.io',
    form: {
      fields: [
        { name: 'name', label: 'Ism', placeholder: 'Ismingiz', type: 'text', required: true },
        { name: 'email', label: 'Elektron pochta', placeholder: 'email@example.com', type: 'email', required: true },
        { name: 'phone', label: 'Telefon raqam', placeholder: '+998 XX XXX XX XX', type: 'tel', required: true },
        { name: 'company', label: 'Kompaniya', placeholder: 'Kompaniya nomi', type: 'text', required: true },
        { name: 'region', label: 'Hudud', placeholder: 'Hudud / shahar', type: 'text', required: true },
        { name: 'message', label: 'Xabar', placeholder: 'Xabaringizni yozing...', type: 'textarea', required: true },
      ],
      submit: 'Yuborish',
      submitting: 'Yuborilmoqda...',
      success: "Xabaringiz yuborildi. Tez orada siz bilan bog'lanamiz.",
      error: "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring yoki email orqali yozing.",
    },
  },
  footer: {
    tagline: 'Real vaqt monitoring va aqlli boshqaruv tizimlari',
    rights: 'Barcha huquqlar himoyalangan.',
    links: 'Sahifalar',
    contact: "Bog'lanish",
  },
  notFound: {
    title: 'Sahifa topilmadi',
    body: "Siz qidirgan sahifa mavjud emas yoki ko'chirilgan.",
    cta: 'Bosh sahifaga qaytish',
  },
};

export default uz;
