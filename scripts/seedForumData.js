const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedForumData() {
  try {
    console.log('Seeding sample forum data...');

    // Get a regular user for creating posts
    const user = await prisma.user.findFirst({
      where: {
        role: 'user'
      }
    });

    if (!user) {
      console.log('⚠️  No regular user found. Creating sample user first...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const newUser = await prisma.user.create({
        data: {
          email: 'user@example.com',
          password: hashedPassword,
          fullName: 'Community Member',
          role: 'user'
        }
      });

      console.log('✅ Created sample user:', newUser.email);
      return seedForumData(); // Retry with new user
    }

    // Sample forum posts covering different topics
    const samplePosts = [
      {
        title: 'Balancing Work and Family Responsibilities',
        content: 'Assalamu alaikum brothers and sisters. I am struggling to find balance between my demanding job and spending quality time with my family. My wife feels neglected and my children barely see me. How can I improve this situation while still fulfilling my financial responsibilities? Any Islamic advice would be appreciated.'
      },
      {
        title: 'Questions About Marriage in Islam',
        content: 'I am planning to get married soon inshallah. What are the key rights and responsibilities of both husband and wife in Islam? I want to ensure I fulfill my duties properly and maintain a strong, loving relationship based on Islamic principles.'
      },
      {
        title: 'Struggling with Consistent Prayer',
        content: 'I try to pray five times a day but often miss Fajr because of my sleep schedule. Sometimes I rush through prayers at work. How can I develop better focus and consistency in my salah? What tips have helped you maintain regular prayers?'
      },
      {
        title: 'Youth Issues - Social Media Impact',
        content: 'My teenage children spend hours on social media and I am concerned about the content they are exposed to. How do we guide our youth to use technology responsibly while maintaining Islamic values? Any parents facing similar challenges?'
      },
      {
        title: 'Dealing with Workplace Challenges',
        content: 'At my workplace, there is pressure to compromise on some Islamic principles. For example, company events with alcohol present. How do other Muslims navigate these situations? What boundaries should we maintain?'
      },
      {
        title: 'Teaching Children About Islam',
        content: 'What are the best ways to teach young children about Islam? My kids find traditional methods boring. Looking for engaging ways to help them love their deen and understand its importance in their lives.'
      },
      {
        title: 'Importance of Community Service',
        content: 'I have been thinking about doing more charity work and helping the less fortunate in our community. What are the best ways to serve others according to Islamic teachings? Any volunteer opportunities at our local mosque?'
      },
      {
        title: 'Seeking Knowledge - Online Islamic Courses',
        content: 'I want to increase my Islamic knowledge but struggle to find time for traditional classes. Has anyone taken online Islamic courses? Which platforms or teachers would you recommend for authentic learning?'
      },
      {
        title: 'Managing Anger and Patience',
        content: 'I have a quick temper and often react in anger, which I later regret. What does Islam teach about controlling anger? What practical steps have helped you develop patience and forbearance in difficult situations?'
      },
      {
        title: 'Building Stronger Faith During Trials',
        content: 'Going through a difficult time with health and financial issues. Sometimes I feel my iman weakening. How do we strengthen our faith during trials? What Quranic verses or hadith give you comfort during hardship?'
      }
    ];

    console.log(`Creating ${samplePosts.length} forum posts...`);

    for (const post of samplePosts) {
      const created = await prisma.forumPost.create({
        data: {
          title: post.title,
          content: post.content,
          authorId: user.id
        }
      });

      console.log(`✓ Created: ${created.title}`);

      // Add some comments to make posts more engaging
      const commentTexts = [
        'JazakAllah khair for sharing this. I face similar challenges.',
        'This is such an important topic. May Allah guide us all.',
        'Thank you for bringing this up. We need more discussion about this.',
        'Assalamu alaikum, I can relate to this situation.',
        'MashaAllah, good question. Looking forward to responses.'
      ];

      const randomComments = Math.floor(Math.random() * 3) + 1; // 1-3 comments
      for (let i = 0; i < randomComments; i++) {
        await prisma.comment.create({
          data: {
            content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
            postId: created.id,
            authorId: user.id
          }
        });
      }

      // Add some likes
      const randomLikes = Math.floor(Math.random() * 5) + 1; // 1-5 likes
      // For simplicity, just add one like from the user
      try {
        await prisma.like.create({
          data: {
            postId: created.id,
            userId: user.id
          }
        });
      } catch (e) {
        // Ignore duplicate like errors
      }
    }

    console.log('\n✅ Successfully seeded forum data!');
    console.log(`   Created ${samplePosts.length} posts with comments and likes`);
    console.log('\n📊 Now an Imam can analyze these posts to generate khutbah suggestions!');

  } catch (error) {
    console.error('❌ Error seeding forum data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedForumData();
