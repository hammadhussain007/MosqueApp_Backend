const prisma = require('../../config/prisma');

/**
 * Returns recent activity relevant to the authenticated user:
 * - Forum: new comments by others on posts the user authored or participated in
 * - Announcements: recent announcements
 *
 * Query params (optional):
 * - limit: number of items per section (default 20)
 * - sinceDays: consider only items in last N days (default 14)
 */
module.exports = {
  async getNotifications(req, res) {
    try {
      const userId = req.userId;
      const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
      const sinceDays = Math.min(parseInt(req.query.sinceDays || '14', 10), 90);
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - sinceDays);

      // Find posts the user authored or commented in
      const relatedPosts = await prisma.forumPost.findMany({
        where: {
          OR: [
            { authorId: userId },
            { comments: { some: { authorId: userId } } },
          ],
        },
        select: { id: true },
      });

      const relatedPostIds = relatedPosts.map((p) => p.id);

      let forum = [];
      if (relatedPostIds.length > 0) {
        const recentComments = await prisma.comment.findMany({
          where: {
            postId: { in: relatedPostIds },
            authorId: { not: userId }, // exclude user's own comments
            createdAt: { gte: sinceDate },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          include: {
            author: { select: { id: true, fullName: true, email: true } },
            post: { select: { id: true, title: true } },
          },
        });

        forum = recentComments.map((c) => ({
          id: `forum_${c.id}`,
          type: 'forum_comment',
          createdAt: c.createdAt,
          actor: {
            id: c.author.id,
            name: c.author.fullName || c.author.email,
          },
          post: {
            id: c.post.id,
            title: c.post.title,
          },
          message: `${c.author.fullName || 'Someone'} commented on your thread: ${c.post.title}`,
        }));
      }

      // Recent announcements
      const announcementsRaw = await prisma.announcement.findMany({
        where: { createdAt: { gte: sinceDate } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { author: { select: { id: true, fullName: true, email: true } } },
      });

      const announcements = announcementsRaw.map((a) => ({
        id: `announcement_${a.id}`,
        type: 'announcement',
        createdAt: a.createdAt,
        actor: {
          id: a.author?.id,
          name: a.author?.fullName || a.author?.email || 'Admin',
        },
        announcement: { id: a.id, title: a.title },
        message: `New announcement: ${a.title}`,
      }));

      // Merge and return combined sorted list for convenience
      const items = [...forum, ...announcements].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      return res.json({ items, forum, announcements });
    } catch (err) {
      console.error('getNotifications error', err);
      return res.status(500).json({ error: 'Failed to load notifications' });
    }
  },
};
