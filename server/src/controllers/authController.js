import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Ride } from '../models/Ride.js';


// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'dailypool_super_secret_jwt_key_123!', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, gender, companyName } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    const domain = email.split('@')[1]?.toLowerCase() || '';

    const user = await User.create({
      name,
      email,
      password,
      gender,
      companyName: companyName || domain.split('.')[0],
      verified: true,
      trustScore: 50,
      homeLocation: { address: '', lat: 0, lng: 0 },
      officeLocation: { address: '', lat: 0, lng: 0 },
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        companyName: user.companyName,
        verified: user.verified,
        trustScore: user.trustScore,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};



// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (user && (await user.comparePassword(password))) {
      res.json({
        success: true,
        token: generateToken(user._id),
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          gender: user.gender,
          companyName: user.companyName,
          verified: user.verified,
          trustScore: user.trustScore,
          homeLocation: user.homeLocation,
          officeLocation: user.officeLocation,
        },
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update user home & office locations
// @route   PUT /api/auth/locations
// @access  Private
export const updateLocations = async (req, res) => {
  try {
    const { homeAddress, homeLat, homeLng, officeAddress, officeLat, officeLng } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.homeLocation = { address: homeAddress, lat: homeLat, lng: homeLng };
    user.officeLocation = { address: officeAddress, lat: officeLat, lng: officeLng };
    await user.save();

    res.json({
      success: true,
      message: 'Commute locations updated successfully',
      user: {
        _id: user._id,
        homeLocation: user.homeLocation,
        officeLocation: user.officeLocation,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};



// @desc    Google OAuth login / signup callback handler
// @route   POST /api/auth/google-oauth
// @access  Public
export const googleOAuth = async (req, res) => {
  try {
    const { email, name, companyName } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      // Create user auto-verified
      user = new User({
        name: name || 'Google Commuter',
        email,
        password: Math.random().toString(36).substring(2, 10), // random password
        gender: 'Male',
        companyName: companyName || 'Google',
        verified: true, // Auto verified
      });
      await user.save();
    } else {
      if (!user.verified) {
        user.verified = true;
        await user.save();
      }
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        companyName: user.companyName,
        verified: user.verified,
        trustScore: user.trustScore,
        homeLocation: user.homeLocation,
        officeLocation: user.officeLocation,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all users (Admin view)
// @route   GET /api/auth/admin/users
export const adminGetUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all rides (Admin view)
// @route   GET /api/auth/admin/rides
export const adminGetRides = async (req, res) => {
  try {
    const rides = await Ride.find({})
      .populate('driverId', 'name email companyName')
      .populate('passengerId', 'name email companyName')
      .sort({ createdAt: -1 });
    res.json({ success: true, rides });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Toggle user verification status (Admin action)
// @route   PUT /api/auth/admin/users/:id/verify
export const adminToggleUserVerification = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    user.verified = !user.verified;
    await user.save();
    res.json({ success: true, message: `User marked ${user.verified ? 'Verified' : 'Unverified'}`, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
