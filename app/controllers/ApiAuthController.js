const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');

exports.login = async (req, res) => {
    try {
        // Log request body (excluding password)
        console.log('Login attempt for email:', req.body.email);

        // Check if required fields are present
        if (!req.body.email || !req.body.password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Validate input
        const validationErrors = [];
        if (!validator.isEmail(req.body.email)) validationErrors.push('Please enter a valid email address.');
        if (validator.isEmpty(req.body.password)) validationErrors.push('Password cannot be blank.');
        if (validationErrors.length) {
            console.log('Validation errors:', validationErrors);
            return res.status(422).json({ 
                success: false,
                errors: validationErrors 
            });
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: req.body.email }
        });

        if (!user) {
            console.log('No user found for email:', req.body.email);
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Check if password exists in database
        if (!user.password) {
            console.error('User found but no password hash stored');
            return res.status(500).json({
                success: false,
                error: 'Account setup incomplete'
            });
        }

        // Check password
        try {
            const passwordMatch = await bcrypt.compare(req.body.password, user.password);
            if (!passwordMatch) {
                console.log('Password mismatch for user:', req.body.email);
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password'
                });
            }
        } catch (bcryptError) {
            console.error('bcrypt compare error:', bcryptError);
            return res.status(500).json({
                success: false,
                error: 'Error verifying password'
            });
        }

        // Check if JWT_SECRET is configured
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET not configured');
            return res.status(500).json({
                success: false,
                error: 'Server configuration error'
            });
        }

        // Generate JWT token
        try {
            const token = jwt.sign(
                { 
                    userId: user.id,
                    email: user.email
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            const userData = {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                phone: user.phone || null,
                address: user.address || null,
                avatar: user.avatar || null,
                role: user.role || 'user'
            };

            // Return success with token and user info
            console.log('Login successful for user:', req.body.email);
            res.json({
                success: true,
                token,
                user: userData
            });
        } catch (jwtError) {
            console.error('JWT sign error:', jwtError);
            return res.status(500).json({
                success: false,
                error: 'Error generating access token'
            });
        }

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'An error occurred during login'
        });
    }
};

exports.signUp = async (req, res) => {
    try {
        // Validate input
        const validationErrors = [];
        if (!validator.isEmail(req.body.email)) validationErrors.push('Please enter a valid email address.');
        if (validator.isEmpty(req.body.password)) validationErrors.push('Password cannot be blank.');
        if (validator.isEmpty(req.body.name)) validationErrors.push('Name cannot be blank.');
        if (validationErrors.length) {
            return res.status(422).json({
                success: false,
                errors: validationErrors
            });
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email: req.body.email }
        });

        if (existingUser) {
            return res.status(422).json({
                success: false,
                error: 'Email already exists'
            });
        }

        // Create user
        const hashedPassword = await bcrypt.hash(req.body.password, 12);
        const user = await prisma.user.create({
            data: {
                fullName: req.body.name,
                email: req.body.email,
                password: hashedPassword
            }
        });

        // Generate token for auto-login
        const token = jwt.sign(
            { 
                userId: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const userData = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone || null,
            address: user.address || null,
            avatar: user.avatar || null,
            role: user.role || 'user'
        };

        res.status(201).json({
            success: true,
            token,
            user: userData
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred during signup'
        });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        // Validate email
        if (!validator.isEmail(req.body.email)) {
            return res.status(422).json({
                success: false,
                error: 'Please enter a valid email address'
            });
        }

        // Find user
        const user = await User.findOne({
            where: { email: req.body.email }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'No user found with this email'
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetToken = resetToken;
        user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
        await user.save();

        // In a real app, send email with reset link here
        // For now, just return success
        res.json({
            success: true,
            message: 'Password reset instructions sent to email'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while processing your request'
        });
    }
};