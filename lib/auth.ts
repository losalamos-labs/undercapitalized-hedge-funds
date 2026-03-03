import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import pool, { ensureDb } from '@/lib/db';
import { nanoid } from 'nanoid';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        isRegister: { label: 'Register', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const username = credentials.username.trim().toLowerCase();

        // Ensure tables exist (first run on a fresh DB)
        await ensureDb();

        if (credentials.isRegister === 'true') {
          // Registration
          const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
          if (existing.rows.length > 0) throw new Error('Username already taken');

          const hash = await bcrypt.hash(credentials.password, 12);
          const userId = nanoid();
          await pool.query(
            'INSERT INTO users (id, username, password_hash, created_at) VALUES ($1, $2, $3, $4)',
            [userId, username, hash, Date.now()]
          );

          // Create default portfolio
          const portfolioId = nanoid();
          await pool.query(
            'INSERT INTO portfolios (id, user_id, name, cash, created_at) VALUES ($1, $2, $3, $4, $5)',
            [portfolioId, userId, `${username}'s Portfolio`, 100000, Date.now()]
          );

          return { id: userId, name: username };
        } else {
          // Login
          const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
          if (result.rows.length === 0) throw new Error('Invalid credentials');

          const user = result.rows[0];
          const valid = await bcrypt.compare(credentials.password, user.password_hash);
          if (!valid) throw new Error('Invalid credentials');

          return { id: user.id, name: user.username };
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId as string;
      return session;
    },
  },
};
