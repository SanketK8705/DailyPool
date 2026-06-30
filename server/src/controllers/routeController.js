import { Route } from '../models/Route.js';
import { User } from '../models/User.js';
import { Match } from '../models/Match.js';
import { calculateRouteOverlap, getDistance } from '../services/mapsService.js';
import { getSmartMatchRanking } from '../services/aiService.js';

// Helper to run matching logic between a newly posted route and existing active routes
const runMatchingEngine = async (newRoute) => {
  try {
    const isDriver = newRoute.role === 'driver';
    const targetRole = isDriver ? 'passenger' : 'driver';

    // Step 1: Geospatial filter
    // Find candidate routes that start near the new route's start location (within 2km radius)
    const candidates = await Route.find({
      role: targetRole,
      active: true,
      userId: { $ne: newRoute.userId }, // don't match with self
      days: { $in: newRoute.days }, // must share at least one weekday
      fromCoords: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: newRoute.fromCoords.coordinates, // [lng, lat]
          },
          $maxDistance: 2000, // 2km radius limit for pickup
        },
      },
    }).populate('userId');

    console.log(`Found ${candidates.length} geospatial candidates for matching.`);

    for (const candidate of candidates) {
      // Step 2: Destination distance filter
      // Ensure destinations are within 3km of each other
      const destDistance = getDistance(
        newRoute.toCoords.coordinates[1], // lat
        newRoute.toCoords.coordinates[0], // lng
        candidate.toCoords.coordinates[1],
        candidate.toCoords.coordinates[0]
      );

      if (destDistance > 3000) {
        console.log(`Skipping candidate ${candidate._id} due to destination distance: ${destDistance}m`);
        continue;
      }

      // Step 3: Run detailed directions overlap calculation
      const driverRoute = isDriver ? newRoute : candidate;
      const passengerRoute = isDriver ? candidate : newRoute;

      const geometricOverlap = await calculateRouteOverlap(driverRoute, passengerRoute);

      if (geometricOverlap.overlapScore < 30) {
        console.log(`Skipping candidate ${candidate._id} due to low geometric overlap: ${geometricOverlap.overlapScore}%`);
        continue;
      }

      // Fetch user profile info
      const driverUser = await User.findById(driverRoute.userId);
      const passengerUser = await User.findById(passengerRoute.userId);

      if (!driverUser || !passengerUser) continue;

      // Step 4: Call Groq API to get smart ranking and AI explanation
      const aiMatch = await getSmartMatchRanking(
        driverUser,
        passengerUser,
        driverRoute,
        passengerRoute,
        geometricOverlap
      );

      // Step 5: Save Match to DB
      await Match.findOneAndUpdate(
        {
          driverRouteId: driverRoute._id,
          passengerRouteId: passengerRoute._id,
        },
        {
          driverRouteId: driverRoute._id,
          passengerRouteId: passengerRoute._id,
          driverId: driverRoute.userId,
          passengerId: passengerRoute.userId,
          overlapScore: aiMatch.overlapScore,
          etaMinutes: aiMatch.etaMinutes,
          aiExplanation: aiMatch.aiExplanation,
          status: 'pending',
        },
        { upsert: true, new: true }
      );

      console.log(`Created/Updated Match between Driver Route ${driverRoute._id} and Passenger Route ${passengerRoute._id} with score ${aiMatch.overlapScore}%`);
    }
  } catch (error) {
    console.error('Error running Matching Engine:', error.message);
  }
};

// @desc    Post a daily commute route
// @route   POST /api/routes
// @access  Private
export const postRoute = async (req, res) => {
  try {
    const {
      fromAddress,
      fromLng,
      fromLat,
      toAddress,
      toLng,
      toLat,
      departureTime,
      days,
      seats,
      mode,
      role,
    } = req.body;

    const route = await Route.create({
      userId: req.user._id,
      fromAddress,
      fromCoords: {
        type: 'Point',
        coordinates: [fromLng, fromLat], // GeoJSON is [lng, lat]
      },
      toAddress,
      toCoords: {
        type: 'Point',
        coordinates: [toLng, toLat], // GeoJSON is [lng, lat]
      },
      departureTime,
      days,
      seats,
      mode,
      role,
      active: true,
    });

    // Run matching in background so response returns immediately
    runMatchingEngine(route);

    res.status(201).json({
      success: true,
      message: 'Commute route posted successfully! Matches are being calculated.',
      route,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get current user's routes
// @route   GET /api/routes/my
// @access  Private
export const getMyRoutes = async (req, res) => {
  try {
    const routes = await Route.find({ userId: req.user._id });
    res.json({ success: true, routes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Toggle route active/inactive state
// @route   PUT /api/routes/:id/toggle
// @access  Private
export const toggleRouteStatus = async (req, res) => {
  try {
    const route = await Route.findOne({ _id: req.params.id, userId: req.user._id });

    if (!route) {
      return res.status(404).json({ success: false, error: 'Route not found or unauthorized' });
    }

    route.active = !route.active;
    await route.save();

    res.json({
      success: true,
      message: `Route marked ${route.active ? 'active' : 'inactive'}`,
      route,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete user route
// @route   DELETE /api/routes/:id
// @access  Private
export const deleteRoute = async (req, res) => {
  try {
    const route = await Route.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!route) {
      return res.status(404).json({ success: false, error: 'Route not found or unauthorized' });
    }

    res.json({
      success: true,
      message: 'Commute route deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
