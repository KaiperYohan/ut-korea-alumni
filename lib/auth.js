import CredentialsProvider from 'next-auth/providers/credentials'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const { rows } = await sql`
          SELECT id, email, name, name_ko, password_hash, is_admin, is_approved
          FROM members WHERE email = ${credentials.email}
        `
        const user = rows[0]
        if (!user) return null

        const passwordMatch = await bcrypt.compare(credentials.password, user.password_hash)
        if (!passwordMatch) return null

        // Update last_login
        await sql`UPDATE members SET last_login = NOW() WHERE id = ${user.id}`

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          nameKo: user.name_ko,
          isAdmin: user.is_admin,
          isApproved: user.is_approved,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.isAdmin = user.isAdmin
        token.isApproved = user.isApproved
        token.nameKo = user.nameKo
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id
      session.user.isAdmin = token.isAdmin
      session.user.isApproved = token.isApproved
      session.user.nameKo = token.nameKo
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
