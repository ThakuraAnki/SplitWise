import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;

export function hashPassword(plainPassword) {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export function verifyPassword(plainPassword, storedHash) {
    return bcrypt.compare(plainPassword, storedHash);
}

export function signAuthToken(user, secret) {
    return jwt.sign(
        {sub: user.id, email: user.email, name: user.name},
        secret,
        {expiresIn: '7d'}
    );
}

export function verifyAuthToken(token, secret) {
    return jwt.verify(token, secret)
}