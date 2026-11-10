import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["Mathematics", "Computer Science", "Science", "Languages", "Business", "Other"],
    },
    description: { type: String, trim: true },
  },
  { timestamps: { createdAt: "createdDate", updatedAt: false } }
);

export default mongoose.model("Subject", subjectSchema);