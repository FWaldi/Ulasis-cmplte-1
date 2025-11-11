import React, { useState, useEffect, useRef } from 'react';
import type { Theme, Page, DemoPlan } from '../types';
import { ThemeToggle } from './common/ThemeToggle';
import { 
    SettingsIcon, LogoutIcon, MenuIcon, CloseIcon,
    DashboardIcon, InboxIcon, QRIcon, ReportsIcon, ClipboardIcon, SignalIcon, LightBulbIcon
} from './common/Icons';
import { useSubscription } from '../contexts/SubscriptionContext';

// --- Mobile Navigation Components ---

const MobileNavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <li>
    <button
      onClick={onClick}
      className={`w-full flex items-center p-3 my-1 rounded-lg text-base font-semibold transition-colors duration-200 ${
        isActive
          ? 'bg-brand-primary text-white shadow-md'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
      }`}
    >
      <div className="w-6 h-6 mr-3">{icon}</div>
      <span>{label}</span>
    </button>
  </li>
);

const DemoPlanSelector: React.FC<{
    demoPlan: DemoPlan;
    onDemoPlanChange: (plan: DemoPlan) => void;
}> = ({ demoPlan, onDemoPlanChange }) => {
    const plans: DemoPlan[] = ['gratis', 'starter', 'bisnis'];
    const planDetails = {
        gratis: { label: 'Gratis' },
        starter: { label: 'Starter' },
        bisnis: { label: 'Business' }
    };

    return (
        <div className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg mt-auto">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-center text-sm mb-2">Pilih Plan Demo</h4>
            <div className="flex space-x-2">
                {plans.map(plan => (
                    <button
                        key={plan}
                        onClick={() => onDemoPlanChange(plan)}
                        className={`w-full p-2 rounded-md text-center transition-all duration-200 border-2 ${
                            demoPlan === plan 
                                ? 'bg-white dark:bg-slate-700 border-brand-primary shadow-lg' 
                                : 'bg-white/50 dark:bg-slate-600/50 border-transparent hover:border-brand-primary/50'
                        }`}
                    >
                        <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{planDetails[plan].label}</h5>
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- Desktop Navigation Component ---

const DesktopNavItem: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`relative px-3 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${
        isActive
          ? 'text-brand-primary dark:text-brand-accent'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
    >
      {label}
      {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-brand-primary dark:bg-brand-accent rounded-full"></span>}
    </button>
);


interface HeaderProps {
  theme: Theme;
  toggleTheme: () => void;
  onLogout: () => void;
  setActivePage: (page: Page) => void;
  activePage: Page;
  isDemoMode: boolean;
  demoPlan: DemoPlan;
  setDemoPlan: (plan: DemoPlan) => void;
  onExitDemo: () => void;
}

const DemoBanner: React.FC<{ onExitDemo: () => void }> = ({ onExitDemo }) => (
    <div className="bg-yellow-400/80 dark:bg-yellow-500/80 text-center py-1.5 px-4 text-sm font-semibold text-yellow-900 dark:text-yellow-900">
        Anda dalam Mode Demo. 
        <button onClick={onExitDemo} className="underline hover:text-black ml-2">
            Keluar dari Demo
        </button>
    </div>
);

const Header: React.FC<HeaderProps> = ({
  theme,
  toggleTheme,
  onLogout,
  setActivePage,
  activePage,
  isDemoMode,
  demoPlan,
  setDemoPlan,
  onExitDemo
}) => {
    const { setDemoMode, setDemoPlan: setContextDemoPlan } = useSubscription();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'inbox', label: 'Inbox', icon: <InboxIcon /> },
    { id: 'active-forms', label: 'Form Aktif', icon: <SignalIcon /> },
    { id: 'qr-codes', label: 'QR Codes', icon: <QRIcon /> },
    { id: 'questionnaires', label: 'Kuesioner', icon: <ClipboardIcon /> },
    { id: 'analytics', label: 'Analytics', icon: <ReportsIcon /> },
    { id: 'reports', label: 'Reports', icon: <ReportsIcon /> },
    { id: 'panduan', label: 'Panduan', icon: <LightBulbIcon /> },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Sync demo mode with subscription context
  useEffect(() => {
    setDemoMode(isDemoMode, demoPlan);
  }, [isDemoMode, demoPlan, setDemoMode]);

  // Handle demo plan changes
  const handleDemoPlanChange = (plan: DemoPlan) => {
    setDemoPlan(plan);
    setContextDemoPlan(plan);
  };

  const handleMobileNavClick = (page: Page) => {
    setActivePage(page);
    setIsMobileNavOpen(false);
  }

  return (
    <header className="bg-white dark:bg-slate-800 sticky top-0 z-40 border-b border-slate-200 dark:border-slate-700">
      {isDemoMode && <DemoBanner onExitDemo={onExitDemo} />}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
             <div className="flex items-center">
                <div className="bg-brand-primary p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h1 className="text-xl font-bold ml-3 tracking-tight text-slate-900 dark:text-white">ULASIS</h1>
              </div>

            <nav className="hidden lg:flex items-center space-x-1">
                {navItems.map((item) => (
                    <DesktopNavItem
                        key={item.id}
                        label={item.label}
                        isActive={activePage === item.id}
                        onClick={() => setActivePage(item.id as Page)}
                    />
                ))}
            </nav>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center space-x-2 cursor-pointer p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                  <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-sm">
                    {isDemoMode ? 'DE' : 'FW'}
                  </div>
                </button>
                {isDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20 animate-fade-in">
                    <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{isDemoMode ? 'Demo User' : 'Fitri Waldi'}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Admin</p>
                    </div>
                    <button
                      onClick={() => {
                        setActivePage('settings');
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <SettingsIcon className="w-4 h-4 mr-2" />
                      Settings
                    </button>
                  </div>
                )}
              </div>
               <button 
                  onClick={isDemoMode ? onExitDemo : onLogout}
                  className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  aria-label={isDemoMode ? 'Exit Demo' : 'Log Out'}
               >
                  <LogoutIcon className="w-5 h-5" />
               </button>
               <button 
                onClick={() => setIsMobileNavOpen(true)}
                className="lg:hidden p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                aria-label="Open navigation"
                >
                    <MenuIcon className="w-6 h-6"/>
                </button>
            </div>
          </div>
      </div>
       {isMobileNavOpen && (
        <>
            <div className="fixed inset-0 bg-black/60 z-40 lg:hidden animate-fade-in" onClick={() => setIsMobileNavOpen(false)}></div>
            <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 z-50 p-4 flex flex-col lg:hidden animate-slide-in-left">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Menu</h1>
                    <button onClick={() => setIsMobileNavOpen(false)} className="p-1 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                <nav className="flex-1">
                    <ul>
                    {navItems.map((item) => (
                        <MobileNavItem
                        key={item.id}
                        label={item.label}
                        icon={item.icon}
                        isActive={activePage === item.id}
                        onClick={() => handleMobileNavClick(item.id as Page)}
                        />
                    ))}
                    </ul>
                </nav>
                {isDemoMode && <DemoPlanSelector demoPlan={demoPlan} onDemoPlanChange={handleDemoPlanChange} />}
            </div>
        </>
      )}
    </header>
  );
};

export default Header;