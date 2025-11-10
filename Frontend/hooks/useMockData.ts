import type { DemoPlan, Review, TrendData, Questionnaire, QRCode } from '../types';
import { ReviewStatus, QuestionType, Sentiment } from '../types';

const allReviews: Review[] = [
    // October 1-7, 2025 - Early month reviews
    { id: 1, rating: 5, comment: 'Kopi susu gula arennya mantap banget! Manisnya pas, porsinya juga pas. Tempatnya cozy banget buat ngumpul sama teman-teman. Saran: tambah menu kopi susu kekinian ya.', timestamp: new Date('2025-10-01T10:15:00Z'), source: 'Pindai QR', tags: ['Kopi', 'Suasana'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kualitas Produk', 'Suasana'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 2, rating: 3, comment: 'Cappuccino-nya lumayan, creamnya thick. Pelayanannya ramah-ramah, cuma agak lama pas weekend rame. Harusnya tambah kasir pas weekend.', timestamp: new Date('2025-10-02T14:30:00Z'), source: 'Pindai QR', tags: ['Pelayanan', 'Kopi'], status: ReviewStatus.InProgress, sentiment: Sentiment.Neutral, topics: ['Pelayanan', 'Kualitas Produk'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 3, rating: 2, comment: 'AC di ruangan dalam kurang dingin, jadi agak pengap. Tolong dicek ya, soalnya siang hari lumayan panas. Mungkin perlu service AC rutin.', timestamp: new Date('2025-10-03T15:45:00Z'), source: 'Pindai QR', tags: ['Fasilitas', 'AC'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Fasilitas'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 4, rating: 5, comment: 'Croissant almond-nya juara! Renyah di luar, lembut di dalam. Sama kopi hitamnya pas banget combination. Request: tambah varian croquettes juga dong!', timestamp: new Date('2025-10-04T08:30:00Z'), source: 'Google Maps', tags: ['Makanan', 'Kopi'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kualitas Produk'] },
    { id: 5, rating: 4, comment: 'Barista-nya helpful banget, dikasih rekomendasi kopi sesuai selera. Proses pembayaran pakai QR juga gampang. Saran: QR payment-nya bisa split bill.', timestamp: new Date('2025-10-05T16:20:00Z'), source: 'Pindai QR', tags: ['Pelayanan', 'Staff'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Pelayanan'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 6, rating: 1, comment: 'Parkir di basement penuh terus, muter-muter 15 menit ga dapet juga. Akhirnya balik lagi deh. Harusnya ada valet service atau reservasi parkir.', timestamp: new Date('2025-10-06T12:00:00Z'), source: 'Google Maps', tags: ['Fasilitas', 'Parkir'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Fasilitas'] },
    { id: 7, rating: 5, comment: 'Wifi-nya kencang banget, zoom meeting lancar jaya. Banyak stop kontak juga, jadi ga perlu bawa powerbank. Perfect buat WFH!', timestamp: new Date('2025-10-07T09:00:00Z'), source: 'Pindai QR', tags: ['Fasilitas', 'Wifi'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Fasilitas'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },

    // October 8-14, 2025 - Mid month reviews
    { id: 8, rating: 3, comment: 'Lagu-nya agak terlalu kencang, jadi susah ngobrol sama teman. Mungkin bisa dikurangi volume-nya dikit atau ada playlist yang lebih tenang.', timestamp: new Date('2025-10-08T19:30:00Z'), source: 'Pindai QR', tags: ['Suasana'], status: ReviewStatus.New, sentiment: Sentiment.Neutral, topics: ['Suasana'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 9, rating: 2, comment: 'Toilet lantai 2 sabunnya habis, tissue juga ga ada. Harusnya dicek rutin ya. Saran: cek toilet setiap 2 jam sekali.', timestamp: new Date('2025-10-09T11:15:00Z'), source: 'Pindai QR', tags: ['Fasilitas', 'Kebersihan'], status: ReviewStatus.InProgress, sentiment: Sentiment.Negative, topics: ['Kebersihan'], questionnaireId: 2, questionnaireName: 'Kuesioner Kebersihan Outlet' },
    { id: 10, rating: 4, comment: 'Menu-nya variatif, ada makanan berat juga. Tapi sayangnya opsi vegetarian masih terbatas. Mohon tambah menu vegan dan gluten-free.', timestamp: new Date('2025-10-10T13:45:00Z'), source: 'Pindai QR', tags: ['Menu'], status: ReviewStatus.Resolved, sentiment: Sentiment.Neutral, topics: ['Kualitas Produk'], questionnaireId: 3, questionnaireName: 'Survei Minuman Favorit' },
    { id: 11, rating: 5, comment: 'Tempatnya instagrammable banget! Corner-nya banyak, lighting-nya bagus buat foto-foto. Saran: tambah spot foto dengan props tematik.', timestamp: new Date('2025-10-11T16:00:00Z'), source: 'Pindai QR', tags: ['Suasana'], status: ReviewStatus.New, sentiment: Sentiment.Positive, topics: ['Suasana'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 12, rating: 2, comment: 'Meja yang saya duduki masih berantakan, belum dibersihin. Harus nunggu 10 menit baru dibersihin. Staff cleaning-nya perlu ditambah.', timestamp: new Date('2025-10-12T10:30:00Z'), source: 'Pindai QR', tags: ['Kebersihan'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Kebersihan'], questionnaireId: 2, questionnaireName: 'Kuesioner Kebersihan Outlet' },
    { id: 13, rating: 4, comment: 'Proses pesannya cepat via aplikasi. Keren! Request: aplikasi-nya bisa save favorite order biar lebih cepat.', timestamp: new Date('2025-10-13T07:45:00Z'), source: 'Pindai QR', tags: ['Pelayanan'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Pelayanan'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 14, rating: 3, comment: 'Harganya lumayan mahal buat kopi di area ini. Tapi ya memang tempatnya nyaman. Mungkin ada promo membership untuk regular customer?', timestamp: new Date('2025-10-14T15:00:00Z'), source: 'Google Maps', tags: ['Harga'], status: ReviewStatus.Resolved, sentiment: Sentiment.Neutral, topics: ['Harga', 'Kualitas Produk'] },

    // October 15-21, 2025 - Late month reviews
    { id: 15, rating: 5, comment: 'Latte art-nya konsisten dan cantik! Barista-nya profesional banget, tau cara bikin kopi yang bener. Request: ada kelas latte art buat customer juga!', timestamp: new Date('2025-10-15T08:15:00Z'), source: 'Pindai QR', tags: ['Kopi', 'Staff'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kualitas Produk', 'Pelayanan'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 16, rating: 2, comment: 'Delivery-nya lama banget, 1.5 jam baru nyampe. Kopinya udah dingin dan ice cream-nya meleleh. Harusnya ada estimasi waktu yang akurat.', timestamp: new Date('2025-10-16T12:30:00Z'), source: 'Gojek', tags: ['Pelayanan', 'Online'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Pelayanan'] },
    { id: 17, rating: 4, comment: 'Packaging-nya eco-friendly dan bagus. Paper bag-nya tebal, cup-nya juga tidak mudah bocor. Saran: tambah opsi packaging premium buat gift.', timestamp: new Date('2025-10-17T17:20:00Z'), source: 'Pindai QR', tags: ['Fasilitas'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Fasilitas'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 18, rating: 1, comment: 'Garpu yang dikasih masih ada sisa makanan, jorok banget! Harusnya lebih diperhatikan kebersihan alat makan. Quality control perlu diperketat.', timestamp: new Date('2025-10-18T19:45:00Z'), source: 'Pindai QR', tags: ['Kebersihan'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Kebersihan'], questionnaireId: 2, questionnaireName: 'Kuesioner Kebersihan Outlet' },
    { id: 19, rating: 5, comment: 'Ada playground kecil buat anak-anak, jadi orang tua bisa santai sambil anak main. Recommended buat keluarga! Request: tambah mainan edukatif juga.', timestamp: new Date('2025-10-19T10:00:00Z'), source: 'Google Maps', tags: ['Fasilitas', 'Suasana'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Fasilitas', 'Suasana'] },
    { id: 20, rating: 3, comment: 'AC-nya terlalu dingin, jadi bawa jaket terus. Mungkin bisa diatur suhu-nya biar ga terlalu ekstrem. Atau ada zona dengan suhu berbeda.', timestamp: new Date('2025-10-20T14:15:00Z'), source: 'Pindai QR', tags: ['Fasilitas', 'AC'], status: ReviewStatus.InProgress, sentiment: Sentiment.Neutral, topics: ['Fasilitas'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 21, rating: 4, comment: 'Pilihan biji kopinya banyak dan dijelaskan dengan baik oleh barista. Saran: ada coffee tasting session buat customer yang mau belajar.', timestamp: new Date('2025-10-21T09:30:00Z'), source: 'Pindai QR', tags: ['Kopi', 'Pelayanan'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kualitas Produk', 'Pelayanan'], questionnaireId: 3, questionnaireName: 'Survei Minuman Favorit' },

    // October 22-31, 2025 - End of month reviews
    { id: 22, rating: 2, comment: 'Antriannya panjang banget, kasirnya cuma satu yang buka. Harusnya ada sistem antrian digital atau tambah kasir di jam sibuk.', timestamp: new Date('2025-10-22T12:00:00Z'), source: 'Pindai QR', tags: ['Pelayanan'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Pelayanan'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 23, rating: 5, comment: 'Promo buy 1 get 1 di weekday mantul! Jadi lebih hemat. Sering ada promo-seru lainnya juga. Request: ada loyalty program dengan poin reward.', timestamp: new Date('2025-10-23T16:30:00Z'), source: 'Gojek', tags: ['Harga'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Harga'] },
    { id: 24, rating: 4, comment: 'Toilet-nya bersih dan wangi. Pengharum ruangannya juga enak, ga menyengat. Penting banget ini! Saran: tambah air freshener otomatis.', timestamp: new Date('2025-10-24T11:45:00Z'), source: 'Pindai QR', tags: ['Fasilitas', 'Kebersihan'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kebersihan'], questionnaireId: 2, questionnaireName: 'Kuesioner Kebersihan Outlet' },
    { id: 25, rating: 1, comment: 'Nasi goreng-nya hambar banget, bumbunya ga meresap. Harganya segitu worth it-nya kurang. Chef-nya perlu training lagi.', timestamp: new Date('2025-10-25T20:15:00Z'), source: 'Pindai QR', tags: ['Makanan', 'Harga'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Kualitas Produk', 'Harga'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 26, rating: 5, comment: 'Vietnam drip-nya autentik banget! Pakai kopi robusta yang bener, pahitnya pas sama susu kental manis. Request: jual biji kopi retail juga!', timestamp: new Date('2025-10-26T08:45:00Z'), source: 'Pindai QR', tags: ['Kopi'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kualitas Produk'], questionnaireId: 3, questionnaireName: 'Survei Minuman Favorit' },
    { id: 27, rating: 3, comment: 'Tempat duduk outdoor-nya kurang banyak, sering full pas jam makan siang. Saran: expand area outdoor atau buka rooftop cafe.', timestamp: new Date('2025-10-27T12:30:00Z'), source: 'Pindai QR', tags: ['Fasilitas'], status: ReviewStatus.New, sentiment: Sentiment.Neutral, topics: ['Fasilitas'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 28, rating: 4, comment: 'Signature dessert-nya "Affogato Cake" unik dan enak! Kombinasi kopi dan cake-nya balance. Request: ada dessert of the month setiap bulan.', timestamp: new Date('2025-10-28T15:20:00Z'), source: 'Pindai QR', tags: ['Makanan'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kualitas Produk'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 29, rating: 2, comment: 'Socket di dekat jendela rusak, ga bisa dipake. Padahal spot itu paling banyak dicari. Harusnya ada maintenance rutin fasilitas.', timestamp: new Date('2025-10-29T10:15:00Z'), source: 'Pindai QR', tags: ['Fasilitas'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Fasilitas'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 30, rating: 5, comment: 'Service-nya top banget! Pelayannya proaktif, tau apa yang pelanggan butuhin tanpa harus diminta. Request: ada training program buat staff baru.', timestamp: new Date('2025-10-30T18:00:00Z'), source: 'Pindai QR', tags: ['Pelayanan', 'Staff'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Pelayanan'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },

    // Additional varied reviews for more comprehensive data
    { id: 31, rating: 4, comment: 'Matcha latte-nya unik dan seger! Rasa matcha-nya tidak pahit, pas banget sama susu. Saran: tambah topping boba atau pearl.', timestamp: new Date('2025-10-01T13:20:00Z'), source: 'Pindai QR', tags: ['Kopi'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kualitas Produk'], questionnaireId: 3, questionnaireName: 'Survei Minuman Favorit' },
    { id: 32, rating: 2, comment: 'Mejanya goyang banget, takut tak tumpah kopi. Harusnya diganti meja yang lebih stabil. Safety first!', timestamp: new Date('2025-10-02T16:45:00Z'), source: 'Pindai QR', tags: ['Fasilitas'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Fasilitas'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 33, rating: 5, comment: 'Staff-nya tau nama regular customer! Personal service banget, jadi makin betah. Recommended!', timestamp: new Date('2025-10-03T09:30:00Z'), source: 'Pindai QR', tags: ['Pelayanan', 'Staff'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Pelayanan'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 34, rating: 3, comment: 'Menu-nya sih bagus tapi jarang ada varian baru. Bosan juga kalau makanan itu-itu aja. Request: ada seasonal menu setiap 3 bulan.', timestamp: new Date('2025-10-04T12:15:00Z'), source: 'Google Maps', tags: ['Menu'], status: ReviewStatus.Resolved, sentiment: Sentiment.Neutral, topics: ['Kualitas Produk'], questionnaireId: 3, questionnaireName: 'Survei Minuman Favorit' },
    { id: 35, rating: 4, comment: 'Cold brew-nya mantap! Tidak asam, pahitnya pas. Perfect buat afternoon coffee. Request: jual cold brew bottle juga.', timestamp: new Date('2025-10-05T15:30:00Z'), source: 'Pindai QR', tags: ['Kopi'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kualitas Produk'], questionnaireId: 3, questionnaireName: 'Survei Minuman Favorit' },
    { id: 36, rating: 2, comment: 'Lantainya licin banget pas hujan, hampir jatuh. Harusnya ada karpet anti-slip atau penanda basah.', timestamp: new Date('2025-10-06T10:45:00Z'), source: 'Pindai QR', tags: ['Fasilitas', 'Kebersihan'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Kebersihan'], questionnaireId: 2, questionnaireName: 'Kuesioner Kebersihan Outlet' },
    { id: 37, rating: 5, comment: 'Banana bread-nya moist dan lembut! Tidak kering, topping-nya juga pas. Best seller! Request: ada combo coffee + pastry.', timestamp: new Date('2025-10-07T08:00:00Z'), source: 'Pindai QR', tags: ['Makanan'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kualitas Produk'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 38, rating: 3, comment: 'Pajaknya 11% tapi tidak ada struk pajaknya. Harusnya diperjelas biar customer tau. Request: sediakan e-receipt.', timestamp: new Date('2025-10-08T14:20:00Z'), source: 'Pindai QR', tags: ['Harga'], status: ReviewStatus.InProgress, sentiment: Sentiment.Neutral, topics: ['Harga'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 39, rating: 4, comment: 'Spanish latte-nya unik! Ada sentuhan cinnamon yang bikin wangi. Saran: tambah kopi dari berbagai negara.', timestamp: new Date('2025-10-09T11:10:00Z'), source: 'Pindai QR', tags: ['Kopi'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kualitas Produk'], questionnaireId: 3, questionnaireName: 'Survei Minuman Favorit' },
    { id: 40, rating: 2, comment: 'Waitress-nya kurang perhatian, harus panggil-panggil baru datang. Harusnya lebih sigap lihat meja customer.', timestamp: new Date('2025-10-10T18:30:00Z'), source: 'Pindai QR', tags: ['Pelayanan'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Pelayanan'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 41, rating: 5, comment: 'Mocha-nya balance antara kopi dan coklat! Tidak terlalu manis, tidak terlalu pahit. Perfect!', timestamp: new Date('2025-10-11T16:15:00Z'), source: 'Pindai QR', tags: ['Kopi'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kualitas Produk'], questionnaireId: 3, questionnaireName: 'Survei Minuman Favorit' },
    { id: 42, rating: 3, comment: 'Tempatnya sih cozy tapi kadang suka bau rokok dari luar. Harusnya ada exhaust fan yang lebih baik.', timestamp: new Date('2025-10-12T13:45:00Z'), source: 'Google Maps', tags: ['Suasana'], status: ReviewStatus.Resolved, sentiment: Sentiment.Neutral, topics: ['Suasana'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 43, rating: 4, comment: 'Iced caramel macchiato-nya photogenic banget! Layer-nya bagus, rasanya juga enak. Instagrammable!', timestamp: new Date('2025-10-13T15:25:00Z'), source: 'Pindai QR', tags: ['Kopi'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kualitas Produk'], questionnaireId: 3, questionnaireName: 'Survei Minuman Favorit' },
    { id: 44, rating: 2, comment: 'Gelasnya terlalu panas, susah pegang. Harusnya ada sleeve atau gelas yang lebih tebal. Safety untuk customer.', timestamp: new Date('2025-10-14T09:50:00Z'), source: 'Pindai QR', tags: ['Fasilitas'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Fasilitas'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 45, rating: 5, comment: 'Avocado coffee-nya sehat dan enak! Porsi-nya pas, topping-nya melimpah. Perfect buat breakfast!', timestamp: new Date('2025-10-15T08:20:00Z'), source: 'Pindai QR', tags: ['Makanan'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kualitas Produk'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 46, rating: 3, comment: 'Musiknya kadang terlalu keras pas pagi, jadi ganggu konsentrasi kerja. Request: atur volume berdasarkan waktu.', timestamp: new Date('2025-10-16T10:30:00Z'), source: 'Pindai QR', tags: ['Suasana'], status: ReviewStatus.New, sentiment: Sentiment.Neutral, topics: ['Suasana'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 47, rating: 4, comment: 'Flat white-nya mantap! Creamy tapi tidak terlalu thick. Barista-nya konsisten bikinnya.', timestamp: new Date('2025-10-17T14:40:00Z'), source: 'Pindai QR', tags: ['Kopi'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kualitas Produk'], questionnaireId: 3, questionnaireName: 'Survei Minuman Favorit' },
    { id: 48, rating: 2, comment: 'Salad-nya sayurannya tidak fresh, ada yang layu. Harusnya quality check bahan setiap hari. Request: ganti supplier sayur.', timestamp: new Date('2025-10-18T12:25:00Z'), source: 'Pindai QR', tags: ['Makanan'], status: ReviewStatus.New, sentiment: Sentiment.Negative, topics: ['Kualitas Produk'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
    { id: 49, rating: 5, comment: 'Taro latte-nya unik! Warna-nya cantik, rasanya tidak aneh-aneh. Instagrammable banget!', timestamp: new Date('2025-10-19T16:50:00Z'), source: 'Pindai QR', tags: ['Kopi'], status: ReviewStatus.Resolved, sentiment: Sentiment.Positive, topics: ['Kualitas Produk'], questionnaireId: 3, questionnaireName: 'Survei Minuman Favorit' },
    { id: 50, rating: 3, comment: 'Reservasi online-nya kadang error, harus konfirmasi ulang. Harusnya sistemnya diupgrade. Request: ada konfirmasi otomatis via WA.', timestamp: new Date('2025-10-20T11:15:00Z'), source: 'Pindai QR', tags: ['Pelayanan'], status: ReviewStatus.InProgress, sentiment: Sentiment.Neutral, topics: ['Pelayanan'], questionnaireId: 1, questionnaireName: 'Umpan Balik Umum Pelanggan' },
];


const allQuestionnaires: Questionnaire[] = [
    { id: 1, name: 'Umpan Balik Umum Pelanggan', description: 'Kuesioner untuk mengumpulkan umpan balik umum setelah kunjungan.', questions: [{id: 'q1', text:'Seberapa puas Anda dengan pelayanan kami?', type: 'rating_5'}, {id:'q2', text:'Apa yang bisa kami tingkatkan?', type: 'long_text'}], responseCount: 342, lastModified: new Date('2023-10-20') },
    { id: 2, name: 'Kuesioner Kebersihan Outlet', description: 'Umpan balik khusus mengenai kebersihan di lokasi kami.', questions: [{id: 'q3', text:'Bagaimana penilaian Anda tentang kebersihan area makan?', type: 'rating_5'}, {id: 'q4', text: 'Apakah toilet bersih dan terawat?', type: 'yes_no'}], responseCount: 157, lastModified: new Date('2023-09-15') },
    { 
        id: 3, 
        name: 'Survei Minuman Favorit', 
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
    { id: 1, name: 'QR Meja - Umum', linkedForm: 'Umpan Balik Umum Pelanggan', questionnaireId: 1, scans: 120, color: '#007A7A' },
    { id: 2, name: 'QR Pintu Keluar', linkedForm: 'Umpan Balik Umum Pelanggan', questionnaireId: 1, scans: 250, color: '#4A4A4A' },
    { id: 3, name: 'QR Toilet', linkedForm: 'Kuesioner Kebersihan Outlet', questionnaireId: 2, scans: 95, color: '#FFC107' },
    { id: 4, name: 'QR Promo Minuman', linkedForm: 'Survei Minuman Favorit', questionnaireId: 3, scans: 55, color: '#D32F2F', logoUrl: 'https://cdn.iconscout.com/icon/free/png-256/free-coffee-bean-1544323-1308892.png' },
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
        { date: 'Oct 25', 'Average Rating': 4.2 },
        { date: 'Oct 26', 'Average Rating': 4.4 },
        { date: 'Oct 27', 'Average Rating': 4.3 },
        { date: 'Oct 28', 'Average Rating': 4.6 },
        { date: 'Oct 29', 'Average Rating': 4.5 },
        { date: 'Oct 30', 'Average Rating': 4.7 },
        { date: 'Oct 31', 'Average Rating': 4.8 },
    ];
    
    // Demo plan logic - limit data based on plan
    let reviewsToUse = allReviews;
    if (demoPlan === 'gratis') {
        // Free plan gets limited data
        reviewsToUse = allReviews.slice(0, 15);
    } else if (demoPlan === 'starter') {
        // Starter plan gets moderate data
        reviewsToUse = allReviews.slice(0, 30);
    }
    // 'bisnis' plan gets all data
    
    return {
        initialKpi: kpiData,
        initialTrend: trendData,
        initialReviews: reviewsToUse,
        initialQuestionnaires: allQuestionnaires,
        initialQrCodes: allQrCodes
    };
};


const mockComments: { rating: number, comment: string, topics: string[] }[] = [
    { rating: 5, comment: "Mantap betul! Kopi susu gula arennya juara, tempatnya cozy, pelayanannya ramah-ramah. Saran: tambah menu kopi kekinian ya.", topics: ["Pelayanan", "Kebersihan", "Kualitas Produk"] },
    { rating: 4, comment: "Enak sih, cuma wifi-nya kadang lemot pas weekend rame. Harusnya ada booster wifi di area ramai.", topics: ["Fasilitas"] },
    { rating: 3, comment: "Ya gitu deh, rasanya standar. Harganya lumayan mahal buat kualitas segini. Mungkin ada promo membership?", topics: ["Harga", "Kualitas Produk"] },
    { rating: 2, comment: "Toilet-nya kurang terawat, sabun habis dan tissue ga ada. Harusnya cek toilet setiap 2 jam sekali.", topics: ["Kebersihan"] },
    { rating: 1, comment: "Kecewa berat! Pesanan salah total, nunggu 45 menit, yang datang malah menu orang lain. Sistem order perlu direview.", topics: ["Pelayanan"] },
    { rating: 5, comment: "Barista-nya helpful banget, dikasih rekomendasi kopi sesuai selera. Menu-nya juga banyak pilihan. Request: ada kelas latte art buat customer!", topics: ["Pelayanan", "Kualitas Produk"] },
    { rating: 4, comment: "Tempatnya nyaman buat kerja, cuma lagu-nya agak terlalu kencang jadi susah fokus. Mungkin ada playlist yang lebih tenang?", topics: ["Suasana"] },
    { rating: 2, comment: "Parkir di basement penuh terus, muter-muter 15 menit ga dapet spot. Harusnya ada valet service atau reservasi parkir.", topics: ["Fasilitas"] },
    { rating: 5, comment: "Vietnam drip-nya autentik! Pahitnya pas sama susu kental manis, recommended banget. Request: jual biji kopi retail juga!", topics: ["Kualitas Produk"] },
    { rating: 3, comment: "AC-nya terlalu dingin, bawa jaket terus tiap kesini. Mungkin bisa diatur suhu berbeda tiap zona?", topics: ["Fasilitas"] },
    { rating: 4, comment: "Packaging-nya bagus dan eco-friendly. Paper bag-nya tebal, ga mudah sobek. Request: tambah opsi packaging premium buat gift.", topics: ["Fasilitas"] },
    { rating: 2, comment: "Delivery-nya lama banget, 1.5 jam baru nyampe. Kopinya udah dingin. Harusnya ada estimasi waktu yang akurat di aplikasi.", topics: ["Pelayanan"] },
    { rating: 5, comment: "Spanish latte-nya unik! Ada sentuhan cinnamon yang bikin wangi. Saran: tambah kopi dari berbagai negara dengan cerita origins.", topics: ["Kualitas Produk"] },
    { rating: 3, comment: "Pajaknya 11% tapi tidak ada struk pajaknya. Harusnya diperjelas biar customer tau. Request: sediakan e-receipt.", topics: ["Harga"] },
    { rating: 4, comment: "Iced caramel macchiato-nya photogenic banget! Layer-nya bagus. Request: ada menu of the month setiap periode.", topics: ["Kualitas Produk"] },
    { rating: 2, comment: "Waitress-nya kurang perhatian, harus panggil-panggil baru datang. Staff perlu training tentang table awareness.", topics: ["Pelayanan"] },
    { rating: 5, comment: "Mocha-nya balance antara kopi dan coklat! Tidak terlalu manis. Perfect! Request: ada combo coffee + pastry.", topics: ["Kualitas Produk"] },
    { rating: 3, comment: "Tempatnya cozy tapi kadang suka bau rokok. Harusnya ada exhaust fan yang lebih baik atau area smoking terpisah.", topics: ["Suasana"] },
    { rating: 4, comment: "Flat white-nya mantap! Creamy tapi tidak terlalu thick. Barista-nya konsisten. Request: ada coffee tasting session.", topics: ["Kualitas Produk"] },
    { rating: 2, comment: "Salad-nya sayurannya tidak fresh, ada yang layu. Harusnya quality check bahan setiap hari. Request: ganti supplier sayur.", topics: ["Kualitas Produk"] },
    { rating: 5, comment: "Taro latte-nya unik! Warna-nya cantik, rasanya tidak aneh. Instagrammable! Request: tambah topping boba atau pearl.", topics: ["Kualitas Produk"] },
    { rating: 3, comment: "Reservasi online-nya kadang error. Harusnya sistemnya diupgrade. Request: ada konfirmasi otomatis via WA.", topics: ["Pelayanan"] },
    { rating: 4, comment: "Cold brew-nya mantap! Tidak asam, pahitnya pas. Request: jual cold brew bottle untuk dibawa pulang.", topics: ["Kualitas Produk"] },
    { rating: 2, comment: "Lantainya licin banget pas hujan. Harusnya ada karpet anti-slip atau penanda basah. Safety untuk customer.", topics: ["Kebersihan"] },
    { rating: 5, comment: "Banana bread-nya moist dan lembut! Tidak kering. Request: ada dessert of the month setiap bulan.", topics: ["Kualitas Produk"] },
    { rating: 3, comment: "Menu-nya bagus tapi jarang ada varian baru. Request: ada seasonal menu setiap 3 bulan biar ga bosan.", topics: ["Kualitas Produk"] },
    { rating: 4, comment: "Matcha latte-nya seger! Rasa matcha-nya tidak pahit. Request: ada area non-smoking yang lebih luas.", topics: ["Kualitas Produk", "Suasana"] },
    { rating: 2, comment: "Gelasnya terlalu panas, susah pegang. Harusnya ada sleeve atau gelas yang lebih tebal. Safety first!", topics: ["Fasilitas"] },
    { rating: 5, comment: "Staff-nya tau nama regular customer! Personal service banget. Request: ada loyalty program dengan poin reward.", topics: ["Pelayanan", "Staff"] },
    { rating: 3, comment: "Musiknya terlalu keras pas pagi. Request: atur volume berdasarkan waktu atau ada headphone zone.", topics: ["Suasana"] },
    { rating: 4, comment: "Avocado coffee-nya sehat dan enak! Porsi-nya pas. Request: ada menu healthy lainnya untuk breakfast.", topics: ["Kualitas Produk"] },
    { rating: 2, comment: "Antriannya panjang, kasirnya cuma satu. Request: ada sistem antrian digital atau tambah kasir di jam sibuk.", topics: ["Pelayanan"] },
    { rating: 5, comment: "Tempatnya instagrammable! Lighting-nya bagus. Request: tambah spot foto dengan props tematik.", topics: ["Suasana", "Fasilitas"] },
    { rating: 3, comment: "Socket di dekat jendela rusak. Request: ada maintenance rutin fasilitas atau tambah power bank rental.", topics: ["Fasilitas"] },
    { rating: 4, comment: "Service-nya proaktif, tau apa yang pelanggan butuhin. Request: ada training program buat staff baru.", topics: ["Pelayanan", "Staff"] },
    { rating: 2, comment: "Mejanya goyang banget. Request: diganti meja yang lebih stabil. Safety first!", topics: ["Fasilitas"] },
    { rating: 5, comment: "Promo buy 1 get 1 mantul! Jadi lebih hemat. Request: ada flash sale di hari-hari tertentu.", topics: ["Harga"] },
    { rating: 3, comment: "Tempat duduk outdoor kurang banyak. Request: expand area outdoor atau buka rooftop cafe.", topics: ["Fasilitas"] },
    { rating: 4, comment: "Toilet-nya bersih dan wangi. Request: tambah air freshener otomatis dan cek setiap 2 jam.", topics: ["Kebersihan"] },
    { rating: 2, comment: "Garpu masih ada sisa makanan. Request: quality control perlu diperketat, staff cleaning perlu ditambah.", topics: ["Kebersihan"] },
];

export const generateMockReview = (): Review => {
    const randomData = mockComments[Math.floor(Math.random() * mockComments.length)];
    const rating = randomData.rating;
    const sentiment = rating >= 4 ? Sentiment.Positive : rating === 3 ? Sentiment.Neutral : Sentiment.Negative;
    const source = ['Pindai QR', 'Google Maps', 'Gojek'][Math.floor(Math.random() * 3)];
    
    // Generate random date within October 2025 (LOCKED to October 2025)
    const startOfMonth = new Date('2025-10-01T00:00:00Z');
    const endOfMonth = new Date('2025-10-31T23:59:59Z');
    const randomTime = startOfMonth.getTime() + Math.random() * (endOfMonth.getTime() - startOfMonth.getTime());
    const randomDate = new Date(randomTime);
    
    // Generate random time during business hours (8 AM - 9 PM)
    const hours = Math.floor(Math.random() * 13) + 8; // 8-20
    const minutes = Math.floor(Math.random() * 60);
    randomDate.setHours(hours, minutes, Math.floor(Math.random() * 60));
    
    let questionnaireData: { id?: number, name?: string } = {};
    if (source === 'Pindai QR') {
        const randomQuestionnaire = allQuestionnaires[Math.floor(Math.random() * allQuestionnaires.length)];
        questionnaireData = { id: randomQuestionnaire.id, name: randomQuestionnaire.name };
    }

    return {
        id: Date.now() + Math.random(),
        rating: rating,
        comment: randomData.comment,
        timestamp: randomDate,
        source: source,
        tags: [randomData.topics[0]],
        status: ReviewStatus.New,
        sentiment: sentiment,
        topics: randomData.topics,
        questionnaireId: questionnaireData.id,
        questionnaireName: questionnaireData.name,
    };
};