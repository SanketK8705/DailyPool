import express from 'express';
import { getMyMatches, updateMatchStatus } from '../controllers/matchController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getMyMatches);
router.put('/:id', protect, updateMatchStatus);

export default router;
