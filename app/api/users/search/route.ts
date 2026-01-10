import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User } from '@/lib/models/User';
import { verifyToken, getTokenFromHeaders } from '@/lib/auth/auth';

// Helper to get current user ID from request
async function getUserId(req: NextRequest): Promise<string | null> {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return null;
    const payload = verifyToken(token);
    return payload?.userId || null;
}

// GET /api/users/search?email=... - Search users by email for inviting
export async function GET(req: NextRequest) {
    await dbConnect();

    const currentUserId = await getUserId(req);
    if (!currentUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email || email.length < 2) {
        return NextResponse.json({ users: [] });
    }

    // Search for users by email (case-insensitive partial match)
    const users = await User.find({
        email: { $regex: email, $options: 'i' },
        _id: { $ne: currentUserId }, // Exclude current user
    })
        .select('email name')
        .limit(10);

    const userList = users.map(u => ({
        id: u._id.toString(),
        email: u.email,
        name: u.name,
    }));

    return NextResponse.json({ users: userList });
}
