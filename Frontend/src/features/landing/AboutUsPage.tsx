import React from 'react';
import { UsersIcon } from '../../../components/common/Icons';

const TeamMemberCard: React.FC<{ name: string; role: string; imgSrc: string; }> = ({ name, role, imgSrc }) => (
    <div className="text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
            <img src={imgSrc} alt={name} className="rounded-full w-full h-full object-cover shadow-lg" />
        </div>
        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">{name}</h4>
        <p className="text-sm text-brand-primary dark:text-brand-accent">{role}</p>
    </div>
);


const AboutUsPage: React.FC = () => {
    return (
        <main className="container mx-auto px-4 sm:px-6 lg:p-8 pt-16 pb-20">
            <section className="text-center max-w-3xl mx-auto">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-4 leading-tight text-slate-900 dark:text-white">
                    Misi Kami: Memberi Suara pada Setiap Pelanggan
                </h1>
                <p className="text-lg text-slate-700 dark:text-slate-300">
                    Kami percaya bahwa di balik setiap ulasan, ada kesempatan untuk bertumbuh. ULASIS lahir dari keinginan untuk menjembatani kesenjangan antara bisnis dan pelanggan mereka, mengubah feedback menjadi dialog yang membangun dan insight yang dapat ditindaklanjuti.
                </p>
            </section>

            <section className="my-20">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                    <img src="https://images.unsplash.com/photo-1522071820081-009f0129c7da?q=80&w=2070&auto=format&fit=crop" alt="Team working together" className="w-full h-96 object-cover" />
                    <div className="absolute inset-0 bg-brand-secondary bg-opacity-70"></div>
                </div>
            </section>

            <section className="grid md:grid-cols-2 gap-12 items-center my-20">
                <div>
                    <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">Cerita Kami</h2>
                    <p className="text-slate-700 dark:text-slate-400 mb-4">
                        ULASIS didirikan pada tahun 2023 oleh sekelompok pengusaha F&B dan tech enthusiast yang frustrasi dengan betapa sulitnya mengumpulkan dan memahami feedback pelanggan secara real-time. Ulasan tersebar di berbagai platform, keluhan kritis seringkali terlambat ditangani, dan pujian jarang sampai ke tim yang berhak menerimanya.
                    </p>
                    <p className="text-slate-700 dark:text-slate-400">
                        Kami memutuskan untuk membangun solusi yang kami inginkan: sebuah platform tunggal yang intuitif, dirancang khusus untuk pasar Indonesia, yang memungkinkan bisnis dari semua ukuran untuk "mendengar" lebih baik dan bertindak lebih cepat.
                    </p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800/50 p-8 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">Nilai-Nilai Kami</h3>
                    <ul className="space-y-3">
                        <li className="flex items-start"><b className="text-brand-primary mr-2">✓</b><span className="flex-1 text-slate-700 dark:text-slate-300"><b>Empati:</b> Selalu menempatkan diri pada posisi pelanggan dan klien kami.</span></li>
                        <li className="flex items-start"><b className="text-brand-primary mr-2">✓</b><span className="flex-1 text-slate-700 dark:text-slate-300"><b>Kesederhanaan:</b> Membuat teknologi canggih menjadi mudah digunakan.</span></li>
                        <li className="flex items-start"><b className="text-brand-primary mr-2">✓</b><span className="flex-1 text-slate-700 dark:text-slate-300"><b>Dampak:</b> Fokus pada penyediaan alat yang menciptakan hasil nyata.</span></li>
                    </ul>
                </div>
            </section>

             <section className="my-20 text-center">
                <UsersIcon className="w-12 h-12 mx-auto text-brand-primary mb-4" />
                <h2 className="text-3xl font-bold mb-10 text-slate-900 dark:text-white">Bertemu Tim Kami</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <TeamMemberCard name="Fitri Waldi" role="Founder & CEO" imgSrc="https://i.pravatar.cc/150?u=a042581f4e29026704d" />
                    <TeamMemberCard name="Budi Santoso" role="Chief Technology Officer" imgSrc="https://i.pravatar.cc/150?u=a042581f4e29026705d" />
                    <TeamMemberCard name="Siti Aisyah" role="Head of Product" imgSrc="https://i.pravatar.cc/150?u=a042581f4e29026706d" />
                    <TeamMemberCard name="Rahmat Hidayat" role="Head of Sales" imgSrc="https://i.pravatar.cc/150?u=a042581f4e29026707d" />
                </div>
            </section>
        </main>
    );
};

export default AboutUsPage;