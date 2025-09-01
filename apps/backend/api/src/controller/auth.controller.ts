import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "@repo/prisma-client";


const generateToken = (userId: string) => {
    return jwt.sign({userId}, process.env.JWT_SECRET!, {expiresIn: "1d"});
}

const setAuthCookie = (res: Response, token: string) => {
    res.cookie(
        "token", token, {
            httpOnly: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        }
    )
}

export const register = async (req: Request, res: Response) => {
    try {
        const {email, phone, password} = req.body;
        if (!email || !phone || !password) {
            return res.status(400).json({
                error: "All fields are required." 
            })
        }
        const hashedPassword = await bcrypt.hash(password, 10)

        const newUser = await prisma.user.create({
            data: {
                email,
                phone,
                password: hashedPassword,
                balance: {
                    create: {},
                },
            },
            include: {
                balance: true,
            }
        })

        const token = generateToken(newUser.id)
        setAuthCookie(res, token)

        return res.json({
            message: "User registered successfully",
            user: {
                id: newUser.id,
                email: newUser.email
            }
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: "Internal server error"
        })
    }
}

export const signin = async (req: Request, res: Response) => {
    try {
        const {email, password} = req.body;
        if (!email || !password) {
            return res.status(400).json({
                error: "All fields are required." 
            })
        }
        const user = await prisma.user.findUnique({
            where: {
                email
            }
        })

        if (!user) {
            return res.send("User not found")
        }
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if(!isPasswordValid) {
            return res.status(400).json({
                message: "Invalid email or password",
            })
        }
        const token = generateToken(user.id)
        setAuthCookie(res, token)
        return res.json({
            message: "Login Successful",
            user: {
                id: user.id,
                email: user.email
            }
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: "Internal server error"
        })
    }
}

export const signout = async (req: Request, res: Response) => {
    res.clearCookie(
        "token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        }
    )

    return res.json({
        message: "Logout successful"
    })
}