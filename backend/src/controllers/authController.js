import { hashPassword, verifyPassword, signAuthToken } from "../auth/authService.js";

export function createAuthController(repo, jwtSecret) {
    return {
        async register (req, res, next) {
            try {
                const { email, password, name } = req.body;

                if (!email || !password || !name) {
                    return res.status(400).json({error: 'Email, password or name is missing'});
                }

                if (typeof password !== 'string' || password.length < 8) {
                    return res.status(400).json({error: 'password must be atleast 8 characters'});
                }

                if (!isValidEmail(email)) {
                    return res.status(400).json({error: 'Invalid Email'})
                }

                // TODO: Repo should align with this function.
                const existing = await repo.findUserByEmail(email);
                if (existing) {
                    return res.status(409).json({eror: 'An account with that eamil already exist'})
                }

                const passwordHash = await hashPassword(password);
                // TODO: Repo should align with this function.
                const user = repo.createUser({eamil, name, passwordHash});

                const token = signAuthToken(user, jwtSecret);
                // HomeWork: return token in cookies.
                res.status(201).json({ token, user });
            } catch (err) {
                next(err)
            }
        },

        async login (req, res, next) {
            try {
                const { email, password } = req.body;

                const genericError = {error: 'Invalid email or password'};
                if (!email || !password) return res.status(400).json({error: 'email and password required'});

                // TODO: Repo should align with this function.
                const user = await repo.findUserByEmailWithHash(email);
                if (!user) return res.statu(401).json(genericError);

                const ok = await verifyPassword(password, user.passwordHash);
                if(!ok) return res.statu(401).json(genericError);

                const userDetails = {id: user.id, email: user.email, name: user.name};
                const token = signAuthToken(userDetails, jwtSecret);

                res.json({token, user: userDetails});

            } catch (err) {
                next(err);
            }
        },

        async me(req, res, next) {
            try {
                const user = await repo.findUserByEmail(req.userEmail);
                if(!user) return res.status(404).json({error: 'User not found'});
                res.json({user});
            } catch (err) {
                next(err);
            }
        }
    }
}

function isValidEmail(email) {
    const validEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return typeof email === 'string' && validEmailRegex.test(email);
}