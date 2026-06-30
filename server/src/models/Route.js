import mongoose from 'mongoose';

const routeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fromAddress: {
      type: String,
      required: true,
    },
    fromCoords: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    toAddress: {
      type: String,
      required: true,
    },
    toCoords: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    departureTime: {
      type: String, // e.g. "08:30" (HH:MM format)
      required: true,
    },
    days: {
      type: [String], // e.g. ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      required: true,
    },
    seats: {
      type: Number,
      default: 1,
      min: 1,
    },
    mode: {
      type: String,
      enum: ['car', 'auto', 'cab_split'],
      required: true,
    },
    role: {
      type: String,
      enum: ['driver', 'passenger'],
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Create geospatial indexes for efficient range matching
routeSchema.index({ fromCoords: '2dsphere' });
routeSchema.index({ toCoords: '2dsphere' });

export const Route = mongoose.model('Route', routeSchema);
