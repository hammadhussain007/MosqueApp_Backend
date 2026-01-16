# Imam Dashboard - Smart Khutbah Topic Suggestion 🕌

## Overview

The Imam Dashboard is an AI-powered feature that analyzes community forum discussions to suggest relevant khutbah (sermon) topics. It helps Imams stay connected with their community's concerns and provides Islamic guidance (Quranic verses and Hadith) for each topic.

## Features

### 1. **AI Topic Analysis**
- Analyzes recent forum posts (last 30 days)
- Extracts trending topics and themes using keyword-based NLP
- Scores topics by relevance (based on keyword frequency and engagement)
- Identifies related community discussions

### 2. **Smart Suggestions**
- Generates 5 top khutbah topic suggestions
- Each suggestion includes:
  - **Topic Name**: e.g., "Family & Marriage", "Youth & Education"
  - **Description**: Context for the khutbah
  - **Relevance Score**: 0-100% based on community interest
  - **Supporting Ayah**: Relevant Quranic verses with Arabic text and translation
  - **Supporting Hadith**: Authentic hadith references
  - **Related Threads**: Links to forum discussions that triggered the suggestion

### 3. **Topic Categories**
The system recognizes 8 major Islamic topic categories:
1. **Family & Marriage** - Marriage, parenting, family bonds
2. **Youth & Education** - Knowledge seeking, student guidance
3. **Prayer & Worship** - Salah, fasting, Hajj, Zakat
4. **Social Issues & Justice** - Community service, helping the poor
5. **Ethics & Character** - Honesty, patience, forgiveness
6. **Faith & Belief** - Strengthening iman, Islamic beliefs
7. **Modern Challenges** - Technology, social media, contemporary issues
8. **Business & Finance** - Halal income, ethical business

### 4. **Workflow States**
- **Suggested**: AI-generated topics ready for review
- **Selected**: Imam has chosen this topic for next khutbah
- **Delivered**: Khutbah has been given

### 5. **Islamic Content Database**
Each topic includes authentic Islamic references:
- **Quranic Verses**: Arabic text, English translation, Surah/Ayah reference
- **Hadith**: Narrator, text, book reference (Bukhari, Muslim, Tirmidhi, etc.)

## User Roles

### Imam Role
- Access to Imam Dashboard
- Can analyze community discussions
- View topic suggestions with Islamic content
- Select topics for upcoming khutbahs
- Mark khutbahs as delivered

### Admin Role
- Regular admin features (unchanged)
- Cannot access Imam Dashboard

### Regular User
- Can create forum posts
- Forum activity contributes to topic analysis

## Technical Implementation

### Backend

#### Database Schema
```prisma
model KhutbahSuggestion {
  id              Int       @id @default(autoincrement())
  topic           String
  description     String    @db.Text
  relevanceScore  Float
  supportingAyah  String?   @db.Text // JSON array
  supportingHadith String?  @db.Text // JSON array
  analyzedThreadIds String? @db.Text // JSON array
  status          String    @default("suggested")
  imam            User?     @relation(fields: [imamId], references: [id])
  imamId          Int?
  selectedAt      DateTime?
  deliveredAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

#### API Endpoints
```
POST   /api/khutbah/analyze                    - Analyze forums and generate suggestions
GET    /api/khutbah/suggestions                - Get all suggestions (with status filter)
GET    /api/khutbah/suggestions/:id            - Get topic details
POST   /api/khutbah/suggestions/:id/select     - Select a topic
POST   /api/khutbah/suggestions/:id/delivered  - Mark as delivered
```

#### NLP Algorithm
The topic extraction uses keyword-based analysis:
1. Define topic categories with relevant keywords
2. Scan forum post titles and content for keyword matches
3. Calculate relevance score: `matches × (1 + engagement × 0.1)`
4. Weight engagement: likes × 2 + comments
5. Return top 5 topics sorted by score
6. Normalize scores to 0-100 range

### Frontend

#### Screens
1. **ImamDashboard.js**
   - Topic suggestions list
   - Search and filter by status
   - "Analyze" button to trigger analysis
   - Relevance score progress bars
   - Thread/Ayah/Hadith count chips

2. **TopicDetailScreen.js**
   - Full topic information
   - Quranic verses with Arabic and translation
   - Hadith references with narrator and book
   - Related community threads
   - Action buttons (Select/Mark as Delivered)

#### Navigation
- New "Khutbah" tab for Imam role users
- Stack navigator for ImamDashboard → TopicDetail
- Conditional rendering based on user role

## Setup Instructions

### 1. Database Migration
```bash
cd MosqueApp_Backend
npx prisma db push
npx prisma generate
```

### 2. Create Imam User
```bash
node scripts/createImamUser.js
```
Credentials:
- Email: `imam@mosque.com`
- Password: `Unlockit007`
- Role: `imam`

### 3. Seed Sample Forum Data
```bash
node scripts/seedForumData.js
```
Creates 10 sample forum posts covering various topics.

### 4. Start Backend Server
```bash
npm start
```

### 5. Start Frontend App
```bash
cd ../MosqueApp_Frontend
npm start
```

## Usage Guide

### For Imams

#### Step 1: Login
- Use imam credentials: `imam@mosque.com` / `Unlockit007`
- Navigate to "Khutbah" tab

#### Step 2: Analyze Community
- Tap the "Analyze" button (brain icon)
- System analyzes last 30 days of forum posts
- Generates top 5 relevant topic suggestions

#### Step 3: Review Suggestions
- Browse suggested topics
- View relevance scores
- See how many threads, ayah, and hadith for each topic

#### Step 4: Select a Topic
- Tap on a suggestion card
- Review detailed information:
  - Quranic verses with Arabic text
  - Hadith references
  - Related community discussions
- Tap "Select This Topic" button
- Topic moves to "Selected" status

#### Step 5: Prepare Khutbah
- Use provided Quranic verses and Hadith
- Reference related community threads for context
- Prepare sermon addressing community concerns

#### Step 6: Mark as Delivered
- After giving the khutbah, open the topic
- Tap "Mark as Delivered"
- Topic moves to "Delivered" status for historical tracking

### For Community Members

#### Contribute to Topic Generation
- Create forum posts about issues you face
- Discuss challenges and questions
- Engage with others (comments, likes)
- Your activity helps Imams understand community needs

## Future Enhancements

### Planned Features
1. **Real AI/ML Integration**
   - Replace keyword-based analysis with actual NLP models
   - Use models like BERT or GPT for better topic extraction
   - Sentiment analysis to gauge urgency of topics

2. **External Islamic Content APIs**
   - Integrate with Quran.com API
   - Connect to Hadith databases (Sunnah.com)
   - Access scholarly tafsir and commentary

3. **Multilingual Support**
   - Arabic interface for Imams
   - Urdu/other languages based on community

4. **Khutbah Scheduling**
   - Calendar integration
   - Schedule topics for specific dates
   - Send reminders to Imams

5. **Community Feedback**
   - Allow community to rate khutbahs
   - Request specific topics
   - Vote on suggested topics

6. **Advanced Analytics**
   - Topic trend visualization
   - Community engagement metrics
   - Historical khutbah tracking

7. **Collaborative Features**
   - Multiple Imams can collaborate
   - Share notes and resources
   - Peer review suggestions

## Testing

### Test Accounts
```
Imam:
- Email: imam@mosque.com
- Password: Unlockit007
- Role: imam

Admin:
- Email: admin@mosque.com
- Password: Unlockit007
- Role: admin
```

### Test Scenarios

1. **Generate Suggestions**
   - Login as Imam
   - Tap "Analyze" button
   - Verify suggestions are created with scores

2. **View Topic Details**
   - Tap a suggestion card
   - Verify Ayah display (Arabic + translation)
   - Verify Hadith display
   - Verify related threads appear

3. **Select Topic**
   - In topic detail, tap "Select This Topic"
   - Verify status changes to "Selected"
   - Check that it appears in "Selected" filter

4. **Mark as Delivered**
   - Open a selected topic
   - Tap "Mark as Delivered"
   - Verify it appears in "Delivered" filter

5. **Search and Filter**
   - Test search functionality
   - Switch between Suggested/Selected/Delivered tabs
   - Verify filtering works correctly

## Troubleshooting

### No Suggestions Generated
- Ensure forum has posts from last 30 days
- Run `node scripts/seedForumData.js` to create sample data
- Check that posts contain relevant keywords

### Authentication Errors
- Verify user has "imam" role in database
- Check JWT token is valid
- Ensure `isImam` middleware is applied to routes

### Missing Islamic Content
- Default content is hardcoded in `KhutbahController.js`
- Future: integrate external APIs for more content
- Can extend `getIslamicContent()` method with more topics

### Performance Issues
- Large number of forum posts may slow analysis
- Consider adding pagination
- Implement caching for suggestions
- Index database fields for faster queries

## Architecture Decisions

### Why Keyword-Based NLP?
- **Simplicity**: Easy to implement and maintain
- **No External Dependencies**: Works offline
- **Sufficient for MVP**: Provides useful suggestions
- **Extensible**: Can be replaced with ML models later

### Why Store Islamic Content in Code?
- **Reliability**: No external API dependency
- **Speed**: Instant access to content
- **Authenticity**: Curated authentic references
- **Future**: Can migrate to database or API

### Why JSON Fields for Arrays?
- **Flexibility**: Easy to store variable-length arrays
- **MySQL Compatibility**: Works with current database
- **Simple Queries**: Easy to parse in JavaScript
- **Future**: Consider PostgreSQL JSONB for better querying

## Contributing

### Adding New Topics
Edit `extractTopicsFromPosts()` in `KhutbahController.js`:
```javascript
const topicKeywords = {
  'Your New Topic': {
    keywords: ['keyword1', 'keyword2', ...],
    description: 'Description for khutbah'
  },
  // ... other topics
};
```

### Adding Islamic Content
Edit `getIslamicContent()` in `KhutbahController.js`:
```javascript
'Your New Topic': {
  ayah: [
    {
      surah: 'Surah Name',
      ayahNumber: 123,
      arabic: 'Arabic text',
      translation: 'English translation',
      reference: 'Quran X:Y'
    }
  ],
  hadith: [
    {
      narrator: 'Narrator name',
      text: 'Hadith text',
      reference: 'Source',
      book: 'Book name'
    }
  ]
}
```

## Credits

- **Quranic Verses**: From authentic translations
- **Hadith References**: From Sahih Bukhari, Muslim, Tirmidhi, Ibn Majah
- **NLP Approach**: Keyword-based topic extraction
- **UI/UX**: Material Design 3 with Islamic theming

## License

This module is part of the Mosque App project.

---

**May Allah accept this effort and make it beneficial for the Muslim community. Ameen.** 🤲
