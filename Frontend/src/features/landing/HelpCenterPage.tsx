import React from 'react';

const FAQItem: React.FC<{ question: string; children: React.ReactNode }> = ({ question, children }) => (
    <div className="py-5">
        <details className="group">
            <summary className="flex justify-between items-center font-medium cursor-pointer list-none">
                <span className="text-lg text-slate-800 dark:text-slate-100">{question}</span>
                <span className="transition group-open:rotate-180">
                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                </span>
            </summary>
            <div className="text-slate-700 dark:text-slate-400 mt-3 group-open:animate-fadeIn">
                {children}
            </div>
        </details>
    </div>
);


const HelpCenterPage: React.FC = () => {
    return (
        <main className="container mx-auto px-4 sm:px-6 lg:p-8 pt-16 pb-20">
            <section className="text-center max-w-3xl mx-auto mb-12">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-4 text-slate-900 dark:text-white">
                    Pusat Bantuan
                </h1>
                <p className="text-lg text-slate-700 dark:text-slate-300 mb-8">
                    Punya pertanyaan? Kami punya jawabannya. Temukan semua yang perlu Anda ketahui tentang ULASIS di sini.
                </p>
                <div className="relative">
                    <input 
                        type="search" 
                        placeholder="Cari topik, misal 'cara buat qr code'"
                        className="w-full p-4 pl-12 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-sm focus:ring-2 focus:ring-brand-primary focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                     <div className="absolute top-0 left-0 inline-flex items-center justify-center h-full w-12 text-slate-400">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                </div>
            </section>

            <section className="max-w-4xl mx-auto">
                 <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Pertanyaan Umum</h2>
                 <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    <FAQItem question="Bagaimana cara membuat QR Code baru?">
                        Masuk ke dashboard Anda, navigasikan ke halaman 'QR Codes' dari menu sidebar, lalu klik tombol 'Buat QR Code Baru'. Anda akan diminta untuk memberi nama, memilih lokasi, dan menautkannya ke kuesioner yang sudah ada.
                    </FAQItem>
                    <FAQItem question="Apakah saya bisa mengubah kuesioner yang sudah diterbitkan?">
                        Ya, Anda bisa. Pergi ke halaman 'Kuesioner', klik ikon pensil pada kuesioner yang ingin Anda edit. Perlu diingat, perubahan akan langsung berlaku untuk semua QR Code yang terhubung dengan kuesioner tersebut.
                    </FAQItem>
                     <FAQItem question="Apa itu Analisis Sentimen?">
                        Analisis Sentimen adalah fitur yang menggunakan AI untuk secara otomatis mendeteksi apakah sebuah ulasan bernada positif, negatif, atau netral. Ini membantu Anda dengan cepat memahami emosi umum pelanggan tanpa harus membaca setiap ulasan secara manual.
                    </FAQItem>
                     <FAQItem question="Bagaimana cara meng-upgrade paket saya?">
                        Anda dapat meng-upgrade paket Anda kapan saja dari halaman 'Settings' di dalam dashboard Anda. Akan ada bagian manajemen langganan di mana Anda dapat memilih paket yang lebih tinggi.
                    </FAQItem>
                 </div>
            </section>

        </main>
    );
};

export default HelpCenterPage;