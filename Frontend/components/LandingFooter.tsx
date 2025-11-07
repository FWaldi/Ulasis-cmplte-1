
import React from 'react';
import { FacebookIcon, TwitterIcon, LinkedInIcon } from './common/Icons';

interface LandingFooterProps {
    onNavigate: (page: string) => void;
}

const FooterLink: React.FC<{ page: string; onNavigate: (page: string) => void; children: React.ReactNode; }> = ({ page, onNavigate, children }) => (
    <li>
        <button onClick={() => onNavigate(page)} className="text-slate-600 dark:text-slate-400 hover:text-brand-primary dark:hover:text-brand-accent transition-colors">
            {children}
        </button>
    </li>
);

const LandingFooter: React.FC<LandingFooterProps> = ({ onNavigate }) => {
    return (
        <footer className="bg-slate-100 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                    <div className="col-span-2 lg:col-span-1">
                        <div className="flex items-center">
                            <div className="bg-brand-primary p-2 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h1 className="text-xl font-bold ml-3 tracking-tight text-slate-900 dark:text-white">ULASIS</h1>
                        </div>
                        <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm">Ubah ulasan menjadi pertumbuhan.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Produk</h4>
                        <ul className="space-y-2">
                            <FooterLink page="features" onNavigate={onNavigate}>Fitur</FooterLink>
                            <FooterLink page="pricing" onNavigate={onNavigate}>Harga</FooterLink>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Perusahaan</h4>
                        <ul className="space-y-2">
                            <FooterLink page="about" onNavigate={onNavigate}>Tentang Kami</FooterLink>
                            <FooterLink page="blog" onNavigate={onNavigate}>Blog</FooterLink>
                            <FooterLink page="careers" onNavigate={onNavigate}>Karir</FooterLink>
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Bantuan</h4>
                        <ul className="space-y-2">
                            <FooterLink page="help" onNavigate={onNavigate}>Pusat Bantuan</FooterLink>
                            <FooterLink page="contact" onNavigate={onNavigate}>Kontak</FooterLink>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400">&copy; {new Date().getFullYear()} ULASIS. Semua hak cipta dilindungi.</p>
                    <div className="flex space-x-4 mt-4 sm:mt-0">
                        <a href="#" className="text-slate-500 hover:text-brand-primary"><FacebookIcon className="w-5 h-5"/></a>
                        <a href="#" className="text-slate-500 hover:text-brand-primary"><TwitterIcon className="w-5 h-5"/></a>
                        <a href="#" className="text-slate-500 hover:text-brand-primary"><LinkedInIcon className="w-5 h-5"/></a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default LandingFooter;
