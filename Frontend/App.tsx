import React, { useState, useEffect, useMemo } from 'react';
import type { Page, Theme, DemoPlan, Review, Questionnaire, QRCode, TrendData } from './types';
import { Sentiment, ReviewStatus } from './types';
import { getMockData, generateMockReview } from './hooks/useMockData';
import { LocalizationProvider } from './locales';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Inbox from './components/Inbox';
import QRCodes from './components/QRCodes';
// FIX: Renamed imported component from 'Questionnaire' to 'QuestionnairesPage' to avoid name collision with the 'Questionnaire' type.
import QuestionnairesPage from './components/Questionnaire';
import Analytics from './components/Analytics';
import Reports from './components/Reports';
import Settings from './components/Settings';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import VerifyEmailPage from './components/VerifyEmailPage';
import LandingHeader from './components/LandingHeader';
import LandingFooter from './components/LandingFooter';
import AboutUsPage from './components/landing/AboutUsPage';
import BlogPage from './components/landing/BlogPage';
import CareersPage from './components/landing/CareersPage';
import FeaturesPage from './components/landing/FeaturesPage';
import HelpCenterPage from './components/landing/HelpCenterPage';
import PricingPage from './components/landing/PricingPage';
import ContactPage from './components/landing/ContactPage';
import ActiveForms from './components/ActiveForms';
import Panduan from './components/Panduan';
import TestAnalytics from './components/TestAnalytics';
import DebugAnalyticsPage from './DebugAnalyticsPage';
import DirectAnalyticsTest from './DirectAnalyticsTest';
import TestAllAnalytics from './components/TestAllAnalytics';
import './components/QuestionnaireForm'; // Ensure new component is included in dependency graph
import PublicQuestionnaireView from './components/PublicQuestionnaireView';


const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('light');
  const [activePage, setActivePage] = useState<Page>('landing');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoPlan, setDemoPlan] = useState<DemoPlan>('bisnis');
  const [userEmail, setUserEmail] = useState('');

  // Centralized state management for application data
  const [reviews, setReviews] = useState<Review[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [previewQuestionnaire, setPreviewQuestionnaire] = useState<Questionnaire | null>(null);
  
  // Recalculate KPI data whenever reviews change
  const kpiData = useMemo(() => {
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;
    const responseRate = totalReviews > 0 ? 88 : 0; // Static for now, 0 if no reviews
    
    console.log('🔍 App.tsx KPI Calculation:', {
      totalReviews,
      avgRating,
      responseRate,
      reviewsSample: reviews.slice(0, 3)
    });
    
    return {
      avgRating: parseFloat(avgRating.toFixed(1)),
      totalReviews,
      responseRate,
    };
  }, [reviews]);

  // Recalculate Trend data whenever reviews change
  const trendData = useMemo(() => {
    console.log('🔍 App.tsx Trend Data Calculation:', {
      totalReviews: reviews.length,
      sampleReviews: reviews.slice(0, 3)
    });
    
    const today = new Date();
    const trendMap: { [key: string]: { ratings: number[], count: number } } = {};
    const dateLabels: { [key: string]: string } = {};

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
        trendMap[key] = { ratings: [], count: 0 };
        dateLabels[key] = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Populate with review data
    reviews.forEach(review => {
        const key = review.timestamp.toISOString().split('T')[0];
        if (trendMap[key]) {
            trendMap[key].ratings.push(review.rating);
            trendMap[key].count++;
        }
    });

    // Calculate averages
    const trend = Object.entries(trendMap).map(([key, data]) => {
        const avg = data.count > 0 ? data.ratings.reduce((a, b) => a + b, 0) / data.count : 0;
        return {
            date: dateLabels[key],
            'Average Rating': parseFloat(avg.toFixed(2)),
        };
    });
    
    console.log('🔍 App.tsx Trend Data Result:', trend);
    return trend;
  }, [reviews]);
  
  // Handler functions to modify state (simulating backend API calls)
  const handleAddReview = (newReviewData: { rating: number; comment: string; source?: string; questionnaireId?: number, questionnaireName?: string }) => {
    const newReview: Review = {
        id: Date.now() + Math.random(),
        rating: newReviewData.rating,
        comment: newReviewData.comment,
        timestamp: new Date(),
        source: newReviewData.source || 'QR Scan',
        tags: ['New Feedback'],
        status: ReviewStatus.New,
        sentiment: newReviewData.rating >= 4 ? Sentiment.Positive : newReviewData.rating === 3 ? Sentiment.Neutral : Sentiment.Negative,
        topics: ['Umum'], // Simplified topic for new reviews
        questionnaireId: newReviewData.questionnaireId,
        questionnaireName: newReviewData.questionnaireName,
    };
    setReviews(prev => [newReview, ...prev]);

    // Increment questionnaire response count
    if (newReview.questionnaireId) {
        setQuestionnaires(prev => prev.map(q => 
            q.id === newReview.questionnaireId 
                ? { ...q, responseCount: q.responseCount + 1 } 
                : q
        ));
    }

    // Increment QR code scan count if applicable
    if (newReview.source === 'QR Scan' || newReview.source === 'Formulir Aktif' || newReview.source === 'Pratinjau Formulir') {
        setQrCodes(prev => {
            const qrToUpdate = prev.find(qr => qr.questionnaireId === newReview.questionnaireId);
            if (qrToUpdate) {
                return prev.map(qr => qr.id === qrToUpdate.id ? { ...qr, scans: qr.scans + 1 } : qr);
            }
            return prev;
        });
    }
  };

  const handleUpdateReviewStatus = (reviewId: number, status: ReviewStatus) => {
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status } : r));
  };

  const handleDeleteReview = (reviewId: number) => {
    setReviews(prev => prev.filter(r => r.id !== reviewId));
    
    // If in demo mode and all reviews are deleted, refresh with mock data
    if (isDemoMode) {
      setTimeout(() => {
        if (reviews.length <= 1) { // Will be 0 after deletion
          refreshDemoData();
        }
      }, 100);
    }
  };


  
  const handleAddOrUpdateQuestionnaire = (questionnaire: Omit<Questionnaire, 'id' | 'responseCount' | 'lastModified'> & { id?: number }) => {
    if (questionnaire.id) { // Update existing
      const updatedQuestionnaire = { 
          ...questionnaires.find(q => q.id === questionnaire.id)!, 
          ...questionnaire, 
          lastModified: new Date() 
      };
      setQuestionnaires(prev => prev.map(q => q.id === questionnaire.id ? updatedQuestionnaire : q));
      
      // Also update linked reviews and QR codes to reflect name changes
      setReviews(prev => prev.map(r => r.questionnaireId === questionnaire.id ? { ...r, questionnaireName: questionnaire.name } : r));
      setQrCodes(prev => prev.map(qr => qr.questionnaireId === questionnaire.id ? { ...qr, linkedForm: questionnaire.name } : qr));

    } else { // Add new
      const newQ: Questionnaire = {
        ...questionnaire,
        id: Date.now(),
        responseCount: 0,
        lastModified: new Date(),
      };
      setQuestionnaires(prev => [newQ, ...prev]);
    }
  };

  const handleDeleteQuestionnaire = (id: number) => {
      setQuestionnaires(prev => prev.filter(q => q.id !== id));
      // Optional: also remove associated QR codes or re-assign them
      setQrCodes(prev => prev.filter(qr => qr.questionnaireId !== id));
      
      // If in demo mode and all data is deleted, refresh with mock data
      if (isDemoMode) {
        setTimeout(() => {
          if (questionnaires.length <= 1) { // Will be 0 after deletion
            refreshDemoData();
          }
        }, 100);
      }
  };
  
   const handleAddOrUpdateQRCode = (qrCode: Omit<QRCode, 'id' | 'scans'> & { id?: number }) => {
    if (qrCode.id) { // Update existing
      setQrCodes(prev => prev.map(q => q.id === qrCode.id ? { ...q, ...qrCode } : q));
    } else { // Add new
      const newQR: QRCode = {
        ...qrCode,
        id: Date.now(),
        scans: 0,
      };
      setQrCodes(prev => [newQR, ...prev]);
    }
  };

  const handleDeleteQRCode = (id: number) => {
      setQrCodes(prev => prev.filter(q => q.id !== id));
      
      // If in demo mode and all data is deleted, refresh with mock data
      if (isDemoMode) {
        setTimeout(() => {
          if (qrCodes.length <= 1) { // Will be 0 after deletion
            refreshDemoData();
          }
        }, 100);
      }
  };

  const handlePreviewQuestionnaire = (questionnaireId: number) => {
    const questionnaireToPreview = questionnaires.find(q => q.id === questionnaireId);
    if (questionnaireToPreview) {
        setPreviewQuestionnaire(questionnaireToPreview);
        setActivePage('public-form-preview');
    } else {
        alert('Kuesioner tidak ditemukan.');
    }
  };


  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard kpiData={kpiData} trendData={trendData} reviews={reviews} setActivePage={setActivePage} />;
      case 'inbox':
        return <Inbox reviews={reviews} questionnaires={questionnaires} onUpdateStatus={handleUpdateReviewStatus} onDelete={handleDeleteReview} />;
      case 'active-forms':
        return <ActiveForms questionnaires={questionnaires} onAddReview={handleAddReview} />;
      case 'qr-codes':
        return <QRCodes qrCodes={qrCodes} questionnaires={questionnaires} isDemoMode={isDemoMode} demoPlan={demoPlan} onSave={handleAddOrUpdateQRCode} onDelete={handleDeleteQRCode} onPreview={handlePreviewQuestionnaire} />;
      case 'questionnaires':
        return <QuestionnairesPage questionnaires={questionnaires} reviews={reviews} onSave={handleAddOrUpdateQuestionnaire} onDelete={handleDeleteQuestionnaire} isDemoMode={isDemoMode} demoPlan={demoPlan} />;
      case 'analytics':
        console.log('🔍 App.tsx Debug - Passing to Analytics:', {
          reviewsCount: reviews.length,
          isDemoMode,
          demoPlan,
          firstReview: reviews[0],
          lastReview: reviews[reviews.length - 1]
        });
        return <Analytics reviews={reviews} isDemoMode={isDemoMode} demoPlan={demoPlan} />;
      case 'reports':
        return <Reports questionnaires={questionnaires} reviews={reviews} isDemoMode={isDemoMode} demoPlan={demoPlan} />;
      case 'panduan':
        return <Panduan />;
      case 'test-analytics':
        return <TestAnalytics />;
      case 'debug-analytics':
        return <DebugAnalyticsPage />;
      case 'direct-analytics':
        return <DirectAnalyticsTest />;
      case 'test-all-analytics':
        return <TestAllAnalytics />;
      default:
        return <Dashboard kpiData={kpiData} trendData={trendData} reviews={reviews} onGenerateData={handleGenerateDashboardData} setActivePage={setActivePage} />;
    }
  };

  const renderLandingContent = () => {
    switch(activePage) {
      case 'landing': return <LandingPage onGoToRegister={() => setActivePage('register')} />;
      case 'about': return <AboutUsPage />;
      case 'blog': return <BlogPage />;
      case 'careers': return <CareersPage />;
      case 'contact': return <ContactPage />;
      case 'features': return <FeaturesPage />;
      case 'help': return <HelpCenterPage />;
      case 'pricing': return <PricingPage onGoToRegister={() => setActivePage('register')}/>;
      default: return <LandingPage onGoToRegister={() => setActivePage('register')} />;
    }
  }
  
  const resetAllData = () => {
    setReviews([]);
    setQuestionnaires([]);
    setQrCodes([]);
  };

  const refreshDemoData = () => {
    if (isDemoMode) {
      const { initialReviews, initialQuestionnaires, initialQrCodes } = getMockData(demoPlan);
      setReviews(initialReviews);
      setQuestionnaires(initialQuestionnaires);
      setQrCodes(initialQrCodes);
    }
  };

  const handleGenerateDashboardData = () => {
    // Generate some sample data for demonstration
    const newReview = generateMockReview();
    handleAddReview(newReview);
  };

  const handleLogin = () => {
    resetAllData();
    setIsLoggedIn(true);
    setActivePage('dashboard');
  };
  
  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsDemoMode(false);
    resetAllData();
    setActivePage('login');
  }

  const handleEnterDemo = () => {
    // Load mock data only for demo mode
    const currentDemoPlan = 'bisnis'; // Match the types.ts DemoPlan type
    const { initialReviews, initialQuestionnaires, initialQrCodes } = getMockData(currentDemoPlan);
    
    console.log('🔍 Demo Mode Debug - Loading data:', {
      demoPlan: currentDemoPlan,
      reviewsCount: initialReviews.length,
      questionnairesCount: initialQuestionnaires.length,
      qrCodesCount: initialQrCodes.length,
      firstReview: initialReviews[0],
      lastReview: initialReviews[initialReviews.length - 1]
    });
    
    setReviews(initialReviews);
    setQuestionnaires(initialQuestionnaires);
    setQrCodes(initialQrCodes);
    
    setIsDemoMode(true);
    setIsLoggedIn(true);
    setDemoPlan(currentDemoPlan);
    setActivePage('dashboard');
  }

  const handleExitDemo = () => {
    setIsDemoMode(false);
    setIsLoggedIn(false);
    setDemoPlan('free');
    resetAllData();
    setActivePage('login');
  }

  if (activePage === 'public-form-preview' && previewQuestionnaire) {
      return (
          <PublicQuestionnaireView 
              questionnaire={previewQuestionnaire} 
              onAddReview={handleAddReview}
              onClosePreview={() => {
                  setPreviewQuestionnaire(null);
                  setActivePage('qr-codes');
              }} 
          />
      );
  }

  if (!isLoggedIn) {
     switch(activePage) {
        case 'login': return <LoginPage onLoginSuccess={handleLogin} onSwitchToRegister={() => setActivePage('register')} onGoHome={() => setActivePage('landing')} onEnterDemo={handleEnterDemo} theme={theme} />;
        case 'register': return <RegisterPage onRegisterSuccess={(email) => { setUserEmail(email); setActivePage('verify-email'); }} onSwitchToLogin={() => setActivePage('login')} onGoHome={() => setActivePage('landing')} theme={theme} />;
        case 'verify-email': return <VerifyEmailPage userEmail={userEmail} onGoToLogin={() => setActivePage('login')} />;
        default: 
            return (
                <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
                    <LandingHeader onGoToLogin={() => setActivePage('login')} onGoToRegister={() => setActivePage('register')} onNavigate={(page) => setActivePage(page as Page)} theme={theme} toggleTheme={toggleTheme}/>
                    {renderLandingContent()}
                    <LandingFooter onNavigate={(page) => setActivePage(page as Page)} />
                </div>
            );
     }
  }

  return (
    <LocalizationProvider>
      <SubscriptionProvider>
        <div className={`min-h-screen flex flex-col bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors duration-300`}>
            <Header 
                theme={theme} 
                toggleTheme={toggleTheme} 
                onLogout={handleLogout} 
                setActivePage={setActivePage}
                activePage={activePage}
                isDemoMode={isDemoMode} 
                demoPlan={demoPlan}
                setDemoPlan={setDemoPlan}
                onExitDemo={handleExitDemo}
            />
            <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <main className="py-4 sm:py-6 lg:py-8">
                {renderContent()}
                </main>
            </div>
        </div>
      </SubscriptionProvider>
    </LocalizationProvider>
  );
}

export default App;