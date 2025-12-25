import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User } from '@/lib/models/User';
import { hashPassword, signToken } from '@/lib/auth/auth';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();

        const { email, password, name } = body;

        // Validation
        if (!email || !password || !name) {
            return NextResponse.json(
                { error: 'Email, password, and name are required' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 409 }
            );
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(password);
        const user = await User.create({
            email: email.toLowerCase(),
            password: hashedPassword,
            name: name.trim(),
        });

        // Generate JWT token
        const token = signToken({
            userId: user._id.toString(),
            email: user.email,
        });

        // Set cookie and return response
        const response = NextResponse.json({
            message: 'User created successfully',
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            }
        });

        response.cookies.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
