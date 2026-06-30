import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    trustScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true,
    },
    companyName: {
      type: String,
      trim: true,
      default: '',
    },
    homeLocation: {
      address: { type: String, default: '' },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    officeLocation: {
      address: { type: String, default: '' },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    rideHistory: [
      {
        rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' },
        date: { type: Date, default: Date.now },
        role: { type: String, enum: ['driver', 'passenger'] },
        status: { type: String, enum: ['completed', 'cancelled'] },
        rating: { type: Number, min: 1, max: 5 },
      },
    ],
  },
  { timestamps: true }
);

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model('User', userSchema);
