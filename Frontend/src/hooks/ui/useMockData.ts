import type { DemoPlan, Review, TrendData, Questionnaire, QRCode, BubbleAnalytics, AnalyticsSummaryData, TimeComparisonData } from '../../types';
import { ReviewStatus, QuestionType, Sentiment } from '../../types';

const allReviews: Review[] = [
    { id: 1, rating: 5, comment: 'Kopinya enak banget, tempatnya juga nyaman buat kerja. Pasti balik lagi!', timestamp: new Date('2023-10-28T10:00:00Z'), source: 'QR Scan', tags: ['Kopi', 'Suasana'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kualitas Produk', 'Suasana'], questionnaireId: 1, questionnaireName: 'Feedback Umum Pelanggan' },
    { id: 2, rating: 3, comment: 'Pelayanannya agak lama ya, padahal lagi ga rame. Makanan sih oke.', timestamp: new Date('2023-10-28T09:30:00Z'), source: 'QR Scan', tags: ['Pelayanan'], status: ReviewStatus.InProgress, sentiment: Sentiment.Neutral, topics: ['Pelayanan'], questionnaireId: 1, questionnaireName: 'Feedback Umum Pelanggan' },
    { id: 3, rating: 2, comment: 'AC-nya panas banget, jadi kurang nyaman. Tolong diperhatikan ya.', timestamp: new Date('2023-10-27T15:00:00Z'), source: 'QR Scan', tags: ['Fasilitas', 'AC'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Fasilitas'], questionnaireId: 1, questionnaireName: 'Feedback Umum Pelanggan' },
    { id: 4, rating: 4, comment: 'Harga agak pricey tapi sebanding sama kualitasnya. Croissant-nya the best!', timestamp: new Date('2023-10-27T12:00:00Z'), source: 'Google Maps', tags: ['Harga', 'Makanan'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Harga', 'Kualitas Produk'] },
    { id: 5, rating: 5, comment: 'Staff ramah dan sangat membantu. Proses redeem voucher gampang.', timestamp: new Date('2023-10-26T18:00:00Z'), source: 'QR Scan', tags: ['Pelayanan', 'Staff'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Pelayanan'], questionnaireId: 1, questionnaireName: 'Feedback Umum Pelanggan' },
    { id: 6, rating: 1, comment: 'Parkirnya susah banget disini, muter-muter setengah jam sendiri.', timestamp: new Date('2023-10-26T14:00:00Z'), source: 'Google Maps', tags: ['Fasilitas', 'Parkir'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Fasilitas'] },
    { id: 7, rating: 4, comment: 'Wifi kencang, cocok buat WFC. Banyak colokan juga.', timestamp: new Date('2023-10-25T11:00:00Z'), source: 'QR Scan', tags: ['Fasilitas', 'Wifi'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Fasilitas'], questionnaireId: 1, questionnaireName: 'Feedback Umum Pelanggan' },
    { id: 8, rating: 2, comment: 'Musik terlalu kencang, sulit untuk mengobrol atau bekerja.', timestamp: new Date('2023-10-28T11:00:00Z'), source: 'QR Scan', tags: ['Suasana'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Suasana'], questionnaireId: 1, questionnaireName: 'Feedback Umum Pelanggan' },
    { id: 9, rating: 3, comment: 'Kebersihan toiletnya kurang terjaga, semoga bisa ditingkatkan.', timestamp: new Date('2023-10-28T12:30:00Z'), source: 'QR Scan', tags: ['Fasilitas', 'Kebersihan'], status: ReviewStatus.InProgress, sentiment: Sentiment.Negative, topics: ['Kebersihan'], questionnaireId: 2, questionnaireName: 'Kuesioner Kebersihan Outlet' },
    { id: 10, rating: 4, comment: 'Pilihan menunya cukup beragam, tapi akan lebih baik jika ada opsi vegetarian.', timestamp: new Date('2023-10-27T18:00:00Z'), source: 'QR Scan', tags: ['Menu'], status: ReviewStatus.Resolved, sentiment: Sentiment.Neutral, topics: ['Kualitas Produk'], questionnaireId: 3, questionnaireName: 'Survey Minuman Favorit' },
    { id: 11, rating: 5, comment: 'Atmosfernya dapet banget buat nongkrong sore-sore. Recommended!', timestamp: new Date('2023-10-28T16:00:00Z'), source: 'QR Scan', tags: ['Suasana'], status: ReviewStatus.New, sentiment: Sentiment.Positive, topics: ['Suasana'], questionnaireId: 1, questionnaireName: 'Feedback Umum Pelanggan' },
    { id: 12, rating: 2, comment: 'Mejanya agak kotor pas saya datang, banyak remahan.', timestamp: new Date('2023-10-28T14:30:00Z'), source: 'QR Scan', tags: ['Kebersihan'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Kebersihan'], questionnaireId: 2, questionnaireName: 'Kuesioner Kebersihan Outlet' },
    { id: 13, rating: 4, comment: 'Proses pesannya cepat via aplikasi. Keren!', timestamp: new Date('2023-10-27T19:00:00Z'), source: 'QR Scan', tags: ['Pelayanan'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Pelayanan'], questionnaireId: 1, questionnaireName: 'Feedback Umum Pelanggan' },
    { id: 14, rating: 3, comment: 'Biasa aja sih, tidak ada yang spesial. Harganya lumayan.', timestamp: new Date('2023-10-26T20:00:00Z'), source: 'Google Maps', tags: ['Harga'], status: ReviewStatus.Resolved, sentiment: Sentiment.Neutral, topics: ['Harga', 'Kualitas Produk'] },
    { id: 15, rating: 5, comment: 'Baristanya jago, latte art nya bagus dan rasanya konsisten.', timestamp: new Date('2023-10-25T13:00:00Z'), source: 'QR Scan', tags: ['Kopi', 'Staff'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kualitas Produk', 'Pelayanan'], questionnaireId: 1, questionnaireName: 'Feedback Umum Pelanggan' },
    { id: 16, rating: 2, comment: 'Pesan antar online lama banget sampainya, kopinya jadi dingin.', timestamp: new Date('2023-10-24T09:00:00Z'), source: 'Gojek', tags: ['Pelayanan', 'Online'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Pelayanan'] },
    { id: 17, rating: 4, comment: 'Suka banget sama packaging takeaway-nya, aman dan estetik.', timestamp: new Date('2023-10-23T15:30:00Z'), source: 'QR Scan', tags: ['Fasilitas'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Fasilitas'], questionnaireId: 1, questionnaireName: 'Feedback Umum Pelanggan' },
    { id: 18, rating: 1, comment: 'Tolong dong, masa sendoknya bekas dipakai masih ada noda.', timestamp: new Date('2023-10-28T18:00:00Z'), source: 'QR Scan', tags: ['Kebersihan'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Kebersihan'], questionnaireId: 2, questionnaireName: 'Kuesioner Kebersihan Outlet' },
    { id: 19, rating: 5, comment: 'Tempatnya kids-friendly, ada area bermain kecil. Anak saya suka.', timestamp: new Date('2023-10-27T11:00:00Z'), source: 'Google Maps', tags: ['Fasilitas', 'Suasana'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Fasilitas', 'Suasana'] },
    { id: 20, rating: 3, comment: 'AC nya terlalu dingin, jadi ga betah lama-lama.', timestamp: new Date('2023-10-28T19:00:00Z'), source: 'QR Scan', tags: ['Fasilitas', 'AC'], status: ReviewStatus.InProgress, sentiment: Sentiment.Neutral, topics: ['Fasilitas'], questionnaireId: 1, questionnaireName: 'Feedback Umum Pelanggan' },
    { id: 21, rating: 4, comment: 'Pilihan biji kopinya banyak dan dijelaskan dengan baik oleh barista.', timestamp: new Date('2023-10-26T10:00:00Z'), source: 'QR Scan', tags: ['Kopi', 'Pelayanan'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kualitas Produk', 'Pelayanan'], questionnaireId: 3, questionnaireName: 'Survey Minuman Favorit' },
    { id: 22, rating: 2, comment: 'Antriannya panjang banget, kasirnya cuma satu yang buka.', timestamp: new Date('2023-10-25T12:30:00Z'), source: 'QR Scan', tags: ['Pelayanan'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Pelayanan'], questionnaireId: 1, questionnaireName: 'Feedback Umum Pelanggan' },
    { id: 23, rating: 5, comment: 'Sering ada promo menarik di aplikasi, jadi sering beli deh.', timestamp: new Date('2023-10-24T17:00:00Z'), source: 'Gojek', tags: ['Harga'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Harga'] },
    { id: 24, rating: 4, comment: 'Toiletnya wangi dan bersih. Penting banget ini!', timestamp: new Date('2023-10-23T18:30:00Z'), source: 'QR Scan', tags: ['Fasilitas', 'Kebersihan'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kebersihan'], questionnaireId: 2, questionnaireName: 'Kuesioner Kebersihan Outlet' },
     { id: 25, rating: 1, comment: 'Rasa makanannya hambar, tidak sesuai ekspektasi dan harganya.', timestamp: new Date('2023-10-28T20:00:00Z'), source: 'QR Scan', tags: ['Makanan', 'Harga'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Kualitas Produk', 'Harga'], questionnaireId: 1, questionnaireName: 'Feedback Umum Pelanggan' },
     { id: 26, rating: 4, comment: 'Pengiriman cukup cepat, tapi packaging bisa lebih baik.', timestamp: new Date('2023-10-27T14:00:00Z'), source: 'Gojek', tags: ['Delivery', 'Packaging'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Pelayanan'], questionnaireId: 4, questionnaireName: 'Feedback Layanan Delivery' },
     { id: 27, rating: 3, comment: 'Driver ramah dan tepat waktu, tapi paket agak penyok.', timestamp: new Date('2023-10-26T16:00:00Z'), source: 'Gojek', tags: ['Driver', 'Packaging'], status: ReviewStatus.InProgress, sentiment: Sentiment.Neutral, topics: ['Pelayanan', 'Fasilitas'], questionnaireId: 4, questionnaireName: 'Feedback Layanan Delivery' },
     { id: 28, rating: 5, comment: 'Event sangat inspiring, materi bagus dan networking-nya worth it.', timestamp: new Date('2023-10-25T18:00:00Z'), source: 'QR Scan', tags: ['Event', 'Materi'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kualitas Produk'], questionnaireId: 6, questionnaireName: 'Evaluasi Event' },
     { id: 29, rating: 2, comment: 'Lingkungan kerja baik, tapi beban kerja terlalu berat.', timestamp: new Date('2023-10-24T10:00:00Z'), source: 'QR Scan', tags: ['Workload', 'Environment'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Pelayanan'], questionnaireId: 5, questionnaireName: 'Survey Kepuasan Karyawan' },
     { id: 30, rating: 4, comment: 'Dukungan dari atasan cukup baik, tapi training bisa lebih banyak.', timestamp: new Date('2023-10-23T12:00:00Z'), source: 'QR Scan', tags: ['Support', 'Training'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Pelayanan'], questionnaireId: 5, questionnaireName: 'Survey Kepuasan Karyawan' },
];


const allQuestionnaires: Questionnaire[] = [
     { id: 1, name: 'Feedback Umum Pelanggan', description: 'Kuesioner untuk mengumpulkan feedback umum setelah kunjungan.', questions: [{id: 'q1', text:'Seberapa puas Anda dengan pelayanan kami?', type: 'rating_5'}, {id:'q2', text:'Apa yang bisa kami tingkatkan?', type: 'long_text'}], responseCount: 342, lastModified: new Date('2023-10-20') },
     { id: 2, name: 'Kuesioner Kebersihan Outlet', description: 'Feedback khusus mengenai kebersihan di lokasi kami.', questions: [{id: 'q3', text:'Bagaimana penilaian Anda tentang kebersihan area makan?', type: 'rating_5'}, {id: 'q4', text: 'Apakah toilet bersih dan terawat?', type: 'yes_no'}], responseCount: 157, lastModified: new Date('2023-09-15') },
     {
         id: 3,
         name: 'Survey Minuman Favorit',
         description: 'Bantu kami mengetahui minuman apa yang paling Anda sukai.',
         questions: [
             {id: 'q5', text:'Minuman apa yang paling sering Anda pesan?', type: 'multiple_choice', options: ['Kopi Hitam', 'Cappuccino', 'Latte', 'Non-Kopi']},
             {id: 'q6', text:'Dari mana Anda mengetahui promo kami?', type: 'dropdown', options: ['Instagram', 'Teman', 'Iklan di Toko', 'Lainnya']},
             {id: 'q7', text:'Beri kami rating untuk varian musiman terbaru.', type: 'rating_10'},
             {id: 'q8', text:'Saran untuk minuman berikutnya?', type: 'short_text'}
         ],
         responseCount: 88,
         lastModified: new Date('2023-10-25')
     },
     { id: 4, name: 'Feedback Layanan Delivery', description: 'Kuesioner untuk menilai pengalaman delivery order.', questions: [{id: 'q9', text:'Seberapa cepat waktu pengiriman?', type: 'rating_5'}, {id:'q10', text:'Kondisi paket saat diterima?', type: 'yes_no'}, {id:'q11', text:'Feedback untuk driver?', type: 'long_text'}], responseCount: 203, lastModified: new Date('2023-10-18') },
     { id: 5, name: 'Survey Kepuasan Karyawan', description: 'Internal survey untuk mengukur kepuasan karyawan.', questions: [{id: 'q12', text:'Seberapa puas Anda dengan lingkungan kerja?', type: 'rating_5'}, {id:'q13', text:'Apakah Anda mendapat dukungan yang cukup?', type: 'yes_no'}, {id:'q14', text:'Saran untuk improvement?', type: 'long_text'}], responseCount: 45, lastModified: new Date('2023-10-10') },
     { id: 6, name: 'Evaluasi Event', description: 'Feedback peserta setelah mengikuti event kami.', questions: [{id: 'q15', text:'Seberapa menarik event ini?', type: 'rating_10'}, {id:'q16', text:'Apakah Anda akan merekomendasikan?', type: 'yes_no'}, {id:'q17', text:'Kritik dan saran?', type: 'long_text'}], responseCount: 127, lastModified: new Date('2023-09-28') },
 ];

const allQrCodes: QRCode[] = [
     { id: 1, name: 'QR Meja - Umum', linkedForm: 'Feedback Umum Pelanggan', questionnaireId: 1, scans: 120, color: '#007A7A' },
     { id: 2, name: 'QR Pintu Keluar', linkedForm: 'Feedback Umum Pelanggan', questionnaireId: 1, scans: 250, color: '#4A4A4A' },
     { id: 3, name: 'QR Toilet', linkedForm: 'Kuesioner Kebersihan Outlet', questionnaireId: 2, scans: 95, color: '#FFC107' },
     { id: 4, name: 'QR Promo Minuman', linkedForm: 'Survey Minuman Favorit', questionnaireId: 3, scans: 55, color: '#D32F2F', logoUrl: 'https://cdn.iconscout.com/icon/free/png-256/free-coffee-bean-1544323-1308892.png' },
     { id: 5, name: 'QR Delivery Feedback', linkedForm: 'Feedback Layanan Delivery', questionnaireId: 4, scans: 78, color: '#1976D2' },
     { id: 6, name: 'QR Karyawan Survey', linkedForm: 'Survey Kepuasan Karyawan', questionnaireId: 5, scans: 23, color: '#388E3C' },
     { id: 7, name: 'QR Event Check-in', linkedForm: 'Evaluasi Event', questionnaireId: 6, scans: 156, color: '#F57C00' },
     { id: 8, name: 'QR Meja VIP', linkedForm: 'Feedback Umum Pelanggan', questionnaireId: 1, scans: 67, color: '#7B1FA2' },
 ];


type TimePeriod = 'day' | 'week' | 'month' | 'year';

export const getMockData = (demoPlan: DemoPlan, timePeriod: TimePeriod = 'week') => {
    // Get questionnaires based on plan - return mock data for demo
    const getQuestionnaires = () => {
        // Start with 0 questionnaires for free/starter, 1 for business (for analytics demo)
        return demoPlan === 'business' ? allQuestionnaires.slice(0, 1) : [];
    };

    // Generate data based on time period
    const getPeriodData = () => {
        switch (timePeriod) {
            case 'day':
                return {
                    totalResponses: 45,
                    avgRating: 4.3,
                    responseRate: 92,
                    positiveSentiment: 78,
                    trends: {
                        totalResponses: { value: 45, change: 8.2 },
                        avgRating: { value: 4.3, change: 2.1 },
                        responseRate: { value: 92, change: 1.5 },
                        positiveSentiment: { value: 78, change: 5.3 },
                    }
                };
            case 'month':
                return {
                    totalResponses: 1245,
                    avgRating: 4.4,
                    responseRate: 85,
                    positiveSentiment: 62,
                    trends: {
                        totalResponses: { value: 1245, change: -3.1 },
                        avgRating: { value: 4.4, change: -0.8 },
                        responseRate: { value: 85, change: -2.2 },
                        positiveSentiment: { value: 62, change: -1.7 },
                    }
                };
            case 'year':
                return {
                    totalResponses: 15420,
                    avgRating: 4.6,
                    responseRate: 79,
                    positiveSentiment: 71,
                    trends: {
                        totalResponses: { value: 15420, change: 12.8 },
                        avgRating: { value: 4.6, change: 0.4 },
                        responseRate: { value: 79, change: -5.1 },
                        positiveSentiment: { value: 71, change: 8.9 },
                    }
                };
            case 'week':
            default:
                return {
                    totalResponses: 1287,
                    avgRating: 4.5,
                    responseRate: 88,
                    positiveSentiment: 65,
                    trends: {
                        totalResponses: { value: 1287, change: 2.5 },
                        avgRating: { value: 4.5, change: 1.2 },
                        responseRate: { value: 88, change: -0.5 },
                        positiveSentiment: { value: 65, change: 3.1 },
                    }
                };
        }
    };

    const kpiData = getPeriodData();

    // Trend Data - Dual axis for Avg Rating and Response Rate
    const getTrendData = () => {
        switch (timePeriod) {
            case 'day':
                return [
                    { date: '00:00', 'Avg Rating': 4.1, 'Response Rate': 89 },
                    { date: '06:00', 'Avg Rating': 4.2, 'Response Rate': 91 },
                    { date: '12:00', 'Avg Rating': 4.4, 'Response Rate': 94 },
                    { date: '18:00', 'Avg Rating': 4.3, 'Response Rate': 92 },
                ];
            case 'month':
                return [
                    { date: 'Week 1', 'Avg Rating': 4.2, 'Response Rate': 82 },
                    { date: 'Week 2', 'Avg Rating': 4.3, 'Response Rate': 84 },
                    { date: 'Week 3', 'Avg Rating': 4.5, 'Response Rate': 87 },
                    { date: 'Week 4', 'Avg Rating': 4.4, 'Response Rate': 85 },
                ];
            case 'year':
                return [
                    { date: 'Jan', 'Avg Rating': 4.3, 'Response Rate': 75 },
                    { date: 'Apr', 'Avg Rating': 4.4, 'Response Rate': 78 },
                    { date: 'Jul', 'Avg Rating': 4.5, 'Response Rate': 81 },
                    { date: 'Oct', 'Avg Rating': 4.6, 'Response Rate': 79 },
                ];
            case 'week':
            default:
                return [
                    { date: 'Sen', 'Avg Rating': 4.3, 'Response Rate': 85 },
                    { date: 'Sel', 'Avg Rating': 4.5, 'Response Rate': 87 },
                    { date: 'Rab', 'Avg Rating': 4.4, 'Response Rate': 86 },
                    { date: 'Kam', 'Avg Rating': 4.6, 'Response Rate': 89 },
                    { date: 'Jum', 'Avg Rating': 4.7, 'Response Rate': 91 },
                    { date: 'Sab', 'Avg Rating': 4.5, 'Response Rate': 88 },
                    { date: 'Min', 'Avg Rating': 4.8, 'Response Rate': 90 },
                ];
        }
    };

    const trendData: TrendData[] = getTrendData();

    // Detailed Breakdown Data
    const getBreakdownData = () => {
        const baseData = [
            { area: 'Kualitas Pelayanan', baseRating: 4.8, baseResponses: 245, baseChange: 5.2 },
            { area: 'Kebersihan', baseRating: 4.2, baseResponses: 198, baseChange: -2.1 },
            { area: 'Rasa Makanan', baseRating: 4.6, baseResponses: 312, baseChange: 1.8 },
            { area: 'Kecepatan', baseRating: 3.9, baseResponses: 156, baseChange: -4.5 },
            { area: 'Suasana', baseRating: 4.4, baseResponses: 178, baseChange: 2.3 },
            { area: 'Nilai untuk Uang', baseRating: 4.1, baseResponses: 134, baseChange: -1.7 },
        ];

        const multiplier = timePeriod === 'day' ? 0.1 : timePeriod === 'month' ? 0.8 : timePeriod === 'year' ? 12 : 1;

        return baseData.map(item => {
            const responses = Math.round(item.baseResponses * multiplier);
            const change = timePeriod === 'day' ? item.baseChange * 2 : timePeriod === 'month' ? item.baseChange * 0.5 : timePeriod === 'year' ? item.baseChange * 0.3 : item.baseChange;
            const direction = change >= 0 ? 'up' as const : 'down' as const;
            const absChange = Math.abs(change);

            let status: 'Good' | 'Monitor' | 'Urgent';
            if (absChange > 3) {
                status = direction === 'up' ? 'Good' : 'Urgent';
            } else if (absChange > 1) {
                status = 'Monitor';
            } else {
                status = 'Good';
            }

            return {
                area: item.area,
                avgRating: `${item.baseRating} / 5`,
                responses,
                trend: { change: absChange, direction },
                status
            };
        });
    };

    const breakdownData = getBreakdownData();

    // Demo plan logic can be added here if needed to slice other data types

    return {
        initialKpi: kpiData,
        initialTrend: trendData,
        initialBreakdown: breakdownData,
        initialReviews: allReviews,
        initialQuestionnaires: getQuestionnaires(),
        initialQrCodes: allQrCodes
    };
};


const mockComments: { rating: number, comment: string, topics: string[] }[] = [
    { rating: 5, comment: "Luar biasa! Pelayanan cepat, tempat bersih, kopi mantap.", topics: ["Pelayanan", "Kebersihan", "Kualitas Produk"] },
    { rating: 4, comment: "Sudah bagus, tapi wifinya kadang lemot.", topics: ["Fasilitas"] },
    { rating: 3, comment: "Rasanya standar, harganya agak mahal untuk kualitas segitu.", topics: ["Harga", "Kualitas Produk"] },
    { rating: 2, comment: "Tolong perhatikan kebersihan toilet. Agak kotor tadi.", topics: ["Kebersihan"] },
    { rating: 1, comment: "Sangat kecewa. Pesanan saya salah dan menunggunya lama sekali.", topics: ["Pelayanan"] },
    { rating: 5, comment: "Staffnya ramah dan informatif. Pilihan menunya juga oke.", topics: ["Pelayanan", "Kualitas Produk"] },
    { rating: 4, comment: "Suasananya nyaman untuk kerja, tapi musiknya agak terlalu kencang.", topics: ["Suasana"] },
    { rating: 2, comment: "Parkirnya susah dan mahal.", topics: ["Fasilitas"] },
];

export const generateMockReview = (): Review => {
    const randomData = mockComments[Math.floor(Math.random() * mockComments.length)];
    const rating = randomData.rating;
    const sentiment = rating >= 4 ? Sentiment.Positive : rating === 3 ? Sentiment.Neutral : Sentiment.Negative;
    const source = ['QR Scan', 'Google Maps', 'Gojek'][Math.floor(Math.random() * 3)];

    let questionnaireData: { id?: number, name?: string } = {};
    if (source === 'QR Scan') {
        const randomQuestionnaire = allQuestionnaires[Math.floor(Math.random() * allQuestionnaires.length)];
        questionnaireData = { id: randomQuestionnaire.id, name: randomQuestionnaire.name };
    }

    return {
        id: Date.now() + Math.random(),
        rating: rating,
        comment: randomData.comment,
        timestamp: new Date(),
        source: source,
        tags: [randomData.topics[0]],
        status: ReviewStatus.New,
        sentiment: sentiment,
        topics: randomData.topics,
        questionnaireId: questionnaireData.id,
        questionnaireName: questionnaireData.name,
    };
};

// Mock analytics data generators
export const generateMockBubbleAnalytics = (questionnaireId: number): BubbleAnalytics => {
    const categories = [
        { name: 'Service Quality', rating: 4.2, response_count: 25, response_rate: 85, color: 'green' as const, trend: 'improving' as const },
        { name: 'Cleanliness', rating: 4.5, response_count: 22, response_rate: 88, color: 'green' as const, trend: 'stable' as const },
        { name: 'Speed', rating: 3.8, response_count: 18, response_rate: 72, color: 'yellow' as const, trend: 'improving' as const },
        { name: 'Value', rating: 4.0, response_count: 20, response_rate: 80, color: 'green' as const, trend: 'stable' as const },
        { name: 'Price', rating: 2.3, response_count: 15, response_rate: 60, color: 'red' as const, trend: 'declining' as const },
        { name: 'Atmosphere', rating: 3.2, response_count: 12, response_rate: 48, color: 'yellow' as const, trend: 'stable' as const },
    ];

    return {
        questionnaire_id: questionnaireId,
        categories,
        period_comparison: {
            current_period: new Date().toISOString().split('T')[0],
            previous_period: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            overall_trend: 'improving'
        },
        total_responses: categories.reduce((sum, cat) => sum + cat.response_count, 0),
        response_rate: Math.round(categories.reduce((sum, cat) => sum + cat.response_rate, 0) / categories.length),
        generated_at: new Date().toISOString()
    };
};

export const generateMockAnalyticsSummary = (questionnaireId: number): AnalyticsSummaryData => {
    const categories = [
        { name: 'Service Quality', rating: 4.2, response_count: 25, response_rate: 85, color: 'green' as const, trend: 'improving' as const },
        { name: 'Cleanliness', rating: 4.5, response_count: 22, response_rate: 88, color: 'green' as const, trend: 'stable' as const },
        { name: 'Speed', rating: 3.8, response_count: 18, response_rate: 72, color: 'yellow' as const, trend: 'improving' as const },
        { name: 'Value', rating: 4.0, response_count: 20, response_rate: 80, color: 'green' as const, trend: 'stable' as const },
        { name: 'Price', rating: 2.3, response_count: 15, response_rate: 60, color: 'red' as const, trend: 'declining' as const },
        { name: 'Atmosphere', rating: 3.2, response_count: 12, response_rate: 48, color: 'yellow' as const, trend: 'stable' as const },
    ];

    const colorDistribution = categories.reduce((acc, cat) => {
        acc[cat.color]++;
        return acc;
    }, { red: 0, yellow: 0, green: 0 });

    const overallRating = categories.reduce((sum, cat) => sum + cat.rating, 0) / categories.length;

    return {
        questionnaire_id: questionnaireId,
        total_categories: categories.length,
        overall_rating: Math.round(overallRating * 10) / 10,
        total_responses: categories.reduce((sum, cat) => sum + cat.response_count, 0),
        response_rate: Math.round(categories.reduce((sum, cat) => sum + cat.response_rate, 0) / categories.length),
        color_distribution: colorDistribution,
        overall_trend: 'improving',
        generated_at: new Date().toISOString()
    };
};

export const generateMockTimeComparison = (questionnaireId: number, comparisonType: 'week_over_week' | 'custom' = 'week_over_week'): TimeComparisonData => {
    const currentCategories = [
        { name: 'Service Quality', rating: 4.2, response_count: 25, response_rate: 85, color: 'green' as const, trend: 'improving' as const },
        { name: 'Cleanliness', rating: 4.5, response_count: 22, response_rate: 88, color: 'green' as const, trend: 'stable' as const },
        { name: 'Speed', rating: 3.8, response_count: 18, response_rate: 72, color: 'yellow' as const, trend: 'improving' as const },
        { name: 'Value', rating: 4.0, response_count: 20, response_rate: 80, color: 'green' as const, trend: 'stable' as const },
        { name: 'Price', rating: 2.3, response_count: 15, response_rate: 60, color: 'red' as const, trend: 'declining' as const },
        { name: 'Atmosphere', rating: 3.2, response_count: 12, response_rate: 48, color: 'yellow' as const, trend: 'stable' as const },
    ];

    const previousCategories = currentCategories.map(cat => ({
        ...cat,
        rating: Math.max(1, cat.rating - Math.random() * 0.5), // Slightly lower ratings for previous period
        response_count: Math.max(1, cat.response_count - Math.floor(Math.random() * 5)),
        response_rate: Math.max(10, cat.response_rate - Math.floor(Math.random() * 10))
    }));

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
        questionnaire_id: questionnaireId,
        comparison_type: comparisonType,
        current_period: {
            start_date: now.toISOString().split('T')[0],
            end_date: now.toISOString().split('T')[0],
            categories: currentCategories
        },
        previous_period: {
            start_date: weekAgo.toISOString().split('T')[0],
            end_date: weekAgo.toISOString().split('T')[0],
            categories: previousCategories
        },
        trend_analysis: {
            overall_trend: 'improving',
            category_trends: currentCategories.map(cat => ({
                category: cat.name,
                trend: cat.trend,
                change_percentage: Math.random() * 20 - 5 // Random change between -5% and 15%
            }))
        }
    };
};