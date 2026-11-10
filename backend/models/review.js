import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "SessionBooking", required: true, unique: true }, 
    learnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tutorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 500 },  
  },
  { timestamps: { createdAt: "createdDate", updatedAt: false } }
);

export default mongoose.model("Review", reviewSchema);
