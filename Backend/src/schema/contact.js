import z from "zod";
import mongoose from "mongoose";

const contactSchema = z.object({

    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),

    phones: z.array(
        z.object({
            label: z.string().trim(),
            number: z.string().trim(),
        })
    ).optional(),

    emails: z.array(
        z.object({
            label: z.string().trim(),
            email: z.string().trim().email(),
        })
    ).optional(),

    dates: z.array(
        z.object({
            label: z.string().trim(),
            date: z.string().trim(),
        })
    ).optional(),

    note: z.string().trim().optional(),
    avatar: z.string().trim().optional(),
    website: z.string().trim().url().optional(),
    address: z.string().trim().optional(),
    company: z.string().trim().optional(),
    jobTitle: z.string().trim().optional(),
    created_at: z.number().optional(),
    modified_at: z.number().optional(),

    _id: z.string().trim().refine(mongoose.Types.ObjectId.isValid, { message: "Invalid ObjectId" }).optional(),
    createdAt: z.string().trim().optional(),
    updatedAt: z.string().trim().optional(),
    __v: z.number().optional(),

}).strict(); // Reject extra fields


export default contactSchema;