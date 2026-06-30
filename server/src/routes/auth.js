import express from 'express';
import {
  registerUser,
  loginUser,
  getProfile,
  updateLocations,
  googleOAuth,
  adminGetUsers,
  adminGetRides,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google-oauth', googleOAuth);
router.get('/profile', protect, getProfile);
router.put('/locations', protect, updateLocations);

// Admin Routes
router.get('/admin/users', protect, adminGetUsers);
router.get('/admin/rides', protect, adminGetRides);

export default router;
