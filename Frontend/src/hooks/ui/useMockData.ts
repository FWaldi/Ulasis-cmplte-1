import type { DemoPlan, Review, TrendData, Questionnaire, QRCode, BubbleAnalytics, AnalyticsSummaryData, TimeComparisonData } from '../../types';
import { ReviewStatus, QuestionType, Sentiment } from '../../types';

// Generate realistic reviews over a month period based on backend database structure
const generateRealisticReviews = (): Review[] => {
    const reviews: Review[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Realistic comment templates based on different questionnaire types
    const commentTemplates = {
        'Customer Satisfaction Survey': [
            { rating: 5, comment: "Excellent service! The staff was very attentive and the coffee quality was outstanding.", topics: ["Service Quality", "Product Quality"] },
            { rating: 4, comment: "Great atmosphere for working, WiFi is stable and power outlets are available.", topics: ["Ambiance", "Facilities"] },
            { rating: 3, comment: "Good coffee but prices are a bit high for the portion size.", topics: ["Pricing", "Value for Money"] },
            { rating: 2, comment: "Wait time was too long during peak hours, need more staff.", topics: ["Service Speed", "Staffing"] },
            { rating: 1, comment: "Table was dirty when I arrived, had to clean it myself.", topics: ["Cleanliness", "Service Quality"] },
            { rating: 4, comment: "Love the new seasonal menu! The pumpkin spice latte is perfect.", topics: ["Product Quality", "Menu Variety"] },
            { rating: 3, comment: "Music is too loud for a coffee shop, makes it hard to work.", topics: ["Ambiance", "Noise Level"] },
            { rating: 5, comment: "Barista remembered my name and usual order - personal touch appreciated!", topics: ["Service Quality", "Customer Experience"] }
        ],
        'Employee Engagement Survey': [
            { rating: 4, comment: "Good work environment, supportive team members and management.", topics: ["Work Environment", "Team Support"] },
            { rating: 3, comment: "Salary could be more competitive with industry standards.", topics: ["Compensation", "Benefits"] },
            { rating: 5, comment: "Great training programs and opportunities for professional growth.", topics: ["Training", "Career Development"] },
            { rating: 2, comment: "Work-life balance is challenging during peak seasons.", topics: ["Work-Life Balance", "Workload"] },
            { rating: 4, comment: "Management is approachable and open to feedback.", topics: ["Management", "Communication"] },
            { rating: 3, comment: "Equipment needs updating, some machines are outdated.", topics: ["Equipment", "Resources"] }
        ],
        'Product Feedback Form': [
            { rating: 5, comment: "New cold brew is amazing! Smooth and refreshing.", topics: ["Product Quality", "Innovation"] },
            { rating: 4, comment: "Pastries are fresh and delicious, great variety.", topics: ["Product Quality", "Variety"] },
            { rating: 3, comment: "Portion sizes could be more generous for the price.", topics: ["Portion Size", "Value"] },
            { rating: 2, comment: "Some items were sold out early in the day.", topics: ["Availability", "Inventory"] },
            { rating: 5, comment: "Plant-based milk options are excellent quality!", topics: ["Product Quality", "Dietary Options"] }
        ]
    };

    // Generate reviews spread over 30 days with realistic patterns
    for (let day = 0; day < 30; day++) {
        const currentDate = new Date(thirtyDaysAgo.getTime() + day * 24 * 60 * 60 * 1000);
        
        // Weekend patterns (more customers)
        const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
        const dailyReviews = isWeekend ? Math.floor(Math.random() * 8) + 5 : Math.floor(Math.random() * 6) + 2;
        
        // Peak hours: 8-10 AM, 12-2 PM, 4-6 PM
        const peakHours = [8, 9, 12, 13, 16, 17, 18];
        
        for (let i = 0; i < dailyReviews; i++) {
            const hour = peakHours[Math.floor(Math.random() * peakHours.length)];
            const minute = Math.floor(Math.random() * 60);
            currentDate.setHours(hour, minute, 0, 0);
            
            // Select questionnaire type
            const questionnaireTypes = Object.keys(commentTemplates);
            const questionnaireType = questionnaireTypes[Math.floor(Math.random() * questionnaireTypes.length)];
            const templates = commentTemplates[questionnaireType as keyof typeof commentTemplates];
            const template = templates[Math.floor(Math.random() * templates.length)];
            
            // Determine source based on questionnaire type
            const source = questionnaireType === 'Employee Engagement Survey' 
                ? 'Internal System' 
                : ['QR Scan', 'Google Maps', 'Gojek', 'Website'][Math.floor(Math.random() * 4)];
            
            // Determine status based on rating and age
            let status: ReviewStatus;
            const daysOld = Math.floor((now.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000));
            if (template.rating >= 4) {
                status = daysOld > 2 ? ReviewStatus.Resolved : ReviewStatus.New;
            } else if (template.rating === 3) {
                status = daysOld > 1 ? ReviewStatus.InProgress : ReviewStatus.New;
            } else {
                status = daysOld > 3 ? ReviewStatus.InProgress : ReviewStatus.New;
            }
            
            const sentiment = template.rating >= 4 ? Sentiment.Positive : 
                           template.rating === 3 ? Sentiment.Neutral : Sentiment.Negative;
            
            reviews.push({
                id: reviews.length + 1,
                rating: template.rating,
                comment: template.comment,
                timestamp: new Date(currentDate),
                source,
                tags: [template.topics[0]],
                status,
                sentiment,
                topics: template.topics,
                questionnaireId: questionnaireType === 'Customer Satisfaction Survey' ? 1 :
                               questionnaireType === 'Employee Engagement Survey' ? 2 : 3,
                questionnaireName: questionnaireType
            });
        }
    }
    
    return reviews.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

const allReviews = generateRealisticReviews();


// Realistic questionnaires based on backend database structure
const allQuestionnaires: Questionnaire[] = [
    {
        id: 1,
        name: 'Customer Satisfaction Survey 1',
        description: 'Comprehensive feedback form for customer experience evaluation covering service quality, product satisfaction, and overall ambiance.',
        questions: [
            { id: 'q1', text: 'How would you rate the overall service quality?', type: 'rating_5' },
            { id: 'q2', text: 'How satisfied are you with our product quality?', type: 'rating_5' },
            { id: 'q3', text: 'Was the waiting time acceptable?', type: 'rating_5' },
            { id: 'q4', text: 'How would you rate the cleanliness of our establishment?', type: 'rating_5' },
            { id: 'q5', text: 'Would you recommend us to friends and family?', type: 'yes_no' },
            { id: 'q6', text: 'What specific aspects did you like most?', type: 'multiple_choice', options: ['Service Quality', 'Product Taste', 'Ambiance', 'Price', 'Location'] },
            { id: 'q7', text: 'Any suggestions for improvement?', type: 'long_text' }
        ],
        responseCount: 156,
        lastModified: new Date('2024-10-15'),
        category: 'Customer Experience',
        isActive: true
    },
    {
        id: 2,
        name: 'Employee Engagement Survey 2',
        description: 'Internal survey to measure employee satisfaction, work environment, and professional development opportunities.',
        questions: [
            { id: 'q8', text: 'How satisfied are you with your work environment?', type: 'rating_5' },
            { id: 'q9', text: 'Do you feel adequately supported by management?', type: 'rating_5' },
            { id: 'q10', text: 'How would you rate the work-life balance?', type: 'rating_5' },
            { id: 'q11', text: 'Are you satisfied with the compensation package?', type: 'rating_5' },
            { id: 'q12', text: 'Do you see opportunities for career growth?', type: 'yes_no' },
            { id: 'q13', text: 'What improvements would you suggest?', type: 'long_text' }
        ],
        responseCount: 42,
        lastModified: new Date('2024-10-10'),
        category: 'Internal HR',
        isActive: true
    },
    {
        id: 3,
        name: 'Product Feedback Form 3',
        description: 'Detailed feedback form focusing on product quality, menu variety, and customer preferences.',
        questions: [
            { id: 'q14', text: 'How would you rate our coffee quality?', type: 'rating_10' },
            { id: 'q15', text: 'How satisfied are you with our food offerings?', type: 'rating_5' },
            { id: 'q16', text: 'Is our menu variety sufficient?', type: 'rating_5' },
            { id: 'q17', text: 'Are our prices reasonable for the quality offered?', type: 'rating_5' },
            { id: 'q18', text: 'Which products would you like to see more of?', type: 'multiple_choice', options: ['Coffee Varieties', 'Pastries', 'Sandwiches', 'Healthy Options', 'Seasonal Items'] },
            { id: 'q19', text: 'Any specific product requests?', type: 'short_text' }
        ],
        responseCount: 89,
        lastModified: new Date('2024-10-12'),
        category: 'Product Development',
        isActive: true
    },
    {
        id: 4,
        name: 'Customer Satisfaction Survey 4',
        description: 'Extended customer satisfaction survey with additional focus on digital experience and loyalty.',
        questions: [
            { id: 'q20', text: 'How was your overall experience today?', type: 'rating_5' },
            { id: 'q21', text: 'How would you rate our mobile app experience?', type: 'rating_5' },
            { id: 'q22', text: 'Was the ordering process smooth?', type: 'rating_5' },
            { id: 'q23', text: 'How likely are you to visit again?', type: 'rating_10' },
            { id: 'q24', text: 'Do you use our loyalty program?', type: 'yes_no' },
            { id: 'q25', text: 'Additional feedback?', type: 'long_text' }
        ],
        responseCount: 67,
        lastModified: new Date('2024-10-08'),
        category: 'Customer Experience',
        isActive: true
    },
    {
        id: 5,
        name: 'Employee Engagement Survey 5',
        description: 'Follow-up engagement survey focusing on team dynamics and communication.',
        questions: [
            { id: 'q26', text: 'How effective is team communication?', type: 'rating_5' },
            { id: 'q27', text: 'Do you feel valued as an employee?', type: 'rating_5' },
            { id: 'q28', text: 'How would you rate training opportunities?', type: 'rating_5' },
            { id: 'q29', text: 'Is feedback from management constructive?', type: 'yes_no' },
            { id: 'q30', text: 'Suggestions for team improvement?', type: 'long_text' }
        ],
        responseCount: 38,
        lastModified: new Date('2024-10-05'),
        category: 'Internal HR',
        isActive: true
    }
];

// Realistic QR codes based on actual questionnaire usage patterns
const allQrCodes: QRCode[] = [
    {
        id: 1,
        name: 'Table QR - Main Dining',
        linkedForm: 'Customer Satisfaction Survey 1',
        questionnaireId: 1,
        scans: 342,
        color: '#007A7A',
        location: 'Main Dining Area',
        lastScanned: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        isActive: true
    },
    {
        id: 2,
        name: 'Exit Door QR',
        linkedForm: 'Customer Satisfaction Survey 1',
        questionnaireId: 1,
        scans: 287,
        color: '#4A4A4A',
        location: 'Main Exit',
        lastScanned: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        isActive: true
    },
    {
        id: 3,
        name: 'Counter QR',
        linkedForm: 'Customer Satisfaction Survey 4',
        questionnaireId: 4,
        scans: 198,
        color: '#1976D2',
        location: 'Service Counter',
        lastScanned: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        isActive: true
    },
    {
        id: 4,
        name: 'Staff Room QR',
        linkedForm: 'Employee Engagement Survey 2',
        questionnaireId: 2,
        scans: 45,
        color: '#388E3C',
        location: 'Staff Break Room',
        lastScanned: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        isActive: true
    },
    {
        id: 5,
        name: 'Product Display QR',
        linkedForm: 'Product Feedback Form 3',
        questionnaireId: 3,
        scans: 156,
        color: '#D32F2F',
        location: 'Product Display Area',
        lastScanned: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        isActive: true,
        logoUrl: 'https://cdn.iconscout.com/icon/free/png-256/free-coffee-bean-1544323-1308892.png'
    },
    {
        id: 6,
        name: 'Delivery Package QR',
        linkedForm: 'Customer Satisfaction Survey 4',
        questionnaireId: 4,
        scans: 89,
        color: '#FF9800',
        location: 'Delivery Packages',
        lastScanned: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        isActive: true
    },
    {
        id: 7,
        name: 'Office QR - Management',
        linkedForm: 'Employee Engagement Survey 5',
        questionnaireId: 5,
        scans: 28,
        color: '#795548',
        location: 'Management Office',
        lastScanned: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        isActive: true
    },
    {
        id: 8,
        name: 'VIP Area QR',
        linkedForm: 'Customer Satisfaction Survey 1',
        questionnaireId: 1,
        scans: 78,
        color: '#7B1FA2',
        location: 'VIP Section',
        lastScanned: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        isActive: true
    },
    {
        id: 9,
        name: 'Outdoor Seating QR',
        linkedForm: 'Customer Satisfaction Survey 4',
        questionnaireId: 4,
        scans: 134,
        color: '#4CAF50',
        location: 'Outdoor Patio',
        lastScanned: new Date(Date.now() - 90 * 60 * 1000), // 90 minutes ago
        isActive: true
    },
    {
        id: 10,
        name: 'Kitchen QR',
        linkedForm: 'Product Feedback Form 3',
        questionnaireId: 3,
        scans: 67,
        color: '#607D8B',
        location: 'Kitchen Area',
        lastScanned: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        isActive: true
    }
];


type TimePeriod = 'day' | 'week' | 'month' | 'year';

export const getMockData = (demoPlan: DemoPlan, timePeriod: TimePeriod = 'week') => {
    // Get questionnaires based on subscription plan - realistic limits
    const getQuestionnaires = () => {
        switch (demoPlan) {
            case 'free':
                // Free plan: 1 questionnaire max
                return allQuestionnaires.slice(0, 1);
            case 'starter':
                // Starter plan: up to 3 questionnaires
                return allQuestionnaires.slice(0, 3);
            case 'business':
                // Business plan: up to 5 questionnaires
                return allQuestionnaires.slice(0, 5);
            case 'admin':
            default:
                // Admin: all questionnaires
                return allQuestionnaires;
        }
    };

    // Generate realistic data based on subscription plan and time period
    const getPeriodData = () => {
        const baseMultiplier = demoPlan === 'free' ? 0.3 : 
                               demoPlan === 'starter' ? 0.6 : 
                               demoPlan === 'business' ? 1.0 : 1.2;
        
        switch (timePeriod) {
            case 'day':
                return {
                    totalResponses: Math.round(45 * baseMultiplier),
                    avgRating: 4.2 + (Math.random() * 0.4),
                    responseRate: Math.round(88 + (Math.random() * 8)),
                    positiveSentiment: Math.round(72 + (Math.random() * 12)),
                    trends: {
                        totalResponses: { value: Math.round(45 * baseMultiplier), change: 5.2 + (Math.random() * 6) },
                        avgRating: { value: 4.2 + (Math.random() * 0.4), change: 1.1 + (Math.random() * 2) },
                        responseRate: { value: Math.round(88 + (Math.random() * 8)), change: -1.2 + (Math.random() * 3) },
                        positiveSentiment: { value: Math.round(72 + (Math.random() * 12)), change: 2.8 + (Math.random() * 4) },
                    }
                };
            case 'month':
                return {
                    totalResponses: Math.round(1245 * baseMultiplier),
                    avgRating: 4.3 + (Math.random() * 0.3),
                    responseRate: Math.round(82 + (Math.random() * 6)),
                    positiveSentiment: Math.round(68 + (Math.random() * 8)),
                    trends: {
                        totalResponses: { value: Math.round(1245 * baseMultiplier), change: -2.1 + (Math.random() * 4) },
                        avgRating: { value: 4.3 + (Math.random() * 0.3), change: -0.5 + (Math.random() * 1.5) },
                        responseRate: { value: Math.round(82 + (Math.random() * 6)), change: -1.8 + (Math.random() * 2) },
                        positiveSentiment: { value: Math.round(68 + (Math.random() * 8)), change: -0.7 + (Math.random() * 3) },
                    }
                };
            case 'year':
                return {
                    totalResponses: Math.round(15420 * baseMultiplier),
                    avgRating: 4.5 + (Math.random() * 0.2),
                    responseRate: Math.round(76 + (Math.random() * 8)),
                    positiveSentiment: Math.round(70 + (Math.random() * 6)),
                    trends: {
                        totalResponses: { value: Math.round(15420 * baseMultiplier), change: 8.5 + (Math.random() * 6) },
                        avgRating: { value: 4.5 + (Math.random() * 0.2), change: 0.2 + (Math.random() * 0.6) },
                        responseRate: { value: Math.round(76 + (Math.random() * 8)), change: -3.2 + (Math.random() * 2) },
                        positiveSentiment: { value: Math.round(70 + (Math.random() * 6)), change: 5.1 + (Math.random() * 4) },
                    }
                };
            case 'week':
            default:
                return {
                    totalResponses: Math.round(287 * baseMultiplier),
                    avgRating: 4.4 + (Math.random() * 0.3),
                    responseRate: Math.round(85 + (Math.random() * 7)),
                    positiveSentiment: Math.round(71 + (Math.random() * 9)),
                    trends: {
                        totalResponses: { value: Math.round(287 * baseMultiplier), change: 1.8 + (Math.random() * 4) },
                        avgRating: { value: 4.4 + (Math.random() * 0.3), change: 0.8 + (Math.random() * 1.5) },
                        responseRate: { value: Math.round(85 + (Math.random() * 7)), change: -0.3 + (Math.random() * 2) },
                        positiveSentiment: { value: Math.round(71 + (Math.random() * 9)), change: 2.1 + (Math.random() * 3) },
                    }
                };
        }
    };

    const kpiData = getPeriodData();

    // Trend Data - Dual axis for Avg Rating and Response Rate
    const getTrendData = () => {
        switch (timePeriod) {
            case 'day':
                return [
                    { date: '00:00', 'Avg Rating': 4.1, 'Response Rate': 89 },
                    { date: '06:00', 'Avg Rating': 4.2, 'Response Rate': 91 },
                    { date: '12:00', 'Avg Rating': 4.4, 'Response Rate': 94 },
                    { date: '18:00', 'Avg Rating': 4.3, 'Response Rate': 92 },
                ];
            case 'month':
                return [
                    { date: 'Week 1', 'Avg Rating': 4.2, 'Response Rate': 82 },
                    { date: 'Week 2', 'Avg Rating': 4.3, 'Response Rate': 84 },
                    { date: 'Week 3', 'Avg Rating': 4.5, 'Response Rate': 87 },
                    { date: 'Week 4', 'Avg Rating': 4.4, 'Response Rate': 85 },
                ];
            case 'year':
                return [
                    { date: 'Jan', 'Avg Rating': 4.3, 'Response Rate': 75 },
                    { date: 'Apr', 'Avg Rating': 4.4, 'Response Rate': 78 },
                    { date: 'Jul', 'Avg Rating': 4.5, 'Response Rate': 81 },
                    { date: 'Oct', 'Avg Rating': 4.6, 'Response Rate': 79 },
                ];
            case 'week':
            default:
                return [
                    { date: 'Sen', 'Avg Rating': 4.3, 'Response Rate': 85 },
                    { date: 'Sel', 'Avg Rating': 4.5, 'Response Rate': 87 },
                    { date: 'Rab', 'Avg Rating': 4.4, 'Response Rate': 86 },
                    { date: 'Kam', 'Avg Rating': 4.6, 'Response Rate': 89 },
                    { date: 'Jum', 'Avg Rating': 4.7, 'Response Rate': 91 },
                    { date: 'Sab', 'Avg Rating': 4.5, 'Response Rate': 88 },
                    { date: 'Min', 'Avg Rating': 4.8, 'Response Rate': 90 },
                ];
        }
    };

    const trendData: TrendData[] = getTrendData();

    // Detailed Breakdown Data
    const getBreakdownData = () => {
        const baseData = [
            { area: 'Kualitas Pelayanan', baseRating: 4.8, baseResponses: 245, baseChange: 5.2 },
            { area: 'Kebersihan', baseRating: 4.2, baseResponses: 198, baseChange: -2.1 },
            { area: 'Rasa Makanan', baseRating: 4.6, baseResponses: 312, baseChange: 1.8 },
            { area: 'Kecepatan', baseRating: 3.9, baseResponses: 156, baseChange: -4.5 },
            { area: 'Suasana', baseRating: 4.4, baseResponses: 178, baseChange: 2.3 },
            { area: 'Nilai untuk Uang', baseRating: 4.1, baseResponses: 134, baseChange: -1.7 },
        ];

        const multiplier = timePeriod === 'day' ? 0.1 : timePeriod === 'month' ? 0.8 : timePeriod === 'year' ? 12 : 1;

        return baseData.map(item => {
            const responses = Math.round(item.baseResponses * multiplier);
            const change = timePeriod === 'day' ? item.baseChange * 2 : timePeriod === 'month' ? item.baseChange * 0.5 : timePeriod === 'year' ? item.baseChange * 0.3 : item.baseChange;
            const direction = change >= 0 ? 'up' as const : 'down' as const;
            const absChange = Math.abs(change);

            let status: 'Good' | 'Monitor' | 'Urgent';
            if (absChange > 3) {
                status = direction === 'up' ? 'Good' : 'Urgent';
            } else if (absChange > 1) {
                status = 'Monitor';
            } else {
                status = 'Good';
            }

            return {
                area: item.area,
                avgRating: `${item.baseRating} / 5`,
                responses,
                trend: { change: absChange, direction },
                status
            };
        });
    };

    const breakdownData = getBreakdownData();

    // Demo plan logic can be added here if needed to slice other data types

    return {
        initialKpi: kpiData,
        initialTrend: trendData,
        initialBreakdown: breakdownData,
        initialReviews: allReviews,
        initialQuestionnaires: getQuestionnaires(),
        initialQrCodes: allQrCodes
    };
};


// Enhanced realistic comment templates based on actual business scenarios
const mockComments: { rating: number, comment: string, topics: string[] }[] = [
    { rating: 5, comment: "Outstanding service! The barista remembered my order and the atmosphere is perfect for remote work.", topics: ["Service Quality", "Customer Experience", "Ambiance"] },
    { rating: 4, comment: "Great coffee and friendly staff. WiFi could be more stable during peak hours.", topics: ["Product Quality", "Service Quality", "Facilities"] },
    { rating: 3, comment: "Decent coffee but prices are on the higher side. Portion sizes could be more generous.", topics: ["Pricing", "Value for Money", "Portion Size"] },
    { rating: 2, comment: "Waited 25 minutes for a simple order. Staff seemed overwhelmed during lunch rush.", topics: ["Service Speed", "Staffing", "Wait Time"] },
    { rating: 1, comment: "Found hair in my food and the manager was unapologetic. Will not return.", topics: ["Cleanliness", "Food Safety", "Management"] },
    { rating: 5, comment: "Love the seasonal pumpkin spice collection! The loyalty app rewards are motivating.", topics: ["Product Innovation", "Digital Experience", "Loyalty Program"] },
    { rating: 4, comment: "Excellent work environment with supportive colleagues. Management could improve communication.", topics: ["Work Environment", "Team Support", "Management Communication"] },
    { rating: 2, comment: "Outdated equipment makes work inefficient. Training programs need updating.", topics: ["Equipment", "Training", "Work Efficiency"] },
    { rating: 5, comment: "The new cold brew is refreshing and perfectly balanced. Great addition to the menu!", topics: ["Product Quality", "Menu Innovation", "Beverage Quality"] },
    { rating: 3, comment: "Mobile app is user-friendly but delivery times are inconsistent. Packaging needs improvement.", topics: ["Digital Experience", "Delivery Service", "Packaging"] },
    { rating: 4, comment: "Great variety of dietary options. The vegan pastries are surprisingly delicious!", topics: ["Menu Variety", "Dietary Options", "Product Quality"] },
    { rating: 2, comment: "Parking is always a challenge and the outdoor seating area needs maintenance.", topics: ["Parking", "Facilities", "Maintenance"] },
    { rating: 5, comment: "Outstanding training program and clear career progression path. Feel valued as an employee.", topics: ["Training", "Career Development", "Employee Recognition"] },
    { rating: 3, comment: "Work-life balance is difficult during peak seasons. Compensation could be more competitive.", topics: ["Work-Life Balance", "Compensation", "Workload"] },
    { rating: 4, comment: "The loyalty program benefits are excellent. Customer service resolves issues quickly.", topics: ["Loyalty Program", "Customer Service", "Issue Resolution"] }
];

export const generateMockReview = (questionnaireId?: number): Review => {
    const randomData = mockComments[Math.floor(Math.random() * mockComments.length)];
    const rating = randomData.rating;
    const sentiment = rating >= 4 ? Sentiment.Positive : rating === 3 ? Sentiment.Neutral : Sentiment.Negative;
    
    // More realistic source distribution
    const sources = ['QR Scan', 'Google Maps', 'Gojek', 'Website', 'Mobile App', 'Email Survey'];
    const source = sources[Math.floor(Math.random() * sources.length)];

    // Select questionnaire based on source or provided ID
    let selectedQuestionnaire: Questionnaire;
    if (questionnaireId) {
        selectedQuestionnaire = allQuestionnaires.find(q => q.id === questionnaireId) || allQuestionnaires[0];
    } else {
        // Higher probability for customer satisfaction surveys
        const weights = [0.4, 0.2, 0.25, 0.1, 0.05]; // weights for each questionnaire
        const random = Math.random();
        let cumulative = 0;
        for (let i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (random < cumulative) {
                selectedQuestionnaire = allQuestionnaires[i];
                break;
            }
        }
        selectedQuestionnaire = allQuestionnaires[0]; // fallback
    }

    // Realistic status based on rating and random factors
    let status: ReviewStatus;
    const randomFactor = Math.random();
    if (rating >= 4) {
        status = randomFactor > 0.3 ? ReviewStatus.Resolved : ReviewStatus.New;
    } else if (rating === 3) {
        status = randomFactor > 0.5 ? ReviewStatus.InProgress : ReviewStatus.New;
    } else {
        status = randomFactor > 0.2 ? ReviewStatus.InProgress : ReviewStatus.New;
    }

    // Generate realistic timestamp (more recent reviews are more likely)
    const hoursAgo = Math.floor(Math.pow(Math.random(), 2) * 168); // 0-168 hours ago, weighted towards recent
    const timestamp = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    return {
        id: Date.now() + Math.random(),
        rating: rating,
        comment: randomData.comment,
        timestamp: timestamp,
        source: source,
        tags: [randomData.topics[0]],
        status: status,
        sentiment: sentiment,
        topics: randomData.topics,
        questionnaireId: selectedQuestionnaire.id,
        questionnaireName: selectedQuestionnaire.name,
    };
};

// Enhanced realistic analytics data generators based on questionnaire types
export const generateMockBubbleAnalytics = (questionnaireId: number): BubbleAnalytics => {
    const questionnaire = allQuestionnaires.find(q => q.id === questionnaireId);
    
    // Define categories based on questionnaire type
    const categoryTemplates = {
        'Customer Satisfaction Survey 1': [
            { name: 'Service Quality', baseRating: 4.3, baseResponses: 45 },
            { name: 'Product Quality', baseRating: 4.5, baseResponses: 52 },
            { name: 'Ambiance', baseRating: 4.1, baseResponses: 38 },
            { name: 'Cleanliness', baseRating: 4.6, baseResponses: 41 },
            { name: 'Value for Money', baseRating: 3.8, baseResponses: 35 },
            { name: 'Wait Time', baseRating: 3.9, baseResponses: 29 }
        ],
        'Employee Engagement Survey 2': [
            { name: 'Work Environment', baseRating: 4.2, baseResponses: 12 },
            { name: 'Management Support', baseRating: 3.9, baseResponses: 11 },
            { name: 'Work-Life Balance', baseRating: 3.5, baseResponses: 10 },
            { name: 'Career Growth', baseRating: 4.1, baseResponses: 9 },
            { name: 'Compensation', baseRating: 3.4, baseResponses: 8 },
            { name: 'Team Collaboration', baseRating: 4.4, baseResponses: 11 }
        ],
        'Product Feedback Form 3': [
            { name: 'Coffee Quality', baseRating: 4.6, baseResponses: 28 },
            { name: 'Food Quality', baseRating: 4.2, baseResponses: 24 },
            { name: 'Menu Variety', baseRating: 4.0, baseResponses: 19 },
            { name: 'Price Fairness', baseRating: 3.7, baseResponses: 22 },
            { name: 'Portion Size', baseRating: 3.9, baseResponses: 18 },
            { name: 'Dietary Options', baseRating: 4.3, baseResponses: 15 }
        ]
    };

    const template = categoryTemplates[questionnaire?.name as keyof typeof categoryTemplates] || categoryTemplates['Customer Satisfaction Survey 1'];
    
    const categories = template.map(template => {
        // Add realistic variation
        const rating = Math.max(1, Math.min(5, template.baseRating + (Math.random() - 0.5) * 0.8));
        const responseCount = Math.max(5, Math.round(template.baseResponses * (0.8 + Math.random() * 0.4)));
        const responseRate = Math.round(70 + Math.random() * 25);
        
        // Determine color and trend based on rating
        let color: 'red' | 'yellow' | 'green';
        let trend: 'improving' | 'stable' | 'declining';
        
        if (rating >= 4.2) {
            color = 'green';
            trend = Math.random() > 0.3 ? 'improving' : 'stable';
        } else if (rating >= 3.5) {
            color = 'yellow';
            trend = Math.random() > 0.5 ? 'stable' : (Math.random() > 0.5 ? 'improving' : 'declining');
        } else {
            color = 'red';
            trend = Math.random() > 0.4 ? 'improving' : 'declining';
        }
        
        return {
            name: template.name,
            rating: Math.round(rating * 10) / 10,
            response_count: responseCount,
            response_rate: responseRate,
            color,
            trend
        };
    });

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
        questionnaire_id: questionnaireId,
        categories,
        period_comparison: {
            current_period: now.toISOString().split('T')[0],
            previous_period: weekAgo.toISOString().split('T')[0],
            overall_trend: categories.filter(c => c.trend === 'improving').length > categories.filter(c => c.trend === 'declining').length ? 'improving' : 'stable'
        },
        total_responses: categories.reduce((sum, cat) => sum + cat.response_count, 0),
        response_rate: Math.round(categories.reduce((sum, cat) => sum + cat.response_rate, 0) / categories.length),
        generated_at: new Date().toISOString()
    };
};

export const generateMockAnalyticsSummary = (questionnaireId: number): AnalyticsSummaryData => {
    const bubbleAnalytics = generateMockBubbleAnalytics(questionnaireId);
    const categories = bubbleAnalytics.categories;

    const colorDistribution = categories.reduce((acc, cat) => {
        acc[cat.color]++;
        return acc;
    }, { red: 0, yellow: 0, green: 0 });

    const overallRating = categories.reduce((sum, cat) => sum + cat.rating, 0) / categories.length;
    
    // Determine overall trend based on category trends
    const improvingCount = categories.filter(c => c.trend === 'improving').length;
    const decliningCount = categories.filter(c => c.trend === 'declining').length;
    const overallTrend = improvingCount > decliningCount ? 'improving' : 
                        decliningCount > improvingCount ? 'declining' : 'stable';

    return {
        questionnaire_id: questionnaireId,
        total_categories: categories.length,
        overall_rating: Math.round(overallRating * 10) / 10,
        total_responses: categories.reduce((sum, cat) => sum + cat.response_count, 0),
        response_rate: Math.round(categories.reduce((sum, cat) => sum + cat.response_rate, 0) / categories.length),
        color_distribution: colorDistribution,
        overall_trend: overallTrend as 'improving' | 'stable' | 'declining',
        generated_at: new Date().toISOString()
    };
};

export const generateMockTimeComparison = (questionnaireId: number, comparisonType: 'week_over_week' | 'custom' = 'week_over_week'): TimeComparisonData => {
    const bubbleAnalytics = generateMockBubbleAnalytics(questionnaireId);
    const currentCategories = bubbleAnalytics.categories;

    // Generate realistic previous period data with some variation
    const previousCategories = currentCategories.map(cat => {
        const ratingChange = (Math.random() - 0.3) * 0.4; // Slight bias towards improvement
        const responseChange = (Math.random() - 0.2) * 0.3; // Slight bias towards growth
        const rateChange = (Math.random() - 0.4) * 10; // Slight bias towards improvement
        
        const prevRating = Math.max(1, Math.min(5, cat.rating - ratingChange));
        const prevResponses = Math.max(1, Math.round(cat.response_count * (1 - responseChange)));
        const prevRate = Math.max(10, Math.min(100, cat.response_rate - rateChange));
        
        // Determine previous trend
        let prevTrend: 'improving' | 'stable' | 'declining';
        if (prevRating >= 4.2) {
            prevTrend = Math.random() > 0.4 ? 'improving' : 'stable';
        } else if (prevRating >= 3.5) {
            prevTrend = 'stable';
        } else {
            prevTrend = Math.random() > 0.6 ? 'improving' : 'declining';
        }
        
        return {
            ...cat,
            rating: Math.round(prevRating * 10) / 10,
            response_count: prevResponses,
            response_rate: Math.round(prevRate),
            trend: prevTrend
        };
    });

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Calculate realistic trend analysis
    const categoryTrends = currentCategories.map((current, index) => {
        const previous = previousCategories[index];
        const ratingChange = ((current.rating - previous.rating) / previous.rating) * 100;
        const responseChange = ((current.response_count - previous.response_count) / previous.response_count) * 100;
        
        // Use the larger of rating or response change for overall trend
        const changePercentage = Math.max(Math.abs(ratingChange), Math.abs(responseChange));
        
        let trend: 'improving' | 'stable' | 'declining';
        if (current.rating > previous.rating && current.response_count > previous.response_count) {
            trend = 'improving';
        } else if (current.rating < previous.rating && current.response_count < previous.response_count) {
            trend = 'declining';
        } else {
            trend = 'stable';
        }
        
        return {
            category: current.name,
            trend,
            change_percentage: Math.round(changePercentage * 10) / 10
        };
    });

    // Determine overall trend
    const improvingCount = categoryTrends.filter(t => t.trend === 'improving').length;
    const decliningCount = categoryTrends.filter(t => t.trend === 'declining').length;
    const overallTrend = improvingCount > decliningCount ? 'improving' : 
                        decliningCount > improvingCount ? 'declining' : 'stable';

    return {
        questionnaire_id: questionnaireId,
        comparison_type: comparisonType,
        current_period: {
            start_date: weekAgo.toISOString().split('T')[0],
            end_date: now.toISOString().split('T')[0],
            categories: currentCategories
        },
        previous_period: {
            start_date: new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: weekAgo.toISOString().split('T')[0],
            categories: previousCategories
        },
        trend_analysis: {
            overall_trend: overallTrend,
            category_trends: categoryTrends
        }
    };
};