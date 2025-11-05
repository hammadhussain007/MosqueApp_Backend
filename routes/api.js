const express = require('express');
const router = express.Router();
const ApiAuthController = require('../app/controllers/ApiAuthController');
const ProfileController = require('../app/controllers/ProfileController');
const ForumController = require('../app/controllers/ForumController');
const AnnouncementController = require('../app/controllers/AnnouncementController');
const NotificationController = require('../app/controllers/NotificationController');
const isApiAuth = require('../app/middlewares/isApiAuth');

// Auth routes
router.post('/api/login', ApiAuthController.login);
router.post('/api/sign-up', ApiAuthController.signUp);
router.post('/api/forgot-password', ApiAuthController.forgotPassword);

// Profile routes (protected by auth middleware)
router.get('/api/profile', isApiAuth, ProfileController.getProfile);
router.put('/api/profile', isApiAuth, ProfileController.updateProfile);
router.post('/api/profile/avatar', isApiAuth, ProfileController.updateAvatar);

// Forum routes (protected by auth middleware)
router.get('/api/forum/posts', isApiAuth, ForumController.getAllPosts);
router.get('/api/forum/posts/:id', isApiAuth, ForumController.getPostById);
router.post('/api/forum/posts', isApiAuth, ForumController.createPost);
router.post('/api/forum/posts/comment', isApiAuth, ForumController.addComment);
router.post('/api/forum/posts/like', isApiAuth, ForumController.toggleLike);

// Announcement routes (protected by auth middleware)
router.get('/api/announcements', isApiAuth, AnnouncementController.getAllAnnouncements);
router.post('/api/announcements', isApiAuth, AnnouncementController.createAnnouncement);

// Notifications (protected by auth middleware)
router.get('/api/notifications', isApiAuth, NotificationController.getNotifications);

module.exports = router;