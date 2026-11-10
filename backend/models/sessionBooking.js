import mongoose from "mongoose";

const sessionBookingSchema = new mongoose.Schema(
  {
    learnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tutorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: "AvailabilitySlot", required: true },
    agreedRate: { type: Number, required: true }, 
    status: { type: String, enum: ["requested", "confirmed", "completed", "cancelled"], 
        default: "requested" }, 
  },
  { timestamps: { createdAt: "createdDate", updatedAt: false } }
);

export default mongoose.model("SessionBooking", sessionBookingSchema);
