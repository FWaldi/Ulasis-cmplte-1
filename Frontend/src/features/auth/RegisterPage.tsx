
import React, { useState } from 'react';
// FIX: Import Theme from the centralized types file.
import type { Theme } from '../../types';
import { UserIcon, MailIcon, LockIcon, HomeIcon } from '../../../components/common/Icons';
import { useAuth } from '../../hooks/auth/useAuth';

interface RegisterPageProps {
    onRegisterSuccess: (email: string) => void;
    onSwitchToLogin: () => void;
    onGoHome: () => void;
    theme: Theme;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisterSuccess, onSwitchToLogin, onGoHome, theme }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [businessName, setBusinessName] = useState('');
    const { register } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await register({
                email,
                password,
                firstName,
                lastName,
                businessName: businessName || undefined,
            });
            onRegisterSuccess(email);
        } catch (error: any) {
            setError(error.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
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
                    <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100 mb-2">Buat Akun Baru</h2>
                    <p className="text-center text-slate-600 dark:text-slate-400 mb-8">Mulai perjalanan Anda bersama ULASIS.</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <UserIcon className="h-5 w-5 text-slate-400" />
                            </span>
                            <input
                                type="text"
                                placeholder="Nama Depan"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                required
                            />
                        </div>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <UserIcon className="h-5 w-5 text-slate-400" />
                            </span>
                            <input
                                type="text"
                                placeholder="Nama Belakang"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                required
                            />
                        </div>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <UserIcon className="h-5 w-5 text-slate-400" />
                            </span>
                            <input
                                type="text"
                                placeholder="Nama Bisnis (Opsional)"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            />
                        </div>
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
                                placeholder="Buat Kata Sandi"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                required
                            />
                        </div>
                        {error && (
                            <div className="text-red-600 dark:text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-brand-primary text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-brand-secondary transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Mendaftar...' : 'Daftar'}
                        </button>
                    </form>
                    
                    <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-8">
                        Sudah punya akun?{' '}
                        <button onClick={onSwitchToLogin} className="font-semibold text-brand-primary hover:underline">
                            Masuk di sini
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;