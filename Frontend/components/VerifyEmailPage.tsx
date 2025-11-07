import React from 'react';
import { MailCheckIcon } from './common/Icons';

interface VerifyEmailPageProps {
    userEmail: string;
    onGoToLogin: () => void;
}

const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ userEmail, onGoToLogin }) => {
    
    const handleResend = () => {
        // In a real app, this would trigger an API call
        alert('Email verifikasi baru telah dikirim!');
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center p-4 transition-colors duration-300">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-slate-800 shadow-2xl rounded-2xl p-8 text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
                        <MailCheckIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Verifikasi Email Anda</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Kami telah mengirimkan tautan verifikasi ke alamat email Anda:
                    </p>
                    <p className="font-semibold text-brand-primary dark:text-brand-accent bg-slate-100 dark:bg-slate-700/50 py-2 px-4 rounded-lg mb-6">
                        {userEmail}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 mb-8 text-sm">
                        Silakan klik tautan tersebut untuk mengaktifkan akun Anda. Setelah itu, Anda dapat masuk.
                    </p>
                    
                    <button
                        onClick={onGoToLogin}
                        className="w-full bg-brand-primary text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-brand-secondary transform hover:-translate-y-0.5 transition-all duration-300"
                    >
                        Lanjutkan ke Halaman Login
                    </button>
                    
                    <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-8">
                        Tidak menerima email?{' '}
                        <button onClick={handleResend} className="font-semibold text-brand-primary hover:underline">
                            Kirim ulang
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmailPage;