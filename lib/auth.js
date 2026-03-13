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

        try {
          const { rows } = await sql`
            SELECT id, email, name, name_ko, password_hash, is_admin, is_approved, email_verified, membership_level
            FROM members WHERE email = ${credentials.email}
          `
          const user = rows[0]
          if (!user) return null

          const passwordMatch = await bcrypt.compare(credentials.password, user.password_hash)
          if (!passwordMatch) return null

          if (!user.email_verified) {
            throw new Error('EMAIL_NOT_VERIFIED')
          }

          // Update last_login
          await sql`UPDATE members SET last_login = NOW() WHERE id = ${user.id}`

          return {
            id: String(user.id),
            email: user.email,
            name: user.name,
            nameKo: user.name_ko,
            isAdmin: user.is_admin,
            isApproved: user.is_approved,
            membershipLevel: user.membership_level || 'general',
          }
        } catch (error) {
          if (error.message === 'EMAIL_NOT_VERIFIED') throw error
          // If membership_level column doesn't exist yet, retry without it
          console.error('Auth error, retrying without membership_level:', error.message)
          const { rows } = await sql`
            SELECT id, email, name, name_ko, password_hash, is_admin, is_approved, email_verified
            FROM members WHERE email = ${credentials.email}
          `
          const user = rows[0]
          if (!user) return null

          const passwordMatch = await bcrypt.compare(credentials.password, user.password_hash)
          if (!passwordMatch) return null

          if (!user.email_verified) {
            throw new Error('EMAIL_NOT_VERIFIED')
          }

          await sql`UPDATE members SET last_login = NOW() WHERE id = ${user.id}`

          return {
            id: String(user.id),
            email: user.email,
            name: user.name,
            nameKo: user.name_ko,
            isAdmin: user.is_admin,
            isApproved: user.is_approved,
            membershipLevel: 'general',
          }
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
        token.membershipLevel = user.membershipLevel
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id
      session.user.isAdmin = token.isAdmin
      session.user.isApproved = token.isApproved
      session.user.nameKo = token.nameKo
      session.user.membershipLevel = token.membershipLevel
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
