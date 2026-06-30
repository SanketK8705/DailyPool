import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema(
  {
    driverRouteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: true,
    },
    passengerRouteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    overlapScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    etaMinutes: {
      type: Number,
      default: 0,
    },
    aiExplanation: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Unique index to prevent duplicate matches for the same pair of routes
matchSchema.index({ driverRouteId: 1, passengerRouteId: 1 }, { unique: true });

export const Match = mongoose.model('Match', matchSchema);
