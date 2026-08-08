import z from "zod";

const userSchema = z.object({

    username: z.string().trim().min(3, "Username must be at least 3 characters").max(30, "Username must be at most 30 characters"),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be at most 72 characters")

}).catchall(z.never());

export default userSchema;