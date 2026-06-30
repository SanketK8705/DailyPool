import mongoose from 'mongoose';

const rideSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
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
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    liveLocations: [
      {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    splitAmount: {
      type: Number,
      required: true,
    },
    upiId: {
      type: String,
      default: '',
    },
    ratings: [
      {
        fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        score: { type: Number, min: 1, max: 5 },
        comment: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

export const Ride = mongoose.model('Ride', rideSchema);
