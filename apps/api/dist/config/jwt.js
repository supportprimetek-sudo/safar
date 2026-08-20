"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJwtSecret = getJwtSecret;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function getJwtSecret() {
    return process.env.JWT_SECRET || 'safar_jwt_secret_key_production_ready_2026_super_secure';
}
