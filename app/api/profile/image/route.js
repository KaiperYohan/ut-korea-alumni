import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import { put, del } from '@vercel/blob'

export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return Response.json({ error: 'Invalid file type. Use JPG, PNG, WebP, or GIF.' }, { status: 400 })
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return Response.json({ error: 'File too large. Maximum 2MB.' }, { status: 400 })
    }

    // Delete old image if exists
    const { rows } = await sql`
      SELECT profile_image_url FROM members WHERE id = ${session.user.id}
    `
    if (rows[0]?.profile_image_url) {
      try {
        await del(rows[0].profile_image_url)
      } catch {
        // Ignore delete errors for old images
      }
    }

    // Upload to Vercel Blob
    const ext = file.name.split('.').pop() || 'jpg'
    const blob = await put(`profiles/${session.user.id}.${ext}`, file, {
      access: 'public',
      addRandomSuffix: true,
    })

    // Update database
    await sql`
      UPDATE members SET profile_image_url = ${blob.url} WHERE id = ${session.user.id}
    `

    return Response.json({ url: blob.url })
  } catch (error) {
    console.error('Image upload error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { rows } = await sql`
      SELECT profile_image_url FROM members WHERE id = ${session.user.id}
    `

    if (rows[0]?.profile_image_url) {
      try {
        await del(rows[0].profile_image_url)
      } catch {
        // Ignore blob delete errors
      }
    }

    await sql`
      UPDATE members SET profile_image_url = NULL WHERE id = ${session.user.id}
    `

    return Response.json({ success: true })
  } catch (error) {
    console.error('Image delete error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
