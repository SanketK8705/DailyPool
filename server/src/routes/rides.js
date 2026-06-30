import express from 'express';
import {
  getActiveRides,
  getRideDetails,
  cancelRide,
  getRideHistory,
  submitRideReview,
} from '../controllers/rideController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/active', protect, getActiveRides);
router.get('/history', protect, getRideHistory);
router.get('/:id', protect, getRideDetails);
router.put('/:id/cancel', protect, cancelRide);
router.post('/:id/review', protect, submitRideReview);

export default router;
