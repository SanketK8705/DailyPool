import { Ride } from '../models/Ride.js';
import { User } from '../models/User.js';

// @desc    Get current user's active/scheduled rides
// @route   GET /api/rides/active
// @access  Private
export const getActiveRides = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch rides that are either scheduled or ongoing
    const rides = await Ride.find({
      $or: [{ driverId: userId }, { passengerId: userId }],
      status: { $in: ['scheduled', 'ongoing'] },
    })
      .populate('driverId', 'name email gender trustScore companyName')
      .populate('passengerId', 'name email gender trustScore companyName')
      .populate({
        path: 'matchId',
        populate: [
          { path: 'driverRouteId' },
          { path: 'passengerRouteId' }
        ]
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, rides });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get details of a specific ride (including live coordinates history)
// @route   GET /api/rides/:id
// @access  Private
export const getRideDetails = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('driverId', 'name email gender trustScore companyName')
      .populate('passengerId', 'name email gender trustScore companyName')
      .populate({
        path: 'matchId',
        populate: [
          { path: 'driverRouteId' },
          { path: 'passengerRouteId' }
        ]
      });

    if (!ride) {
      return res.status(404).json({ success: false, error: 'Ride session not found' });
    }

    // Verify user is member of the ride
    const isMember =
      ride.driverId._id.toString() === req.user._id.toString() ||
      ride.passengerId._id.toString() === req.user._id.toString();

    if (!isMember) {
      return res.status(403).json({ success: false, error: 'Unauthorized to view this ride' });
    }

    res.json({ success: true, ride });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Manually cancel a ride
// @route   PUT /api/rides/:id/cancel
// @access  Private
export const cancelRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, error: 'Ride not found' });
    }

    // Verify ownership
    const isMember =
      ride.driverId.toString() === req.user._id.toString() ||
      ride.passengerId.toString() === req.user._id.toString();

    if (!isMember) {
      return res.status(403).json({ success: false, error: 'Unauthorized to cancel this ride' });
    }

    ride.status = 'cancelled';
    await ride.save();

    // Penalize cancelling user trust score (-5 points)
    const user = await User.findById(req.user._id);
    if (user) {
      user.trustScore = Math.max(0, user.trustScore - 5);
      user.rideHistory.push({
        rideId: ride._id,
        role: ride.driverId.toString() === req.user._id.toString() ? 'driver' : 'passenger',
        status: 'cancelled',
      });
      await user.save();
    }

    res.json({
      success: true,
      message: 'Ride cancelled. Penalty of -5 trust score points applied.',
      ride,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get user's full ride history (completed, active, cancelled)
// @route   GET /api/rides/history
// @access  Private
export const getRideHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const rides = await Ride.find({
      $or: [{ driverId: userId }, { passengerId: userId }],
    })
      .populate('driverId', 'name email gender trustScore companyName')
      .populate('passengerId', 'name email gender trustScore companyName')
      .sort({ createdAt: -1 });

    res.json({ success: true, rides });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Submit rating and review for a completed ride
// @route   POST /api/rides/:id/review
// @access  Private
export const submitRideReview = async (req, res) => {
  try {
    const { score, comment } = req.body;
    const rideId = req.params.id;

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ success: false, error: 'Please provide a valid score between 1 and 5' });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, error: 'Ride not found' });
    }

    if (ride.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Reviews can only be submitted for completed rides' });
    }

    const userId = req.user._id;
    const isDriver = ride.driverId.toString() === userId.toString();
    const isPassenger = ride.passengerId.toString() === userId.toString();

    if (!isDriver && !isPassenger) {
      return res.status(403).json({ success: false, error: 'Unauthorized to review this ride' });
    }

    const targetUserId = isDriver ? ride.passengerId : ride.driverId;

    // Check if user already reviewed this ride
    const alreadyReviewed = ride.ratings.find(
      (r) => r.fromUserId.toString() === userId.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({ success: false, error: 'You have already reviewed this ride' });
    }

    // Append rating
    ride.ratings.push({
      fromUserId: userId,
      toUserId: targetUserId,
      score,
      comment,
    });
    await ride.save();

    // Adjust target user's trust score
    const targetUser = await User.findById(targetUserId);
    if (targetUser) {
      if (score >= 4) {
        // High rating boosts trust score
        targetUser.trustScore = Math.min(100, targetUser.trustScore + 1);
      } else if (score <= 2) {
        // Low rating penalizes trust score
        targetUser.trustScore = Math.max(0, targetUser.trustScore - 3);
      }
      
      // Save rating in user history as well if match found
      const historyItem = targetUser.rideHistory.find(
        (h) => h.rideId && h.rideId.toString() === ride._id.toString()
      );
      if (historyItem) {
        historyItem.rating = score;
      }

      await targetUser.save();
    }

    res.json({
      success: true,
      message: 'Review submitted successfully. Trust score updated.',
      ride,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
