import React, { useState } from 'react';
import type { Theme } from '../types';
import { MailIcon, LockIcon, HomeIcon } from './common/Icons';

interface LoginPageProps {
    onLoginSuccess: () => void;
    onSwitchToRegister: () => void;
    onGoHome: () => void;
    onEnterDemo: () => void;
    theme: Theme;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onSwitchToRegister, onGoHome, onEnterDemo, theme }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Here you would typically handle form validation and API calls
        console.log('Logging in with:', { email, password });
        onLoginSuccess();
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center p-4 transition-colors duration-300">
            <div className="absolute top-4 left-4">
                <button onClick={onGoHome} className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-accent transition-colors">
                    <HomeIcon className="w-5 h-5 mr-2"/>
                    Kembali ke Beranda
                </button>
            </div>
            <div className="w-full max-w-md">
                <div className="flex justify-center items-center mb-6">
                    <div className="bg-brand-primary p-2 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h1 className="text-3xl font-bold ml-3 tracking-tight text-slate-900 dark:text-white">ULASIS</h1>
                </div>

                <div className="bg-white dark:bg-slate-800 shadow-2xl rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100 mb-2">Selamat Datang Kembali</h2>
                    <p className="text-center text-slate-600 dark:text-slate-400 mb-8">Masuk untuk melanjutkan ke dashboard Anda.</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <MailIcon className="h-5 w-5 text-slate-400" />
                            </span>
                            <input
                                type="email"
                                placeholder="Alamat Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                required
                            />
                        </div>
                        <div className="relative">
                             <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <LockIcon className="h-5 w-5 text-slate-400" />
                            </span>
                            <input
                                type="password"
                                placeholder="Kata Sandi"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                required
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                             <button
                                type="submit"
                                className="w-full bg-brand-primary text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-brand-secondary transform hover:-translate-y-0.5 transition-all duration-300"
                            >
                                Masuk
                            </button>
                            <button
                                type="button"
                                onClick={onEnterDemo}
                                className="w-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-8 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-all duration-300"
                            >
                                Coba Demo
                            </button>
                        </div>
                    </form>
                    
                    <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-8">
                        Belum punya akun?{' '}
                        <button onClick={onSwitchToRegister} className="font-semibold text-brand-primary hover:underline">
                            Daftar di sini
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;