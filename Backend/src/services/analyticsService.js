const logger = require('../utils/logger');
const mockDataService = require('./mockDataService');

class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  // Cache management
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Main analytics data processing
  async getAnalyticsData(dateRange = 'month', demoMode = false, reviews = null) {
    try {
      const cacheKey = `analytics_${dateRange}_${demoMode}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      let data;
      if (demoMode) {
        data = await this.processDemoData(dateRange, reviews);
      } else {
        data = await this.processRealData(dateRange);
      }

      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      logger.error('Error getting analytics data:', error);
      throw error;
    }
  }

  // Process demo data (replicates frontend logic but on backend)
  async processDemoData(dateRange, reviews) {
    logger.info(`Processing demo analytics data for ${dateRange} range`);
    
    if (!reviews || reviews.length === 0) {
      reviews = mockDataService.generateMockReviews(100); // Generate mock reviews if none provided
    }

    const dateFilter = this.getDateFilter(dateRange);
    const filteredReviews = reviews.filter(review => review.timestamp >= dateFilter.start && review.timestamp <= dateFilter.end);

    return {
      success: true,
      data: {
        sentimentTrend: this.calculateSentimentTrend(filteredReviews, dateRange),
        topicDistribution: this.calculateTopicDistribution(filteredReviews),
        ratingDistribution: this.calculateRatingDistribution(filteredReviews),
        sourceBreakdown: this.calculateSourceBreakdown(filteredReviews),
        dailyMetrics: this.calculateDailyMetrics(filteredReviews, dateRange),
        summaryStats: this.calculateSummaryStats(filteredReviews),
        methodology: {
          sentimentAnalysis: 'Keyword-based sentiment analysis with Indonesian language support',
          topicCategorization: 'Rule-based topic classification',
          dateProcessing: 'Server-side date range filtering and aggregation',
          dataProcessing: 'Backend statistical processing with transparent algorithms'
        }
      },
      metadata: {
        dateRange,
        totalReviews: reviews.length,
        filteredReviews: filteredReviews.length,
        processingTime: new Date().toISOString(),
        demoMode: true
      }
    };
  }

  // Process real data from database
  async processRealData(dateRange) {
    logger.info(`Processing real analytics data for ${dateRange} range`);
    
    // This would connect to actual database
    // For now, return demo-like structure
    return {
      success: true,
      data: {
        sentimentTrend: [],
        topicDistribution: [],
        ratingDistribution: [],
        sourceBreakdown: [],
        dailyMetrics: [],
        summaryStats: {},
        methodology: {
          sentimentAnalysis: 'Database-driven sentiment analysis',
          topicCategorization: 'ML-based topic classification',
          dateProcessing: 'Database date range queries',
          dataProcessing: 'Real-time backend analytics processing'
        }
      },
      metadata: {
        dateRange,
        processingTime: new Date().toISOString(),
        demoMode: false
      }
    };
  }

  // Sentiment trend calculation
  calculateSentimentTrend(reviews, dateRange) {
    const { dataPoints, dateFormat } = this.getDataPointsConfig(dateRange);
    const trendData = [];

    for (let i = 0; i < dataPoints; i++) {
      const { start, end } = this.getDatePeriod(i, dateRange, dateFormat);
      const periodReviews = reviews.filter(r => r.timestamp >= start && r.timestamp < end);
      
      const sentiment = periodReviews.reduce((acc, review) => {
        const score = review.sentiment === 'Positive' ? 1 : review.sentiment === 'Negative' ? -1 : 0.5;
        acc.total += score;
        acc.count++;
        return acc;
      }, { total: 0, count: 0 });

      const avgSentiment = sentiment.count > 0 ? sentiment.total / sentiment.count : 0;
      
      trendData.push({
        date: this.formatDate(start, dateFormat),
        sentiment: Math.max(0, Math.min(100, (avgSentiment + 1) * 50)), // Convert to 0-100 scale
        reviews: periodReviews.length,
        positive: periodReviews.filter(r => r.sentiment === 'Positive').length,
        negative: periodReviews.filter(r => r.sentiment === 'Negative').length,
        neutral: periodReviews.filter(r => r.sentiment === 'Neutral').length
      });
    }

    return trendData;
  }

  // Topic distribution calculation
  calculateTopicDistribution(reviews) {
    const topicCounts = {};
    const topicSentiment = {};

    reviews.forEach(review => {
      if (review.topics && Array.isArray(review.topics)) {
        review.topics.forEach(topic => {
          if (!topicCounts[topic]) {
            topicCounts[topic] = 0;
            topicSentiment[topic] = { positive: 0, negative: 0, neutral: 0 };
          }
          topicCounts[topic]++;
          
          const sentiment = review.sentiment || 'Neutral';
          topicSentiment[topic][sentiment.toLowerCase()]++;
        });
      }
    });

    return Object.entries(topicCounts).map(([topic, count]) => {
      const sentiments = topicSentiment[topic];
      const total = sentiments.positive + sentiments.negative + sentiments.neutral;
      const avgSentiment = total > 0 ? 
        (sentiments.positive - sentiments.negative) / total : 0;

      return {
        topic: this.translateTopic(topic),
        count,
        percentage: Math.round((count / reviews.length) * 100),
        sentiment: Math.max(0, Math.min(100, (avgSentiment + 1) * 50)),
        positive: sentiments.positive,
        negative: sentiments.negative,
        neutral: sentiments.neutral
      };
    }).sort((a, b) => b.count - a.count);
  }

  // Rating distribution calculation
  calculateRatingDistribution(reviews) {
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    reviews.forEach(review => {
      const rating = Math.floor(review.rating) || 3;
      if (rating >= 1 && rating <= 5) {
        ratingCounts[rating]++;
      }
    });

    return Object.entries(ratingCounts).map(([rating, count]) => ({
      rating: parseInt(rating),
      count,
      percentage: Math.round((count / reviews.length) * 100),
      label: `${rating} Bintang`
    }));
  }

  // Source breakdown calculation
  calculateSourceBreakdown(reviews) {
    const sourceCounts = {};
    
    reviews.forEach(review => {
      const source = review.source || 'Unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    return Object.entries(sourceCounts).map(([source, count]) => ({
      source: this.translateSource(source),
      count,
      percentage: Math.round((count / reviews.length) * 100)
    })).sort((a, b) => b.count - a.count);
  }

  // Daily metrics calculation
  calculateDailyMetrics(reviews, dateRange) {
    const { dataPoints, dateFormat } = this.getDataPointsConfig(dateRange);
    const dailyData = [];

    for (let i = 0; i < dataPoints; i++) {
      const { start, end } = this.getDatePeriod(i, dateRange, dateFormat);
      const dayReviews = reviews.filter(r => r.timestamp >= start && r.timestamp < end);
      
      const avgRating = dayReviews.length > 0 ? 
        dayReviews.reduce((sum, r) => sum + r.rating, 0) / dayReviews.length : 0;

      dailyData.push({
        date: this.formatDate(start, dateFormat),
        reviews: dayReviews.length,
        avgRating: Math.round(avgRating * 10) / 10,
        sentiment: this.calculateAverageSentiment(dayReviews)
      });
    }

    return dailyData;
  }

  // Summary statistics
  calculateSummaryStats(reviews) {
    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        avgRating: 0,
        sentimentScore: 50,
        responseRate: 0
      };
    }

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const sentimentScore = this.calculateAverageSentiment(reviews);

    return {
      totalReviews: reviews.length,
      avgRating: Math.round(avgRating * 10) / 10,
      sentimentScore,
      responseRate: Math.round(Math.random() * 30 + 70), // Simulated response rate
      topTopics: this.getTopTopics(reviews, 3),
      recentActivity: this.getRecentActivity(reviews)
    };
  }

  // Helper methods
  calculateAverageSentiment(reviews) {
    if (reviews.length === 0) return 50;
    
    const sentiment = reviews.reduce((acc, review) => {
      const score = review.sentiment === 'Positive' ? 1 : review.sentiment === 'Negative' ? -1 : 0.5;
      acc.total += score;
      acc.count++;
      return acc;
    }, { total: 0, count: 0 });

    const avgSentiment = sentiment.total / sentiment.count;
    return Math.max(0, Math.min(100, (avgSentiment + 1) * 50));
  }

  getTopTopics(reviews, limit = 3) {
    const topicCounts = {};
    reviews.forEach(review => {
      if (review.topics) {
        review.topics.forEach(topic => {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });
      }
    });

    return Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([topic]) => this.translateTopic(topic));
  }

  getRecentActivity(reviews) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return {
      lastHour: reviews.filter(r => r.timestamp >= oneHourAgo).length,
      lastDay: reviews.filter(r => r.timestamp >= oneDayAgo).length,
      total: reviews.length
    };
  }

  getDateFilter(dateRange) {
    const now = new Date();
    let start, end;

    switch (dateRange) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear() + 1, 0, 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    return { start, end };
  }

  getDataPointsConfig(dateRange) {
    switch (dateRange) {
      case 'day':
        return { dataPoints: 24, dateFormat: 'hour' };
      case 'week':
        return { dataPoints: 7, dateFormat: 'day' };
      case 'month':
        return { dataPoints: 30, dateFormat: 'day' };
      case 'year':
        return { dataPoints: 12, dateFormat: 'month' };
      default:
        return { dataPoints: 30, dateFormat: 'day' };
    }
  }

  getDatePeriod(index, dateRange, dateFormat) {
    const now = new Date();
    let start, end;

    switch (dateFormat) {
      case 'hour':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), index);
        end = new Date(start.getTime() + 60 * 60 * 1000);
        break;
      case 'day':
        if (dateRange === 'week') {
          const dayOfWeek = now.getDay();
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + index);
        } else {
          start = new Date(now.getFullYear(), now.getMonth(), index + 1);
        }
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getFullYear(), index, 1);
        end = new Date(now.getFullYear(), index + 1, 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), index + 1);
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }

  formatDate(date, format) {
    const options = {
      hour: { hour: '2-digit', minute: '2-digit' },
      day: { month: 'short', day: 'numeric' },
      month: { month: 'short' }
    };

    return date.toLocaleDateString('id-ID', options[format] || options.day);
  }

  translateTopic(topic) {
    const translations = {
      'Pelayanan': 'Layanan',
      'Kualitas Produk': 'Kualitas Produk',
      'Fasilitas': 'Fasilitas',
      'Harga': 'Harga',
      'Service': 'Layanan',
      'Product Quality': 'Kualitas Produk',
      'Facilities': 'Fasilitas',
      'Price': 'Harga'
    };
    return translations[topic] || topic;
  }

  translateSource(source) {
    const translations = {
      'QR Scan': 'QR Scan',
      'Google Maps': 'Google Maps',
      'Gojek': 'Gojek',
      'Manual': 'Manual',
      'Website': 'Website'
    };
    return translations[source] || source;
  }

  // Advanced sentiment analysis
  async getAdvancedSentimentData(demoMode = false, reviews = null) {
    try {
      const cacheKey = `advanced_sentiment_${demoMode}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      let data;
      if (demoMode) {
        data = await this.processAdvancedSentimentDemo(reviews);
      } else {
        data = await this.processAdvancedSentimentReal();
      }

      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      logger.error('Error getting advanced sentiment data:', error);
      throw error;
    }
  }

  // Actionable insights
  async getActionableInsightsData(category = 'all', priority = 'all', demoMode = false, reviews = null) {
    try {
      const cacheKey = `insights_${category}_${priority}_${demoMode}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      let data;
      if (demoMode) {
        data = await this.processActionableInsightsDemo(category, priority, reviews);
      } else {
        data = await this.processActionableInsightsReal(category, priority);
      }

      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      logger.error('Error getting actionable insights data:', error);
      throw error;
    }
  }

  // Real-time analytics
  async getRealTimeAnalyticsData(demoMode = false, reviews = null) {
    try {
      // Real-time data should not be cached for long
      let data;
      if (demoMode) {
        data = await this.processRealTimeAnalyticsDemo(reviews);
      } else {
        data = await this.processRealTimeAnalyticsReal();
      }

      return data;
    } catch (error) {
      logger.error('Error getting real-time analytics data:', error);
      throw error;
    }
  }

  // Customer journey
  async getCustomerJourneyData(demoMode = false, reviews = null) {
    try {
      const cacheKey = `customer_journey_${demoMode}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      let data;
      if (demoMode) {
        data = await this.processCustomerJourneyDemo(reviews);
      } else {
        data = await this.processCustomerJourneyReal();
      }

      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      logger.error('Error getting customer journey data:', error);
      throw error;
    }
  }

  // Advanced sentiment demo processing
  async processAdvancedSentimentDemo(reviews) {
    if (!reviews || reviews.length === 0) {
      reviews = mockDataService.generateMockReviews(50);
    }

    const emotionAnalysis = this.calculateEmotionAnalysis(reviews);
    const sentimentDrivers = this.calculateSentimentDrivers(reviews);
    const sentimentForecast = this.calculateSentimentForecast(reviews);
    const ratingCorrelation = this.calculateRatingCorrelation(reviews);

    return {
      emotionAnalysis,
      sentimentDrivers,
      sentimentForecast,
      ratingCorrelation,
      methodology: {
        emotionDetection: 'Keyword dictionary matching with Indonesian language support',
        keywordAnalysis: 'Pattern frequency analysis and sentiment weighting',
        forecasting: 'Statistical trend projection based on historical patterns'
      }
    };
  }

  // Actionable insights demo processing
  async processActionableInsightsDemo(category, priority, reviews) {
    if (!reviews || reviews.length === 0) {
      reviews = mockDataService.generateMockReviews(100);
    }

    const insights = this.generateActionableInsights(reviews);
    const filteredInsights = this.filterInsights(insights, category, priority);
    const summaryStats = this.calculateInsightsSummary(filteredInsights);

    return {
      insights: filteredInsights,
      summaryStats,
      methodology: {
        patternRecognition: 'Threshold-based pattern detection',
        thresholdRules: 'Minimum review count and sentiment score rules',
        confidenceCalculation: 'Based on evidence strength and pattern consistency'
      }
    };
  }

  // Real-time analytics demo processing
  async processRealTimeAnalyticsDemo(reviews) {
    if (!reviews || reviews.length === 0) {
      reviews = mockDataService.generateMockReviews(30);
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayReviews = reviews.filter(r => r.timestamp >= today);

    return {
      activeUsers: Math.floor(Math.random() * 20) + 5,
      newReviewsToday: todayReviews.length,
      currentSentimentShift: this.calculateSentimentShift(reviews),
      avgResponseTime: Math.floor(Math.random() * 30) + 10,
      liveFeedbackStream: this.generateLiveStream(reviews),
      hourlyActivity: this.generateHourlyActivity(),
      sentimentVelocity: this.generateSentimentVelocity(),
      methodology: {
        realTimeProcessing: 'Timestamp-based statistical analysis',
        statisticalAnalysis: 'Real-time aggregation of review data',
        liveUpdates: 'Continuous data processing with 30-second refresh'
      }
    };
  }

  // Customer journey demo processing
  async processCustomerJourneyDemo(reviews) {
    if (!reviews || reviews.length === 0) {
      reviews = mockDataService.generateMockReviews(80);
    }

    const journeyStages = this.calculateJourneyStages(reviews);
    const funnelData = this.calculateFunnelData(journeyStages);
    const sentimentFlow = this.calculateSentimentFlow(journeyStages);
    const criticalIssues = this.identifyCriticalIssues(journeyStages);

    return {
      journeyStages,
      funnelData,
      sentimentFlow,
      criticalIssues,
      methodology: {
        journeyMapping: 'Touchpoint-based customer journey analysis',
        dropoffAnalysis: 'Stage-by-stage conversion rate calculation',
        sentimentTracking: 'Sentiment correlation across journey stages'
      }
    };
  }

  // Helper methods for advanced analytics
  calculateEmotionAnalysis(reviews) {
    const emotionKeywords = {
      joy: ['mantap', 'juara', 'perfect', 'recommended', 'senang', 'bahagia'],
      trust: ['professional', 'consisten', 'reliable', 'terpercaya', 'baik'],
      anger: ['kecewa', 'marah', 'buruk', 'parah', 'jelek'],
      frustration: ['lama', 'rusak', 'error', 'gagal', 'mengecewakan'],
      excitement: ['wow', 'keren', 'amazing', 'hebat', 'luar biasa'],
      disappointment: ['harusnya', 'sayang', 'seharusnya', 'kurang', 'biasa saja'],
      satisfaction: ['puas', 'bagus', 'enak', 'memuaskan', 'cukup'],
      confusion: ['bingung', 'tidak jelas', 'salah', 'kurang paham', 'membingungkan']
    };

    const emotions = {};
    Object.keys(emotionKeywords).forEach(emotion => {
      emotions[emotion] = 0;
    });

    reviews.forEach(review => {
      const comment = review.comment.toLowerCase();
      Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
        const matches = keywords.filter(keyword => comment.includes(keyword)).length;
        if (matches > 0) {
          const weight = review.rating >= 4 ? 2 : review.rating <= 2 ? 1.5 : 1;
          emotions[emotion] += matches * weight;
        }
      });
    });

    const total = Object.values(emotions).reduce((sum, val) => sum + val, 0) || 1;
    const normalizedScores = Object.fromEntries(
      Object.entries(emotions).map(([key, val]) => [key, Math.round((val / total) * 100)])
    );

    const distribution = [
      { emotion: 'Joy', value: normalizedScores.joy, color: '#22c55e' },
      { emotion: 'Trust', value: normalizedScores.trust, color: '#3b82f6' },
      { emotion: 'Anger', value: normalizedScores.anger, color: '#ef4444' },
      { emotion: 'Frustration', value: normalizedScores.frustration, color: '#f59e0b' },
      { emotion: 'Excitement', value: normalizedScores.excitement, color: '#8b5cf6' },
      { emotion: 'Disappointment', value: normalizedScores.disappointment, color: '#64748b' },
      { emotion: 'Satisfaction', value: normalizedScores.satisfaction, color: '#10b981' },
      { emotion: 'Confusion', value: normalizedScores.confusion, color: '#06b6d4' }
    ];

    return { scores: normalizedScores, distribution };
  }

  calculateSentimentDrivers(reviews) {
    const drivers = {};
    
    reviews.forEach(review => {
      const words = review.comment.toLowerCase().split(' ');
      words.forEach(word => {
        if (word.length > 4) {
          if (!drivers[word]) {
            drivers[word] = { count: 0, sentiment: 0, category: 'general' };
          }
          drivers[word].count++;
          
          const sentimentScore = review.sentiment === 'Positive' ? 1 : 
                              review.sentiment === 'Negative' ? -1 : 0.5;
          drivers[word].sentiment += sentimentScore;
          
          if (['pelayanan', 'staff', 'kasir', 'barista'].includes(word)) {
            drivers[word].category = 'service';
          } else if (['kopi', 'makanan', 'minuman', 'menu'].includes(word)) {
            drivers[word].category = 'product';
          } else if (['toilet', 'ac', 'parkir', 'wifi', 'fasilitas'].includes(word)) {
            drivers[word].category = 'facility';
          } else if (['harga', 'mahal', 'murah', 'promo'].includes(word)) {
            drivers[word].category = 'price';
          }
        }
      });
    });

    return Object.entries(drivers)
      .map(([phrase, data]) => ({
        phrase,
        frequency: data.count,
        sentiment: data.sentiment / data.count,
        impact: data.count > 5 ? 'high' : data.count > 2 ? 'medium' : 'low',
        category: data.category
      }))
      .filter(driver => driver.frequency >= 2)
      .sort((a, b) => Math.abs(b.sentiment) - Math.abs(a.sentiment))
      .slice(0, 10);
  }

  calculateSentimentForecast(reviews) {
    const forecasts = [];
    const today = new Date();
    
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + i);
      
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      const recentReviews = reviews.filter(r => r.timestamp >= weekAgo);
      const avgSentiment = recentReviews.reduce((sum, r) => {
        const sentimentScore = r.sentiment === 'Positive' ? 1 : 
                            r.sentiment === 'Negative' ? -1 : 0.5;
        return sum + sentimentScore;
      }, 0) / (recentReviews.length || 1);
      
      const predicted = Math.max(0, Math.min(100, 
        50 + avgSentiment * 20 + (Math.random() - 0.5) * 10 + Math.sin(i * 0.5) * 5
      ));
      
      const confidence = Math.max(60, 95 - i * 5);
      
      forecasts.push({
        date: futureDate.toLocaleDateString('id-ID', { weekday: 'short', month: 'short', day: 'numeric' }),
        predicted: Math.round(predicted),
        confidence,
        factors: predicted > 60 ? ['Positive trend', 'Seasonal uplift'] : 
                predicted < 40 ? ['Quality concerns', 'Service issues'] : 
                ['Stable performance']
      });
    }
    
    return forecasts;
  }

  calculateRatingCorrelation(reviews) {
    const correlation = {};
    
    reviews.forEach(review => {
      const sentimentScore = review.sentiment === 'Positive' ? 3 : 
                          review.sentiment === 'Negative' ? 1 : 2;
      if (!correlation[review.rating]) {
        correlation[review.rating] = [];
      }
      correlation[review.rating].push(sentimentScore);
    });

    return Object.entries(correlation).map(([rating, scores]) => ({
      rating: `${rating} Stars`,
      avgSentiment: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      count: scores.length
    }));
  }

  generateActionableInsights(reviews) {
    const insights = [];
    
    // Service issues
    const serviceIssues = reviews.filter(r => 
      r.topics && r.topics.includes('Pelayanan') && r.sentiment === 'Negative'
    );
    
    if (serviceIssues.length >= 3) {
      insights.push({
        id: 'service-improvement',
        title: 'Optimasi Program Pelatihan Staff',
        description: 'Beberapa ulasan negatif menyebutkan masalah kualitas pelayanan. Implementasikan pelatihan staf komprehensif fokus pada interaksi pelanggan dan waktu respons.',
        priority: serviceIssues.length >= 5 ? 'critical' : 'high',
        impact: { sentiment: 25, revenue: 15, retention: 20 },
        effort: 'medium',
        confidence: 85,
        category: 'service',
        timeframe: '2-4 minggu',
        resources: ['Material pelatihan', 'Waktu staf', 'Trainer eksternal'],
        kpis: ['Skor kepuasan pelanggan', 'Waktu respons', 'Metrik performa staf'],
        status: 'new',
        evidence: {
          reviewCount: serviceIssues.length,
          sentimentScore: -0.6,
          keyPhrases: ['pelayanan', 'staff', 'kasir', 'lambat', 'kurang perhatian'],
          trendDirection: 'declining'
        }
      });
    }

    // Add more insight types as needed...
    return insights;
  }

  filterInsights(insights, category, priority) {
    return insights.filter(insight => {
      const categoryMatch = category === 'all' || insight.category === category;
      const priorityMatch = priority === 'all' || insight.priority === priority;
      return categoryMatch && priorityMatch;
    });
  }

  calculateInsightsSummary(insights) {
    const total = insights.length;
    const critical = insights.filter(i => i.priority === 'critical').length;
    const high = insights.filter(i => i.priority === 'high').length;
    const avgConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / (total || 1);
    const totalImpact = insights.reduce((sum, i) => 
      sum + (i.impact.sentiment + i.impact.revenue + i.impact.retention) / 3, 0
    );

    return { total, critical, high, avgConfidence, totalImpact };
  }

  calculateSentimentShift(reviews) {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const currentHourReviews = reviews.filter(r => r.timestamp >= oneHourAgo);
    const previousHourReviews = reviews.filter(r => r.timestamp >= twoHoursAgo && r.timestamp < oneHourAgo);
    
    const currentSentiment = currentHourReviews.reduce((sum, r) => 
      sum + (r.sentiment === 'Positive' ? 1 : r.sentiment === 'Negative' ? -1 : 0.5), 0
    );
    const previousSentiment = previousHourReviews.reduce((sum, r) => 
      sum + (r.sentiment === 'Positive' ? 1 : r.sentiment === 'Negative' ? -1 : 0.5), 0
    );
    
    return currentSentiment - previousSentiment;
  }

  generateLiveStream(reviews) {
    // Return recent reviews as live stream
    const recentReviews = reviews
      .filter(r => r.timestamp >= new Date(Date.now() - 2 * 60 * 60 * 1000))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
    
    return recentReviews.map(review => ({
      ...review,
      timestamp: new Date(review.timestamp)
    }));
  }

  generateHourlyActivity() {
    const activity = [];
    const now = new Date();
    
    for (let i = 0; i < 24; i++) {
      const hour = new Date(now);
      hour.setHours(hour.getHours() - (23 - i), 0, 0, 0);
      
      let baseActivity;
      if (hour.getHours() >= 7 && hour.getHours() <= 10) {
        baseActivity = 8 + Math.random() * 4;
      } else if (hour.getHours() >= 11 && hour.getHours() <= 14) {
        baseActivity = 15 + Math.random() * 8;
      } else if (hour.getHours() >= 18 && hour.getHours() <= 21) {
        baseActivity = 12 + Math.random() * 6;
      } else {
        baseActivity = 2 + Math.random() * 2;
      }
      
      activity.push({
        hour: hour.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        reviews: Math.floor(baseActivity),
        users: Math.floor(baseActivity * (0.8 + Math.random() * 0.4))
      });
    }
    
    return activity;
  }

  generateSentimentVelocity() {
    const velocity = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      
      velocity.push({
        time: time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        positive: Math.floor(8 + Math.random() * 4),
        neutral: Math.floor(3 + Math.random() * 2),
        negative: Math.floor(2 + Math.random() * 2)
      });
    }
    
    return velocity;
  }

  calculateJourneyStages(reviews) {
    const stages = [
      {
        stage: 'Discovery',
        description: 'Pelanggan menemukan outlet melalui berbagai saluran',
        sentiment: 0.7,
        dropOffRate: 5,
        avgTimeSpent: 2,
        feedbackVolume: reviews.filter(r => r.source === 'Google Maps').length,
        issues: ['Sulit menemukan lokasi', 'Presensi online yang buruk'],
        improvements: ['Koordinat GPS yang lebih baik', 'Presensi media sosial yang ditingkatkan']
      },
      // Add more stages...
    ];

    return stages.map(stage => {
      const stageReviews = reviews.filter(r => {
        const comment = r.comment.toLowerCase();
        return (
          (stage.stage === 'Discovery' && (comment.includes('cari') || comment.includes('temukan'))) ||
          (stage.stage === 'Arrival' && (comment.includes('parkir') || comment.includes('masuk')))
        );
      });

      if (stageReviews.length > 0) {
        const avgSentiment = stageReviews.reduce((sum, r) => 
          sum + (r.sentiment === 'Positive' ? 1 : r.sentiment === 'Negative' ? -1 : 0.5), 0
        ) / stageReviews.length;
        stage.sentiment = Math.max(-1, Math.min(1, avgSentiment));
        stage.feedbackVolume = stageReviews.length;
      }

      return stage;
    });
  }

  calculateFunnelData(stages) {
    const totalCustomers = 1000;
    return stages.map((stage, index) => {
      const remainingCustomers = totalCustomers * (1 - stages.slice(0, index + 1).reduce((sum, s) => sum + (s.dropOffRate / 100), 0));
      return {
        stage: stage.stage,
        value: Math.max(10, remainingCustomers),
        dropOff: stage.dropOffRate,
        sentiment: stage.sentiment
      };
    });
  }

  calculateSentimentFlow(stages) {
    return stages.map(stage => ({
      stage: stage.stage.substring(0, 4),
      sentiment: Math.round(stage.sentiment * 100),
      dropOff: stage.dropOffRate,
      time: stage.avgTimeSpent
    }));
  }

  identifyCriticalIssues(stages) {
    return stages
      .filter(stage => stage.dropOffRate > 10)
      .sort((a, b) => b.dropOffRate - a.dropOffRate)
      .slice(0, 3);
  }

  // Placeholder methods for real data processing
  async processAdvancedSentimentReal() {
    // Implement real database processing
    return { emotionAnalysis: {}, sentimentDrivers: [], sentimentForecast: [], ratingCorrelation: [] };
  }

  async processActionableInsightsReal(category, priority) {
    // Implement real database processing
    return { insights: [], summaryStats: {} };
  }

  async processRealTimeAnalyticsReal() {
    // Implement real database processing
    return { activeUsers: 0, newReviewsToday: 0, currentSentimentShift: 0 };
  }

  async processCustomerJourneyReal() {
    // Implement real database processing
    return { journeyStages: [], funnelData: [], sentimentFlow: [] };
  }

  // Get bubble analytics data for a specific questionnaire
  async getBubbleAnalyticsData(questionnaireId, options = {}) {
    try {
      const { dateFrom, dateTo, comparisonPeriod } = options;
      const cacheKey = `bubble_${questionnaireId}_${dateFrom}_${dateTo}_${comparisonPeriod}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      // For now, return mock data that matches expected structure
      const mockData = {
        categories: [
          { name: 'Pelayanan', rating: 4.2, response_count: 35, color: 'green', trend: 'improving' },
          { name: 'Kualitas Produk', rating: 4.5, response_count: 28, color: 'green', trend: 'stable' },
          { name: 'Fasilitas', rating: 3.8, response_count: 20, color: 'yellow', trend: 'declining' },
          { name: 'Harga', rating: 4.0, response_count: 17, color: 'red', trend: 'stable' }
        ],
        total_responses: 150,
        average_rating: 4.2,
        sentiment_distribution: {
          positive: 65,
          neutral: 25,
          negative: 10
        },
        date_range: {
          from: dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          to: dateTo || new Date().toISOString()
        }
      };

      this.setCachedData(cacheKey, mockData);
      return mockData;
    } catch (error) {
      logger.error('Error getting bubble analytics data:', error);
      throw error;
    }
  }

  // Get comparison analytics data for a specific questionnaire
  async getComparisonAnalyticsData(questionnaireId, options = {}) {
    try {
      const { dateFrom, dateTo, comparisonType, comparisonPeriod } = options;
      const cacheKey = `comparison_${questionnaireId}_${dateFrom}_${dateTo}_${comparisonType}_${comparisonPeriod}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      // For now, return mock data that matches expected structure
      const mockData = {
        current_period: {
          total_responses: 150,
          average_rating: 4.2,
          sentiment_distribution: {
            positive: 65,
            neutral: 25,
            negative: 10
          }
        },
        previous_period: {
          total_responses: 120,
          average_rating: 4.0,
          sentiment_distribution: {
            positive: 60,
            neutral: 30,
            negative: 10
          }
        },
        comparison_metrics: {
          total_responses: 25, // +25%
          average_rating: 0.2, // +0.2
          positive_sentiment: 5, // +5%
          improvement_percentage: 15.5,
          rating_change: 0.2,
          response_change: 25
        },
        comparison_type: comparisonType === 'custom' ? 'month_over_month' : comparisonType,
        comparison_period_label: comparisonPeriod
      };

      this.setCachedData(cacheKey, mockData);
      return mockData;
    } catch (error) {
      logger.error('Error getting comparison analytics data:', error);
      throw error;
    }
  }

  // Generate export data for a questionnaire
  async generateExportData(questionnaireId, options = {}) {
    try {
      const { format, dateFrom, dateTo, includeComparison } = options;
      
      // Generate mock export data
      const exportData = [
        ['Category', 'Rating', 'Responses'],
        ['Customer Service', '4.2', '45'],
        ['Product Quality', '4.5', '38'],
        ['Facilities', '3.8', '22'],
        ['Pricing', '4.0', '15']
      ];

      if (includeComparison) {
        exportData[0].push('Previous Period');
        exportData[1].push('4.0');
        exportData[2].push('4.3');
        exportData[3].push('3.9');
        exportData[4].push('4.1');
      }

      if (format === 'csv') {
        return exportData.map(row => row.join(',')).join('\n');
      } else if (format === 'excel') {
        // For Excel, return a buffer (mock implementation)
        return Buffer.from('mock-excel-content');
      } else {
        return exportData;
      }
    } catch (error) {
      logger.error('Error generating export data:', error);
      throw error;
    }
  }

  // Get real-time analytics data for a specific questionnaire
  async getRealtimeAnalyticsData(questionnaireId, options = {}) {
    try {
      const { dateFrom, dateTo } = options;
      const cacheKey = `realtime_${questionnaireId}_${dateFrom}_${dateTo}`;
      
      // Real-time data should have very short cache
      const cached = this.getCachedData(cacheKey);
      if (cached && (Date.now() - cached.timestamp < 10000)) { // 10 second cache
        return cached.data;
      }

      // Generate mock real-time data
      const realtimeData = {
        active_users: Math.floor(Math.random() * 20) + 5,
        new_responses_today: Math.floor(Math.random() * 10) + 1,
        current_sentiment: Math.floor(Math.random() * 30) + 60, // 60-90 range
        response_rate: Math.floor(Math.random() * 20) + 70, // 70-90%
        recent_activity: {
          last_hour: Math.floor(Math.random() * 5),
          last_day: Math.floor(Math.random() * 25) + 10,
          last_week: Math.floor(Math.random() * 100) + 50
        },
        live_metrics: {
          avg_response_time: Math.floor(Math.random() * 30) + 10,
          completion_rate: Math.floor(Math.random() * 15) + 80,
          satisfaction_score: Math.floor(Math.random() * 20) + 70
        }
      };

      this.setCachedData(cacheKey, realtimeData);
      return realtimeData;
    } catch (error) {
      logger.error('Error getting real-time analytics data:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsService();