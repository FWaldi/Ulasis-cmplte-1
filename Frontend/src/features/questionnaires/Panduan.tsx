import React from 'react';
import { LightBulbIcon, CheckIcon, ArrowDownIcon } from '../../../components/common/Icons';

// Komponen Pembantu untuk Struktur Halaman
const SectionHeader: React.FC<{ chapter: string; title: string; subtitle: string }> = ({ chapter, title, subtitle }) => (
    <div className="text-center py-12">
        <p className="font-bold text-brand-primary dark:text-brand-accent mb-2">{chapter}</p>
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-slate-100">{title}</h2>
        <p className="mt-4 max-w-2xl mx-auto text-slate-600 dark:text-slate-400">{subtitle}</p>
    </div>
);

const StepCard: React.FC<{ step: string; title: string; children: React.ReactNode; }> = ({ step, title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
        <p className="font-bold text-sm text-brand-primary dark:text-brand-accent mb-1">{step}</p>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">{title}</h3>
        <div className="text-slate-700 dark:text-slate-300 space-y-2">{children}</div>
    </div>
);

// --- Komponen Visualisasi Data (Simulasi) ---

const BarChartVisual: React.FC<{ data: { name: string; value: number }[] }> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.value));
    return (
        <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            {data.map(item => (
                <div key={item.name} className="flex items-center">
                    <span className="w-12 text-xs font-semibold text-slate-600 dark:text-slate-400">{item.name}</span>
                    <div className="flex-1 bg-slate-200 dark:bg-slate-600 rounded-full h-6">
                        <div 
                            className="bg-brand-primary h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-bold" 
                            style={{ width: `${(item.value / maxValue) * 100}%` }}>
                            {item.value}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const WordCloudVisual: React.FC<{ words: { text: string; size: number }[] }> = ({ words }) => (
    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {words.map(word => (
            <span 
                key={word.text} 
                className="font-bold text-slate-700 dark:text-slate-200"
                style={{ fontSize: `${word.size}rem`, opacity: word.size > 1.5 ? 1 : 0.7 }}
            >
                {word.text}
            </span>
        ))}
    </div>
);


const Panduan: React.FC = () => {
    
    // Data untuk visualisasi
    const ratingData = [
        { name: '1 ★', value: 8 }, { name: '2 ★', value: 25 }, { name: '3 ★', value: 15 },
        { name: '4 ★', value: 4 }, { name: '5 ★', value: 2 }
    ];
    
    const wordCloudData = [
        { text: 'porsi kecil', size: 2.5 }, { text: 'mahal', size: 1.5 }, { text: 'kurang variasi', size: 2 },
        { text: 'hambar', size: 1.2 }, { text: 'biasa saja', size: 1.7 }, { text: 'tidak kenyang', size: 2.2 }
    ];

    return (
        <div className="space-y-12">
            <header className="text-center">
                 <div className="inline-block bg-brand-primary/10 dark:bg-brand-accent/10 p-4 rounded-full mb-4">
                     <LightBulbIcon className="w-10 h-10 text-brand-primary dark:text-brand-accent"/>
                 </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-100">Studi Kasus: Dari Ulasan Menjadi Aksi</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-400">
                    Ikuti perjalanan "Kopi Senja" dalam menggunakan ULASIS untuk memecahkan masalah bisnis nyata, langkah demi langkah.
                </p>
            </header>

            {/* BABAK 1 */}
            <section>
                <SectionHeader 
                    chapter="BABAK 1" 
                    title="Pondasi: Merancang Kuesioner yang Tepat" 
                    subtitle="Kualitas data Anda ditentukan oleh kualitas pertanyaan Anda. Mari kita rancang kuesioner yang tajam dan fokus."
                />
                <div className="space-y-6 max-w-4xl mx-auto">
                    <StepCard step="LANGKAH 1" title="Menentukan Tujuan yang Jelas">
                        <p>Tim "Kopi Senja" menyadari ada masalah: <b className="text-slate-900 dark:text-white">"Penjualan menu makan siang kami menurun 20% bulan ini."</b></p>
                        <p>Tujuan kuesioner mereka menjadi sangat spesifik:</p>
                        <blockquote className="border-l-4 border-brand-primary pl-4 py-2 bg-slate-50 dark:bg-slate-900/40 italic">
                            "Mencari tahu alasan kepuasan pelanggan yang rendah terhadap menu makan siang baru dan mendapatkan masukan untuk perbaikan."
                        </blockquote>
                    </StepCard>
                    <StepCard step="LANGKAH 2" title="Membuat Pertanyaan Efektif">
                        <p>Mereka menghindari pertanyaan yang ambigu dan fokus pada inti masalah.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                <p className="font-bold text-red-700 dark:text-red-300">Contoh Buruk:</p>
                                <p>"Bagaimana pendapat Anda tentang menu baru kami?" (Terlalu umum)</p>
                            </div>
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <p className="font-bold text-green-700 dark:text-green-300">Contoh Baik:</p>
                                <p>"Seberapa puas Anda dengan menu makan siang baru kami?" (Spesifik & terukur)</p>
                            </div>
                        </div>
                    </StepCard>
                     <StepCard step="HASIL AKHIR" title="Kuesioner Final 'Kopi Senja'">
                        <p>Setelah merancang, inilah 3 pertanyaan final yang mereka gunakan:</p>
                         <ol className="list-decimal list-inside space-y-2 font-semibold bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                            <li>Seberapa puas Anda dengan menu makan siang baru kami? (Rating 1-5)</li>
                            <li>Apa yang menjadi alasan utama penilaian Anda? (Pilihan Ganda: Rasa, Harga, Porsi, Variasi)</li>
                            <li>Saran apa yang Anda miliki untuk kami? (Jawaban Terbuka)</li>
                        </ol>
                    </StepCard>
                </div>
            </section>

            <div className="text-center"><ArrowDownIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto animate-bounce"/></div>

            {/* BABAK 2 */}
            <section>
                 <SectionHeader 
                    chapter="BABAK 2" 
                    title="Transformasi: Dari Data Mentah Menjadi Insight" 
                    subtitle="Setelah kuesioner disebar, data mulai masuk. Di sinilah keajaiban ULASIS dimulai, mengubah angka dan teks menjadi cerita yang bisa dipahami."
                />
                 <div className="space-y-8 max-w-4xl mx-auto">
                    <StepCard step="DATA MENTAH" title="Contoh Ulasan yang Terkumpul">
                        <p>Berikut adalah beberapa contoh data mentah yang diterima "Kopi Senja" melalui ULASIS.</p>
                        <div className="overflow-x-auto text-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-100 dark:bg-slate-700">
                                    <tr>
                                        <th className="p-2 font-semibold text-slate-800 dark:text-slate-200">Rating</th>
                                        <th className="p-2 font-semibold text-slate-800 dark:text-slate-200">Alasan Utama</th>
                                        <th className="p-2 font-semibold text-slate-800 dark:text-slate-200">Saran/Komentar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b dark:border-slate-700">
                                        <td className="p-2 text-slate-700 dark:text-slate-300">2 ★</td>
                                        <td className="p-2 text-slate-700 dark:text-slate-300">Porsi</td>
                                        <td className="p-2 text-slate-700 dark:text-slate-300">"Porsinya kecil banget, tidak kenyang."</td>
                                    </tr>
                                     <tr className="border-b dark:border-slate-700">
                                        <td className="p-2 text-slate-700 dark:text-slate-300">3 ★</td>
                                        <td className="p-2 text-slate-700 dark:text-slate-300">Rasa</td>
                                        <td className="p-2 text-slate-700 dark:text-slate-300">"Rasanya oke, tapi pilihannya kurang variasi."</td>
                                    </tr>
                                     <tr className="border-b dark:border-slate-700">
                                        <td className="p-2 text-slate-700 dark:text-slate-300">2 ★</td>
                                        <td className="p-2 text-slate-700 dark:text-slate-300">Harga</td>
                                        <td className="p-2 text-slate-700 dark:text-slate-300">"Terlalu mahal untuk porsi sekecil itu."</td>
                                    </tr>
                                     <tr>
                                        <td className="p-2 text-slate-700 dark:text-slate-300">1 ★</td>
                                        <td className="p-2 text-slate-700 dark:text-slate-300">Porsi</td>
                                        <td className="p-2 text-slate-700 dark:text-slate-300">"Kecewa, porsinya sedikit."</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </StepCard>
                    <StepCard step="DATA TEROLAH" title="Visualisasi Otomatis oleh ULASIS">
                        <p>ULASIS secara otomatis mengolah data mentah di atas menjadi grafik yang mudah dibaca.</p>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold mb-2">1. Distribusi Rating Kepuasan</h4>
                                <BarChartVisual data={ratingData} />
                                <p className="text-xs italic text-slate-500 mt-1">Insight: Mayoritas pelanggan memberikan rating rendah (1-2 bintang).</p>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">2. Kata Kunci dari Komentar Pelanggan</h4>
                                <WordCloudVisual words={wordCloudData} />
                                 <p className="text-xs italic text-slate-500 mt-1">Insight: Isu yang paling sering disebut adalah "porsi kecil" dan "kurang variasi".</p>
                            </div>
                        </div>
                    </StepCard>
                 </div>
            </section>
            
            <div className="text-center"><ArrowDownIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto animate-bounce"/></div>

            {/* BABAK 3 */}
            <section>
                 <SectionHeader 
                    chapter="BABAK 3" 
                    title="Aksi: Mengubah Insight Menjadi Pertumbuhan" 
                    subtitle="Data tanpa tindakan hanyalah angka. Inilah langkah terakhir dan terpenting: mengubah temuan menjadi rencana aksi yang konkret."
                />
                <div className="space-y-6 max-w-4xl mx-auto">
                     <StepCard step="SINTESIS" title="Menyimpulkan Temuan Utama">
                        <p>Manajer "Kopi Senja" melihat dashboard ULASIS dan menyimpulkan 3 poin utama:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li><b>Masalah Utama:</b> Pelanggan secara konsisten tidak puas dengan menu makan siang baru.</li>
                            <li><b>Akar Masalah:</b> Keluhan paling dominan adalah ukuran porsi yang terlalu kecil untuk harganya.</li>
                            <li><b>Peluang Perbaikan:</b> Ada permintaan untuk lebih banyak variasi menu.</li>
                        </ul>
                    </StepCard>
                     <StepCard step="RENCANA AKSI" title="Membuat Rencana Aksi Nyata">
                        <p>Berdasarkan temuan, mereka membuat rencana aksi yang jelas dan terukur di ULASIS.</p>
                        <div className="overflow-x-auto text-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-100 dark:bg-slate-700">
                                    <tr>
                                        <th className="p-2 font-semibold text-slate-800 dark:text-slate-200">Temuan</th>
                                        <th className="p-2 font-semibold text-slate-800 dark:text-slate-200">Tindakan</th>
                                        <th className="p-2 font-semibold text-slate-800 dark:text-slate-200">PIC</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b dark:border-slate-700">
                                        <td className="p-2 text-slate-700 dark:text-slate-300">Porsi dianggap kecil.</td>
                                        <td className="p-2 text-slate-700 dark:text-slate-300">Review standar porsi, naikkan 20%.</td>
                                        <td className="p-2 text-slate-700 dark:text-slate-300">Chef Dapur</td>
                                    </tr>
                                    <tr className="border-b dark:border-slate-700">
                                        <td className="p-2 text-slate-700 dark:text-slate-300">Kurang variasi.</td>
                                        <td className="p-2 text-slate-700 dark:text-slate-300">Brainstorming 2 menu baru.</td>
                                        <td className="p-2 text-slate-700 dark:text-slate-300">Tim Produk</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 text-slate-700 dark:text-slate-300">Harga tidak sepadan.</td>
                                        <td className="p-2 text-slate-700 dark:text-slate-300">Sesuaikan harga setelah porsi diubah.</td>
                                        <td className="p-2 text-slate-700 dark:text-slate-300">Manajer Outlet</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </StepCard>
                </div>
            </section>
            
            {/* KESIMPULAN */}
            <div className="text-center pt-12">
                 <CheckIcon className="w-12 h-12 text-green-500 mx-auto mb-4"/>
                 <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Lingkaran Sempurna Umpan Balik</h2>
                <p className="mt-4 max-w-2xl mx-auto text-slate-600 dark:text-slate-400">
                    Dengan mengikuti alur ini, "Kopi Senja" berhasil meningkatkan kepuasan pelanggan dan penjualan makan siang mereka sebesar 35% di bulan berikutnya. Ini adalah kekuatan dari mendengarkan dan bertindak.
                </p>
            </div>

        </div>
    );
};

export default Panduan;