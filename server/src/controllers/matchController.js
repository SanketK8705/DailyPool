import { Match } from '../models/Match.js';
import { Ride } from '../models/Ride.js';
import { Route } from '../models/Route.js';
import { User } from '../models/User.js';
import { getDistance } from '../services/mapsService.js';

// @desc    Get all matches for the current user (either as driver or passenger)
// @route   GET /api/matches
// @access  Private
export const getMyMatches = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Retrieve matches where the user is either the driver or the passenger
    const matches = await Match.find({
      $or: [{ driverId: userId }, { passengerId: userId }],
      status: { $ne: 'declined' }, // exclude declined matches
    })
      .populate('driverId', 'name email gender trustScore companyName')
      .populate('passengerId', 'name email gender trustScore companyName')
      .populate('driverRouteId')
      .populate('passengerRouteId')
      .sort({ overlapScore: -1 }); // Rank highest overlap score first

    res.json({ success: true, matches });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update match status (Accept/Decline)
// @route   PUT /api/matches/:id
// @access  Private
export const updateMatchStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' or 'declined'
    const matchId = req.params.id;

    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid match status' });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, error: 'Match record not found' });
    }

    // Verify requesting user is part of the match
    const isUserDriver = match.driverId.toString() === req.user._id.toString();
    const isUserPassenger = match.passengerId.toString() === req.user._id.toString();

    if (!isUserDriver && !isUserPassenger) {
      return res.status(403).json({ success: false, error: 'Unauthorized to update this match' });
    }

    match.status = status;
    await match.save();

    // If accepted, automatically create a Ride session
    if (status === 'accepted') {
      // Check if a ride already exists for this match
      const rideExists = await Ride.findOne({ matchId: match._id });
      if (!rideExists) {
        // Calculate Suggested UPI Split:
        // Fetch driver route to compute distance
        const route = await Route.findById(match.driverRouteId);
        let distanceKm = 15; // default fallback 15km

        if (route) {
          const meters = getDistance(
            route.fromCoords.coordinates[1],
            route.fromCoords.coordinates[0],
            route.toCoords.coordinates[1],
            route.toCoords.coordinates[0]
          );
          distanceKm = meters / 1000;
        }

        // Suggested Split Rate: ₹8 per kilometer, capped between ₹50 and ₹400
        const ratePerKm = 8;
        const rawSplit = Math.round(distanceKm * ratePerKm);
        const splitAmount = Math.max(50, Math.min(400, rawSplit));

        const driverUser = await User.findById(match.driverId);
        const driverName = driverUser ? driverUser.name : 'driver';

        await Ride.create({
          matchId: match._id,
          driverId: match.driverId,
          passengerId: match.passengerId,
          status: 'scheduled',
          splitAmount,
          upiId: `${driverName.toLowerCase().replace(/\s+/g, '')}@okaxis`, // mock UPI ID based on driver name
        });
      }
    }

    res.json({
      success: true,
      message: `Match status updated to ${status}.`,
      match,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
