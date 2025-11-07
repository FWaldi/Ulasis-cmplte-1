import React from 'react';
import type { DemoPlan, Theme } from '../types';

interface DemoPlanSelectProps {
  onPlanSelect: (plan: DemoPlan) => void;
  theme: Theme;
}

const DemoPlanSelect: React.FC<DemoPlanSelectProps> = ({ onPlanSelect, theme }) => {
  const plans = [
    {
      id: 'free' as DemoPlan,
      name: 'Gratis',
      price: 'Rp 0',
      period: 'selamanya',
      features: [
        '1 Kuesioner aktif',
        '50 respons per bulan',
        'Export CSV',
        'QR Code dasar'
      ],
      color: 'bg-gray-500',
      buttonColor: 'bg-gray-600 hover:bg-gray-700'
    },
    {
      id: 'starter' as DemoPlan,
      name: 'Starter',
      price: 'Rp 99.000',
      period: 'per bulan',
      features: [
        '5 Kuesioner aktif',
        '500 respons per bulan',
        'Export CSV',
        'QR Code dengan logo',
        'Analytics dasar'
      ],
      color: 'bg-blue-500',
      buttonColor: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      id: 'business' as DemoPlan,
      name: 'Business',
      price: 'Rp 299.000',
      period: 'per bulan',
      features: [
        'Kuesioner unlimited',
        'Respons unlimited',
        'Export CSV & Excel',
        'QR Code premium',
        'Analytics lanjutan',
        'Branding custom'
      ],
      color: 'bg-purple-500',
      buttonColor: 'bg-purple-600 hover:bg-purple-700'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            Pilih Paket Demo
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Coba semua fitur ULASIS dengan data demo. Pilih paket yang ingin Anda jelajahi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 border-2 border-transparent hover:border-brand-primary transition-all duration-300"
            >
              <div className={`w-full h-2 ${plan.color} rounded-t-lg mb-4`}></div>

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  {plan.name}
                </h3>
                <div className="text-3xl font-bold text-brand-primary mb-1">
                  {plan.price}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {plan.period}
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => onPlanSelect(plan.id)}
                className={`w-full py-3 px-6 text-white font-semibold rounded-lg transition-all duration-300 ${plan.buttonColor}`}
              >
                Coba {plan.name}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Data demo akan direset setiap kali Anda memilih paket berbeda
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="text-brand-primary hover:text-brand-secondary font-semibold"
          >
            ← Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoPlanSelect;