import mongoose from "mongoose";

const tutorProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    bio: { type: String, maxlength: 500 }, 
    hourlyRate: { type: Number, required: true, min: 5, max: 200 }, 
    subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }], 
  },
  { timestamps: { createdAt: "createdDate", updatedAt: false } }
);

export default mongoose.model("TutorProfile", tutorProfileSchema);
