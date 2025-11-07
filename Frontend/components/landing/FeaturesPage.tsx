import React from 'react';
// FIX: Import the missing `DashboardIcon` component.
import { RealTimeIcon, ReportsIcon, OperationalControlIcon, QRIcon, CheckIcon, SmartphoneIcon, BrainCircuitIcon, StarIcon, InboxIcon, UserIcon, DashboardIcon } from '../common/Icons';

// --- Visual Components for Features ---

const RealTimeFeedbackVisual = () => (
    <div className="w-full h-full flex items-center justify-center p-4 relative overflow-hidden">
        <QRIcon className="w-16 h-16 text-slate-700 dark:text-slate-300 opacity-0 animate-fade-in" />
        <SmartphoneIcon className="absolute w-28 h-28 text-slate-800 dark:text-white opacity-0 animate-fade-in-up-delay-1" style={{ top: '50%', left: '50%', transform: 'translate(-110%, -50%)' }} />
        
        <div className="absolute top-1/2 left-1/2 w-48 h-1 bg-slate-300 dark:bg-slate-600" style={{ transform: 'translate(-50%, -50%) rotate(-15deg)' }}>
            <div className="w-full h-full bg-brand-primary origin-left animate-scale-x" style={{ animationDelay: '0.5s', transformOrigin: 'left center' }}></div>
        </div>

        <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(40%, -120%)' }}>
            <div className="flex items-center space-x-1 bg-white dark:bg-slate-700 p-2 rounded-lg shadow-lg opacity-0 animate-fade-in-up" style={{ animationDelay: '1s' }}>
                <StarIcon filled={true} className="w-4 h-4 text-yellow-400" />
                <StarIcon filled={true} className="w-4 h-4 text-yellow-400" />
                <StarIcon filled={true} className="w-4 h-4 text-yellow-400" />
                <StarIcon filled={true} className="w-4 h-4 text-yellow-400" />
                <StarIcon filled={false} className="w-4 h-4 text-slate-300" />
            </div>
        </div>
         <div className="absolute bg-white dark:bg-slate-700 p-2 rounded-lg shadow-lg opacity-0 animate-fade-in-up" style={{ top: '50%', left: '50%', transform: 'translate(60%, 20%)', animationDelay: '1.2s' }}>
            <p className="text-xs text-slate-700 dark:text-slate-200">"Kopinya enak!"</p>
        </div>
        <style>{`
            @keyframes scale-x {
                0% { transform: scaleX(0); }
                100% { transform: scaleX(1); }
            }
            .animate-scale-x { animation: scale-x 0.5s ease-out forwards; }
        `}</style>
    </div>
);

const SentimentAnalysisVisual = () => (
    <div className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-4 text-center">
        <div className="bg-white dark:bg-slate-700 p-3 rounded-lg shadow-lg opacity-0 animate-fade-in-up">
            <p className="text-sm text-slate-700 dark:text-slate-200">"Pelayanan cepat tapi kopi dingin."</p>
        </div>
        
        <div className="text-slate-400 dark:text-slate-500 animate-fade-in" style={{ animationDelay: '0.4s' }}>
             <svg className="w-8 h-8 hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
             <svg className="w-8 h-8 md:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 17l-4 4m0 0l-4-4m4 4V3" /></svg>
        </div>

        <div className="flex items-center justify-center w-16 h-16 bg-brand-primary/10 dark:bg-brand-primary/20 rounded-full animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <BrainCircuitIcon className="w-8 h-8 text-brand-primary" />
        </div>

        <div className="text-slate-400 dark:text-slate-500 animate-fade-in" style={{ animationDelay: '0.8s' }}>
            <svg className="w-8 h-8 hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            <svg className="w-8 h-8 md:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 17l-4 4m0 0l-4-4m4 4V3" /></svg>
        </div>

        <div className="space-y-2">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-bold px-2 py-1 rounded-full inline-block opacity-0 animate-fade-in-up" style={{ animationDelay: '1s' }}>
                SENTIMEN: NETRAL
            </div>
             <div className="flex gap-2">
                <div className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-2 py-1 rounded-full inline-block opacity-0 animate-fade-in-up" style={{ animationDelay: '1.2s' }}>
                    Topik: Pelayanan
                </div>
                 <div className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-2 py-1 rounded-full inline-block opacity-0 animate-fade-in-up" style={{ animationDelay: '1.4s' }}>
                    Topik: Produk
                </div>
            </div>
        </div>
    </div>
);

const TaskManagementVisual = () => (
    <div className="w-full h-full flex flex-col items-center justify-around p-4">
        <div className="flex items-center bg-red-100 dark:bg-red-900/30 p-2 rounded-lg shadow-md opacity-0 animate-fade-in-up">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <p className="text-xs font-semibold text-red-800 dark:text-red-300">Ulasan: "AC kurang dingin"</p>
        </div>

        <div className="h-6 w-0.5 bg-slate-300 dark:bg-slate-600 opacity-0 animate-fade-in" style={{ animationDelay: '0.4s' }}></div>

        <div className="bg-white dark:bg-slate-700 p-2 rounded-lg shadow-lg flex items-center opacity-0 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <InboxIcon className="w-4 h-4 text-brand-primary mr-2" />
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Tugas: Perbaiki AC</p>
            <div className="mx-2 h-4 w-px bg-slate-200 dark:bg-slate-600"></div>
            <UserIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 mr-1" />
            <p className="text-xs text-slate-600 dark:text-slate-400">Tim Teknisi</p>
        </div>

        <div className="h-6 w-0.5 bg-slate-300 dark:bg-slate-600 opacity-0 animate-fade-in" style={{ animationDelay: '1s' }}></div>

        <div className="flex items-center bg-green-100 dark:bg-green-900/30 p-2 rounded-lg shadow-md opacity-0 animate-fade-in-up" style={{ animationDelay: '1.2s' }}>
            <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" />
            <p className="text-xs font-semibold text-green-800 dark:text-green-300">Status: Selesai</p>
        </div>
    </div>
);

const DynamicQRManagementVisual = () => {
    const Bar = ({ height, delay }: { height: string, delay: string }) => (
        <div className="w-2 bg-slate-200 dark:bg-slate-600 rounded-full h-10 flex items-end">
            <div className="w-full bg-brand-primary rounded-full animate-grow" style={{ height: height, animationDelay: delay }}></div>
        </div>
    );
    return (
        <div className="w-full h-full flex items-center justify-center p-4 relative">
            <div className="absolute w-20 h-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-brand-primary/10 dark:bg-brand-primary/20 rounded-full animate-fade-in">
                <DashboardIcon className="w-8 h-8 text-brand-primary" />
            </div>

            {/* Path and item 1 */}
            <div className="absolute top-1/2 left-1/2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                 <div className="absolute flex flex-col items-center gap-1" style={{ transform: 'translate(-120px, -80px) rotate(-45deg)' }}>
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-md shadow-md">
                        <QRIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200" style={{ transform: 'rotate(45deg) '}}>Meja 5</p>
                    <div className="flex items-end space-x-0.5 h-10"><Bar height="60%" delay="1s" /><Bar height="80%" delay="1.2s" /></div>
                </div>
            </div>
            
             {/* Path and item 2 */}
             <div className="absolute top-1/2 left-1/2 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                 <div className="absolute flex flex-col items-center gap-1" style={{ transform: 'translate(80px, -50px) rotate(30deg)' }}>
                     <div className="bg-white dark:bg-slate-800 p-2 rounded-md shadow-md">
                        <QRIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200" style={{ transform: 'rotate(-30deg) '}}>Pintu</p>
                    <div className="flex items-end space-x-0.5 h-10"><Bar height="90%" delay="1.4s" /><Bar height="70%" delay="1.6s" /></div>
                </div>
            </div>
            
             {/* Path and item 3 */}
             <div className="absolute top-1/2 left-1/2 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                 <div className="absolute flex flex-col items-center gap-1" style={{ transform: 'translate(-50px, 90px) rotate(120deg)' }}>
                     <div className="bg-white dark:bg-slate-800 p-2 rounded-md shadow-md">
                        <QRIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200" style={{ transform: 'rotate(-120deg) '}}>Kasir</p>
                    <div className="flex items-end space-x-0.5 h-10"><Bar height="50%" delay="1.8s" /><Bar height="65%" delay="2s" /></div>
                </div>
            </div>
            <style>{`
                @keyframes grow {
                    0% { transform: scaleY(0); }
                    100% { transform: scaleY(1); }
                }
                .animate-grow { animation: grow 0.5s ease-out forwards; transform-origin: bottom; }
            `}</style>
        </div>
    );
};


// --- Main Component Structure ---

interface FeatureDetailCardProps {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
    visual: React.ReactNode;
    reverse?: boolean;
}

const FeatureDetailCard: React.FC<FeatureDetailCardProps> = ({ icon, title, children, visual, reverse = false }) => (
    <div className={`grid md:grid-cols-2 gap-8 md:gap-12 items-center ${reverse ? 'md:grid-flow-col-dense' : ''}`}>
        <div className={`text-center md:text-left ${reverse ? 'md:col-start-2' : ''}`}>
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary mb-4">
                {icon}
            </div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{title}</h3>
            <p className="text-slate-700 dark:text-slate-300">{children}</p>
        </div>
        <div className={`bg-slate-100 dark:bg-slate-800/50 rounded-xl h-64 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700/50 ${reverse ? 'md:col-start-1' : ''}`}>
            {visual}
        </div>
    </div>
);


const FeaturesPage: React.FC = () => {
    return (
        <main className="container mx-auto px-4 sm:px-6 lg:p-8 pt-16 pb-20">
            <section className="text-center max-w-3xl mx-auto mb-16">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-4 text-slate-900 dark:text-white">
                    Alat yang Anda Butuhkan untuk Memahami Pelanggan
                </h1>
                <p className="text-lg text-slate-700 dark:text-slate-300">
                    Dari pengumpulan feedback hingga analisis mendalam, ULASIS menyediakan semua yang Anda butuhkan dalam satu platform yang mudah digunakan.
                </p>
            </section>
            
            <section className="space-y-20">
                <FeatureDetailCard icon={<RealTimeIcon className="w-7 h-7" />} title="Pengumpulan Feedback Real-Time" visual={<RealTimeFeedbackVisual />}>
                    Tangkap ulasan di saat yang paling penting—tepat setelah pengalaman pelanggan. Dengan formulir yang dioptimalkan untuk seluler dan dapat diakses melalui QR code, memberikan feedback menjadi sangat mudah bagi pelanggan Anda.
                </FeatureDetailCard>
                
                <FeatureDetailCard icon={<ReportsIcon className="w-7 h-7" />} title="Analisis Sentimen & Topik Otomatis" visual={<SentimentAnalysisVisual />} reverse={true}>
                    Biarkan AI kami yang bekerja. ULASIS secara otomatis menganalisis setiap ulasan untuk menentukan sentimen (positif, negatif, netral) dan mengidentifikasi topik utama seperti 'Pelayanan', 'Makanan', atau 'Kebersihan', sehingga Anda dapat melihat tren dengan cepat.
                </FeatureDetailCard>

                <FeatureDetailCard icon={<OperationalControlIcon className="w-7 h-7" />} title="Manajemen Tugas & Tindak Lanjut" visual={<TaskManagementVisual />}>
                    Ubah insight menjadi aksi. Buat tugas dari ulasan, berikan kepada anggota tim yang relevan, dan lacak penyelesaiannya langsung dari dashboard. Tunjukkan kepada pelanggan bahwa suara mereka benar-benar didengar.
                </FeatureDetailCard>
                
                <FeatureDetailCard icon={<QRIcon className="w-7 h-7" />} title="Manajemen QR Code Dinamis" visual={<DynamicQRManagementVisual />} reverse={true}>
                    Buat dan kelola QR code untuk setiap lokasi, meja, atau titik kontak. Hubungkan QR code ke kuesioner yang berbeda dan lacak kinerjanya secara individual untuk memahami dari mana feedback Anda berasal.
                </FeatureDetailCard>
            </section>

             <section className="my-20 bg-slate-100 dark:bg-slate-800/50 py-16 rounded-2xl">
                <div className="text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">Dan Banyak Lagi...</h2>
                    <div className="grid grid-cols-2 gap-6 text-left">
                        <p className="flex items-center text-slate-700 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-brand-primary mr-2 flex-shrink-0" /> Dashboard Terpusat</p>
                        <p className="flex items-center text-slate-700 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-brand-primary mr-2 flex-shrink-0" /> Laporan Mingguan Otomatis</p>
                        <p className="flex items-center text-slate-700 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-brand-primary mr-2 flex-shrink-0" /> Peran & Izin Pengguna</p>
                        <p className="flex items-center text-slate-700 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-brand-primary mr-2 flex-shrink-0" /> Pembuat Kuesioner</p>
                        <p className="flex items-center text-slate-700 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-brand-primary mr-2 flex-shrink-0" /> Ekspor Data (CSV)</p>
                        <p className="flex items-center text-slate-700 dark:text-slate-300"><CheckIcon className="w-5 h-5 text-brand-primary mr-2 flex-shrink-0" /> Notifikasi Real-time</p>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default FeaturesPage;
