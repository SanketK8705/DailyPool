import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client({});
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Haversine formula to compute distance in meters between two lat/lng points
export const getDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
};

// Fetch Directions steps coordinates from Google Maps Directions API
export const getDirectionsPath = async (fromCoords, toCoords) => {
  try {
    if (!API_KEY || API_KEY.startsWith('your_')) {
      console.warn('Google Maps API key is not set. Returning mock route path.');
      return [
        { lat: fromCoords[1], lng: fromCoords[0] },
        { lat: (fromCoords[1] + toCoords[1]) / 2, lng: (fromCoords[0] + toCoords[0]) / 2 },
        { lat: toCoords[1], lng: toCoords[0] },
      ];
    }

    const response = await client.directions({
      params: {
        origin: `${fromCoords[1]},${fromCoords[0]}`, // lat,lng
        destination: `${toCoords[1]},${toCoords[0]}`,
        mode: 'driving',
        key: API_KEY,
      },
    });

    if (
      response.data &&
      response.data.routes &&
      response.data.routes.length > 0
    ) {
      const route = response.data.routes[0];
      const pathPoints = [];

      // Extract coordinates along the route steps
      route.legs.forEach((leg) => {
        leg.steps.forEach((step) => {
          pathPoints.push({
            lat: step.start_location.lat,
            lng: step.start_location.lng,
          });
          pathPoints.push({
            lat: step.end_location.lat,
            lng: step.end_location.lng,
          });
        });
      });

      return pathPoints;
    }
    return [];
  } catch (error) {
    console.error('Error fetching Google Directions:', error.message);
    // Return simple interpolation as fallback
    return [
      { lat: fromCoords[1], lng: fromCoords[0] },
      { lat: (fromCoords[1] + toCoords[1]) / 2, lng: (fromCoords[0] + toCoords[0]) / 2 },
      { lat: toCoords[1], lng: toCoords[0] },
    ];
  }
};

// Check path similarity / detour score
// Check if the passenger's home and office are near the driver's route path (within maxDistance meters)
export const calculateRouteOverlap = async (driverRoute, passengerRoute) => {
  try {
    const driverPath = await getDirectionsPath(
      driverRoute.fromCoords.coordinates,
      driverRoute.toCoords.coordinates
    );

    if (driverPath.length === 0) return { overlapScore: 0, detourDistance: 0 };

    const passHome = {
      lat: passengerRoute.fromCoords.coordinates[1],
      lng: passengerRoute.fromCoords.coordinates[0],
    };
    const passOffice = {
      lat: passengerRoute.toCoords.coordinates[1],
      lng: passengerRoute.toCoords.coordinates[0],
    };

    // Find the minimum distance from passenger's home and office to the driver's path
    let minHomeDist = Infinity;
    let minOfficeDist = Infinity;

    driverPath.forEach((point) => {
      const dHome = getDistance(passHome.lat, passHome.lng, point.lat, point.lng);
      const dOffice = getDistance(passOffice.lat, passOffice.lng, point.lat, point.lng);

      if (dHome < minHomeDist) minHomeDist = dHome;
      if (dOffice < minOfficeDist) minOfficeDist = dOffice;
    });

    // Score calculations:
    // If the passenger's home is within 500m of the driver's route and office is within 1000m, it's a strong route match.
    // 500m and 1000m are standard tolerances.
    // Score decays as distance increases.
    const maxHomeTolerance = 1500; // 1.5km max detour for pickup
    const maxOfficeTolerance = 2500; // 2.5km max detour for dropoff

    let homeScore = Math.max(0, 100 * (1 - minHomeDist / maxHomeTolerance));
    let officeScore = Math.max(0, 100 * (1 - minOfficeDist / maxOfficeTolerance));

    // Overall geometric similarity score (average)
    const geometricScore = Math.round((homeScore + officeScore) / 2);
    const detourDistance = Math.round(minHomeDist + minOfficeDist);

    return {
      overlapScore: geometricScore,
      detourDistance,
    };
  } catch (error) {
    console.error('Error calculating route overlap:', error);
    return { overlapScore: 0, detourDistance: Infinity };
  }
};
