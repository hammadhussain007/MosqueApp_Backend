const prisma = require('../../config/prisma').default;
const bcrypt = require('bcryptjs');
const validator = require('validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'public/uploads/avatars';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
}).single('avatar');

exports.getProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                address: true,
                avatar: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user: user
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile'
        });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { fullName, phone, address } = req.body;
        const validationErrors = [];

        // Validate inputs
        if (fullName && fullName.trim().length < 2) {
            validationErrors.push('Name must be at least 2 characters long');
        }
        if (phone && !validator.isMobilePhone(phone)) {
            validationErrors.push('Invalid phone number');
        }

        if (validationErrors.length) {
            return res.status(422).json({
                success: false,
                errors: validationErrors
            });
        }

        // Find and update user
        const user = await prisma.user.update({
            where: { id: req.user.userId },
            data: {
                ...(fullName && { fullName }),
                ...(phone && { phone }),
                ...(address && { address })
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Return updated user without password
        const userResponse = user.toJSON();
        delete userResponse.password;

        res.json({
            success: true,
            user: userResponse
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
};

exports.updateAvatar = async (req, res) => {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                error: 'File upload error: ' + err.message
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                error: err.message
            });
        }

        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded'
                });
            }

            const user = await User.findByPk(req.user.userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Delete old avatar if exists
            if (user.avatar) {
                const oldAvatarPath = path.join('public', user.avatar);
                if (fs.existsSync(oldAvatarPath)) {
                    fs.unlinkSync(oldAvatarPath);
                }
            }

            // Update user avatar path
            const avatarUrl = `/uploads/avatars/${req.file.filename}`;
            user.avatar = avatarUrl;
            await user.save();

            // Return updated user without password
            const userResponse = user.toJSON();
            delete userResponse.password;

            res.json({
                success: true,
                user: userResponse
            });

        } catch (error) {
            // Delete uploaded file if there was an error
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }

            console.error('Avatar upload error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update avatar'
            });
        }
    });
};