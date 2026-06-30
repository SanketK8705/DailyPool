import express from 'express';
import {
  postRoute,
  getMyRoutes,
  toggleRouteStatus,
  deleteRoute,
} from '../controllers/routeController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, postRoute);
router.get('/my', protect, getMyRoutes);
router.put('/:id/toggle', protect, toggleRouteStatus);
router.delete('/:id', protect, deleteRoute);

export default router;
