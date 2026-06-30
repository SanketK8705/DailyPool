import express from 'express';
import {
  registerUser,
  loginUser,
  verifyOTP,
  getProfile,
  updateLocations,
  getDevOTP,
  resendOTP,
  googleOAuth,
  adminGetUsers,
  adminGetRides,
  adminToggleUserVerification,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-otp', protect, verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/google-oauth', googleOAuth);
router.get('/profile', protect, getProfile);
router.put('/locations', protect, updateLocations);
router.get('/dev-otp/:email', getDevOTP);

// Admin Routes
router.get('/admin/users', protect, adminGetUsers);
router.get('/admin/rides', protect, adminGetRides);
router.put('/admin/users/:id/verify', protect, adminToggleUserVerification);

export default router;
