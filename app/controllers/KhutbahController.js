const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const islamicContentService = require('../services/IslamicContentService');

/**
 * Khutbah Controller
 * Handles AI-powered khutbah topic suggestions based on community forum analysis
 */
class KhutbahController {
  
  /**
   * Analyze community forum discussions and generate topic suggestions
   * Uses keyword extraction and frequency analysis
   */
  async analyzeAndGenerateSuggestions(req, res) {
    try {
      // First, delete all old 'suggested' status suggestions to start fresh
      // Keep 'selected' and 'delivered' suggestions as they are actively in use
      // Also keep manual topics (isCommunityDriven=false) created by imams
      await prisma.khutbahSuggestion.deleteMany({
        where: {
          status: 'suggested',
          isCommunityDriven: true
        }
      });

      // Get recent forum posts (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let recentPosts = await prisma.forumPost.findMany({
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        },
        include: {
          comments: true,
          likes: true,
          author: {
            select: {
              fullName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Fallback: if no posts in last 30 days, analyze the most recent 50 posts (any date)
      if (!recentPosts.length) {
        recentPosts = await prisma.forumPost.findMany({
          take: 50,
          include: {
            comments: true,
            likes: true,
            author: {
              select: {
                fullName: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      }

      // Analyze posts to extract topics and themes
      const topicAnalysis = await this.extractTopicsFromPosts(recentPosts);

      if (topicAnalysis.length === 0) {
        return res.json({
          success: true,
          message: 'No relevant topics found in recent community discussions.',
          suggestions: []
        });
      }

      // Generate suggestions for each topic from community discussions
      const suggestions = [];
      for (const topic of topicAnalysis) {
        // Pass topic name and keywords for better content fetching
        const searchContent = topic.keywords ? 
          topic.keywords.primaryKeywords.join(' ') + ' ' + topic.keywords.secondaryKeywords.join(' ') : 
          topic.name;
        
        const islamicContent = await islamicContentService.getContentForTopic(topic.name, searchContent);
        
        const suggestion = await prisma.khutbahSuggestion.create({
          data: {
            topic: topic.name,
            description: topic.description,
            relevanceScore: topic.score,
            supportingAyah: JSON.stringify(islamicContent.ayah),
            supportingHadith: JSON.stringify(islamicContent.hadith),
            analyzedThreadIds: JSON.stringify(topic.threadIds),
            status: 'suggested'
          }
        });

        suggestions.push(suggestion);
      }

      res.json({
        success: true,
        message: `Generated ${suggestions.length} khutbah topic suggestion(s) from community discussions`,
        suggestions: suggestions
      });

    } catch (error) {
      console.error('Error analyzing forum topics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze forum topics',
        error: error.message
      });
    }
  }

  /**
   * Create a manual khutbah topic with custom keywords
   * Allows imam to input topic and keywords to get relevant Islamic content
   */
  async createManualTopic(req, res) {
    try {
      const { topic, keywords, description } = req.body;

      // Validate input
      if (!topic || !keywords) {
        return res.status(400).json({
          success: false,
          message: 'Topic and keywords are required'
        });
      }

      // Convert keywords string to array if needed
      const keywordArray = Array.isArray(keywords) 
        ? keywords 
        : keywords.split(',').map(k => k.trim()).filter(k => k);

      if (keywordArray.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one keyword is required'
        });
      }

      // Use IslamicContentService to get relevant content based on keywords
      const keywordText = keywordArray.join(' ');
      const islamicContent = await islamicContentService.getContentForTopic(topic, keywordText);

      // Generate description if not provided
      const finalDescription = description || `Islamic guidance on ${keywordArray.slice(0, 3).join(', ')}`;

      // Check if topic already exists
      const existingTopic = await prisma.khutbahSuggestion.findFirst({
        where: {
          topic: topic,
          status: {
            in: ['suggested', 'selected']
          }
        }
      });

      if (existingTopic) {
        return res.status(400).json({
          success: false,
          message: 'A suggestion with this topic already exists'
        });
      }

      // Create the suggestion
      const suggestion = await prisma.khutbahSuggestion.create({
        data: {
          topic: topic,
          description: finalDescription,
          relevanceScore: 100, // Manual topics get high relevance
          supportingAyah: JSON.stringify(islamicContent.ayah || []),
          supportingHadith: JSON.stringify(islamicContent.hadith || []),
          analyzedThreadIds: JSON.stringify([]), // Manual topic, no thread IDs
          status: 'suggested'
        }
      });

      res.json({
        success: true,
        message: 'Topic created successfully',
        suggestion: {
          ...suggestion,
          supportingAyah: islamicContent.ayah || [],
          supportingHadith: islamicContent.hadith || [],
          analyzedThreadIds: [],
          keywords: keywordArray
        }
      });

    } catch (error) {
      console.error('Error creating manual topic:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create topic',
        error: error.message
      });
    }
  }

  /**
   * Real-time search for Islamic content
   * Allows imam to search Quran/Hadith with keyword and select sources
   */
  async searchIslamicContent(req, res) {
    try {
      const { keywords, sources = ['quran', 'bukhari', 'muslim'] } = req.body;

      if (!keywords || !keywords.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Keywords are required'
        });
      }

      // Use the existing imported service
      const extractedKeywords = islamicContentService.extractKeywords(keywords, '');
      
      const results = {
        quran: [],
        hadith: []
      };

      // Search Quran if requested
      if (sources.includes('quran')) {
        results.quran = await islamicContentService.searchQuranVerses(extractedKeywords.searchTerms);
      }

      // Get curated Hadith if requested
      if (sources.includes('bukhari') || sources.includes('muslim') || sources.includes('hadith')) {
        results.hadith = await islamicContentService.getCuratedHadith(
          extractedKeywords.primaryKeywords,
          extractedKeywords.searchTerms
        );
      }

      res.json({
        success: true,
        results,
        extractedKeywords: extractedKeywords.searchTerms
      });

    } catch (error) {
      console.error('Error searching Islamic content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search content',
        error: error.message
      });
    }
  }

  /**
   * Save curated Islamic content as a khutbah topic
   */
  async saveCuratedTopic(req, res) {
    try {
      const { topic, description, selectedAyah, selectedHadith, keywords } = req.body;

      if (!topic || !keywords) {
        return res.status(400).json({
          success: false,
          message: 'Topic and keywords are required'
        });
      }

      const keywordArray = Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim());

      const suggestion = await prisma.khutbahSuggestion.create({
        data: {
          topic,
          description: description || `Curated topic about ${topic}`,
          supportingAyah: JSON.stringify(selectedAyah || []),
          supportingHadith: JSON.stringify(selectedHadith || []),
          relevanceScore: 100,
          status: 'suggested',
          analyzedThreadIds: JSON.stringify([])
        }
      });

      res.json({
        success: true,
        message: 'Topic saved successfully',
        suggestion
      });

    } catch (error) {
      console.error('Error saving curated topic:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save topic',
        error: error.message
      });
    }
  }

  /**
   * Get all khutbah suggestions for imam dashboard
   */
  async getSuggestions(req, res) {
    try {
      const { status } = req.query;

      const where = status ? { status } : {};

      const suggestions = await prisma.khutbahSuggestion.findMany({
        where,
        include: {
          imam: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: [
          { relevanceScore: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      // Parse JSON fields
      const formattedSuggestions = suggestions.map(s => ({
        ...s,
        supportingAyah: s.supportingAyah ? JSON.parse(s.supportingAyah) : [],
        supportingHadith: s.supportingHadith ? JSON.parse(s.supportingHadith) : [],
        analyzedThreadIds: s.analyzedThreadIds ? JSON.parse(s.analyzedThreadIds) : []
      }));

      res.json({
        success: true,
        suggestions: formattedSuggestions
      });

    } catch (error) {
      console.error('Error fetching suggestions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch khutbah suggestions',
        error: error.message
      });
    }
  }

  /**
   * Get detailed information about a specific topic
   */
  async getTopicDetail(req, res) {
    try {
      const { id } = req.params;

      const suggestion = await prisma.khutbahSuggestion.findUnique({
        where: { id: parseInt(id) },
        include: {
          imam: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      });

      if (!suggestion) {
        return res.status(404).json({
          success: false,
          message: 'Topic not found'
        });
      }

      // Parse JSON fields and get related threads
      const analyzedThreadIds = suggestion.analyzedThreadIds ? JSON.parse(suggestion.analyzedThreadIds) : [];
      
      const relatedThreads = await prisma.forumPost.findMany({
        where: {
          id: {
            in: analyzedThreadIds
          }
        },
        include: {
          author: {
            select: {
              fullName: true
            }
          },
          _count: {
            select: {
              comments: true,
              likes: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const formattedSuggestion = {
        ...suggestion,
        supportingAyah: suggestion.supportingAyah ? JSON.parse(suggestion.supportingAyah) : [],
        supportingHadith: suggestion.supportingHadith ? JSON.parse(suggestion.supportingHadith) : [],
        analyzedThreadIds,
        relatedThreads
      };

      res.json({
        success: true,
        suggestion: formattedSuggestion
      });

    } catch (error) {
      console.error('Error fetching topic detail:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch topic details',
        error: error.message
      });
    }
  }

  /**
   * Imam selects a topic for their next khutbah
   */
  async selectTopic(req, res) {
    try {
      const { id } = req.params;
      const imamId = req.user.id;

      const suggestion = await prisma.khutbahSuggestion.update({
        where: { id: parseInt(id) },
        data: {
          status: 'selected',
          imamId: imamId,
          selectedAt: new Date()
        }
      });

      res.json({
        success: true,
        message: 'Topic selected successfully',
        suggestion
      });

    } catch (error) {
      console.error('Error selecting topic:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to select topic',
        error: error.message
      });
    }
  }

  /**
   * Mark a topic as delivered
   */
  async markAsDelivered(req, res) {
    try {
      const { id } = req.params;

      const suggestion = await prisma.khutbahSuggestion.update({
        where: { id: parseInt(id) },
        data: {
          status: 'delivered',
          deliveredAt: new Date()
        }
      });

      res.json({
        success: true,
        message: 'Topic marked as delivered',
        suggestion
      });

    } catch (error) {
      console.error('Error marking topic as delivered:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark topic as delivered',
        error: error.message
      });
    }
  }

  /**
   * Extract topics from forum posts using NLP-based keyword analysis
   * Uses IslamicContentService to analyze what users are actually asking about
   */
  async extractTopicsFromPosts(posts) {
    if (!posts || posts.length === 0) {
      return [];
    }

    const topicScores = {};

    // Analyze each post using NLP-based keyword extraction
    for (const post of posts) {
      const engagement = (post.likes.length * 2) + post.comments.length;

      // Only include posts with some engagement or content
      if (post.content.length > 20 || engagement > 0) {
        // Use IslamicContentService to analyze the post and extract keywords
        const analysis = islamicContentService.analyzeForumPost(post.title, post.content);
        
        console.log(`Analyzing post: "${post.title}"`);
        console.log('Extracted analysis:', analysis);

        const topicName = analysis.topicName;
        const description = analysis.description;

        if (!topicScores[topicName]) {
          topicScores[topicName] = {
            name: topicName,
            description: description,
            score: 0,
            threadIds: [],
            matchCount: 0,
            keywords: analysis.keywords  // Store extracted keywords for reference
          };
        }

        // Score based on engagement
        const score = 10 + (engagement * 5); // Base score + engagement
        topicScores[topicName].score += score;
        topicScores[topicName].threadIds.push(post.id);
        topicScores[topicName].matchCount += 1;
      }
    }

    // Convert to array and sort by score
    // Only return topics with actual engagement
    const topics = Object.values(topicScores)
      .filter(topic => topic.score >= 10) // Minimum threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5 topics

    // Normalize scores to 0-100 range
    if (topics.length > 0) {
      const maxScore = topics[0].score;
      topics.forEach(topic => {
        topic.score = Math.round((topic.score / maxScore) * 100);
      });
    }

    return topics;
  }

  /**
   * @deprecated - Now using IslamicContentService for dynamic API-based content
   * Get Islamic content (Quranic verses and Hadith) for a topic
   * This is a simplified version with hardcoded content
   * In production, integrate with Islamic content APIs like Quran.com API, Hadith APIs, etc.
   */
  async getIslamicContent(topicName) {
    const islamicContent = {
      'Family & Marriage': {
        ayah: [
          {
            surah: 'Ar-Rum',
            ayahNumber: 21,
            arabic: 'وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً',
            translation: 'And of His signs is that He created for you from yourselves mates that you may find tranquility in them; and He placed between you affection and mercy.',
            reference: 'Quran 30:21'
          },
          {
            surah: 'An-Nisa',
            ayahNumber: 19,
            arabic: 'وَعَاشِرُوهُنَّ بِالْمَعْرُوفِ',
            translation: 'And live with them in kindness.',
            reference: 'Quran 4:19'
          }
        ],
        hadith: [
          {
            narrator: 'Abu Hurairah',
            text: 'The most perfect of believers in faith are those who are best in character, and the best of you are those who are best to their wives.',
            reference: 'Tirmidhi',
            book: 'Jami` at-Tirmidhi'
          },
          {
            narrator: 'Aisha',
            text: 'The best of you is the one who is best to his family, and I am the best of you to my family.',
            reference: 'Ibn Majah',
            book: 'Sunan Ibn Majah'
          }
        ]
      },
      'Youth & Education': {
        ayah: [
          {
            surah: 'Al-Mujadila',
            ayahNumber: 11,
            arabic: 'يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ',
            translation: 'Allah will raise those who have believed among you and those who were given knowledge, by degrees.',
            reference: 'Quran 58:11'
          },
          {
            surah: 'Taha',
            ayahNumber: 114,
            arabic: 'وَقُل رَّبِّ زِدْنِي عِلْمًا',
            translation: 'And say: My Lord, increase me in knowledge.',
            reference: 'Quran 20:114'
          }
        ],
        hadith: [
          {
            narrator: 'Prophet Muhammad (PBUH)',
            text: 'Seeking knowledge is an obligation upon every Muslim.',
            reference: 'Ibn Majah',
            book: 'Sunan Ibn Majah'
          },
          {
            narrator: 'Abu Hurairah',
            text: 'When a man dies, his deeds come to an end except for three things: ongoing charity, knowledge that is benefited from, and a righteous child who prays for him.',
            reference: 'Muslim',
            book: 'Sahih Muslim'
          }
        ]
      },
      'Prayer & Worship': {
        ayah: [
          {
            surah: 'Al-Baqarah',
            ayahNumber: 153,
            arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ',
            translation: 'O you who have believed, seek help through patience and prayer.',
            reference: 'Quran 2:153'
          },
          {
            surah: 'Al-Ankabut',
            ayahNumber: 45,
            arabic: 'إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ',
            translation: 'Indeed, prayer prohibits immorality and wrongdoing.',
            reference: 'Quran 29:45'
          }
        ],
        hadith: [
          {
            narrator: 'Prophet Muhammad (PBUH)',
            text: 'The first matter that the slave will be brought to account for on the Day of Judgment is the prayer. If it is sound, then the rest of his deeds will be sound.',
            reference: 'Tabarani',
            book: 'Al-Mu\'jam al-Awsat'
          },
          {
            narrator: 'Abu Hurairah',
            text: 'Allah\'s Messenger said: If anyone performs ablution well, then comes to the Friday prayer and listens and keeps silent, he will be forgiven for what is between that and the next Friday, with three days extra.',
            reference: 'Muslim',
            book: 'Sahih Muslim'
          }
        ]
      },
      'Social Issues & Justice': {
        ayah: [
          {
            surah: 'An-Nisa',
            ayahNumber: 135,
            arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا كُونُوا قَوَّامِينَ بِالْقِسْطِ',
            translation: 'O you who have believed, be persistently standing firm in justice.',
            reference: 'Quran 4:135'
          },
          {
            surah: 'Al-Ma\'un',
            ayahNumber: 1-3,
            arabic: 'أَرَأَيْتَ الَّذِي يُكَذِّبُ بِالدِّينِ فَذَٰلِكَ الَّذِي يَدُعُّ الْيَتِيمَ',
            translation: 'Have you seen the one who denies the Recompense? For that is the one who drives away the orphan.',
            reference: 'Quran 107:1-3'
          }
        ],
        hadith: [
          {
            narrator: 'Prophet Muhammad (PBUH)',
            text: 'Whoever relieves a believer\'s distress of the distressful aspects of this world, Allah will rescue him from a difficulty of the difficulties of the Hereafter.',
            reference: 'Muslim',
            book: 'Sahih Muslim'
          },
          {
            narrator: 'Abu Musa Al-Ash\'ari',
            text: 'The believers, in their mutual love, mercy and compassion, are like one body: if one organ complained, the rest of the body develops a fever.',
            reference: 'Bukhari',
            book: 'Sahih al-Bukhari'
          }
        ]
      },
      'Ethics & Character': {
        ayah: [
          {
            surah: 'Al-Qalam',
            ayahNumber: 4,
            arabic: 'وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍ',
            translation: 'And indeed, you are of a great moral character.',
            reference: 'Quran 68:4'
          },
          {
            surah: 'Al-Hujurat',
            ayahNumber: 11,
            arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا لَا يَسْخَرْ قَوْمٌ مِّن قَوْمٍ',
            translation: 'O you who have believed, let not a people ridicule [another] people.',
            reference: 'Quran 49:11'
          }
        ],
        hadith: [
          {
            narrator: 'Prophet Muhammad (PBUH)',
            text: 'I have been sent to perfect good character.',
            reference: 'Muwatta Malik',
            book: 'Al-Muwatta'
          },
          {
            narrator: 'Abu Dharr',
            text: 'The Messenger of Allah said to me: Fear Allah wherever you are, and follow up a bad deed with a good one and it will wipe it out, and behave well towards people.',
            reference: 'Tirmidhi',
            book: 'Jami` at-Tirmidhi'
          }
        ]
      },
      'Faith & Belief': {
        ayah: [
          {
            surah: 'Al-Baqarah',
            ayahNumber: 285,
            arabic: 'آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ',
            translation: 'The Messenger has believed in what was revealed to him from his Lord, and [so have] the believers.',
            reference: 'Quran 2:285'
          },
          {
            surah: 'Al-Imran',
            ayahNumber: 173,
            arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
            translation: 'Sufficient for us is Allah, and [He is] the best Disposer of affairs.',
            reference: 'Quran 3:173'
          }
        ],
        hadith: [
          {
            narrator: 'Umar ibn Al-Khattab',
            text: 'Iman (faith) has more than seventy branches, the most excellent of which is the declaration that there is no god but Allah, and the humblest of which is the removal of harmful objects from the road.',
            reference: 'Muslim',
            book: 'Sahih Muslim'
          },
          {
            narrator: 'Abu Hurairah',
            text: 'The strong believer is better and more beloved to Allah than the weak believer, although both are good.',
            reference: 'Muslim',
            book: 'Sahih Muslim'
          }
        ]
      },
      'Modern Challenges': {
        ayah: [
          {
            surah: 'Al-Baqarah',
            ayahNumber: 216,
            arabic: 'وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ',
            translation: 'But perhaps you hate a thing and it is good for you.',
            reference: 'Quran 2:216'
          },
          {
            surah: 'Ar-Ra\'d',
            ayahNumber: 11,
            arabic: 'إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنفُسِهِمْ',
            translation: 'Indeed, Allah will not change the condition of a people until they change what is in themselves.',
            reference: 'Quran 13:11'
          }
        ],
        hadith: [
          {
            narrator: 'Ibn Abbas',
            text: 'Take advantage of five before five: your youth before your old age, your health before your illness, your riches before your poverty, your free time before your work, and your life before your death.',
            reference: 'Hakim',
            book: 'Al-Mustadrak'
          },
          {
            narrator: 'Prophet Muhammad (PBUH)',
            text: 'The world is a prison for the believer and a paradise for the disbeliever.',
            reference: 'Muslim',
            book: 'Sahih Muslim'
          }
        ]
      },
      'Business & Finance': {
        ayah: [
          {
            surah: 'Al-Baqarah',
            ayahNumber: 275,
            arabic: 'وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا',
            translation: 'But Allah has permitted trade and has forbidden interest.',
            reference: 'Quran 2:275'
          },
          {
            surah: 'An-Nisa',
            ayahNumber: 29,
            arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا لَا تَأْكُلُوا أَمْوَالَكُم بَيْنَكُم بِالْبَاطِلِ',
            translation: 'O you who have believed, do not consume one another\'s wealth unjustly.',
            reference: 'Quran 4:29'
          }
        ],
        hadith: [
          {
            narrator: 'Prophet Muhammad (PBUH)',
            text: 'The honest merchant will be with the Prophets, the truthful and the martyrs.',
            reference: 'Tirmidhi',
            book: 'Jami` at-Tirmidhi'
          },
          {
            narrator: 'Hakim ibn Hizam',
            text: 'The buyer and seller have the option to cancel or confirm the bargain unless they separate, and if they spoke the truth and made clear the defects of the goods, then they would be blessed in their bargain, but if they told lies and concealed some facts, their bargain would be deprived of Allah\'s blessings.',
            reference: 'Bukhari',
            book: 'Sahih al-Bukhari'
          }
        ]
      }
    };

    // Return content for the topic, or default content
    return islamicContent[topicName] || {
      ayah: [
        {
          surah: 'Al-Baqarah',
          ayahNumber: 2,
          arabic: 'ذَٰلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ هُدًى لِّلْمُتَّقِينَ',
          translation: 'This is the Book about which there is no doubt, a guidance for those conscious of Allah.',
          reference: 'Quran 2:2'
        }
      ],
      hadith: [
        {
          narrator: 'Prophet Muhammad (PBUH)',
          text: 'The best speech is the Book of Allah and the best guidance is the guidance of Muhammad.',
          reference: 'Muslim',
          book: 'Sahih Muslim'
        }
      ]
    };
  }
}

module.exports = new KhutbahController();
