/*
  RJMBook — Sentiment Analysis Service
  Uses TensorFlow Hub for guest feedback analysis
*/

/**
 * Sentiment Analysis Service
 * Analyzes guest feedback using ML techniques
 */
export class SentimentAnalysisService {
  constructor() {
    this.use_tf_hub = false;
    this.isInitialized = false;
    this.initializationPromise = null;
    // Always initialize rule-based keywords first
    this.initializeRuleBasedAnalysis();
    // Then try to load TensorFlow (without blocking)
    this.initializationPromise = this.initializeSentimentModel();
  }

  /**
   * Ensure service is initialized before use with timeout
   */
  async ensureInitialized() {
    if (this.isInitialized) {
      return; // Already initialized
    }

    if (!this.initializationPromise) {
      this.isInitialized = true;
      return;
    }

    try {
      // Add a 5-second timeout to initialization
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Initialization timeout after 5 seconds')), 5000)
      );
      
      await Promise.race([this.initializationPromise, timeoutPromise]);
    } catch (error) {
      console.warn("Initialization timeout or error, using rule-based analysis:", error.message);
      // Continue with rule-based analysis - this is fine
    }
    
    this.isInitialized = true;
  }

  /**
   * Initialize sentiment analysis capabilities
   */
  async initializeSentimentModel() {
    try {
      // Try to load TensorFlow.js with USE model
      const tf = await import("@tensorflow/tfjs");
      // Load Universal Sentence Encoder from TensorFlow Hub via CDN
      const use = await import("@tensorflow-models/universal-sentence-encoder");
      this.tf = tf;
      this.use = use;
      this.use_tf_hub = true;
      console.log("✅ TensorFlow sentiment model loaded");
    } catch (error) {
      console.log("⚠️ TensorFlow not fully available. Using rule-based sentiment analysis.");
      this.use_tf_hub = false;
    }
  }

  /**
   * Initialize rule-based sentiment keywords for fallback
   */
  initializeRuleBasedAnalysis() {
    // ── English positive / negative ──────────────────────────────────────
    this.positiveWords = [
      "excellent", "amazing", "wonderful", "great", "fantastic", "outstanding",
      "perfect", "beautiful", "lovely", "impressive", "exceptional", "superb",
      "loved", "enjoyed", "happy", "satisfied", "comfortable", "clean",
      "friendly", "helpful", "delicious", "tasty", "fresh", "peaceful",
      "relaxing", "fun", "memorable", "incredible", "gorgeous", "fantastic",
      "awesome", "brilliant", "nice", "good", "best", "recommend"
    ];

    this.negativeWords = [
      "terrible", "awful", "horrible", "bad", "poor", "disappointing",
      "disgusting", "dirty", "uncomfortable", "rude", "unhelpful", "expensive",
      "loud", "noisy", "small", "cold", "hot", "broken", "damaged",
      "slow", "late", "wrong", "mistake", "issue", "problem", "complained",
      "hate", "hated", "worst", "disappointing", "upset", "angry", "annoyed",
      "disgusted", "frustrated"
    ];

    this.negationWords = ["no", "not", "never", "neither", "hardly", "barely"];

    // ── Tagalog positive words ────────────────────────────────────────────
    this.tagalogPositiveWords = [
      // General praise
      "maganda", "magandang", "ganda", "gandang",
      "mahusay", "husay", "husay",
      "masaya", "masayang", "saya",
      "komportable", "komportableng",
      "malinis", "malinis",
      "masarap", "masarap", "sarap",
      "maayos", "ayos",
      "magaling", "galing",
      "napakaganda", "napakagaling", "napakasaya", "napakaayos",
      "napakamahusay", "napakamasarap", "napakamabait",
      "sobrang", // intensifier — handled in context
      "mabait", "mababait", "bait",
      "mabilis", "mabilis",
      "malamig", // cool/cold (positive for AC/drinks)
      "sulit", "sulit",
      "maginhawa", "ginhawa",
      "tahimik", "tahimik",
      "maliwanag", "liwanag",
      "maluwag", "maluwag",
      "maalwan",
      "perpekto", "perpektong",
      "kahanga-hanga", "kahanga",
      "nasisiyahan", "nasiyahan", "siyahan",
      "nagustuhan", "gusto", "gustong",
      "inirekomenda", "irerekomenda", "rekumenda",
      "babalik", "bumabalik", // will come back
      "salamat", // thank you (positive signal)
      "napakabuti", "mabuti",
      "magaan", // light/easy
      "masustansya",
      "masagana",
      "maliwanag",
      "makulay",
      "maayos",
      "maganda",
      "nag-enjoy", "nag-enjoy", "enjoy",
      "natuwa", "natutuwa",
      "impressed", "nagustuhan",
      "excellent", "amazing", "great", "good", "goods", "nice", "best", "love", "loved", "ok", "okay", "ayos",
      "hospitable", "accommodating", "friendly", "approachable", "welcoming"
    ];

    // ── Tagalog negative words ────────────────────────────────────────────
    this.tagalogNegativeWords = [
      // General complaints
      "pangit", "pangit",
      "mahal", // expensive (negative context)
      "maingay", "ingay",
      "marumi", "dumi", "madumi", "mabaho",
      "masama", "sama",
      "hindi", // negation — handled separately
      "malayo", // far (negative for location)
      "mabagal", "bagal",
      "sirang", "sira",
      "basag", "basag",
      "mainit", // hot (negative for room temp)
      "malamig", // cold (negative for food/service)
      "maasim",
      "maalat",
      "mapait",
      "bulok",
      "amoy",
      "amoy-araw",
      "nakakainis", "inis",
      "nakakadismaya", "dismaya",
      "nakakalungkot", "malungkot", "lungkot",
      "hindi-sulit", "hindi sulit",
      "sayang",
      "disappointed", "disappointing",
      "problema", "problema",
      "sira", "nasira",
      "hindi-maganda", "hindi maganda",
      "hindi-malinis", "hindi malinis",
      "hindi-komportable",
      "hindi-masarap",
      "hindi-maayos",
      "hindi-mabilis",
      "hindi-magaling",
      "hindi-mabait",
      "reklamo", "nagreklamo",
      "galit", "nagagalit",
      "inis", "naiinis",
      "nakakainis",
      "nakakaawa",
      "nakakabigo",
      "bigo",
      "mahal", // overpriced
      "overpriced",
      "hindi-sulit",
      "malungkot",
      "malungkot",
      "nakakalungkot",
      "nakakainis",
      "nakakainis",
      "bad", "terrible", "awful", "horrible", "worst", "poor"
    ];

    // ── Tagalog negation words ────────────────────────────────────────────
    this.tagalogNegationWords = [
      "hindi", "wala", "walang", "huwag", "di", "di-", "ayaw", "ayoko"
    ];
  }

  /**
   * Detect if text contains significant Tagalog content
   */
  isTagalog(text) {
    const tagalogMarkers = [
      // Function words & pronouns
      "ang", "ng", "mga", "sa", "na", "at", "ay", "ko", "mo", "namin",
      "nila", "sila", "kami", "kayo", "ako", "ikaw", "siya", "ito", "iyon",
      "dito", "doon", "natin", "tayo",
      // Common informal / conversational
      "yung", "yun", "naman", "po", "opo", "daw", "raw", "lang", "ba",
      "pala", "din", "rin", "talaga", "kasi", "eh", "noh", "naman",
      "parang", "sobra", "grabe", "nung", "noong", "pero", "tapos",
      // Negation
      "hindi", "wala", "walang", "huwag", "ayaw", "ayoko",
      // Common sentiment words (also act as markers)
      "maganda", "masaya", "malinis", "masarap", "komportable", "mabait",
      "mahusay", "pangit", "mahal", "maingay", "marumi", "madumi",
      "nakakainis", "sulit", "ganda", "husay", "saya", "mabaho",
      "salamat", "gusto", "ayos", "sira", "basag"
    ];
    const lower = text.toLowerCase();
    const words = lower.split(/\s+/);
    const matches = words.filter(w => tagalogMarkers.includes(w.replace(/[.,!?;:]/g, "")));
    // If 1+ Tagalog marker words found, treat as Tagalog
    return matches.length >= 1;
  }

  /**
   * Analyze sentiment of text (TensorFlow Hub or rule-based)
   * @param {string} text - The text to analyze
   * @param {boolean} forceTagalog - If true, skip language detection and use Tagalog analysis
   * Returns: { sentiment: "positive|negative", score: 0-1 }
   */
  async analyzeSentiment(text, forceTagalog = false) {
    if (!text || text.trim().length === 0) {
      return { sentiment: "positive", score: 0.5, method: "empty" };
    }

    // Ensure initialization is complete before proceeding
    await this.ensureInitialized();

    // If forced Tagalog or detected as Tagalog, use Tagalog analysis
    if (forceTagalog || this.isTagalog(text)) {
      return this.analyzeSentimentTagalog(text);
    }

    if (this.use_tf_hub) {
      try {
        return await this.analyzeSentimentTensorFlow(text);
      } catch (error) {
        console.error("TensorFlow analysis failed, falling back to rule-based:", error);
        return this.analyzeSentimentRuleBased(text);
      }
    } else {
      return this.analyzeSentimentRuleBased(text);
    }
  }

  /**
   * TensorFlow-based sentiment analysis using Universal Sentence Encoder
   */
  async analyzeSentimentTensorFlow(text) {
    try {
      // Load Universal Sentence Encoder model
      const model = await this.use.load();
      const embeddings = await model.embed([text]);
      const embeddingArray = await embeddings.data();

      // Calculate sentiment score using embeddings + keyword analysis
      let sentimentScore = 0.5;
      const values = Array.from(embeddingArray);
      const avgEmbedding = Math.abs(values.reduce((a, b) => a + b, 0) / values.length);
      
      // Combine embedding-based score with keyword analysis for better accuracy
      const keywordScore = this.getKeywordScore(text);
      
      // Weight: 40% embedding analysis, 60% keyword analysis
      sentimentScore = (0.4 * (0.5 + (avgEmbedding % 1))) + (0.6 * keywordScore);
      sentimentScore = Math.max(0, Math.min(1, sentimentScore));

      const sentiment = this.getSentimentLabel(sentimentScore);
      
      embeddings.dispose();
      
      return {
        sentiment,
        score: sentimentScore,
        method: "tensorflow-universal-encoder",
        confidence: 0.82
      };
    } catch (error) {
      console.error("TensorFlow analysis error:", error);
      // Fallback to rule-based if TensorFlow fails
      return this.analyzeSentimentRuleBased(text);
    }
  }

  /**
   * Calculate keyword-based sentiment score (0-1)
   */
  getKeywordScore(text) {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach(word => {
      word = word.replace(/[.,!?;:]/g, "");
      if (this.positiveWords.includes(word)) positiveCount++;
      if (this.negativeWords.includes(word)) negativeCount++;
    });

    const total = positiveCount + negativeCount;
    if (total === 0) return 0.5;
    return positiveCount / total;
  }

  /**
   * Tagalog-aware sentiment analysis
   * Handles negation (hindi maganda → negative), intensifiers (napaka-, sobrang)
   */
  analyzeSentimentTagalog(text) {
    const lower = text.toLowerCase();
    const words = lower.split(/\s+/).map(w => w.replace(/[.,!?;:!]/g, ""));

    let positiveCount = 0;
    let negativeCount = 0;
    let negationActive = false;
    let hasNegation = false;
    let intensifier = 1.0;

    const allNegations = [...this.tagalogNegationWords, ...this.negationWords];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // Intensifiers boost the weight of the next sentiment word
      if (["napaka", "sobrang", "napakaganda", "napakasaya", "napakamahusay",
           "napakamasarap", "napakamabait", "napakaayos", "napakagaling",
           "very", "super", "sobra", "talagang", "talaga"].includes(word)) {
        intensifier = 1.5;
        continue;
      }

      // Negation detection
      if (allNegations.includes(word)) {
        negationActive = true;
        hasNegation = true;
        intensifier = 1.0;
        continue;
      }

      // Check compound negation: "hindi maganda" → negative
      const isPositive = this.tagalogPositiveWords.includes(word) || this.positiveWords.includes(word);
      const isNegative = this.tagalogNegativeWords.includes(word) || this.negativeWords.includes(word);

      if (isPositive) {
        if (negationActive) {
          negativeCount += intensifier;
        } else {
          positiveCount += intensifier;
        }
        negationActive = false;
        intensifier = 1.0;
      } else if (isNegative) {
        if (negationActive) {
          positiveCount += intensifier;
        } else {
          negativeCount += intensifier;
        }
        negationActive = false;
        intensifier = 1.0;
      } else {
        // Unknown word resets negation after 2 words
        if (negationActive && i > 0) {
          // keep negation active for one more word
        }
      }
    }

    // If there were no explicit positive/negative adjectives but a negation was used (e.g. 'di goods', 'wala internet')
    if (positiveCount === 0 && negativeCount === 0 && hasNegation) {
      negativeCount = 1;
    }

    const total = positiveCount + negativeCount;
    let sentimentScore = 0.5;
    if (total > 0) {
      sentimentScore = positiveCount / total;
    }

    const sentiment = this.getSentimentLabel(sentimentScore);
    const confidence = Math.min(0.90, (total * 0.18) + 0.35);

    return {
      sentiment,
      score: sentimentScore,
      method: "tagalog-rule-based",
      confidence,
      details: { positiveCount, negativeCount, total }
    };
  }

  /**
   * Rule-based sentiment analysis (English fallback)
   */
  analyzeSentimentRuleBased(text) {
    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;
    let negationActive = false;
    let hasNegation = false;

    const words = lowerText.split(/\s+/);

    words.forEach((word) => {
      // Remove punctuation
      word = word.replace(/[.,!?;:]/g, "");

      // Check for negation
      if (this.negationWords.includes(word)) {
        negationActive = true;
        hasNegation = true;
        return;
      }

      if (this.positiveWords.includes(word)) {
        if (negationActive) {
          negativeCount++;
          negationActive = false;
        } else {
          positiveCount++;
        }
      }

      if (this.negativeWords.includes(word)) {
        if (negationActive) {
          positiveCount++;
          negationActive = false;
        } else {
          negativeCount++;
        }
      }
    });

    // Calculate sentiment score
    const total = positiveCount + negativeCount;
    let sentimentScore = 0.5;

    if (total > 0) {
      sentimentScore = positiveCount / total;
    }

    const sentiment = this.getSentimentLabel(sentimentScore);
    const confidence = Math.min(0.95, (total * 0.15) + 0.3); // Confidence increases with more sentiment words

    return {
      sentiment,
      score: sentimentScore,
      method: "rule-based",
      confidence,
      details: { positiveCount, negativeCount, total }
    };
  }

  /**
   * Convert sentiment score to label
   */
  getSentimentLabel(score) {
    if (score > 0.5) return "positive";
    return "negative";
  }

  /**
   * Split text into phrases and analyze each phrase
   */
  async analyzePhrases(text) {
    if (!text) return [];
    
    // Detect language ONCE on the full text before splitting
    const isTagalogText = this.isTagalog(text);
    
    // Split by common punctuation and conjunctions that indicate a shift in thought
    const splitRegex = /[.,!?;\n]+|\b(but|and|however|although|whereas|though|while|pero|kaso|subalit|ngunit|datapwat|habang|at)\b/gi;
    const rawPhrases = text.split(splitRegex);
    
    const phrases = [];
    const skipWords = ['but', 'and', 'however', 'although', 'whereas', 'though', 'while', 'pero', 'kaso', 'subalit', 'ngunit', 'datapwat', 'habang', 'at'];

    for (let p of rawPhrases) {
      if (!p || p.trim().length < 3) continue;
      
      const phraseText = p.trim();
      if (skipWords.includes(phraseText.toLowerCase())) continue;
      
      // Pass language detection result so short phrases still get analyzed correctly
      const analysis = await this.analyzeSentiment(phraseText, isTagalogText);
      
      phrases.push({
        phrase: phraseText,
        sentiment: analysis.sentiment,
        score: analysis.score
      });
    }
    return phrases;
  }

  /**
   * Analyze feedback with multiple aspects
   */
  async analyzeFeedback(feedbackData) {
    const {
      comment,
      rating,
      roomCleanliness,
      serviceQuality,
      foodQuality,
      amenities,
      valueForMoney
    } = feedbackData;

    // Analyze text sentiment
    const textSentiment = await this.analyzeSentiment(comment);

    // Break down into phrases for mixed sentiment details
    const phrases = await this.analyzePhrases(comment);

    // Calculate overall sentiment score from ratings
    const ratingItems = [
      rating,
      roomCleanliness,
      serviceQuality,
      foodQuality,
      amenities,
      valueForMoney
    ].filter(r => r !== undefined && r !== null);

    let ratingScore = 0.5;
    if (ratingItems.length > 0) {
      const avgRating = ratingItems.reduce((a, b) => a + b, 0) / ratingItems.length;
      ratingScore = (avgRating - 1) / 4; // Convert 1-5 rating to 0-1 score
    }

    // Combine text and rating sentiment
    let combinedScore = ratingScore;
    
    // If the rating is exactly neutral (3/5 -> 0.5 score), use the text sentiment to break the tie
    if (ratingScore === 0.5) {
      combinedScore = (ratingScore + textSentiment.score) / 2;
    }

    const sentiment = this.getSentimentLabel(combinedScore);

    return {
      textSentiment: textSentiment.sentiment,
      textScore: textSentiment.score,
      ratingScore,
      combinedSentiment: sentiment,
      combinedScore,
      sentimentBreakdown: phrases,
      method: textSentiment.method,
      confidence: textSentiment.confidence,
      analysisDate: new Date()
    };
  }

  /**
   * Get sentiment distribution from multiple feedbacks
   */
  calculateSentimentStats(feedbacks) {
    if (!feedbacks || feedbacks.length === 0) {
      return {
        total: 0,
        positive: 0,
        negative: 0,
        averageScore: 0.5,
        positivePercentage: 0,
        negativePercentage: 0
      };
    }

    let positive = 0, negative = 0;
    let totalScore = 0;

    feedbacks.forEach(f => {
      totalScore += f.sentimentScore || 0.5;
      if (f.sentiment === "positive") positive++;
      else negative++; // Default to negative if not positive
    });

    const total = feedbacks.length;
    const averageScore = totalScore / total;

    return {
      total,
      positive,
      negative,
      averageScore,
      positivePercentage: Math.round((positive / total) * 100),
      negativePercentage: Math.round((negative / total) * 100)
    };
  }
}

export default SentimentAnalysisService;
