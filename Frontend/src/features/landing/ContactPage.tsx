import React from 'react';
import { MailIcon } from '../../../components/common/Icons';

const ContactPage: React.FC = () => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert("Pesan Anda telah terkirim! Tim kami akan segera menghubungi Anda.");
    };

    return (
        <main className="container mx-auto px-4 sm:px-6 lg:p-8 pt-16 pb-20">
            <section className="text-center max-w-3xl mx-auto mb-12">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-4 text-slate-900 dark:text-white">
                    Hubungi Kami
                </h1>
                <p className="text-lg text-slate-700 dark:text-slate-300">
                    Punya pertanyaan tentang produk, harga, atau apa pun? Kami siap membantu.
                </p>
            </section>

            <section className="max-w-4xl mx-auto bg-white dark:bg-slate-800/50 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50">
                 <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                            <input type="text" placeholder="Nama Anda" className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Alamat Email</label>
                            <input type="email" placeholder="email@anda.com" className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500" required/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pesan</label>
                        <textarea rows={5} placeholder="Tuliskan pertanyaan atau pesan Anda di sini..." className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500" required></textarea>
                    </div>
                    <button type="submit" className="w-full bg-brand-primary text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-brand-secondary transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center">
                        <MailIcon className="w-5 h-5 mr-2" />
                        Kirim Pesan
                    </button>
                 </form>
            </section>
        </main>
    );
};

export default ContactPage;