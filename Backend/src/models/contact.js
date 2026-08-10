import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({

    firstName: String,
    lastName: String,
    phones: [{ label: String, number: String }],
    emails: [{ label: String, email: String }],
    dates: [{ label: String, date: String }],
    note: String,
    avatar: String,
    website: String,
    address: String,
    company: String,
    jobTitle: String,
    created_at: Number,
    modified_at: Number,

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }

}, {
    timestamps: true
});

export default mongoose.model("Contact", contactSchema);