import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { rows } = await sql`
    SELECT id, email, name, name_ko, graduation_year, major, location, company, title, bio, birthday, phone,
           linkedin, instagram, tiktok, youtube, twitter, interests, profile_image_url, membership_level
    FROM members WHERE id = ${session.user.id}
  `

  if (!rows.length) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  const user = rows[0]
  return Response.json({
    email: user.email,
    name: user.name,
    nameKo: user.name_ko,
    graduationYear: user.graduation_year,
    major: user.major,
    location: user.location,
    company: user.company,
    title: user.title,
    bio: user.bio,
    profileImageUrl: user.profile_image_url,
    birthday: user.birthday,
    phone: user.phone,
    linkedin: user.linkedin,
    instagram: user.instagram,
    tiktok: user.tiktok,
    youtube: user.youtube,
    twitter: user.twitter,
    interests: user.interests,
  })
}

export async function PUT(request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, nameKo, graduationYear, major, location, company, title, bio, birthday, phone,
          linkedin, instagram, tiktok, youtube, twitter, interests } = body

  if (!name?.trim()) {
    return Response.json({ error: 'Name is required' }, { status: 400 })
  }

  await sql`
    UPDATE members SET
      name = ${name.trim()},
      name_ko = ${nameKo?.trim() || null},
      graduation_year = ${graduationYear ? parseInt(graduationYear) : null},
      major = ${major?.trim() || null},
      location = ${location?.trim() || null},
      company = ${company?.trim() || null},
      title = ${title?.trim() || null},
      bio = ${bio?.trim() || null},
      birthday = ${birthday?.trim() || null},
      phone = ${phone?.trim() || null},
      linkedin = ${linkedin?.trim() || null},
      instagram = ${instagram?.trim() || null},
      tiktok = ${tiktok?.trim() || null},
      youtube = ${youtube?.trim() || null},
      twitter = ${twitter?.trim() || null},
      interests = ${interests?.trim() || null}
    WHERE id = ${session.user.id}
  `

  return Response.json({ success: true })
}
