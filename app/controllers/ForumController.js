const prisma = require('../../config/prisma');

exports.getAllPosts = async (req, res) => {
    try {
        const posts = await prisma.forumPost.findMany({
            include: {
                author: {
                    select: {
                        id: true,
                        fullName: true,
                        avatar: true
                    }
                },
                comments: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                fullName: true,
                                avatar: true
                            }
                        }
                    }
                },
                likes: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true
                            }
                        }
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

        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getPostById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const post = await prisma.forumPost.findUnique({
            where: { id },
            include: {
                author: {
                    select: { id: true, fullName: true, avatar: true }
                },
                comments: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        author: { select: { id: true, fullName: true, avatar: true } }
                    }
                },
                likes: {
                    include: {
                        user: { select: { id: true, fullName: true } }
                    }
                },
                _count: { select: { comments: true, likes: true } }
            }
        });

        if (!post) return res.status(404).json({ error: 'Post not found' });
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createPost = async (req, res) => {
    const { title, content } = req.body;
    const userId = req.userId;

    try {
        const post = await prisma.forumPost.create({
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

        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addComment = async (req, res) => {
    const { postId, content } = req.body;
    const userId = req.userId;

    try {
        const comment = await prisma.comment.create({
            data: {
                content,
                postId: parseInt(postId),
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

        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.toggleLike = async (req, res) => {
    const { postId } = req.body;
    const userId = req.userId;

    try {
        const existingLike = await prisma.like.findUnique({
            where: {
                postId_userId: {
                    postId: parseInt(postId),
                    userId: userId
                }
            }
        });

        if (existingLike) {
            await prisma.like.delete({
                where: {
                    id: existingLike.id
                }
            });
            res.json({ liked: false });
        } else {
            await prisma.like.create({
                data: {
                    postId: parseInt(postId),
                    userId: userId
                }
            });
            res.json({ liked: true });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};