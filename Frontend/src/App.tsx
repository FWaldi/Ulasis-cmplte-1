import React, { useState, useEffect, useMemo } from 'react';
import type { Page, Theme, DemoPlan, Review, Questionnaire, QRCode, TrendData } from './types';
import { Sentiment, ReviewStatus } from './types';
import apiService from './services/api/apiService';
import { questionnaireService } from './services/api/questionnaireService';
import Header from './components/ui/Header';
import DashboardIntegrated from './features/dashboard/DashboardIntegrated';
import Inbox from './features/analytics/inbox/Inbox';
import QRCodes from './features/questionnaires/qr-codes/QRCodes';
// FIX: Renamed imported component from 'Questionnaire' to 'QuestionnairesPage' to avoid name collision with the 'Questionnaire' type.
import QuestionnairesPage from './features/questionnaires/QuestionnairesPage';
import AnalyticsIntegrated from './features/dashboard/AnalyticsIntegrated';
import Reports from './features/reports/Reports';
import Settings from './features/settings/Settings';
import LandingPage from './features/landing/LandingPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import VerifyEmailPage from './features/auth/VerifyEmailPage';
import LandingHeader from './components/ui/LandingHeader';
import LandingFooter from './components/ui/LandingFooter';
import AboutUsPage from './features/landing/AboutUsPage';
import BlogPage from './features/landing/BlogPage';
import CareersPage from './features/landing/CareersPage';
import FeaturesPage from './features/landing/FeaturesPage';
import HelpCenterPage from './features/landing/HelpCenterPage';
import PricingPage from './features/landing/PricingPage';
import ContactPage from './features/landing/ContactPage';
import ActiveForms from './features/questionnaires/ActiveForms';
import Panduan from './features/questionnaires/Panduan';
import './features/questionnaires/QuestionnaireForm'; // Ensure new component is included in dependency graph
import PublicQuestionnaireView from './features/questionnaires/PublicQuestionnaireView';
import { getMockData, generateMockReview } from './hooks/ui/useMockData';
import { useAuth } from './hooks/auth/useAuth';



const App: React.FC = () => {
    const { authState, login, register, logout } = useAuth();
    const { isAuthenticated, isLoading: authLoading, user } = authState;
    console.log('App render - isAuthenticated:', isAuthenticated, 'authLoading:', authLoading, 'user:', user);
    const [theme, setTheme] = useState<Theme>('light');
     const [activePage, setActivePage] = useState<Page>(() => {
       // Restore page from localStorage or default to landing
       try {
         const savedPage = localStorage.getItem('activePage');
         return (savedPage as Page) || 'landing';
       } catch (error) {
         console.warn('localStorage access failed, using default page:', error);
         return 'landing';
       }
     });
     const [isDemoMode, setIsDemoMode] = useState(() => {
       // Restore demo mode from localStorage
       try {
         return localStorage.getItem('isDemoMode') === 'true';
       } catch (error) {
         console.warn('localStorage access failed, using default demo mode:', error);
         return false;
       }
     });
     const [demoPlan, setDemoPlan] = useState<DemoPlan>('business');
     const [userEmail, setUserEmail] = useState('');

   // Centralized state management for application data
   const [reviews, setReviews] = useState<Review[]>([]);
   const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
   const [questionnaireUsage, setQuestionnaireUsage] = useState<{ used: number; limit: number; plan: string } | null>(null);
   const [isLoadingQuestionnaires, setIsLoadingQuestionnaires] = useState(false);
   const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
   const [previewQuestionnaire, setPreviewQuestionnaire] = useState<Questionnaire | null>(null);
   const [demoQuestionnaires, setDemoQuestionnaires] = useState<Questionnaire[]>([]);

      // Initialize demo data if in demo mode
      useEffect(() => {
        if (isDemoMode) {
          const { initialQuestionnaires, initialQrCodes, initialReviews } = getMockData(demoPlan);
          setDemoQuestionnaires(initialQuestionnaires);
          setQrCodes(initialQrCodes);
          setReviews(initialReviews);
          setUserEmail('demo@ulas.is');
          setQuestionnaireUsage({
            used: initialQuestionnaires.length,
            limit: { free: 1, starter: 5, business: 100 }[demoPlan],
            plan: demoPlan
          });
        }
      }, [isDemoMode, demoPlan]);

    // Persist activePage to localStorage
    const setActivePageWithPersistence = (page: Page) => {
      setActivePage(page);
       try {
         localStorage.setItem('activePage', page);
       } catch (error) {
         console.warn('localStorage setItem failed:', error);
       }
    };

   // Set initial page based on authentication status
      useEffect(() => {
        if (!authLoading) {
          if (isAuthenticated || isDemoMode) {
            // If authenticated or in demo mode and on landing/login/register, go to dashboard
            if (['landing', 'login', 'register', 'verify-email'].includes(activePage)) {
              setActivePageWithPersistence('dashboard');
            }
           } else {
             // If not authenticated and not in demo mode and on protected pages, go to login
              // Allow access to all main app pages during authentication state updates
              if (!['landing', 'login', 'register', 'verify-email', 'about', 'blog', 'careers', 'contact', 'features', 'help', 'pricing', 'dashboard', 'inbox', 'active-forms', 'questionnaires', 'analytics', 'reports', 'settings', 'panduan', 'qr-codes'].includes(activePage)) {
                setActivePageWithPersistence('login');
              }
           }
        }
      }, [isAuthenticated, authLoading, activePage, isDemoMode]);


  
  // Recalculate KPI data whenever reviews change
  const kpiData = useMemo(() => {
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;
    const responseRate = totalReviews > 0 ? 88 : 0; // Static for now, 0 if no reviews
    return {
      avgRating: parseFloat(avgRating.toFixed(1)),
      totalReviews,
      responseRate,
    };
  }, [reviews]);

  // Recalculate Trend data whenever reviews change
  const trendData = useMemo(() => {
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
    return Object.entries(trendMap).map(([key, data]) => {
        const avg = data.count > 0 ? data.ratings.reduce((a, b) => a + b, 0) / data.count : 0;
        return {
            date: dateLabels[key],
            'Average Rating': parseFloat(avg.toFixed(2)),
        };
    });
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
         if (isDemoMode) {
             setDemoQuestionnaires(prev => prev.map(q =>
                 q.id === newReview.questionnaireId
                     ? { ...q, responseCount: q.responseCount + 1 }
                     : q
             ));
         } else {
             setQuestionnaires(prev => prev.map(q =>
                 q.id === newReview.questionnaireId
                     ? { ...q, responseCount: q.responseCount + 1 }
                     : q
             ));
         }
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

  const handleGenerateMockReviews = () => {
      const newReviews = Array.from({ length: 10 }, () => generateMockReview());
      setReviews(prev => [...newReviews, ...prev]);
  };
  
  const handleGenerateDashboardData = () => {
    // This function now only needs to add reviews.
    // KPIs and Trend data will update automatically via useMemo.
    const newReviews = Array.from({ length: 5 }, () => generateMockReview());
    setReviews(prev => [...newReviews, ...prev]);
  };
  
      const handleAddOrUpdateQuestionnaire = async (questionnaire: Omit<Questionnaire, 'id' | 'responseCount' | 'lastModified'> & { id?: number }) => {
        if (isDemoMode) {
          // In demo mode, simulate adding/updating without API calls
          if (questionnaire.id) { // Update existing
            setDemoQuestionnaires(prev => prev.map(q => q.id === questionnaire.id ? { ...q, name: questionnaire.name, description: questionnaire.description, questions: questionnaire.questions, lastModified: new Date() } : q));
            // Update linked reviews and QR codes
            setReviews(prev => prev.map(r => r.questionnaireId === questionnaire.id ? { ...r, questionnaireName: questionnaire.name } : r));
            setQrCodes(prev => prev.map(qr => qr.questionnaireId === questionnaire.id ? { ...qr, linkedForm: questionnaire.name } : qr));
            return true;
          } else { // Add new
            // Check limit
            if (questionnaireUsage && questionnaireUsage.used >= questionnaireUsage.limit) {
              alert(`You have reached your limit of ${questionnaireUsage.limit} questionnaires for the ${questionnaireUsage.plan} plan.`);
              return false;
            }
           const newQ: Questionnaire = {
             id: Date.now(),
             name: questionnaire.name,
             description: questionnaire.description,
             questions: questionnaire.questions,
             responseCount: 0,
             lastModified: new Date(),
           };
            setDemoQuestionnaires(prev => [newQ, ...prev]);
            // Update usage
            if (questionnaireUsage) {
              setQuestionnaireUsage(prev => prev ? { ...prev, used: prev.used + 1 } : null);
            }
            return true;
          }
       }

       try {
         if (questionnaire.id) { // Update existing
           const response = await questionnaireService.updateQuestionnaire(questionnaire.id, {
             title: questionnaire.name,
             questions: questionnaire.questions,
           });
           const updated = response.data;
            setQuestionnaires(prev => prev.map(q => q.id === questionnaire.id ? { ...q, ...updated, lastModified: new Date(updated.updated_at) } : q));

            // Also update linked reviews and QR codes to reflect name changes
            setReviews(prev => prev.map(r => r.questionnaireId === questionnaire.id ? { ...r, questionnaireName: questionnaire.name } : r));
            setQrCodes(prev => prev.map(qr => qr.questionnaireId === questionnaire.id ? { ...qr, linkedForm: questionnaire.name } : qr));
            return true;

            } else { // Add new
             try {
               // Check subscription limit
               if (questionnaireUsage && questionnaireUsage.used >= questionnaireUsage.limit) {
                 throw new Error(`You have reached your limit of ${questionnaireUsage.limit} questionnaires for the ${questionnaireUsage.plan} plan. Please upgrade to create more.`);
               }
                // Transform questions to match backend expectations
                const typeMapping = {
                  'short_text': 'text',
                  'long_text': 'textarea',
                  'multiple_choice': 'multiple_choice',
                  'dropdown': 'single_choice',
                  'yes_no': 'yes_no',
                  'rating_5': 'rating',
                  'rating_10': 'scale'
                };

                 const transformedQuestions = questionnaire.questions.map((q, index) => {
                   let options = q.options || [];
                   let minValue, maxValue;

                   // Set default options and min/max values based on question type
                   if (q.type === 'rating_5') {
                     minValue = 1;
                     maxValue = 5;
                     options = [];
                   } else if (q.type === 'rating_10') {
                     minValue = 1;
                     maxValue = 10;
                     options = [];
                   } else if (q.type === 'yes_no') {
                     options = ['Yes', 'No'];
                   }
                   // For multiple_choice and dropdown, options should be an array

                   return {
                     questionText: q.text,
                     questionType: typeMapping[q.type] || 'text',
                     isRequired: q.required || false,
                     orderIndex: index,
                     options: options,
                     minValue: minValue,
                     maxValue: maxValue,
                     category: '',
                     validationRules: {},
                     placeholder: '',
                     helpText: '',
                   };
                 });

                const requestData = {
                  title: questionnaire.name,
                  description: questionnaire.description || '',
                  questions: transformedQuestions,
                };
                 console.log('Sending questionnaire data:', requestData);
                 console.log('User authenticated:', isAuthenticated);
                 console.log('Demo mode:', isDemoMode);

                 const response = await questionnaireService.createQuestionnaire(requestData);
                 console.log('Questionnaire creation response:', response);
               const newQ = response.data;
               const questionnaireWithMeta: Questionnaire = {
                 ...newQ,
                 name: newQ.title,
                 description: questionnaire.description || '',
                 questions: newQ.questions || [],
                 responseCount: 0,
                 lastModified: new Date(newQ.updated_at),
               };
                setQuestionnaires(prev => [questionnaireWithMeta, ...prev]);
                // Update usage
                if (questionnaireUsage) {
                  setQuestionnaireUsage(prev => prev ? { ...prev, used: prev.used + 1 } : null);
                }
                return true;
              } catch (error: any) {
                console.error('Failed to save questionnaire:', error);
                alert(error.message || 'Failed to save questionnaire. Please try again.');
                return false;
              }
           }
         } catch (error: any) {
           console.error('Failed to save questionnaire:', error);
           alert(error.message || 'Failed to save questionnaire. Please try again.');
           return false;
         }
      };
  
   const handleAddOrUpdateQRCode = async (qrCode: Omit<QRCode, 'id' | 'scans'> & { id?: number }) => {
      if (isDemoMode) {
        if (qrCode.id) { // Update existing
          setQrCodes(prev => prev.map(q => q.id === qrCode.id ? { ...q, ...qrCode } : q));
        } else { // Add new
          const newQR: QRCode = {
            id: Date.now(),
            name: qrCode.name,
            linkedForm: qrCode.linkedForm,
            questionnaireId: qrCode.questionnaireId,
            scans: 0,
            color: qrCode.color,
            logoUrl: qrCode.logoUrl,
          };
          setQrCodes(prev => [newQR, ...prev]);
        }
        return;
      }

      try {
        if (qrCode.id) { // Update existing
          const updated = await apiService.updateQRCode(qrCode.id, qrCode);
          setQrCodes(prev => prev.map(q => q.id === qrCode.id ? { ...q, ...updated } : q));
        } else { // Add new
          const newQR = await apiService.createQRCode(qrCode);
          setQrCodes(prev => [{ ...newQR, scans: 0 }, ...prev]);
        }
      } catch (error) {
        console.error('Failed to save QR code:', error);
        alert('Failed to save QR code. Please try again.');
      }
    };

    const handleDeleteQRCode = async (id: number) => {
       if (isDemoMode) {
         setQrCodes(prev => prev.filter(q => q.id !== id));
         return;
       }

       try {
         await apiService.deleteQRCode(id);
         setQrCodes(prev => prev.filter(q => q.id !== id));
       } catch (error) {
         console.error('Failed to delete QR code:', error);
         alert('Failed to delete QR code. Please try again.');
       }
     };

      const handleDeleteQuestionnaire = async (id: number) => {
        if (isDemoMode) {
          setDemoQuestionnaires(prev => prev.filter(q => q.id !== id));
          setQuestionnaireUsage(prev => prev ? { ...prev, used: prev.used - 1 } : null);
          return;
        }

        try {
          await questionnaireService.deleteQuestionnaire(id);
          setQuestionnaires(prev => prev.filter(q => q.id !== id));
        } catch (error) {
          console.error('Failed to delete questionnaire. Please try again.');
        }
      };

   const handlePreviewQuestionnaire = (questionnaireId: number) => {
      const currentQuestionnaires = isDemoMode ? demoQuestionnaires : questionnaires;
      const questionnaireToPreview = currentQuestionnaires.find(q => q.id === questionnaireId);
      if (questionnaireToPreview) {
          setPreviewQuestionnaire(questionnaireToPreview);
          setActivePageWithPersistence('public-form-preview');
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

    // Load data from API when logged in
    useEffect(() => {
      const loadData = async () => {
        console.log('🔍 Load data check - isAuthenticated:', isAuthenticated, 'isDemoMode:', isDemoMode, 'user:', user);
        if (isAuthenticated && !isDemoMode) {
          console.log('📡 Loading data for authenticated user...');
          setIsLoadingQuestionnaires(true);
          try {
            const [questionnairesResponse, qrCodesData] = await Promise.all([
              questionnaireService.getQuestionnaires(),
              apiService.getQRCodes(),
            ]);
            console.log('✅ Questionnaires response:', questionnairesResponse);
            console.log('✅ QR codes response:', qrCodesData);
            console.log('📊 Setting questionnaires:', questionnairesResponse.data.questionnaires.length);
            setQuestionnaires(questionnairesResponse.data.questionnaires.map((q: any) => ({
              ...q,
              name: q.title || q.name, // Map title to name for frontend compatibility
              responseCount: q.responseCount || 0,
              lastModified: new Date(q.updated_at || q.lastModified),
              questions: q.questions || [], // Ensure questions is always an array
            })));
            setQuestionnaireUsage(questionnairesResponse.data.usage);
            setQrCodes(qrCodesData);
           } catch (error) {
             console.error('❌ Failed to load data:', error);
             setQrCodes([]); // Ensure qrCodes is an array even on error
           } finally {
            setIsLoadingQuestionnaires(false);
          }
        } else {
          console.log('🚫 Skipping data load - not authenticated or in demo mode');
        }
      };
      loadData();
    }, [isAuthenticated, isDemoMode, user?.id]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const renderContent = () => {
     // Use demo data when in demo mode
     const currentQuestionnaires = isDemoMode ? demoQuestionnaires : questionnaires;
     const currentReviews = reviews; // Reviews are set directly in demo

      switch (activePage) {
         case 'dashboard':
            const qId = isDemoMode ? (currentQuestionnaires[0]?.id || 1) : (currentQuestionnaires[0]?.id || null);
           return <DashboardIntegrated questionnaireId={qId} setActivePage={setActivePageWithPersistence} isDemoMode={isDemoMode} />;
       case 'inbox':
         return <Inbox reviews={currentReviews} questionnaires={currentQuestionnaires} onUpdateStatus={handleUpdateReviewStatus} onGenerateMockReviews={handleGenerateMockReviews} />;
       case 'active-forms':
         return <ActiveForms questionnaires={currentQuestionnaires} onAddReview={handleAddReview} />;
       case 'qr-codes':
         return <QRCodes qrCodes={qrCodes} questionnaires={currentQuestionnaires} isDemoMode={isDemoMode} demoPlan={demoPlan} onSave={handleAddOrUpdateQRCode} onDelete={handleDeleteQRCode} onPreview={handlePreviewQuestionnaire} />;
       case 'questionnaires':
         return <QuestionnairesPage questionnaires={currentQuestionnaires} reviews={currentReviews} isDemoMode={isDemoMode} demoPlan={demoPlan} usage={questionnaireUsage} isLoading={isLoadingQuestionnaires} onSave={handleAddOrUpdateQuestionnaire} onDelete={handleDeleteQuestionnaire} />;
        case 'analytics':
          const analyticsQId = currentQuestionnaires[0]?.id || 1;
          return <AnalyticsIntegrated questionnaireId={analyticsQId} isDemoMode={isDemoMode} demoPlan={demoPlan} />;
        case 'reports':
          return <Reports questionnaires={currentQuestionnaires} reviews={currentReviews} isDemoMode={isDemoMode} demoPlan={demoPlan} />;
        case 'settings':
           return <Settings demoPlan={demoPlan} setDemoPlan={setDemoPlan} isDemoMode={isDemoMode} />;
        case 'panduan':
          return <Panduan />;
         default:
           const defaultQId = currentQuestionnaires[0]?.id || 1;
           return <DashboardIntegrated questionnaireId={defaultQId} setActivePage={setActivePageWithPersistence} />;
     }
   };

   const renderLandingContent = () => {
     switch(activePage) {
       case 'landing': return <LandingPage onGoToRegister={() => setActivePageWithPersistence('register')} />;
       case 'about': return <AboutUsPage />;
       case 'blog': return <BlogPage />;
       case 'careers': return <CareersPage />;
       case 'contact': return <ContactPage />;
       case 'features': return <FeaturesPage />;
       case 'help': return <HelpCenterPage />;
       case 'pricing': return <PricingPage onGoToRegister={() => setActivePageWithPersistence('register')}/>;
       default: return <LandingPage onGoToRegister={() => setActivePageWithPersistence('register')} />;
     }
   }
  
  const resetAllData = () => {
    setReviews([]);
    setQuestionnaires([]);
    setQrCodes([]);
  };

    const handleLogin = () => {
       resetAllData();
       // Login succeeded, navigate to dashboard
       setActivePageWithPersistence('dashboard');
     };

   const handleLogout = async () => {
     try {
       await logout();
     } catch (error) {
       console.error('Logout error:', error);
     } finally {
       setIsDemoMode(false);
       resetAllData();
       setActivePageWithPersistence('login');
     }
   }

    const handleEnterDemo = () => {
       setIsDemoMode(true);
       try {
         localStorage.setItem('isDemoMode', 'true');
       } catch (error) {
         console.warn('localStorage setItem failed:', error);
       }
       setDemoPlan('business');
       const { initialQuestionnaires, initialQrCodes, initialReviews } = getMockData('business');
       setDemoQuestionnaires(initialQuestionnaires);
       setQrCodes(initialQrCodes);
       setReviews(initialReviews);
       setQuestionnaireUsage({
         used: initialQuestionnaires.length,
         limit: 100,
         plan: 'business'
       });
       setActivePageWithPersistence('dashboard');
     };

    const handleDemoPlanSelect = (plan: DemoPlan) => {
      const demoEmail = 'demo@ulas.is';

      // Set demo state with selected plan
      setDemoPlan(plan);
      setUserEmail(demoEmail);

      // Load mock data for the selected plan
      const { initialQuestionnaires, initialQrCodes, initialReviews } = getMockData(plan);

      // Set mock data to state
      setDemoQuestionnaires(initialQuestionnaires);
      setQrCodes(initialQrCodes);
      setReviews(initialReviews);

      // Set mock questionnaire usage
      const limits = { free: 1, starter: 5, business: 100 };
      setQuestionnaireUsage({
        used: initialQuestionnaires.length,
        limit: limits[plan],
        plan: plan
      });

      // Go to dashboard
      setActivePageWithPersistence('dashboard');
    };

    const handleExitDemo = () => {
      setIsDemoMode(false);
      setDemoPlan('free');
      try {
        localStorage.removeItem('isDemoMode');
      } catch (error) {
        console.warn('localStorage removeItem failed:', error);
      }
      resetAllData();
      setActivePageWithPersistence('login');
    }

  // Show loading spinner while authentication is being initialized
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">Memuat aplikasi...</p>
      </div>
    );
  }

  if (activePage === 'public-form-preview' && previewQuestionnaire) {
       return (
           <PublicQuestionnaireView
               questionnaire={previewQuestionnaire}
               onAddReview={handleAddReview}
               onClosePreview={() => {
                   setPreviewQuestionnaire(null);
                   setActivePageWithPersistence('qr-codes');
               }}
           />
       );
   }

    // Show auth pages only if not authenticated and not on protected pages
    if (!isAuthenticated && !isDemoMode && !['dashboard', 'inbox', 'active-forms', 'questionnaires', 'analytics', 'reports', 'settings', 'panduan', 'qr-codes', 'demo-plan-select'].includes(activePage)) {
        switch(activePage) {
           case 'login': return <LoginPage onLoginSuccess={handleLogin} onSwitchToRegister={() => setActivePageWithPersistence('register')} onGoHome={() => setActivePageWithPersistence('landing')} onEnterDemo={handleEnterDemo} theme={theme} />;
           case 'register': return <RegisterPage onRegisterSuccess={(email) => { setUserEmail(email); setActivePageWithPersistence('verify-email'); }} onSwitchToLogin={() => setActivePageWithPersistence('login')} onGoHome={() => setActivePageWithPersistence('landing')} theme={theme} />;
           case 'verify-email': return <VerifyEmailPage userEmail={userEmail} onGoToLogin={() => setActivePageWithPersistence('login')} />;

           default:
              return (
                  <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
                      <LandingHeader onGoToLogin={() => setActivePageWithPersistence('login')} onGoToRegister={() => setActivePageWithPersistence('register')} onNavigate={(page) => setActivePageWithPersistence(page as Page)} theme={theme} toggleTheme={toggleTheme}/>
                      {renderLandingContent()}
                      <LandingFooter onNavigate={(page) => setActivePageWithPersistence(page as Page)} />
                  </div>
              );
       }
   }

  return (
    <div className={`min-h-screen flex flex-col bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors duration-300`}>
        <Header
             theme={theme}
             toggleTheme={toggleTheme}
             onLogout={handleLogout}
             setActivePage={setActivePageWithPersistence}
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
  );
}

export default App;