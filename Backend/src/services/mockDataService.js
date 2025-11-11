const logger = require('../utils/logger');

class MockDataService {
  constructor() {
    this.indonesianNames = [
      'Budi Santoso', 'Siti Nurhaliza', 'Ahmad Fauzi', 'Dewi Lestari', 'Rudi Hartono',
      'Maya Sari', 'Joko Widodo', 'Rina Amelia', 'Eko Prasetyo', 'Indah Permata',
      'Andi Wijaya', 'Fitri Handayani', 'Hendra Kusuma', 'Wati Susanti', 'Bambang Sutrisno',
      'Nina Kartika', 'Doni Hermawan', 'Lisa Permata', 'Rizki Ahmad', 'Sri Wahyuni'
    ];

    this.positiveComments = [
      'mantap sekali pelayanannya', 'enak banget makanannya', 'staff sangat ramah dan helpful',
      'tempat nyaman dan bersih', 'harga terjangkau kualitas premium', 'recommended banget',
      'juara! pasti akan kembali lagi', 'perfect! sesuai ekspektasi', 'sangat puas dengan pengalaman',
      'top banget! worth it', 'keren tempatnya', 'senang sekali datang kesini',
      'pelayanan terbaik!', 'kualitas produk luar biasa', 'fasilitas lengkap dan memadai',
      'cepat dan efisien', 'sangat memuaskan', 'pasti recommend ke teman-teman'
    ];

    this.negativeComments = [
      'pelayanan sangat lambat', 'staff kurang ramah', 'makanan kurang enak',
      'harga terlalu mahal', 'tempat kurang bersih', 'fasilitas perlu perbaikan',
      'antri terlalu lama', 'kurang perhatian ke pelanggan', 'produk tidak sesuai harapan',
      'sangat kecewa', 'buruk sekali pelayanannya', 'tidak akan datang lagi',
      'perlu banyak perbaikan', 'staff tidak profesional', 'waktu tunggu terlalu lama',
      'kualitas menurun drastis', 'sangat tidak direkomendasikan'
    ];

    this.neutralComments = [
      'biasa saja', 'cukup lumayan', 'standar saja', 'tidak ada yang spesial',
      'sesuai harga', 'pelayanan standar', 'tempat biasa', 'makanan biasa',
      'normal-normal saja', 'tidak terlalu bagus tapi tidak jelek', 'cukup untuk sekali mampir',
      'masih bisa diperbaiki', 'standar tempat makan pada umumnya'
    ];

    this.topics = ['Pelayanan', 'Kualitas Produk', 'Fasilitas', 'Harga'];
    this.sources = ['QR Scan', 'Google Maps', 'Gojek', 'Manual', 'Website'];
  }

  // Generate mock reviews for demo purposes
  generateMockReviews(count = 100) {
    logger.info(`Generating ${count} mock reviews for demo`);
    
    const reviews = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const review = this.generateSingleReview(now, i);
      reviews.push(review);
    }

    // Sort by timestamp (newest first)
    reviews.sort((a, b) => b.timestamp - a.timestamp);
    
    logger.info(`Generated ${reviews.length} mock reviews`);
    return reviews;
  }

  generateSingleReview(now, index) {
    // Generate random timestamp within last 90 days
    const daysAgo = Math.floor(Math.random() * 90);
    const hoursAgo = Math.floor(Math.random() * 24);
    const minutesAgo = Math.floor(Math.random() * 60);
    const timestamp = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000) - (minutesAgo * 60 * 1000));

    // Generate rating based on sentiment distribution
    const sentimentRoll = Math.random();
    let sentiment, rating;
    
    if (sentimentRoll < 0.65) { // 65% positive
      sentiment = 'Positive';
      rating = Math.random() < 0.7 ? 5 : 4;
    } else if (sentimentRoll < 0.85) { // 20% neutral
      sentiment = 'Neutral';
      rating = 3;
    } else { // 15% negative
      sentiment = 'Negative';
      rating = Math.random() < 0.6 ? 1 : 2;
    }

    // Generate comment based on sentiment
    let comment;
    const commentArray = sentiment === 'Positive' ? this.positiveComments : 
                       sentiment === 'Negative' ? this.negativeComments : 
                       this.neutralComments;
    comment = commentArray[Math.floor(Math.random() * commentArray.length)];

    // Add some variation and details
    if (Math.random() < 0.3) {
      comment += this.addRandomDetail();
    }

    // Generate topics (1-2 topics per review)
    const topicCount = Math.random() < 0.7 ? 1 : 2;
    const topics = this.getRandomTopics(topicCount);

    // Generate source with realistic distribution
    const source = this.getRandomSource();

    return {
      id: `review_${Date.now()}_${index}`,
      rating,
      comment,
      timestamp,
      source,
      topics,
      sentiment,
      customerName: this.getRandomCustomerName(),
      responseTime: Math.random() < 0.4 ? Math.floor(Math.random() * 48) + 1 : null, // 40% have response
      resolved: Math.random() < 0.3, // 30% resolved
      tags: this.generateTags(sentiment, topics)
    };
  }

  addRandomDetail() {
    const details = [
      ' untuk ukuran family', ' dengan harga yang wajar', ' meskipun sedikit ramai',
      ' di jam sibuk sekalipun', ' tapi worth it', ' sangat recommended',
      ' untuk acara keluarga', ' dengan pelayanan ekstra', ' meskipun harga sedikit mahal',
      ' tapi pelayanan memuaskan', ' dengan variasi menu lengkap', ' di akhir pekan'
    ];
    return details[Math.floor(Math.random() * details.length)];
  }

  getRandomTopics(count) {
    const shuffled = [...this.topics].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  getRandomSource() {
    // Realistic distribution: QR Scan (40%), Google Maps (25%), Gojek (20%), Manual (10%), Website (5%)
    const rand = Math.random();
    if (rand < 0.4) return 'QR Scan';
    if (rand < 0.65) return 'Google Maps';
    if (rand < 0.85) return 'Gojek';
    if (rand < 0.95) return 'Manual';
    return 'Website';
  }

  getRandomCustomerName() {
    return this.indonesianNames[Math.floor(Math.random() * this.indonesianNames.length)];
  }

  generateTags(sentiment, topics) {
    const tags = [];
    
    // Add sentiment-based tags
    if (sentiment === 'Positive') {
      tags.push('Puas', 'Recommended');
    } else if (sentiment === 'Negative') {
      tags.push('Perlu Perhatian', 'Complaint');
    } else {
      tags.push('Neutral');
    }

    // Add topic-based tags
    topics.forEach(topic => {
      if (topic === 'Pelayanan') tags.push('Service');
      if (topic === 'Kualitas Produk') tags.push('Quality');
      if (topic === 'Fasilitas') tags.push('Facility');
      if (topic === 'Harga') tags.push('Pricing');
    });

    // Add random tags
    if (Math.random() < 0.2) tags.push('VIP Customer');
    if (Math.random() < 0.15) tags.push('First Time');
    if (Math.random() < 0.1) tags.push('Regular');

    return [...new Set(tags)]; // Remove duplicates
  }

  // Generate reviews for specific date range
  generateReviewsForDateRange(startDate, endDate, density = 'medium') {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    // Determine review frequency based on density
    const frequencyPerDay = density === 'high' ? 15 : density === 'low' ? 3 : 8;
    const totalReviews = daysDiff * frequencyPerDay;
    
    const reviews = [];
    for (let i = 0; i < totalReviews; i++) {
      const randomDay = Math.floor(Math.random() * daysDiff);
      const reviewDate = new Date(start.getTime() + randomDay * 24 * 60 * 60 * 1000);
      
      const review = this.generateSingleReview(reviewDate, i);
      review.timestamp = reviewDate;
      reviews.push(review);
    }

    return reviews.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Generate reviews with specific sentiment distribution
  generateReviewsWithSentimentDistribution(count, positivePercent = 65, neutralPercent = 20) {
    const reviews = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      let sentiment, rating;
      const roll = Math.random() * 100;
      
      if (roll < positivePercent) {
        sentiment = 'Positive';
        rating = Math.random() < 0.7 ? 5 : 4;
      } else if (roll < positivePercent + neutralPercent) {
        sentiment = 'Neutral';
        rating = 3;
      } else {
        sentiment = 'Negative';
        rating = Math.random() < 0.6 ? 1 : 2;
      }

      const commentArray = sentiment === 'Positive' ? this.positiveComments : 
                         sentiment === 'Negative' ? this.negativeComments : 
                         this.neutralComments;
      
      const review = {
        id: `review_${Date.now()}_${i}`,
        rating,
        comment: commentArray[Math.floor(Math.random() * commentArray.length)],
        timestamp: new Date(now.getTime() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)),
        source: this.getRandomSource(),
        topics: this.getRandomTopics(Math.random() < 0.7 ? 1 : 2),
        sentiment,
        customerName: this.getRandomCustomerName(),
        responseTime: Math.random() < 0.4 ? Math.floor(Math.random() * 48) + 1 : null,
        resolved: Math.random() < 0.3,
        tags: this.generateTags(sentiment, this.getRandomTopics(1))
      };

      reviews.push(review);
    }

    return reviews.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Generate realistic hourly activity pattern
  generateHourlyActivity(date = new Date()) {
    const activity = [];
    
    for (let hour = 0; hour < 24; hour++) {
      // Simulate realistic restaurant/cafe activity pattern
      let baseActivity;
      
      if (hour >= 7 && hour <= 10) { // Morning peak
        baseActivity = 8 + Math.random() * 4;
      } else if (hour >= 11 && hour <= 14) { // Lunch peak
        baseActivity = 15 + Math.random() * 8;
      } else if (hour >= 15 && hour <= 17) { // Afternoon
        baseActivity = 6 + Math.random() * 3;
      } else if (hour >= 18 && hour <= 21) { // Dinner peak
        baseActivity = 12 + Math.random() * 6;
      } else { // Late night/early morning
        baseActivity = 2 + Math.random() * 2;
      }

      activity.push({
        hour: hour.toString().padStart(2, '0') + ':00',
        reviews: Math.floor(baseActivity),
        users: Math.floor(baseActivity * (0.8 + Math.random() * 0.4)),
        timestamp: new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0, 0)
      });
    }

    return activity;
  }

  // Generate sentiment velocity data
  generateSentimentVelocity(hours = 12) {
    const velocity = [];
    const now = new Date();

    for (let i = hours - 1; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      
      // Generate realistic sentiment patterns
      const basePositive = 8 + Math.random() * 4;
      const baseNeutral = 3 + Math.random() * 2;
      const baseNegative = 2 + Math.random() * 2;

      velocity.push({
        time: time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        positive: Math.floor(basePositive),
        neutral: Math.floor(baseNeutral),
        negative: Math.floor(baseNegative),
        timestamp: time
      });
    }

    return velocity;
  }
}

module.exports = new MockDataService();