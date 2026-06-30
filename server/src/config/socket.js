import { Server } from 'socket.io';
import { Ride } from '../models/Ride.js';
import { User } from '../models/User.js';

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*', // allows any origin for development testing
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket Client Connected: ${socket.id}`);

    // Join room for a specific ride pool
    socket.on('join_ride', ({ rideId }) => {
      socket.join(`ride_${rideId}`);
      console.log(`Socket ${socket.id} joined room: ride_${rideId}`);
    });

    // "Leaving Now" event triggered by the driver
    socket.on('leaving_now', async ({ rideId, lat, lng }) => {
      try {
        const ride = await Ride.findById(rideId).populate('driverId');
        if (!ride) return socket.emit('error_message', 'Ride not found');

        ride.status = 'ongoing';
        ride.startTime = new Date();
        ride.liveLocations.push({ lat, lng, timestamp: new Date() });
        await ride.save();

        // Notify all riders in the pool room
        io.to(`ride_${rideId}`).emit('ride_started', {
          rideId,
          status: 'ongoing',
          driverName: ride.driverId.name,
          driverLocation: { lat, lng },
          splitAmount: ride.splitAmount,
        });

        console.log(`Ride ${rideId} started by driver: ${ride.driverId.name}`);
      } catch (err) {
        console.error('Socket leaving_now error:', err.message);
      }
    });

    // Handle continuous location updates from driver
    socket.on('share_location', async ({ rideId, lat, lng }) => {
      try {
        const ride = await Ride.findById(rideId);
        if (!ride || ride.status !== 'ongoing') return;

        // Append to database path history
        ride.liveLocations.push({ lat, lng, timestamp: new Date() });
        await ride.save();

        // Broadcast updated coordinates to all passenger/driver listeners in the room
        io.to(`ride_${rideId}`).emit('location_updated', {
          rideId,
          lat,
          lng,
        });
      } catch (err) {
        console.error('Socket share_location error:', err.message);
      }
    });

    // SOS Emergency Button Triggered
    socket.on('emergency_sos', async ({ rideId, userId, lat, lng }) => {
      try {
        const user = await User.findById(userId);
        const name = user ? user.name : 'A commuter';

        console.warn(`[EMERGENCY SOS] User ${name} triggered SOS on Ride ${rideId} at coords: (${lat}, ${lng})`);

        // Broadcast emergency alarm to all riders in this room
        io.to(`ride_${rideId}`).emit('emergency_alert', {
          rideId,
          userId,
          userName: name,
          lat,
          lng,
          message: 'CRITICAL: SOS button tapped! Directing safety support.',
        });
      } catch (err) {
        console.error('Socket SOS error:', err.message);
      }
    });

    // End Ride triggered by driver
    socket.on('end_ride', async ({ rideId }) => {
      try {
        const ride = await Ride.findById(rideId);
        if (!ride) return;

        ride.status = 'completed';
        ride.endTime = new Date();
        await ride.save();

        // Update driver and passenger trust scores for completing a ride
        const driver = await User.findById(ride.driverId);
        const passenger = await User.findById(ride.passengerId);

        if (driver) {
          driver.trustScore = Math.min(100, driver.trustScore + 2);
          driver.rideHistory.push({
            rideId: ride._id,
            role: 'driver',
            status: 'completed',
          });
          await driver.save();
        }

        if (passenger) {
          passenger.trustScore = Math.min(100, passenger.trustScore + 1);
          passenger.rideHistory.push({
            rideId: ride._id,
            role: 'passenger',
            status: 'completed',
          });
          await passenger.save();
        }

        // Notify room members
        io.to(`ride_${rideId}`).emit('ride_completed', {
          rideId,
          status: 'completed',
          splitAmount: ride.splitAmount,
          upiId: ride.upiId || 'upi-merchant@bank',
        });

        console.log(`Ride ${rideId} marked completed.`);
      } catch (err) {
        console.error('Socket end_ride error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket Client Disconnected: ${socket.id}`);
    });
  });

  return io;
};
