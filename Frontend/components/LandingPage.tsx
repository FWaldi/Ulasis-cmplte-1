
import React from 'react';
import { ReportsIcon, OperationalControlIcon, RealTimeIcon, CheckIcon, QuoteIcon } from './common/Icons';

interface LandingPageProps {
    onGoToRegister: () => void;
}

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; className?: string }> = ({ icon, title, children, className }) => (
    <div className={`bg-white/5 dark:bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-slate-300 dark:border-white/10 shadow-lg text-left opacity-0 ${className}`}>
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-brand-primary text-white mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{title}</h3>
        <p className="text-slate-700 dark:text-slate-300">{children}</p>
    </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onGoToRegister }) => {

    return (
        <>
            <div className="relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-primary/10 dark:bg-brand-primary/30 rounded-full blur-3xl opacity-50"></div>
                
                <main className="container mx-auto px-4 sm:px-6 lg:p-8 pt-20 md:pt-24 pb-20 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="text-center lg:text-left">
                            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-4 leading-tight text-slate-900 dark:text-white opacity-0 animate-fade-in-up">
                                Setiap Ulasan Adalah Cerita. <span className="text-brand-primary dark:text-brand-accent">Sudahkah Anda Mendengarkan?</span>
                            </h2>
                            <p className="max-w-2xl text-lg text-slate-700 dark:text-slate-300 mb-8 opacity-0 animate-fade-in-up-delay-1">
                               Di balik setiap rating, ada narasi pelanggan yang menunggu didengar. ULASIS membantu Anda membaca di antara baris dan mengubahnya menjadi babak baru kesuksesan bisnis Anda.
                            </p>
                        </div>
                        <div className="hidden lg:block opacity-0 animate-fade-in-up-delay-3">
                           <div className="relative bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-300 dark:border-white/10 shadow-2xl backdrop-blur-sm">
                                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-t-lg flex items-center px-3 space-x-2">
                                    <div className="w-3.5 h-3.5 rounded-full bg-red-400"></div>
                                    <div className="w-3.5 h-3.5 rounded-full bg-yellow-400"></div>
                                    <div className="w-3.5 h-3.5 rounded-full bg-green-400"></div>
                                </div>
                                <div className="p-4 h-80 bg-slate-100 dark:bg-slate-900/50 rounded-b-lg space-y-4">
                                    <div className="h-10 bg-slate-200 dark:bg-slate-700/80 rounded w-3/4"></div>
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700/80 rounded w-1/2"></div>
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700/80 rounded w-5/6"></div>
                                    <div className="h-10 bg-slate-200 dark:bg-slate-700/80 rounded w-full mt-6"></div>
                                     <div className="h-10 bg-slate-200 dark:bg-slate-700/80 rounded w-full"></div>
                                </div>
                           </div>
                        </div>
                    </div>
                </main>
            </div>

            <section id="story-start" className="py-20 relative z-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                         <div className="opacity-0 animate-fade-in-up-delay-1">
                           <div className="relative bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-300 dark:border-white/10 shadow-2xl backdrop-blur-sm">
                                <div className="p-4 h-80 bg-slate-100 dark:bg-slate-900/50 rounded-lg flex flex-wrap gap-4 items-center justify-center">
                                     <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-lg text-sm text-slate-800 dark:text-slate-200">"Pelayanannya lama sekali..."</div>
                                     <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-lg text-sm text-slate-800 dark:text-slate-200">"Kopinya juara!"</div>
                                     <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-lg text-sm text-slate-800 dark:text-slate-200">"AC panas, tidak nyaman."</div>
                                     <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-lg text-sm text-slate-800 dark:text-slate-200">"Parkirnya susah..."</div>
                                     <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-lg text-sm text-slate-800 dark:text-slate-200">"Pasti kembali lagi!"</div>
                                </div>
                           </div>
                        </div>
                        <div className="opacity-0 animate-fade-in-up">
                            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">Cerita Pelanggan Tercecer di Mana-mana.</h3>
                            <p className="mt-4 text-lg text-slate-700 dark:text-slate-400">Dari media sosial, kasir, hingga ulasan online—feedback datang dari segala arah. Tanpa alat yang tepat, suara mereka menjadi bising tak bermakna. Kesempatan untuk berkembang hilang dalam kekacauan.</p>
                            <ul className="mt-6 space-y-3">
                                <li className="flex items-start text-slate-700 dark:text-slate-200"><span className="text-red-500 font-bold mr-3">✗</span> Keluhan kritis terlewatkan.</li>
                                <li className="flex items-start text-slate-700 dark:text-slate-200"><span className="text-red-500 font-bold mr-3">✗</span> Tren positif tidak termanfaatkan.</li>
                                <li className="flex items-start text-slate-700 dark:text-slate-200"><span className="text-red-500 font-bold mr-3">✗</span> Keputusan bisnis tanpa data solid.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <section id="features" className="py-20 relative z-10 bg-slate-100 dark:bg-slate-800/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                     <div className="text-center mb-12 opacity-0 animate-fade-in-up">
                        <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">ULASIS: Penerjemah Cerita Pelanggan Anda</h3>
                        <p className="mt-4 max-w-2xl mx-auto text-slate-700 dark:text-slate-400">Kami mengubah kebisingan menjadi sinyal yang jelas, memberikan Anda kekuatan untuk mendengar, memahami, dan bertindak.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard icon={<RealTimeIcon className="w-6 h-6" />} title="Mendengar Saat Cerita Terjadi" className="animate-fade-in-up">
                            Tangkap setiap ulasan secara instan melalui QR code dinamis, tepat saat pengalaman pelanggan masih hangat.
                        </FeatureCard>
                        <FeatureCard icon={<ReportsIcon className="w-6 h-6" />} title="Analisis Topik Otomatis" className="animate-fade-in-up-delay-1">
                            Sistem kami menganalisis setiap komentar untuk mengungkap sentimen, topik utama, dan insight tersembunyi secara otomatis.
                        </FeatureCard>
                        <FeatureCard icon={<OperationalControlIcon className="w-6 h-6" />} title="Menulis Babak Berikutnya" className="animate-fade-in-up-delay-2">
                            Ubah insight menjadi aksi. Tugaskan tim, lacak penyelesaian, dan tunjukkan pada pelanggan bahwa suara mereka didengar.
                        </FeatureCard>
                    </div>
                </div>
            </section>

            <section className="py-20 relative z-10 bg-slate-100 dark:bg-slate-800/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12 opacity-0 animate-fade-in-up">
                        <h3 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-slate-100">Dari Kekacauan Menjadi Kejelasan</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
                        <div className="flex flex-col items-center opacity-0 animate-fade-in-up">
                            <div className="flex items-center justify-center w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full text-brand-primary font-bold text-2xl mb-4">1</div>
                            <h4 className="font-bold text-lg mb-2 text-slate-800 dark:text-slate-100">Pindai QR</h4>
                            <p className="text-slate-700 dark:text-slate-400 text-sm">Pelanggan memindai QR code di meja, struk, atau lokasi strategis lainnya.</p>
                        </div>
                        <div className="flex flex-col items-center opacity-0 animate-fade-in-up-delay-1">
                            <div className="flex items-center justify-center w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full text-brand-primary font-bold text-2xl mb-4">2</div>
                            <h4 className="font-bold text-lg mb-2 text-slate-800 dark:text-slate-100">Beri Ulasan</h4>
                            <p className="text-slate-700 dark:text-slate-400 text-sm">Mereka langsung memberikan rating dan komentar melalui form sederhana.</p>
                        </div>
                        <div className="flex flex-col items-center opacity-0 animate-fade-in-up-delay-2">
                            <div className="flex items-center justify-center w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full text-brand-primary font-bold text-2xl mb-4">3</div>
                            <h4 className="font-bold text-lg mb-2 text-slate-800 dark:text-slate-100">Dapatkan Insight</h4>
                            <p className="text-slate-700 dark:text-slate-400 text-sm">Data masuk dianalisis dan disajikan di dashboard Anda secara real-time.</p>
                        </div>
                        <div className="flex flex-col items-center opacity-0 animate-fade-in-up-delay-3">
                            <div className="flex items-center justify-center w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full text-brand-primary font-bold text-2xl mb-4">4</div>
                            <h4 className="font-bold text-lg mb-2 text-slate-800 dark:text-slate-100">Ambil Tindakan</h4>
                            <p className="text-slate-700 dark:text-slate-400 text-sm">Tim Anda menerima notifikasi dan dapat langsung menindaklanjuti ulasan.</p>
                        </div>
                    </div>
                </div>
            </section>
            
            <section className="py-20 relative z-10">
                 <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12 opacity-0 animate-fade-in-up">
                        <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">Kisah Sukses yang Telah Ditulis</h3>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg opacity-0 animate-fade-in-up">
                             <QuoteIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-4" />
                             <p className="text-slate-700 dark:text-slate-300 mb-4">"ULASIS mengubah cara kami menangani keluhan. Sekarang kami bisa menyelesaikan masalah sebelum pelanggan meninggalkan restoran."</p>
                             <p className="font-bold text-slate-800 dark:text-white">Rahmat Hidayat</p>
                             <p className="text-sm text-slate-600 dark:text-slate-400">Manajer, Kopi Kenangan</p>
                         </div>
                         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg opacity-0 animate-fade-in-up-delay-1">
                              <QuoteIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-4" />
                             <p className="text-slate-700 dark:text-slate-300 mb-4">"Melihat tren mingguan dari analisis topik sangat membantu kami dalam menentukan prioritas perbaikan layanan kamar."</p>
                             <p className="font-bold text-slate-800 dark:text-white">Siti Aisyah</p>
                             <p className="text-sm text-slate-600 dark:text-slate-400">GM, Hotel Artotel</p>
                         </div>
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg opacity-0 animate-fade-in-up-delay-2">
                              <QuoteIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-4" />
                             <p className="text-slate-700 dark:text-slate-300 mb-4">"Dengan data per lokasi, kami bisa membandingkan kinerja cabang dan menerapkan praktik terbaik secara merata."</p>
                             <p className="font-bold text-slate-800 dark:text-white">Budi Santoso</p>
                             <p className="text-sm text-slate-600 dark:text-slate-400">Area-Lead, Uniqlo</p>
                         </div>
                     </div>
                 </div>
            </section>

             <section className="py-20 relative z-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-10 md:p-16 text-center shadow-inner-lg border border-slate-200 dark:border-slate-700/50 opacity-0 animate-fade-in-up">
                        <h3 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white">Siap Menulis Cerita Sukses Anda?</h3>
                        <p className="mt-4 max-w-2xl mx-auto text-slate-700 dark:text-slate-400 text-lg">Ubah setiap feedback menjadi kesempatan. Mulai gratis hari ini dan dengarkan apa yang sebenarnya ingin dikatakan oleh pelanggan Anda.</p>
                        <button onClick={onGoToRegister} className="mt-8 bg-brand-primary text-white font-bold py-4 px-10 text-lg rounded-lg shadow-lg hover:bg-brand-secondary transform hover:-translate-y-1 transition-all duration-300">
                            Daftar Gratis & Mulai Sekarang
                        </button>
                    </div>
                </div>
            </section>


             <section id="pricing" className="py-20 relative z-10 bg-slate-100 dark:bg-slate-800/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12 opacity-0 animate-fade-in-up">
                        <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">Harga Fleksibel untuk UKM Indonesia</h3>
                        <p className="mt-4 max-w-2xl mx-auto text-slate-700 dark:text-slate-400">Mulai gratis, lalu pilih paket yang tumbuh bersama bisnis Anda. Tanpa kontrak, tanpa ribet.</p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                        {/* Pricing Card 1 - Free */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-8 h-full flex flex-col opacity-0 animate-fade-in-up">
                             <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">GRATIS</h4>
                             <p className="text-4xl font-extrabold my-4 text-slate-900 dark:text-white">Rp 0</p>
                             <p className="text-slate-600 dark:text-slate-400 h-12">Untuk coba-coba atau bisnis yang baru mulai.</p>
                             <ul className="space-y-3 text-slate-700 dark:text-slate-300 mt-4 flex-1">
                                <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> 1 Kuesioner Aktif</li>
                                <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> 50 Ulasan / bulan</li>
                                <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Dashboard KPI Utama</li>
                                <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Manajemen Ulasan (Inbox)</li>
                                <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> QR Code Standar</li>
                             </ul>
                             <button onClick={onGoToRegister} className="w-full mt-8 py-3 px-6 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Mulai Gratis</button>
                        </div>
                        {/* Pricing Card 2 - Starter (Highlighted) */}
                        <div className="border-2 border-brand-primary rounded-xl p-8 shadow-2xl relative h-full flex flex-col opacity-0 animate-fade-in-up-delay-1">
                            <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-brand-primary text-white text-xs font-bold px-3 py-1 rounded-full">PALING POPULER</div>
                             <h4 className="text-lg font-bold text-brand-primary">STARTER</h4>
                             <p className="text-4xl font-extrabold my-4 text-slate-900 dark:text-white">Rp 49rb<span className="text-base font-medium text-slate-600 dark:text-slate-400">/bln</span></p>
                             <p className="text-slate-600 dark:text-slate-400 h-12">Untuk bisnis yang sedang bertumbuh.</p>
                             <ul className="space-y-3 text-slate-700 dark:text-slate-300 mt-4 flex-1">
                                <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> 5 Kuesioner Aktif</li>
                                <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Ulasan Tak Terbatas</li>
                                <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Kustomisasi Warna QR Code</li>
                                <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Analisis Sentimen & Topik</li>
                                <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Grafik Tren Kinerja</li>
                             </ul>
                             <button onClick={onGoToRegister} className="w-full mt-8 py-3 px-6 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-secondary transition-colors">Pilih Paket</button>
                        </div>
                        {/* Pricing Card 3 - Business */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-8 h-full flex flex-col opacity-0 animate-fade-in-up-delay-2">
                             <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">BUSINESS</h4>
                             <p className="text-4xl font-extrabold my-4 text-slate-900 dark:text-white">Rp 199rb<span className="text-base font-medium text-slate-600 dark:text-slate-400">/bln</span></p>
                             <p className="text-slate-600 dark:text-slate-400 h-12">Untuk bisnis dengan banyak cabang dan kebutuhan analisis mendalam.</p>
                             <ul className="space-y-3 text-slate-700 dark:text-slate-300 mt-4 flex-1">
                                <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Kuesioner Tak Terbatas</li>
                                <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Kustomisasi Logo QR Code</li>
                                <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Unduh Laporan PDF</li>
                                <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Analisis per Sumber Ulasan</li>
                                <li className="flex items-center"><CheckIcon className="w-5 h-5 text-brand-primary mr-2" /> Manajemen Tim & Peran</li>
                             </ul>
                             <button onClick={onGoToRegister} className="w-full mt-8 py-3 px-6 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Pilih Paket</button>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default LandingPage;