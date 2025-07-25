const express = require("express")
const router = express.Router()
const { approveDriver, approveCar, getPendingApprovals } = require("../controller/verificationController")
const { authenticationToken } = require("../middleware/authMiddleware")


// Fixed route parameter definitions - ensure proper parameter names
router.post("/approvedriver/:driver_id", authenticationToken, approveDriver);
router.post("/approvecar/:car_id", authenticationToken, approveCar);
router.get("/pending-approvals", authenticationToken, getPendingApprovals);

console.log("Verification routes configured successfully");

module.exports = router;