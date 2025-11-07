import React from 'react';

const JobOpeningCard: React.FC<{ title: string; department: string; location: string; }> = ({ title, department, location }) => (
    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700/50 flex justify-between items-center">
        <div>
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">{department} · {location}</p>
        </div>
        <button className="px-4 py-2 text-sm font-semibold bg-brand-primary hover:bg-brand-secondary text-white rounded-lg shadow-sm transition-all">
            Lamar
        </button>
    </div>
);


const CareersPage: React.FC = () => {
    const openings = [
        { title: 'Senior Frontend Engineer', department: 'Teknik', location: 'Remote (Indonesia)'},
        { title: 'Product Manager', department: 'Produk', location: 'Jakarta'},
        { title: 'Customer Success Manager', department: 'Sales', location: 'Bandung'},
    ];

    return (
        <main className="container mx-auto px-4 sm:px-6 lg:p-8 pt-16 pb-20">
            <section className="text-center max-w-3xl mx-auto mb-12">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-4 text-slate-900 dark:text-white">
                    Bergabung dengan Tim Kami
                </h1>
                <p className="text-lg text-slate-700 dark:text-slate-300">
                    Kami sedang membangun masa depan manajemen pengalaman pelanggan di Indonesia. Jika Anda bersemangat, inovatif, dan ingin membuat dampak, kami ingin mendengar dari Anda.
                </p>
            </section>

            <section className="max-w-3xl mx-auto space-y-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Lowongan Terbuka</h2>
                {openings.map(job => <JobOpeningCard key={job.title} {...job} />)}
            </section>
        </main>
    );
};

export default CareersPage;