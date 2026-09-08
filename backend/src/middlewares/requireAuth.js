import { verifyAuthToken } from "../auth/authService.js";

export function createRequireAuth(jwtSecret) {
    return function requireAuth(req, res, next) {
        const header = req.header('Authorization') || '';
        const [scheme, token] = header.split(' ');

        if (scheme !== 'Bearer' || !token) {
            return res.status(401).json({error: 'Missing or malformed authorization header'});
        }

        try {
            const payload = verifyAuthToken(token, jwtSecret);
            req.userId = payload.sub;
            req.userEmail = payload.email;
            req.userName = payload.name;
            next();
        } catch (err) {
            return res.status(401).json({error: 'Invalid or expired jwt token'});
        }
    }
}