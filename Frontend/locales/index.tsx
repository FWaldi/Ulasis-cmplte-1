import React, { createContext, useContext, useState, ReactNode } from 'react';

// Translation types
interface Translations {
  // Dashboard
  dashboard: {
    title: string;
    avgRating: string;
    totalReviews: string;
    responseRate: string;
    recentReviews: string;
    viewAllReviews: string;
    quickActions: string;
    createQuestionnaire: string;
    generateQRCode: string;
    viewAnalytics: string;
    activeForms: string;
    qrCodes: string;
    questionnaires: string;
    analytics: string;
    reports: string;
    settings: string;
    logout: string;
  };
  
  // Real-time Analytics
  realTimeAnalytics: {
    title: string;
    live: string;
    paused: string;
    pause: string;
    resume: string;
    activeUsers: string;
    avgSessionDuration: string;
    conversionRate: string;
    bounceRate: string;
    pageViews: string;
    newSignups: string;
    revenue: string;
    newToday: string;
    sentimentShift: string;
    avgResponse: string;
    hourlyActivity: string;
    sentimentVelocity: string;
    liveFeedbackStream: string;
    waitingForFeedback: string;
    newReviewsWillAppear: string;
    reviews: string;
    activeUsersChart: string;
  };
  
  // Common
  common: {
    loading: string;
    error: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    view: string;
    create: string;
    update: string;
    confirm: string;
    success: string;
    warning: string;
    info: string;
  };
  
  // Analytics
  analytics: {
    title: string;
    overview: string;
    realTime: string;
    advanced: string;
    insights: string;
    journey: string;
    sentimentDistribution: string;
    positive: string;
    neutral: string;
    negative: string;
    topPositiveTopic: string;
    mostPraised: string;
    topNegativeTopic: string;
    needsAttention: string;
    sentimentTrend: string;
    last7Days: string;
    topicAnalysis: string;
    positiveTopics: string;
    negativeTopics: string;
    reviewSources: string;
  };
  
  // Advanced Sentiment
  advancedSentiment: {
    title: string;
    emotionAnalysis: string;
    emotionRadar: string;
    sentimentDrivers: string;
    keyPhrases: string;
    sentimentForecast: string;
    predictedTrend: string;
    confidence: string;
    influencingFactors: string;
    emotionBreakdown: string;
    joy: string;
    trust: string;
    anger: string;
    frustration: string;
    excitement: string;
    disappointment: string;
    satisfaction: string;
    confusion: string;
    upgradeRequired: string;
  };
  
  // Actionable Insights
  actionableInsights: {
    title: string;
    subtitle: string;
    description: string;
    filterByCategory: string;
    filterByPriority: string;
    allCategories: string;
    allPriorities: string;
    critical: string;
    high: string;
    medium: string;
    low: string;
    service: string;
    product: string;
    facilities: string;
    pricing: string;
    operations: string;
    noInsights: string;
    noInsightsFound: string;
    noInsightsMessage: string;
    upgradeRequired: string;
    takeAction: string;
    dismiss: string;
    markComplete: string;
    startImplementation: string;
    priority: string;
    impact: string;
    effort: string;
    confidence: string;
    avgConfidence: string;
    timeframe: string;
    resources: string;
    resourcesNeeded: string;
    kpis: string;
    successMetrics: string;
    evidence: string;
    reviewCount: string;
    reviews: string;
    sentimentScore: string;
    score: string;
    keyPhrases: string;
    trendDirection: string;
    improving: string;
    declining: string;
    stable: string;
    totalInsights: string;
    criticalIssues: string;
    potentialImpact: string;
    sentiment: string;
    revenue: string;
    retention: string;
  };
  
  // Customer Journey
  customerJourney: {
    title: string;
    description: string;
    journeyStages: string;
    stage: string;
    stageDescription: string;
    sentiment: string;
    dropOffRate: string;
    avgTimeSpent: string;
    feedbackVolume: string;
    issues: string;
    improvements: string;
    selectStage: string;
    journeyFunnel: string;
    sentimentFlow: string;
    keyInsights: string;
    upgradeRequired: string;
    avgJourneySentiment: string;
    totalDropoffRate: string;
    avgJourneyTime: string;
    totalFeedback: string;
    conversionFunnel: string;
    customers: string;
    dropoff: string;
    criticalDropoffPoints: string;
    stageAnalysis: string;
    stageMetrics: string;
    sentimentScore: string;
    dropoffRate: string;
    avgTime: string;
    minutes: string;
    improvementOpportunities: string;
  };
  
  // Navigation
  nav: {
    dashboard: string;
    inbox: string;
    activeForms: string;
    qrCodes: string;
    questionnaires: string;
    reports: string;
    panduan: string;
    settings: string;
  };
}

// English translations
const enTranslations: Translations = {
  dashboard: {
    title: 'Dashboard',
    avgRating: 'Average Rating',
    totalReviews: 'Total Reviews',
    responseRate: 'Response Rate',
    recentReviews: 'Recent Reviews',
    viewAllReviews: 'View All Reviews',
    quickActions: 'Quick Actions',
    createQuestionnaire: 'Create Questionnaire',
    generateQRCode: 'Generate QR Code',
    viewAnalytics: 'View Analytics',
    activeForms: 'Active Forms',
    qrCodes: 'QR Codes',
    questionnaires: 'Questionnaires',
    analytics: 'Analytics',
    reports: 'Reports',
    settings: 'Settings',
    logout: 'Logout',
  },
  
  realTimeAnalytics: {
    title: 'Real-Time Analytics',
    live: 'LIVE',
    paused: 'PAUSED',
    pause: 'Pause',
    resume: 'Resume',
    activeUsers: 'Active Users',
    avgSessionDuration: 'Avg Session Duration',
    conversionRate: 'Conversion Rate',
    bounceRate: 'Bounce Rate',
    pageViews: 'Page Views',
    newSignups: 'New Signups',
    revenue: 'Revenue',
    newToday: 'New Today',
    sentimentShift: 'Sentiment Shift',
    avgResponse: 'Avg Response',
    hourlyActivity: 'Hourly Activity',
    sentimentVelocity: 'Sentiment Velocity',
    liveFeedbackStream: 'Live Feedback Stream',
    waitingForFeedback: 'Waiting for feedback...',
    newReviewsWillAppear: 'New reviews will appear here automatically.',
    reviews: 'Reviews',
    activeUsersChart: 'Active Users',
  },
  
  common: {
    loading: 'Loading...',
    error: 'Error',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    create: 'Create',
    update: 'Update',
    confirm: 'Confirm',
    success: 'Success',
    warning: 'Warning',
    info: 'Info',
  },
  
  analytics: {
    title: 'Analytics',
    overview: 'Overview',
    realTime: 'Real-Time',
    advanced: 'Advanced',
    insights: 'Insights',
    journey: 'Customer Journey',
    sentimentDistribution: 'Sentiment Distribution',
    positive: 'Positive',
    neutral: 'Neutral',
    negative: 'Negative',
    topPositiveTopic: 'Top Positive Topic',
    mostPraised: 'Most Praised',
    topNegativeTopic: 'Top Negative Topic',
    needsAttention: 'Needs Attention',
    sentimentTrend: 'Sentiment Trend',
    last7Days: 'Last 7 Days',
    topicAnalysis: 'Topic Analysis',
    positiveTopics: 'Positive Topics',
    negativeTopics: 'Negative Topics',
    reviewSources: 'Review Sources',
  },
  
  advancedSentiment: {
    title: 'Advanced Sentiment Analysis',
    emotionAnalysis: 'Emotion Analysis',
    emotionRadar: 'Emotion Radar',
    sentimentDrivers: 'Sentiment Drivers',
    keyPhrases: 'Key Phrases',
    sentimentForecast: 'Sentiment Forecast',
    predictedTrend: 'Predicted Trend',
    confidence: 'Confidence',
    influencingFactors: 'Influencing Factors',
    emotionBreakdown: 'Emotion Breakdown',
    joy: 'Joy',
    trust: 'Trust',
    anger: 'Anger',
    frustration: 'Frustration',
    excitement: 'Excitement',
    disappointment: 'Disappointment',
    satisfaction: 'Satisfaction',
    confusion: 'Confusion',
    upgradeRequired: 'Upgrade to PRO for advanced sentiment analysis.',
  },
  
  actionableInsights: {
    title: 'Actionable Insights',
    subtitle: 'AI-powered recommendations to improve customer satisfaction',
    description: 'AI-powered recommendations to improve customer satisfaction',
    filterByCategory: 'Filter by Category',
    filterByPriority: 'Filter by Priority',
    allCategories: 'All Categories',
    allPriorities: 'All Priorities',
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    service: 'Service',
    product: 'Product',
    facilities: 'Facilities',
    pricing: 'Pricing',
    operations: 'Operations',
    noInsights: 'No insights available for the current filters.',
    noInsightsFound: 'No insights found',
    noInsightsMessage: 'Try adjusting your filters to see more insights.',
    upgradeRequired: 'Upgrade to PRO for actionable insights.',
    takeAction: 'Take Action',
    dismiss: 'Dismiss',
    markComplete: 'Mark Complete',
    startImplementation: 'Start Implementation',
    priority: 'Priority',
    impact: 'Impact',
    effort: 'Effort',
    confidence: 'Confidence',
    avgConfidence: 'Confidence',
    timeframe: 'Timeframe',
    resources: 'Resources',
    resourcesNeeded: 'Resources Needed',
    kpis: 'KPIs',
    successMetrics: 'Success Metrics',
    evidence: 'Evidence',
    reviewCount: 'Review Count',
    reviews: 'reviews',
    sentimentScore: 'Sentiment Score',
    score: 'Score',
    keyPhrases: 'Key Phrases',
    trendDirection: 'Trend Direction',
    improving: 'Improving',
    declining: 'Declining',
    stable: 'Stable',
    totalInsights: 'Total Insights',
    criticalIssues: 'Critical Issues',
    potentialImpact: 'Potential Impact',
    sentiment: 'Sentiment',
    revenue: 'Revenue',
    retention: 'Retention',
  },
  
  customerJourney: {
    title: 'Customer Journey Analysis',
    description: 'Track customer experience across all touchpoints',
    journeyStages: 'Journey Stages',
    stage: 'Stage',
    stageDescription: 'Description',
    sentiment: 'Sentiment',
    dropOffRate: 'Drop-off Rate',
    avgTimeSpent: 'Avg Time Spent',
    feedbackVolume: 'Feedback Volume',
    issues: 'Common Issues',
    improvements: 'Improvement Opportunities',
    selectStage: 'Select a stage to see details',
    journeyFunnel: 'Journey Funnel',
    sentimentFlow: 'Sentiment Flow',
    keyInsights: 'Key Insights',
    upgradeRequired: 'Upgrade to PRO for customer journey analysis.',
    avgJourneySentiment: 'Avg Journey Sentiment',
    totalDropoffRate: 'Total Drop-off Rate',
    avgJourneyTime: 'Avg Journey Time',
    totalFeedback: 'Total Feedback',
    conversionFunnel: 'Conversion Funnel',
    customers: 'Customers',
    dropoff: 'Drop-off',
    criticalDropoffPoints: 'Critical Drop-off Points',
    stageAnalysis: 'Stage Analysis',
    stageMetrics: 'Stage Metrics',
    sentimentScore: 'Sentiment Score',
    dropoffRate: 'Drop-off Rate',
    avgTime: 'Avg Time',
    minutes: 'minutes',
    improvementOpportunities: 'Improvement Opportunities',
  },
  
  nav: {
    dashboard: 'Dashboard',
    inbox: 'Inbox',
    activeForms: 'Active Forms',
    qrCodes: 'QR Codes',
    questionnaires: 'Questionnaires',
    reports: 'Reports',
    panduan: 'Guide',
    settings: 'Settings',
  },
};

// Indonesian translations
const idTranslations: Translations = {
  dashboard: {
    title: 'Dashboard',
    avgRating: 'Rating Rata-rata',
    totalReviews: 'Total Ulasan',
    responseRate: 'Tingkat Respons',
    recentReviews: 'Ulasan Terbaru',
    viewAllReviews: 'Lihat Semua Ulasan',
    quickActions: 'Aksi Cepat',
    createQuestionnaire: 'Buat Kuesioner',
    generateQRCode: 'Generate Kode QR',
    viewAnalytics: 'Lihat Analitik',
    activeForms: 'Formulir Aktif',
    qrCodes: 'Kode QR',
    questionnaires: 'Kuesioner',
    analytics: 'Analitik',
    reports: 'Laporan',
    settings: 'Pengaturan',
    logout: 'Keluar',
  },
  
  realTimeAnalytics: {
    title: 'Analitik Real-Time',
    live: 'LIVE',
    paused: 'DIJEDA',
    pause: 'Jeda',
    resume: 'Lanjutkan',
    activeUsers: 'Pengguna Aktif',
    avgSessionDuration: 'Durasi Sesi Rata-rata',
    conversionRate: 'Tingkat Konversi',
    bounceRate: 'Tingkat Bounce',
    pageViews: 'Tampilan Halaman',
    newSignups: 'Pendaftaran Baru',
    revenue: 'Pendapatan',
    newToday: 'Baru Hari Ini',
    sentimentShift: 'Perubahan Sentimen',
    avgResponse: 'Respons Rata-rata',
    hourlyActivity: 'Aktivitas Per Jam',
    sentimentVelocity: 'Kecepatan Sentimen',
    liveFeedbackStream: 'Aliran Feedback Langsung',
    waitingForFeedback: 'Menunggu feedback...',
    newReviewsWillAppear: 'Ulasan baru akan muncul di sini secara otomatis.',
    reviews: 'Ulasan',
    activeUsersChart: 'Pengguna Aktif',
  },
  
  common: {
    loading: 'Memuat...',
    error: 'Error',
    save: 'Simpan',
    cancel: 'Batal',
    delete: 'Hapus',
    edit: 'Edit',
    view: 'Lihat',
    create: 'Buat',
    update: 'Perbarui',
    confirm: 'Konfirmasi',
    success: 'Berhasil',
    warning: 'Peringatan',
    info: 'Info',
  },
  
  analytics: {
    title: 'Analitik',
    overview: 'Ringkasan',
    realTime: 'Real-Time',
    advanced: 'Lanjutan',
    insights: 'Wawasan',
    journey: 'Perjalanan Pelanggan',
    sentimentDistribution: 'Distribusi Sentimen',
    positive: 'Positif',
    neutral: 'Netral',
    negative: 'Negatif',
    topPositiveTopic: 'Topik Positif Teratas',
    mostPraised: 'Paling Dipuji',
    topNegativeTopic: 'Topik Negatif Teratas',
    needsAttention: 'Perlu Perhatian',
    sentimentTrend: 'Tren Sentimen',
    last7Days: '7 Hari Terakhir',
    topicAnalysis: 'Analisis Topik',
    positiveTopics: 'Topik Positif',
    negativeTopics: 'Topik Negatif',
    reviewSources: 'Sumber Ulasan',
  },
  
  advancedSentiment: {
    title: 'Analisis Sentimen Lanjutan',
    emotionAnalysis: 'Analisis Emosi',
    emotionRadar: 'Radar Emosi',
    sentimentDrivers: 'Pendorong Sentimen',
    keyPhrases: 'Frasa Kunci',
    sentimentForecast: 'Prakiraan Sentimen',
    predictedTrend: 'Tren Diprediksi',
    confidence: 'Kepercayaan',
    influencingFactors: 'Faktor Pengaruh',
    emotionBreakdown: 'Rincian Emosi',
    joy: 'Sukacita',
    trust: 'Kepercayaan',
    anger: 'Kemarahan',
    frustration: 'Frustrasi',
    excitement: 'Kegembiraan',
    disappointment: 'Kekecewaan',
    satisfaction: 'Kepuasan',
    confusion: 'Kebingungan',
    upgradeRequired: 'Tingkatkan ke PRO untuk analisis sentimen lanjutan.',
  },
  
  actionableInsights: {
    title: 'Wawasan yang Dapat Ditindaklanjuti',
    subtitle: 'Rekomendasi bertenaga AI untuk meningkatkan kepuasan pelanggan',
    description: 'Rekomendasi bertenaga AI untuk meningkatkan kepuasan pelanggan',
    filterByCategory: 'Filter berdasarkan Kategori',
    filterByPriority: 'Filter berdasarkan Prioritas',
    allCategories: 'Semua Kategori',
    allPriorities: 'Semua Prioritas',
    critical: 'Kritis',
    high: 'Tinggi',
    medium: 'Sedang',
    low: 'Rendah',
    service: 'Layanan',
    product: 'Produk',
    facilities: 'Fasilitas',
    pricing: 'Harga',
    operations: 'Operasi',
    noInsights: 'Tidak ada wawasan untuk filter saat ini.',
    noInsightsFound: 'Tidak ada wawasan ditemukan',
    noInsightsMessage: 'Coba sesuaikan filter Anda untuk melihat lebih banyak wawasan.',
    upgradeRequired: 'Tingkatkan ke PRO untuk wawasan yang dapat ditindaklanjuti.',
    takeAction: 'Ambil Tindakan',
    dismiss: 'Abaikan',
    markComplete: 'Tandai Selesai',
    startImplementation: 'Mulai Implementasi',
    priority: 'Prioritas',
    impact: 'Dampak',
    effort: 'Usaha',
    confidence: 'Kepercayaan',
    avgConfidence: 'Kepercayaan',
    timeframe: 'Rentang Waktu',
    resources: 'Sumber Daya',
    resourcesNeeded: 'Sumber Daya Diperlukan',
    kpis: 'KPI',
    successMetrics: 'Metrik Sukses',
    evidence: 'Bukti',
    reviewCount: 'Jumlah Ulasan',
    reviews: 'ulasan',
    sentimentScore: 'Skor Sentimen',
    score: 'Skor',
    keyPhrases: 'Frasa Kunci',
    trendDirection: 'Arah Tren',
    improving: 'Meningkat',
    declining: 'Menurun',
    stable: 'Stabil',
    totalInsights: 'Total Wawasan',
    criticalIssues: 'Masalah Kritis',
    potentialImpact: 'Dampak Potensial',
    sentiment: 'Sentimen',
    revenue: 'Pendapatan',
    retention: 'Retensi',
  },
  
  customerJourney: {
    title: 'Analisis Perjalanan Pelanggan',
    description: 'Lacak pengalaman pelanggan di semua titik sentuh',
    journeyStages: 'Tahapan Perjalanan',
    stage: 'Tahap',
    stageDescription: 'Deskripsi',
    sentiment: 'Sentimen',
    dropOffRate: 'Tingkat Drop-off',
    avgTimeSpent: 'Waktu Rata-rata Dihabiskan',
    feedbackVolume: 'Volume Feedback',
    issues: 'Masalah Umum',
    improvements: 'Peluang Peningkatan',
    selectStage: 'Pilih tahap untuk melihat detail',
    journeyFunnel: 'Corong Perjalanan',
    sentimentFlow: 'Aliran Sentimen',
    keyInsights: 'Wawasan Kunci',
    upgradeRequired: 'Tingkatkan ke PRO untuk analisis perjalanan pelanggan.',
    avgJourneySentiment: 'Sentimen Perjalanan Rata-rata',
    totalDropoffRate: 'Tingkat Drop-off Total',
    avgJourneyTime: 'Waktu Perjalanan Rata-rata',
    totalFeedback: 'Total Feedback',
    conversionFunnel: 'Corong Konversi',
    customers: 'Pelanggan',
    dropoff: 'Drop-off',
    criticalDropoffPoints: 'Titik Drop-off Kritis',
    stageAnalysis: 'Analisis Tahap',
    stageMetrics: 'Metrik Tahap',
    sentimentScore: 'Skor Sentimen',
    dropoffRate: 'Tingkat Drop-off',
    avgTime: 'Waktu Rata-rata',
    minutes: 'menit',
    improvementOpportunities: 'Peluang Peningkatan',
  },
  
  nav: {
    dashboard: 'Dashboard',
    inbox: 'Kotak Masuk',
    activeForms: 'Formulir Aktif',
    qrCodes: 'Kode QR',
    questionnaires: 'Kuesioner',
    reports: 'Laporan',
    panduan: 'Panduan',
    settings: 'Pengaturan',
  },
};

type Language = 'en' | 'id';

interface LocalizationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('id'); // Default to Indonesian
  
  const t = language === 'en' ? enTranslations : idTranslations;
  
  return (
    <LocalizationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useTranslation = (): Translations => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LocalizationProvider');
  }
  return context.t;
};

export const useLanguage = (): {
  language: Language;
  setLanguage: (lang: Language) => void;
} => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LocalizationProvider');
  }
  return {
    language: context.language,
    setLanguage: context.setLanguage,
  };
};