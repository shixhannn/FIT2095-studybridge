import mongoose from "mongoose";

const availabilitySlotSchema = new mongoose.Schema(
  {
    tutorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true }, 
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ }, 
    durationMinutes: { type: Number, required: true, min: 30, max: 180 }, 
    isBooked: { type: Boolean, default: false }, 
  },
  { timestamps: { createdAt: "createdDate", updatedAt: false } }
);

export default mongoose.model("AvailabilitySlot", availabilitySlotSchema);
