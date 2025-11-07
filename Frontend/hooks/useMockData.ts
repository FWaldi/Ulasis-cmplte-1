import type { DemoPlan, Review, TrendData, Questionnaire, QRCode } from '../types';
import { ReviewStatus, QuestionType, Sentiment } from '../types';

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
];

const allQrCodes: QRCode[] = [
    { id: 1, name: 'QR Meja - Umum', linkedForm: 'Feedback Umum Pelanggan', questionnaireId: 1, scans: 120, color: '#007A7A' },
    { id: 2, name: 'QR Pintu Keluar', linkedForm: 'Feedback Umum Pelanggan', questionnaireId: 1, scans: 250, color: '#4A4A4A' },
    { id: 3, name: 'QR Toilet', linkedForm: 'Kuesioner Kebersihan Outlet', questionnaireId: 2, scans: 95, color: '#FFC107' },
    { id: 4, name: 'QR Promo Minuman', linkedForm: 'Survey Minuman Favorit', questionnaireId: 3, scans: 55, color: '#D32F2F', logoUrl: 'https://cdn.iconscout.com/icon/free/png-256/free-coffee-bean-1544323-1308892.png' },
];


export const getMockData = (demoPlan: DemoPlan) => {
    // KPI Data (will be recalculated in App.tsx)
    const kpiData = {
        avgRating: 4.5,
        totalReviews: 234,
        responseRate: 88,
    };
    
    // Trend Data
    const trendData: TrendData[] = [
        { date: 'Oct 22', 'Average Rating': 4.3 },
        { date: 'Oct 23', 'Average Rating': 4.5 },
        { date: 'Oct 24', 'Average Rating': 4.4 },
        { date: 'Oct 25', 'Average Rating': 4.6 },
        { date: 'Oct 26', 'Average Rating': 4.7 },
        { date: 'Oct 27', 'Average Rating': 4.5 },
        { date: 'Oct 28', 'Average Rating': 4.8 },
    ];
    
    // Demo plan logic can be added here if needed to slice other data types
    
    return {
        initialKpi: kpiData,
        initialTrend: trendData,
        initialReviews: allReviews,
        initialQuestionnaires: allQuestionnaires,
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