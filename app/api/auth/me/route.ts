import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User } from '@/lib/models/User';
import { verifyToken, getTokenFromHeaders } from '@/lib/auth/auth';

export async function GET(req: NextRequest) {
    try {
        const token = getTokenFromHeaders(req.headers);

        if (!token) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const payload = verifyToken(token);
        if (!payload) {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        await dbConnect();
        const user = await User.findById(payload.userId).select('-password');

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            }
        });
    } catch (error) {
        console.error('Auth check error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
