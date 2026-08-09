import z from "zod";

const signupSchema = z.object({

    username: z.string().trim().min(3, "Username must be at least 3 characters").max(30, "Username must be at most 30 characters"),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be at most 72 characters")

}).catchall(z.never());


const loginShcema = z.object({

    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be at most 72 characters")

}).catchall(z.never());


const updateUserSchema = z.object({

    username: z.string().trim().min(3, "Username must be at least 3 characters").max(30, "Username must be at most 30 characters").optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    currentPassword: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be at most 72 characters").optional(),
    newPassword: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be at most 72 characters").optional()

}).catchall(z.never());


export { signupSchema, loginShcema, updateUserSchema };