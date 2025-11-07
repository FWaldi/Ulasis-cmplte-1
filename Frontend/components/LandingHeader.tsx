import React, { useState } from 'react';
import type { Theme } from '../types';
import { ThemeToggle } from './common/ThemeToggle';
import { MenuIcon, CloseIcon } from './common/Icons';

interface LandingHeaderProps {
    onGoToLogin: () => void;
    onGoToRegister: () => void;
    onNavigate: (page: string) => void;
    theme: Theme;
    toggleTheme: () => void;
}

const LandingHeader: React.FC<LandingHeaderProps> = ({ onGoToLogin, onGoToRegister, onNavigate, theme, toggleTheme }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleNavClick = (e: React.MouseEvent<HTMLButtonElement>, targetId: string) => {
        e.preventDefault();
        onNavigate(targetId);
        setIsMenuOpen(false);
        // We find the element and scroll to it if it exists.
        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        } else if (targetId === 'landing') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <header className="w-full p-4 sm:px-6 z-20 sticky top-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm transition-colors duration-300 border-b border-slate-200 dark:border-slate-700/50">
            <div className="container mx-auto flex justify-between items-center">
                <button onClick={(e) => handleNavClick(e, 'landing')} className="flex items-center">
                     <div className="bg-brand-primary p-2 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h1 className="text-2xl font-bold ml-3 tracking-tight text-slate-900 dark:text-white">ULASIS</h1>
                </button>
                <div className="flex items-center space-x-2">
                    <nav className="hidden lg:flex items-center space-x-6">
                        <button onClick={(e) => handleNavClick(e, 'features')} className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-accent transition-colors">Fitur</button>
                        <button onClick={(e) => handleNavClick(e, 'pricing')} className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-accent transition-colors">Harga</button>
                        <button onClick={(e) => onNavigate('contact')} className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-accent transition-colors">Kontak</button>
                    </nav>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                    <div className="hidden sm:flex items-center space-x-2">
                      <button onClick={onGoToLogin} className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-accent transition-colors">
                          Masuk
                      </button>
                       <button onClick={onGoToRegister} className="text-sm font-semibold bg-brand-primary text-white py-2 px-4 rounded-lg hover:bg-brand-secondary transition-colors">
                          Daftar Gratis
                      </button>
                    </div>
                    <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700">
                      {isMenuOpen ? <CloseIcon className="w-6 h-6"/> : <MenuIcon className="w-6 h-6"/>}
                    </button>
                </div>
            </div>
            {/* Mobile Menu */}
            {isMenuOpen && (
              <div className="lg:hidden mt-4 animate-fade-in-up">
                <nav className="flex flex-col space-y-4">
                  <button onClick={(e) => handleNavClick(e, 'features')} className="text-md font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-accent transition-colors text-left">Fitur</button>
                  <button onClick={(e) => handleNavClick(e, 'pricing')} className="text-md font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-accent transition-colors text-left">Harga</button>
                  <button onClick={(e) => {onNavigate('contact'); setIsMenuOpen(false);}} className="text-md font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-accent transition-colors text-left">Kontak</button>
                  <div className="border-t border-slate-200 dark:border-slate-700 my-2"></div>
                  <div className="sm:hidden flex flex-col space-y-3">
                    <button onClick={onGoToLogin} className="w-full text-center text-md font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-accent transition-colors py-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                        Masuk
                    </button>
                     <button onClick={onGoToRegister} className="w-full text-center text-md font-semibold bg-brand-primary text-white py-2 px-4 rounded-lg hover:bg-brand-secondary transition-colors">
                        Daftar Gratis
                    </button>
                  </div>
                </nav>
              </div>
            )}
        </header>
    );
}

export default LandingHeader;