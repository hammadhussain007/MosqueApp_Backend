const prisma = require('../../config/prisma');

exports.getAllAnnouncements = async (req, res) => {
    try {
        const announcements = await prisma.announcement.findMany({
            include: {
                author: {
                    select: {
                        id: true,
                        fullName: true,
                        avatar: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(announcements);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createAnnouncement = async (req, res) => {
    const { title, content } = req.body;
    const userId = req.userId;

    try {
        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can create announcements' });
        }

        const announcement = await prisma.announcement.create({
            data: {
                title,
                content,
                authorId: userId
            },
            include: {
                author: {
                    select: {
                        id: true,
                        fullName: true,
                        avatar: true
                    }
                }
            }
        });

        res.status(201).json(announcement);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
