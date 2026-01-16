const axios = require('axios');

/**
 * Islamic Content Service
 * Extracts keywords using NLP-like analysis and fetches relevant Islamic content from APIs
 */
class IslamicContentService {
  constructor() {
    // API endpoints
    this.quranSearchAPI = 'https://api.alquran.cloud/v1/search';
    this.quranSurahAPI = 'https://api.alquran.cloud/v1/surah';
    this.hadithAPI = 'https://api.hadith.gading.dev/books';
  }

  /**
   * Extract meaningful keywords from forum post title and content
   * Uses NLP-like approach: remove stop words, extract key phrases, identify main topics
   */
  extractKeywords(title, content) {
    // Combine title (weighted more) and content
    const fullText = `${title} ${title} ${title} ${content}`.toLowerCase();
    
    // Common English stop words to filter out
    const stopWords = new Set([
      'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
      'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
      'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
      'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
      'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
      'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until',
      'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
      'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
      'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
      'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other',
      'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
      's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'need', 'know', 'want', 'like',
      'please', 'help', 'would', 'could', 'also', 'get', 'make', 'see', 'think', 'take',
      'come', 'go', 'say', 'tell', 'ask', 'use', 'find', 'give', 'may', 'must', 'shall'
    ]);

    // Islamic context words to keep and prioritize (including Urdu transliterations)
    const islamicKeywords = new Set([
      // Prayer
      'prayer', 'salah', 'salat', 'namaz', 'nimaz', 'fajr', 'dhuhr', 'asr', 'maghrib', 'isha',
      'farz', 'wajib', 'sunnah', 'nafl', 'rakat', 'rakaat', 'sajda', 'sajdah', 'ruku',
      'wudu', 'wudhu', 'ghusl', 'taharat',
      
      // Marriage/Divorce
      'marriage', 'nikah', 'nikkah', 'shadi', 'shaadi', 'wedding', 'spouse', 'husband', 'wife', 'wives',
      'divorce', 'talaq', 'talaaq', 'khula', 'khulaa', 'iddah', 'iddat', 'mahr', 'mehr', 'meher', 'dowry',
      
      // Fasting
      'fasting', 'fast', 'sawm', 'roza', 'rozay', 'rozah', 'ramadan', 'iftar', 'iftaar', 'sehri', 'suhoor', 'suhur',
      
      // Charity
      'zakat', 'zakaat', 'charity', 'sadqa', 'sadaqah', 'sadqah', 'khairat',
      
      // Pilgrimage
      'hajj', 'haj', 'umrah', 'umra', 'pilgrimage',
      
      // Character/Ethics
      'patience', 'sabr', 'sabar', 'gratitude', 'shukr', 'shukar', 'repentance', 'tawbah', 'tauba',
      'ikhlas', 'sincerity', 'taqwa', 'taqva', 'righteousness',
      
      // Faith
      'faith', 'belief', 'iman', 'imaan', 'islam', 'tawhid', 'tauheed', 'shirk', 'kufr', 'kufer',
      
      // Business/Halal-Haram
      'halal', 'halaal', 'haram', 'haraam', 'permissible', 'forbidden', 'riba', 'sood', 'sud', 'interest',
      
      // General Islamic
      'quran', 'hadith', 'prophet', 'muhammad', 'allah',
      'rights', 'duties', 'obligations', 'responsibilities',
      'women', 'men', 'children', 'parents', 'family', 'inheritance',
      'death', 'burial', 'janazah', 'funeral',
      'jihad', 'struggle', 'justice', 'adl', 'oppression',
      'business', 'trade', 'loan', 'debt',
      'procedure', 'process', 'steps', 'method', 'way', 'rules', 'law', 'shariah', 'sharia'
    ]);

    // Extract words and clean them
    const words = fullText
      .replace(/[^\w\s]/g, ' ')  // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2)  // Remove very short words
      .filter(word => !stopWords.has(word));  // Remove stop words

    // Count word frequency
    const wordFreq = {};
    words.forEach(word => {
      // Boost Islamic keywords
      const boost = islamicKeywords.has(word) ? 3 : 1;
      wordFreq[word] = (wordFreq[word] || 0) + boost;
    });

    // Extract key phrases (bigrams) from title
    const titleWords = title.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    const phrases = [];
    for (let i = 0; i < titleWords.length - 1; i++) {
      if (!stopWords.has(titleWords[i]) && !stopWords.has(titleWords[i + 1])) {
        phrases.push(`${titleWords[i]} ${titleWords[i + 1]}`);
      }
    }

    // Sort by frequency and get top keywords
    const sortedKeywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // Identify the main topic/subject
    const mainTopics = sortedKeywords.filter(word => islamicKeywords.has(word));
    
    // Map Islamic terms to English equivalents for better API search
    // Handles Urdu/Arabic words written in English (transliteration)
    const termMapping = {
      // Prayer related
      'namaz': 'prayer',
      'salah': 'prayer',
      'salat': 'prayer',
      'nimaz': 'prayer',
      'namaz': 'prayer',
      'farz': 'obligatory',
      'wajib': 'obligatory',
      'sunnah': 'tradition',
      'nafl': 'voluntary',
      'rakat': 'prayer',
      'rakaat': 'prayer',
      'sajda': 'prostration',
      'sajdah': 'prostration',
      'ruku': 'bowing',
      'wudu': 'ablution',
      'wudhu': 'ablution',
      'ghusl': 'ritual bath',
      'taharat': 'purification',
      
      // Marriage/Divorce
      'nikah': 'marriage',
      'nikkah': 'marriage',
      'shadi': 'marriage',
      'shaadi': 'marriage',
      'talaq': 'divorce',
      'talaaq': 'divorce',
      'khula': 'divorce',
      'khulaa': 'divorce',
      'mahr': 'dowry',
      'meher': 'dowry',
      'mehr': 'dowry',
      'iddat': 'waiting period',
      'iddah': 'waiting period',
      
      // Fasting
      'sawm': 'fasting',
      'roza': 'fasting',
      'rozah': 'fasting',
      'iftar': 'breaking fast',
      'iftaar': 'breaking fast',
      'sehri': 'pre-dawn meal',
      'suhoor': 'pre-dawn meal',
      'suhur': 'pre-dawn meal',
      
      // Charity
      'zakat': 'charity',
      'zakaat': 'charity',
      'sadqa': 'charity',
      'sadaqah': 'charity',
      'sadqah': 'charity',
      'khairat': 'charity',
      
      // Pilgrimage
      'hajj': 'pilgrimage',
      'haj': 'pilgrimage',
      'umrah': 'pilgrimage',
      'umra': 'pilgrimage',
      
      // Character/Ethics
      'sabr': 'patience',
      'sabar': 'patience',
      'shukr': 'gratitude',
      'shukar': 'gratitude',
      'tawbah': 'repentance',
      'tauba': 'repentance',
      'ikhlas': 'sincerity',
      'taqwa': 'righteousness',
      'taqva': 'righteousness',
      
      // Faith
      'iman': 'faith',
      'imaan': 'faith',
      'islam': 'submission',
      'tawhid': 'monotheism',
      'tauheed': 'monotheism',
      'shirk': 'polytheism',
      'kufr': 'disbelief',
      'kufer': 'disbelief',
      
      // Business/Halal-Haram
      'halal': 'permissible',
      'halaal': 'permissible',
      'haram': 'forbidden',
      'haraam': 'forbidden',
      'riba': 'interest',
      'sood': 'interest',
      'sud': 'interest'
    };
    
    // Convert Islamic terms to searchable English terms
    const mappedKeywords = mainTopics.map(word => termMapping[word] || word);
    
    return {
      primaryKeywords: mainTopics.slice(0, 3),  // Top 3 Islamic keywords (original)
      secondaryKeywords: sortedKeywords.filter(w => !mainTopics.includes(w)).slice(0, 5),
      phrases: phrases.slice(0, 3),  // Key phrases
      searchTerms: [...new Set([...mappedKeywords.slice(0, 3), ...mainTopics.slice(0, 2)])].filter(Boolean)  // Mapped + original, remove duplicates
    };
  }

  /**
   * Get relevant Quranic verses and Hadith for extracted keywords
   */
  async getContentForTopic(topicName, postContent = '') {
    try {
      // Extract keywords from topic name and content
      const keywords = this.extractKeywords(topicName, postContent);
      
      console.log('Extracted keywords:', keywords);

      const content = {
        ayah: [],
        hadith: [],
        extractedKeywords: keywords  // Include for transparency
      };

      // Fetch Quranic verses using search API
      content.ayah = await this.searchQuranVerses(keywords.searchTerms);

      // Fetch relevant Hadith - use curated ones based on keywords for better relevance
      content.hadith = await this.getCuratedHadith(keywords.primaryKeywords, keywords.searchTerms);

      // Only return curated hadith - no random/general hadith
      // If no curated hadith available, return empty array

      return content;
    } catch (error) {
      console.error('Error fetching Islamic content:', error);
      return { ayah: [], hadith: [], error: error.message };
    }
  }

  /**
   * Get curated Hadith based on keywords for topic relevance
   */
  getCuratedHadith(keywords, searchTerms) {
    const hadiths = [];
    const keywordText = [...keywords, ...searchTerms].join(' ').toLowerCase();
    
    // Divorce-related curated Hadith
    if (keywordText.includes('divorce') || keywordText.includes('talaq') || keywordText.includes('separation')) {
      hadiths.push(
        {
          narrator: 'Ibn Umar (RA)',
          text: 'The Prophet (PBUH) said: "The most hated of permissible things to Allah is divorce."',
          arabic: 'أَبْغَضُ الْحَلَالِ إِلَى اللَّهِ الطَّلَاقُ',
          reference: 'Abu Dawud 2178',
          book: 'Sunan Abu Dawud',
          matchedKeyword: 'divorce'
        },
        {
          narrator: 'Muawiyah ibn Haydah (RA)',
          text: 'I said: "O Messenger of Allah, what is the right of the wife of one of us over him?" He said: "That you feed her when you eat, clothe her when you clothe yourself, do not strike her on the face, do not revile her or separate from her except in the house."',
          reference: 'Abu Dawud 2142',
          book: 'Sunan Abu Dawud',
          matchedKeyword: 'rights'
        },
        {
          narrator: 'Aisha (RA)',
          text: 'The Prophet (PBUH) said: "The best of you are those who are best to their wives, and I am the best of you to my wives."',
          reference: 'Tirmidhi 3895',
          book: 'Jami at-Tirmidhi',
          matchedKeyword: 'marriage'
        }
      );
    }
    
    // Women's rights
    if (keywordText.includes('women') || keywordText.includes('rights') || keywordText.includes('wife')) {
      hadiths.push(
        {
          narrator: 'Abu Huraira (RA)',
          text: 'The Prophet (PBUH) said: "Treat women kindly, for woman was created from a rib, and the most crooked part of the rib is its top. If you try to straighten it, you will break it, and if you leave it, it will remain crooked. So treat women kindly."',
          reference: 'Bukhari 3331',
          book: 'Sahih Bukhari',
          matchedKeyword: 'women'
        },
        {
          narrator: 'Prophet Muhammad (PBUH)',
          text: 'The last sermon: "O People, it is true that you have certain rights with regard to your women, but they also have rights over you. Remember that you have taken them as your wives only under a trust from Allah and with His permission."',
          reference: 'Muslim 1218',
          book: 'Sahih Muslim',
          matchedKeyword: 'rights'
        }
      );
    }
    
    // Marriage
    if (keywordText.includes('marriage') || keywordText.includes('nikah') || keywordText.includes('marital')) {
      hadiths.push(
        {
          narrator: 'Anas ibn Malik (RA)',
          text: 'The Prophet (PBUH) said: "When a man marries, he has fulfilled half of his religion, so let him fear Allah regarding the remaining half."',
          reference: 'Bayhaqi',
          book: 'Shuab al-Iman',
          matchedKeyword: 'marriage'
        },
        {
          narrator: 'Abu Huraira (RA)',
          text: 'The Prophet (PBUH) said: "A woman is married for four things: her wealth, her family status, her beauty and her religion. So you should marry the religious woman (otherwise) you will be a loser."',
          reference: 'Bukhari 5090',
          book: 'Sahih Bukhari',
          matchedKeyword: 'marriage'
        }
      );
    }
    
    // Prayer/Salah/Namaz
    if (keywordText.includes('prayer') || keywordText.includes('salah') || keywordText.includes('salat') || keywordText.includes('namaz') || keywordText.includes('worship')) {
      hadiths.push(
        {
          narrator: 'Abu Huraira (RA)',
          text: 'The Prophet (PBUH) said: "The first matter that the slave will be brought to account for on the Day of Judgment is the prayer. If it is sound, then the rest of his deeds will be sound. And if it is bad, then the rest of his deeds will be bad."',
          arabic: 'أَوَّلُ مَا يُحَاسَبُ بِهِ الْعَبْدُ يَوْمَ الْقِيَامَةِ الصَّلاَةُ',
          reference: 'Tabarani',
          book: 'Al-Awsat',
          matchedKeyword: 'prayer'
        },
        {
          narrator: 'Abdullah ibn Masud (RA)',
          text: 'I asked the Prophet (PBUH): "Which deed is most beloved to Allah?" He replied: "Prayer at its proper time."',
          arabic: 'الصَّلاَةُ عَلَى وَقْتِهَا',
          reference: 'Bukhari 527',
          book: 'Sahih Bukhari',
          matchedKeyword: 'prayer'
        },
        {
          narrator: 'Abu Huraira (RA)',
          text: 'The Prophet (PBUH) said: "The five daily prayers and from one Friday prayer to the next are expiation for whatever sins come in between, so long as one does not commit any major sin."',
          reference: 'Muslim 233',
          book: 'Sahih Muslim',
          matchedKeyword: 'prayer'
        },
        {
          narrator: 'Jabir ibn Abdullah (RA)',
          text: 'The Prophet (PBUH) said: "Between a man and disbelief is the abandonment of prayer."',
          arabic: 'بَيْنَ الرَّجُلِ وَبَيْنَ الْكُفْرِ تَرْكُ الصَّلاَةِ',
          reference: 'Muslim 82',
          book: 'Sahih Muslim',
          matchedKeyword: 'prayer'
        },
        {
          narrator: 'Umar ibn al-Khattab (RA)',
          text: 'The Prophet (PBUH) said: "Whoever guards and observes the prayers, they will be a light, evidence and salvation for him on the Day of Judgment."',
          reference: 'Ahmad 6576',
          book: 'Musnad Ahmad',
          matchedKeyword: 'prayer'
        }
      );
    }
    
    // Fasting/Rozay
    if (keywordText.includes('fasting') || keywordText.includes('fast') || keywordText.includes('ramadan') || keywordText.includes('roza') || keywordText.includes('rozay') || keywordText.includes('sawm')) {
      hadiths.push(
        {
          narrator: 'Abu Huraira (RA)',
          text: 'The Prophet (PBUH) said: "Whoever fasts during Ramadan out of sincere faith and hoping to attain Allah\'s rewards, then all his past sins will be forgiven."',
          arabic: 'مَنْ صَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ',
          reference: 'Bukhari 38',
          book: 'Sahih Bukhari',
          matchedKeyword: 'fasting'
        },
        {
          narrator: 'Abu Huraira (RA)',
          text: 'The Prophet (PBUH) said: "Fasting is a shield (from Hell). So the one who fasts should avoid obscenity and foolishness, and if someone fights with him or insults him, he should say: \'Indeed, I am fasting.\'"',
          arabic: 'الصِّيَامُ جُنَّةٌ',
          reference: 'Bukhari 1904',
          book: 'Sahih Bukhari',
          matchedKeyword: 'fasting'
        },
        {
          narrator: 'Abu Said al-Khudri (RA)',
          text: 'The Prophet (PBUH) said: "No servant fasts on a day in the path of Allah except that Allah removes the Hellfire seventy years further away from his face."',
          reference: 'Bukhari 2840',
          book: 'Sahih Bukhari',
          matchedKeyword: 'fasting'
        },
        {
          narrator: 'Sahl ibn Sa\'d (RA)',
          text: 'The Prophet (PBUH) said: "There is a gate in Paradise called Ar-Rayyan, and those who observe fasts will enter through it on the Day of Resurrection and none except them will enter through it."',
          arabic: 'إِنَّ فِي الْجَنَّةِ بَابًا يُقَالُ لَهُ الرَّيَّانُ',
          reference: 'Bukhari 1896',
          book: 'Sahih Bukhari',
          matchedKeyword: 'fasting'
        },
        {
          narrator: 'Abu Huraira (RA)',
          text: 'Allah said: "Every deed of the son of Adam is for him except fasting; it is for Me and I shall reward for it."',
          arabic: 'كُلُّ عَمَلِ ابْنِ آدَمَ لَهُ إِلاَّ الصِّيَامَ فَإِنَّهُ لِي وَأَنَا أَجْزِي بِهِ',
          reference: 'Bukhari 1904',
          book: 'Sahih Bukhari',
          matchedKeyword: 'fasting'
        }
      );
    }
    
    // Patience/Sabr
    if (keywordText.includes('patience') || keywordText.includes('sabr') || keywordText.includes('difficult')) {
      hadiths.push(
        {
          narrator: 'Abu Huraira (RA)',
          text: 'The Prophet (PBUH) said: "The strong person is not the one who is strong in wrestling, rather the strong person is the one who controls himself in anger."',
          reference: 'Bukhari 6114',
          book: 'Sahih Bukhari',
          matchedKeyword: 'patience'
        }
      );
    }
    
    return hadiths.slice(0, 5);
  }

  /**
   * Search Quran API for verses matching keywords
   */
  async searchQuranVerses(searchTerms) {
    const ayahs = [];
    
    for (const term of searchTerms) {
      if (!term || ayahs.length >= 5) break;
      
      try {
        // Clean the search term - remove non-alphabetic characters
        const cleanTerm = term.replace(/[^a-zA-Z\s]/g, '').trim();
        if (cleanTerm.length < 3) continue; // Skip very short terms
        
        // Search Quran for this keyword
        const response = await axios.get(
          `${this.quranSearchAPI}/${encodeURIComponent(cleanTerm)}/all/en.asad`,
          { timeout: 10000 }
        );
        
        if (response.data && response.data.code === 200 && response.data.data && response.data.data.matches) {
          const matches = response.data.data.matches.slice(0, 3);  // Get top 3 matches per term
          
          for (const match of matches) {
            // Avoid duplicates
            const ayahRef = `Quran ${match.surah.number}:${match.numberInSurah}`;
            if (!ayahs.find(a => a.reference === ayahRef)) {
              try {
                // Fetch Arabic text
                const arabicResponse = await axios.get(
                  `https://api.alquran.cloud/v1/ayah/${match.number}/ar.alafasy`,
                  { timeout: 10000 }
                );
                
                // Fetch Urdu translation
                const urduResponse = await axios.get(
                  `https://api.alquran.cloud/v1/ayah/${match.number}/ur.jalandhry`,
                  { timeout: 10000 }
                );
                
                ayahs.push({
                  surah: match.surah.englishName,
                  surahArabic: match.surah.name,
                  surahNumber: match.surah.number,
                  ayahNumber: match.numberInSurah,
                  fullReference: `${match.surah.englishName} ${match.surah.number}:${match.numberInSurah}`,
                  arabic: arabicResponse.data.data.text || match.text,
                  translation: match.text,  // English translation
                  urduTranslation: urduResponse.data.data.text || '',
                  reference: ayahRef,
                  matchedKeyword: cleanTerm,
                  source: 'Quran',
                  edition: 'en.asad'
                });
              } catch (fetchError) {
                // If fetching Arabic/Urdu fails, use what we have from search
                ayahs.push({
                  surah: match.surah.englishName,
                  surahArabic: match.surah.name,
                  surahNumber: match.surah.number,
                  ayahNumber: match.numberInSurah,
                  fullReference: `${match.surah.englishName} ${match.surah.number}:${match.numberInSurah}`,
                  arabic: match.text,
                  translation: match.text,
                  urduTranslation: '',
                  reference: ayahRef,
                  matchedKeyword: cleanTerm,
                  source: 'Quran',
                  edition: 'en.asad'
                });
              }
            }
          }
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.log(`No Quran results found for "${term}"`);
        } else {
          console.error(`Error searching Quran for "${term}":`, error.message);
        }
      }
    }

    // No fallback - only return results that match the actual search terms
    return ayahs.slice(0, 5);  // Return max 5 verses
  }

  /**
   * Search Hadith API for relevant hadith matching keywords
   */
  async searchHadith(searchTerms) {
    const hadiths = [];
    
    // Use the random hadith API since the gading.dev API has limited search
    // We'll fetch from multiple collections and rely on topic-specific curated hadith
    const randomAPI = 'https://random-hadith-generator.vercel.app';
    const books = ['bukhari', 'muslim'];
    
    for (const book of books) {
      if (hadiths.length >= 5) break;
      
      try {
        // Fetch random hadith from this book
        for (let i = 0; i < 3; i++) {
          if (hadiths.length >= 5) break;
          
          const response = await axios.get(
            `${randomAPI}/${book}/`,
            { timeout: 10000 }
          );
          
          if (response.data && response.data.data) {
            const hadithData = response.data.data;
            hadiths.push({
              narrator: hadithData.chapterName || 'Hadith',
              text: hadithData.hadith_english || hadithData.hadithEnglish,
              arabic: hadithData.hadithArabic || '',
              reference: hadithData.refno || `Book ${hadithData.book?.bookNumber || ''}`,
              book: book === 'bukhari' ? 'Sahih Bukhari' : 'Sahih Muslim',
              matchedKeyword: 'general'
            });
          }
        }
      } catch (error) {
        console.log(`Error fetching hadith from ${book}:`, error.message);
      }
    }

    return hadiths.slice(0, 5);
  }

  /**
   * Format hadith book name for display
   */
  formatBookName(book) {
    const bookNames = {
      'bukhari': 'Sahih Bukhari',
      'muslim': 'Sahih Muslim',
      'abu-dawud': 'Sunan Abu Dawud',
      'tirmidzi': 'Jami at-Tirmidhi',
      'ibnu-majah': 'Sunan Ibn Majah',
      'nasai': 'Sunan an-Nasai'
    };
    return bookNames[book] || book;
  }

  /**
   * Get keywords directly from a forum post for analysis
   * This is called from KhutbahController to understand what user is asking
   */
  analyzeForumPost(title, content) {
    const keywords = this.extractKeywords(title, content);
    
    // Generate a descriptive topic name based on extracted keywords
    let topicName = '';
    
    if (keywords.primaryKeywords.length > 0) {
      // Create topic name from primary keywords
      const mainKeyword = keywords.primaryKeywords[0];
      const secondaryKeyword = keywords.primaryKeywords[1] || keywords.secondaryKeywords[0];
      
      // Capitalize and format
      const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
      
      if (secondaryKeyword) {
        topicName = `${capitalize(mainKeyword)} and ${capitalize(secondaryKeyword)} in Islam`;
      } else {
        topicName = `${capitalize(mainKeyword)} in Islam`;
      }
    } else if (keywords.phrases.length > 0) {
      topicName = keywords.phrases[0].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    } else {
      topicName = title;  // Fallback to original title
    }

    return {
      topicName,
      keywords,
      description: this.generateDescription(keywords)
    };
  }

  /**
   * Generate a description based on extracted keywords
   */
  generateDescription(keywords) {
    const primary = keywords.primaryKeywords;
    const phrases = keywords.phrases;
    
    if (primary.length === 0) {
      return 'Community discussion seeking Islamic guidance';
    }
    
    let description = 'Understanding Islamic teachings on ';
    
    if (primary.length >= 2) {
      description += `${primary[0]}, ${primary[1]}`;
      if (primary.length > 2) {
        description += `, and ${primary[2]}`;
      }
    } else {
      description += primary[0];
    }
    
    if (phrases.length > 0) {
      description += ` - including ${phrases[0]}`;
    }
    
    return description;
  }
}

module.exports = new IslamicContentService();
