"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_1 = require("../config/jwt");
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required', code: 'UNAUTHORIZED' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, (0, jwt_1.getJwtSecret)());
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token', code: 'FORBIDDEN' });
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Forbidden: Access restricted to ${roles.join(', ')}`,
                code: 'ROLE_FORBIDDEN',
            });
        }
        next();
    };
}
