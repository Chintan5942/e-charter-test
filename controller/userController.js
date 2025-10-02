const { db } = require("../config/db");
const asyncHandler = require("express-async-handler");
const imagekit = require("../config/imagekit");
const userGetQueries = require("../config/userQueries/userGetQueries");
const userPutQueries = require("../config/userQueries/userPutQueries");



const getUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user?.user_id;

  console.log(userId);
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized: User ID not found" });
  }

  const [user] = await db.query(userGetQueries.getUserProfileById, [userId]);

  if (!user.length) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json(user[0]);
});


const editUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user?.user_id;
  const { firstName, lastName, address, cityName, zipCode, phoneNo } = req.body;
  const profileImage = req.file;

  // Validate fields
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: User not found" });
  }

  if (!firstName || !lastName || !address || !cityName || !zipCode || !phoneNo) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Optional profile image upload
    let imageURL = null;

    if (profileImage) {
      const uploadedImage = await imagekit.upload({
        file: profileImage.buffer,
        fileName: `${firstName}_profile_${Date.now()}.jpg`,
        folder: "echarter/user-profile",
      });
      imageURL = uploadedImage.url;
    }

    const updateFields = [firstName, lastName, address, cityName, zipCode, phoneNo, imageURL, userId];

    await db.query(userPutQueries.updateUserProfile, updateFields);

    res.status(200).json({
      message: "Profile updated successfully.",
      profileImage: imageURL,
    });

  } catch (err) {
    console.error("Edit Profile Error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

const getApprovedCars = asyncHandler(async (req, res) => {
  try {
    const [cars] = await db.query(userGetQueries.getApprovedCars);
    res.status(200).json({
      message: "Approved cars fetched successfully",
      count: cars.length,
      cars
    });
  } catch (error) {
    console.error("Error fetching approved cars:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});


module.exports = { getApprovedCars, editUserProfile, getUserProfile };
