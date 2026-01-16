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

exports.deletePost = async (req, res) => {
    const postId = parseInt(req.params.id);
    const userId = req.userId;

    try {
        // Find the post
        const post = await prisma.forumPost.findUnique({
            where: { id: postId },
            include: {
                author: { select: { id: true, role: true } }
            }
        });

        if (!post) {
            return res.status(404).json({ 
                success: false,
                error: 'Post not found' 
            });
        }

        // Get current user to check role
        const currentUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        // Check if user is admin or post author
        const isAdmin = currentUser.role === 'admin';
        const isAuthor = post.authorId === userId;

        if (!isAdmin && !isAuthor) {
            return res.status(403).json({ 
                success: false,
                error: 'You do not have permission to delete this post' 
            });
        }

        // Delete related records first (cascade)
        await prisma.like.deleteMany({ where: { postId } });
        await prisma.comment.deleteMany({ where: { postId } });
        
        // Delete the post
        await prisma.forumPost.delete({ where: { id: postId } });

        res.json({ 
            success: true,
            message: 'Post deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};