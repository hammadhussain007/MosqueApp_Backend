const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.get('Authorization');
    if (!authHeader) {
        return res.status(401).json({
            success: false,
            error: 'Not authenticated'
        });
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decodedToken.userId;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
};