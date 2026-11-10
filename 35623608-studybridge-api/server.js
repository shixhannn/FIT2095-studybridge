import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "./models/user.js";
import TutorProfile from "./models/tutorProfile.js";
import Subject from "./models/subject.js";
import AvailabilitySlot from "./models/availabilitySlot.js";
import Review from "./models/review.js";
import SessionBooking from "./models/sessionBooking.js";
import { verifyToken } from "./middleware/verifyToken.js";
import { requireRole } from "./middleware/requireRole.js";
import http from "http";
import { Server } from "socket.io";
import { GoogleGenAI } from "@google/genai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
app.use(express.json());

// A3 T10: Attach Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:4200" },
});
// A3 T10: Allow routes to access Socket.io
app.set("io", io);

const PORT = process.env.PORT ?? 3000;
const SALT_ROUNDS = 10;
// HD5: Gemini 
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// enable CORS 
app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

function isPasswordComplex(password) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function hoursToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes
};

// Task 2 
app.post("/api/35623608/auth/register", async (req, res) => {
  const { fullName, email, password, role } = req.body;
  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ error: "Please fill in all fields." });
  }

  if (role !== "learner" && role !== "tutor") {
    return res.status(400).json({ error: "Your role must be learner or tutor." });
  }

  if (!isPasswordComplex(password)) {
    return res.status(400).json({
      error: "Password needs 8+ characters, an uppercase letter, a lowercase letter, a number and a symbol",
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ fullName, email, passwordHash, role });
    return res.status(201).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
      createdDate: user.createdDate,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email is already registered" });
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

// Task 3 
app.post("/api/35623608/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  const passwordOk = user && (await bcrypt.compare(password, user.passwordHash));
  if (!passwordOk) {
    return res.status(401).json({ error: "Incorrect email or password" });
  }

  const token = jwt.sign(
    { userId: user._id, role: user.role, tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: "2h", algorithm: "HS256" }
  );
  return res.status(200).json({ token });
});

app.get("/api/35623608/auth/me", verifyToken, async (req, res) => {
  const user = await User.findById(req.user.userId);
  const firstName = user.role === "admin" ? "Admin" : user.fullName.split(" ")[0];
  return res.status(200).json({
    userId: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    createdDate: user.createdDate,
    greeting: `Welcome back, ${firstName}!`,
  });
});

app.post("/api/35623608/auth/logout", verifyToken, async (req, res) => {
  await User.findByIdAndUpdate(req.user.userId, { $inc: { tokenVersion: 1 } });
  return res.status(200).json({ message: "Logged out" });
});

// Task 5 
app.post("/api/35623608/tutors/profile", verifyToken, requireRole("tutor"), async (req, res) => {
  const existingProfile = await TutorProfile.findOne({ userId: req.user.userId });
  if (existingProfile) {
    return res.status(409).json({ error: "Tutor profile already exists" });
  }

  const { bio, hourlyRate, subjects } = req.body;
  if (hourlyRate === undefined || hourlyRate < 5 || hourlyRate > 200) {
    return res.status(400).json({ error: "Hourly rate must be 5-200" });
  }

  if (!subjects || subjects.length === 0) {
    return res.status(400).json({ error: "Please enter at least one subject" })
  }
  for (const subjectId of subjects) {
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(400).json({ error: `Subject ${subjectId} does not exist` });
    }
  }

  const profile = await TutorProfile.create({
    userId: req.user.userId, bio, hourlyRate, subjects
  });
  return res.status(201).json(profile);
});

app.put("/api/35623608/tutors/profile", verifyToken, requireRole("tutor"), async (req, res) => {
  const { bio, hourlyRate, subjects } = req.body;
  if (hourlyRate === undefined || hourlyRate < 5 || hourlyRate > 200) {
    return res.status(400).json({ error: "Hourly rate must be 5-200" });
  }

  if (!subjects || subjects.length === 0) {
    return res.status(400).json({ error: "Please enter subject" })
  }
  for (const subjectId of subjects) {
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(400).json({ error: `Subject ${subjectId} does not exist` });
    }
  }

  let updatedBio = bio;
  if (bio === undefined) {
    updatedBio = "";
  }

  const profile = await TutorProfile.findOne({ userId: req.user.userId });
  if (!profile) {
    return res.status(404).json({ error: "No tutor profile found" });
  }

  const updatedProfile = await TutorProfile.findOneAndUpdate(
    { userId: req.user.userId },
    { bio: updatedBio, hourlyRate, subjects },
    { new: true, runValidators: true });
  return res.status(200).json(updatedProfile);
});

// Task 8 
app.get("/api/35623608/tutors/search", verifyToken, async (req, res) => {
  const { subject, minPrice, maxPrice, minRating, availableThisWeek } = req.query;
  const pipeline = [];

  pipeline.push({
    $lookup: {
      from: "subjects",
      localField: "subjects",
      foreignField: "_id",
      as: "subject"
    }
  });
  if (subject) {
    const escapedSubject = subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    pipeline.push({
      $match: {
        "subject.name": new RegExp(`^${escapedSubject}$`, "i")
      }
    });
  }

  const minPriceNumber =
    minPrice !== undefined && minPrice !== "" && !Number.isNaN(Number(minPrice))
      ? Number(minPrice) : null;
  const maxPriceNumber =
    maxPrice !== undefined && maxPrice !== "" && !Number.isNaN(Number(maxPrice))
      ? Number(maxPrice) : null;
  const priceCheck = {};
  if (minPriceNumber !== null) {
    priceCheck.$gte = minPriceNumber;
  }
  if (maxPriceNumber !== null) {
    priceCheck.$lte = maxPriceNumber;
  }
  if (Object.keys(priceCheck).length > 0) {
    pipeline.push({
      $match: { hourlyRate: priceCheck }
    });
  }

  pipeline.push({
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user"
    }
  });
  pipeline.push({ $unwind: '$user' });

  pipeline.push(
    {
      $lookup: {
        from: "reviews",
        localField: "userId",
        foreignField: "tutorId",
        as: "reviews"
      },
    },
    {
      $addFields: {
        averageRating: { $avg: "$reviews.rating" },
        reviewCount: { $size: "$reviews" },
      },
    },
  );

  const minRatingNumber =
    minRating !== undefined && minRating !== "" && !Number.isNaN(Number(minRating))
      ? Number(minRating) : null;
  if (minRatingNumber !== null) {
    pipeline.push({
      $match: { averageRating: { $gte: minRatingNumber } }
    });
  }

  if (availableThisWeek === "true") {
    const firstDay = new Date();
    firstDay.setHours(0, 0, 0, 0);
    const lastDay = new Date(firstDay);
    lastDay.setDate(lastDay.getDate() + 6);
    lastDay.setHours(23, 59, 59, 999);

    pipeline.push(
      {
        $lookup: {
          from: "availabilityslots",
          localField: "userId",
          foreignField: "tutorId",
          as: "availableSlots"
        }
      },
      { $unwind: "$availableSlots" },
      {
        $match: {
          "availableSlots.isBooked": false,
          "availableSlots.date": { $gte: firstDay, $lte: lastDay }
        }
      }
    )
  };

  pipeline.push({
    $group: {
      _id: "$userId",
      userId: { $first: "$userId" },
      user: { $first: "$user" },
      bio: { $first: "$bio" },
      hourlyRate: { $first: "$hourlyRate" },
      subject: { $first: "$subject" },
      averageRating: { $first: "$averageRating" },
      reviewCount: { $first: "$reviewCount" }
    }
  });

  pipeline.push({ $sort: { averageRating: -1 } });

  pipeline.push({
    $project: {
      _id: 0,
      userId: 1,
      fullName: "$user.fullName",
      bio: 1,
      hourlyRate: 1,
      subjects: "$subject.name",
      averageRating: 1,
      reviewCount: 1
    }
  });

  const results = await TutorProfile.aggregate(pipeline);
  return res.status(200).json(results);
});

// Task 5
app.get("/api/35623608/tutors/:userId", verifyToken, async (req, res) => {
  const { userId } = req.params;
  const profile = await TutorProfile.findOne({ userId })
    .populate("subjects", "name");
  if (!profile) {
    return res.status(404).json({ error: "No tutor profile found" });
  }

  const user = await User.findById(userId);

  // Task 11 
  const [summary] = await Review.aggregate([
    { $match: { tutorId: profile.userId } },
    {
      $group: {
        _id: "$tutorId",
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);
  const ratingSummary = summary || {
    averageRating: null, reviewCount: 0
  }

  const availableSlots = await AvailabilitySlot.find({
    tutorId: userId, isBooked: false
  });
  const reviews = await Review.find({ tutorId: userId });

  return res.status(200).json({
    fullName: user.fullName,
    bio: profile.bio,
    hourlyRate: profile.hourlyRate,
    subjects: profile.subjects.map(subject => subject.name),
    averageRating: ratingSummary.averageRating,
    reviewCount: ratingSummary.reviewCount,
    availableSlots,
    reviews: reviews.map(review => ({
      rating: review.rating,
      comment: review.comment,
      createdDate: review.createdDate
    }))
  });
});

// Task 6 
app.post("/api/35623608/subjects", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const existingSubject = await Subject.findOne({
      name: { $regex: `^${req.body.name}$`, $options: "i" }
    });
    if (existingSubject) {
      return res.status(409).json({ error: "Subject name already exists" });
    }

    const subject = new Subject(req.body);
    await subject.save();
    return res.status(201).json(subject);

  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: "Subject name already exists" });
    }
    throw err;
  }
});

app.get("/api/35623608/subjects", verifyToken, async (req, res) => {
  const subjects = await Subject.find({});
  return res.status(200).json(subjects);
});

app.get("/api/35623608/subjects/:subjectId", verifyToken, async (req, res) => {
  const subject = await Subject.findById(req.params.subjectId);
  if (!subject) {
    return res.status(404).json({ error: "No subject found" });
  }
  return res.status(200).json(subject);
});

app.put("/api/35623608/subjects/:subjectId", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const duplicateSubject = await Subject.findOne({
      name: { $regex: `^${req.body.name}$`, $options: "i" },
      _id: { $ne: req.params.subjectId }
    });
    if (duplicateSubject) {
      return res.status(409).json({ error: "Subject name already exists" });
    }

    const { name, category, description } = req.body;
    const subject = await Subject.findByIdAndUpdate(
      req.params.subjectId,
      { name, category, description },
      { new: true, runValidators: true }
    );
    if (!subject) {
      return res.status(404).json({ error: "No subject found" });
    }
    return res.status(200).json(subject);

  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

app.delete("/api/35623608/subjects/:subjectId", verifyToken, requireRole("admin"), async (req, res) => {
  const tutorInUse = await TutorProfile.findOne({ subjects: req.params.subjectId });
  const sessionInUse = await SessionBooking.findOne({ subjectId: req.params.subjectId });
  if (tutorInUse || sessionInUse) {
    return res.status(409).json({ error: "Subject is in use" });
  }

  const subject = await Subject.findByIdAndDelete(req.params.subjectId);
  if (!subject) {
    return res.status(404).json({ error: "No subject found" });
  }
  return res.status(200).json({ message: "Subject deleted" });
});

// Task 7 
app.post("/api/35623608/slots", verifyToken, requireRole("tutor"), async (req, res) => {
  try {
    const { date, startTime, durationMinutes } = req.body;
    const profile = await TutorProfile.findOne({ userId: req.user.userId });
    if (!profile) {
      return res.status(409).json({ error: "No tutor profile found. Please create a tutor profile." });
    }

    const slot = new AvailabilitySlot({
      tutorId: req.user.userId, date, startTime, durationMinutes
    });
    if (!date || !startTime || !durationMinutes) {
      return res.status(400).json({ error: "Please fill in all fields." });
    }

    const newStart = hoursToMinutes(slot.startTime);
    const newEnd = newStart + slot.durationMinutes;
    const existingSlots = await AvailabilitySlot.find({
      tutorId: req.user.userId, date: slot.date
    });

    const overlap = existingSlots.find((slot) => {
      const existingStart = hoursToMinutes(slot.startTime);
      const existingEnd = existingStart + slot.durationMinutes;
      return (newStart < existingEnd && newEnd > existingStart);
    });
    if (overlap) {
      return res.status(409).json({
        error: `This slot overlaps your existing slot on ${date} at ${overlap.startTime} (${overlap.durationMinutes} minutes).`
      });
    }

    await slot.save();
    return res.status(201).json(slot);

  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

app.get("/api/35623608/slots/mine", verifyToken, requireRole("tutor"), async (req, res) => {
  const slots = await AvailabilitySlot.find({ tutorId: req.user.userId });
  return res.status(200).json(slots);
});

app.delete("/api/35623608/slots/:slotId", verifyToken, requireRole("tutor"), async (req, res) => {
  const slot = await AvailabilitySlot.findById(req.params.slotId);

  if (!slot) {
    return res.status(404).json({ error: "No slot found" });
  }
  if (slot.tutorId.toString() !== req.user.userId.toString()) {
    return res.status(403).json({ error: "You can only delete your own slots" });
  }
  if (slot.isBooked) {
    return res.status(409).json({ error: "Booked slots cannot be deleted directly" });
  }

  await AvailabilitySlot.deleteOne({ _id: slot._id });
  return res.status(200).json({ message: "Slot deleted" });
});

// Task 9 
app.post("/api/35623608/bookings", verifyToken, requireRole("learner"), async (req, res) => {
  const { slotId, subjectId } = req.body;

  const slot = await AvailabilitySlot.findById(slotId);
  if (!slot) {
    return res.status(404).json({ error: "No slot found" });
  }

  const tutorProfile = await TutorProfile.findOne({ userId: slot.tutorId })
  if (!tutorProfile) {
    return res.status(404).json({ error: "No tutor profile found" });
  }
  const tutorTeachSubject = tutorProfile.subjects.some(
    subject => subject.toString() === subjectId
  );
  if (!tutorTeachSubject) {
    return res.status(400).json({ error: "Subject not taught by tutor" });
  }

  const reservedSlot = await AvailabilitySlot.findOneAndUpdate(
    { _id: slotId, isBooked: false },
    { $set: { isBooked: true } },
    { new: true }
  );
  if (!reservedSlot) {
    return res.status(409).json({ error: "Slot no longer available" });
  }

  const booking = await SessionBooking.create({
    learnerId: req.user.userId,
    tutorId: reservedSlot.tutorId,
    subjectId,
    slotId: reservedSlot._id,
    agreedRate: tutorProfile.hourlyRate,
    status: "requested"
  });

  // A3 T10: Broadcast after successful booking (A2 T9) 
  req.app.get("io").emit("slot:booked", {
    slotId: reservedSlot._id.toString(),
    tutorId: reservedSlot.tutorId.toString()
  });

  return res.status(201).json(booking);
});

// Task 10
app.get("/api/35623608/bookings/mine", verifyToken, requireRole("learner", "tutor"), async (req, res) => {
  let filterRole;
  if (req.user.role === "learner") {
    filterRole = { learnerId: req.user.userId };
  } else {
    filterRole = { tutorId: req.user.userId };
  }
  const bookings = await SessionBooking.find(filterRole);
  return res.status(200).json(bookings);
});

app.patch("/api/35623608/bookings/:bookingId/confirm", verifyToken, requireRole("tutor"), async (req, res) => {
  const booking = await SessionBooking.findById(req.params.bookingId);
  if (!booking) {
    return res.status(404).json({ error: "No booking found" });
  }

  if (booking.tutorId.toString() !== req.user.userId.toString()) {
    return res.status(403).json({ error: "You can only confirm your own bookings" });
  }
  if (booking.status !== "requested") {
    return res.status(409).json({
      error: `This booking is already ${booking.status}; only a requested booking can be confirmed`
    });
  }

  booking.status = "confirmed";
  await booking.save();
  return res.status(200).json(booking);
});

app.patch("/api/35623608/bookings/:bookingId/complete", verifyToken, requireRole("tutor"), async (req, res) => {
  const booking = await SessionBooking.findById(req.params.bookingId);
  if (!booking) {
    return res.status(404).json({ error: "No booking found" });
  }

  if (booking.tutorId.toString() !== req.user.userId.toString()) {
    return res.status(403).json({ error: "You can only complete your own bookings" });
  }
  if (booking.status !== "confirmed") {
    return res.status(409).json({
      error: `This booking is currently ${booking.status}; only a confirmed booking can be completed`
    });
  }

  booking.status = "completed";
  await booking.save();
  return res.status(200).json(booking);
});

app.patch("/api/35623608/bookings/:bookingId/cancel", verifyToken, requireRole("learner", "tutor"), async (req, res) => {
  const booking = await SessionBooking.findById(req.params.bookingId);
  if (!booking) {
    return res.status(404).json({ error: "No booking found" });
  }

  const ownLearner = booking.learnerId.toString() === req.user.userId.toString();
  const ownTutor = booking.tutorId.toString() === req.user.userId.toString();
  if (!ownLearner && !ownTutor) {
    return res.status(403).json({ error: "You can only cancel your own bookings" });
  }

  if (booking.status !== "requested" && booking.status !== "confirmed") {
    return res.status(409).json({
      error: `This booking is currently ${booking.status}; only a requested or confirmed booking can be cancelled`
    });
  }

  booking.status = "cancelled";
  await booking.save();

  await AvailabilitySlot.findByIdAndUpdate(booking.slotId, { $set: { isBooked: false } });

  // A3 T10: Broadcast after successful freed slot
  req.app.get("io").emit("slot:freed", {
    slotId: booking.slotId.toString(),
    tutorId: booking.tutorId.toString()
  });

  return res.status(200).json(booking);
});

// Task 11
app.post("/api/35623608/bookings/:bookingId/review", verifyToken, requireRole("learner"), async (req, res) => {
  const booking = await SessionBooking.findById(req.params.bookingId);
  if (!booking) {
    return res.status(404).json({ error: "No booking found" });
  }

  if (booking.learnerId.toString() !== req.user.userId.toString()) {
    return res.status(403).json({ error: "You can only review your own booking" });
  }
  if (booking.status !== "completed") {
    return res.status(409).json({
      error: `This booking is currently ${booking.status}; only a completed booking can be reviewed`
    });
  }

  const existingReview = await Review.findOne({ bookingId: booking._id });
  if (existingReview) {
    return res.status(409).json({ error: "This booking has been reviewed" });
  }

  const { rating, comment } = req.body;
  if (rating === undefined || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be an integer between 1-5" });
  }
  if (comment !== undefined && comment.length > 500) {
    return res.status(400).json({
      error: "Comment cannot exceed 500 characters"
    });
  }

  const review = await Review.create({
    bookingId: booking._id,
    learnerId: booking.learnerId,
    tutorId: booking.tutorId,
    rating,
    comment
  });
  return res.status(201).json(review);
});

// HD5: Generate an AI recap for completed session
app.post("/api/35623608/bookings/:bookingId/recap", verifyToken, requireRole("tutor"), async (req, res) => {
  const booking = await SessionBooking.findById(req.params.bookingId);
  if (!booking) {
    return res.status(404).json({ error: "No booking found" });
  }
  // HD5: Only the tutor who owns this booking
  if (booking.tutorId.toString() !== req.user.userId.toString()) {
    return res.status(403).json({
      error: "You do not own this booking."
    });
  }
  // HD5: Booking must be completed 
  if (booking.status !== "completed") {
    return res.status(409).json({
      error: "You have not completed the booking."
    });
  }

  const { notes } = req.body;
  if (typeof notes !== "string" || !notes.trim()) {
    return res.status(400).json({ error: "notes is required" });
  }

  if (!ai) {
    return res.status(503).json({ error: "Recap generatino is not configured" });
  }

  try {
    // HD5: Writes nothing to collection
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: `Write a short, friendly 2-3 sentence recap of this tutoring session, 
        based on these notes: "${notes}". Keep it factual - don't invent details the 
        notes don't contain. `,
    });
    return res.status(200).json({ recap: response.text ?? "" });
  } catch (err) {
    console.error("Gemini request failed:", err.message);
    return res.status(503).json({ error: "Recap generation failed - try again" });
  }
}
);

// Serve the production Angular frontend
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const angularDist = path.join(
  __dirname,
  "../35623608-studybridge-client/dist/35623608-studybridge/browser"
);

app.use(express.static(angularDist));

// Angular SPA fallback for frontend routes
app.get("/{*path}", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  res.sendFile(path.join(angularDist, "index.html"));
});

app.use((err, req, res, next) => {
  if (err.name === "CastError") {
    return res.status(400).json({ error: `'${err.value}' is not a valid id` });
  }
});

async function connectToDatabase() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME });
  console.log("Connected to MongoDB");
}

connectToDatabase()
  .then(() => server.listen(PORT, () => console.log(`Listening on port ${PORT}`)))
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });