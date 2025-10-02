const {db} = require("../config/db");
const asyncHandler = require("express-async-handler");
const adminGetQueries = require("../config/adminQueries/adminGetQueries");
const adminDeleteQueries = require("../config/adminQueries/adminDeleteQueries");
const adminUpdateQueries = require("../config/adminQueries/adminUpdateQueries");
const fleetPartnerQueries = require("../config/fleetPartnerQueries/fleetPartnerQueries");

const getAllDrivers = asyncHandler(async (req, res) => {
    try {
        const [drivers] = await db.query(adminGetQueries.getAllDrivers);

        res.status(200).json({
            message: "Drivers fetched successfully",
            count: drivers.length,
            drivers
        });
    } catch (error) {
        console.error("Error fetching drivers:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getAllCars = asyncHandler(async (req, res) => {
  try {
    const [cars] = await db.query(adminGetQueries.getAllCars);
    res.status(200).json({
      message: "All cars fetched successfully",
      count: cars.length,
      cars
    });
  } catch (error) {
    console.error("Error fetching cars:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Get all trips for admin dashboard - FIXED with proper data formatting
const getAllTrips = asyncHandler(async (req, res) => {
  try {
    console.log("Fetching all trips for admin...");
    
    // Enhanced query with better error handling and data formatting
    const [trips] = await db.query(adminGetQueries.getAllTrips);

    // Ensure all numeric fields are properly formatted
    const formattedTrips = trips.map(trip => ({
      ...trip,
      total_price: parseFloat(trip.total_price) || 0,
      base_price: parseFloat(trip.base_price) || 0,
      tax_amount: parseFloat(trip.tax_amount) || 0,
      distance_km: parseFloat(trip.distance_km) || 0,
      durationHours: parseFloat(trip.durationHours) || 0
    }));

    console.log(`Found ${formattedTrips.length} trips`);

    res.status(200).json({
      message: "All trips fetched successfully",
      count: formattedTrips.length,
      trips: formattedTrips
    });
  } catch (error) {
    console.error("Error fetching trips:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const [users] = await db.query(adminGetQueries.getAllUsers);

    res.status(200).json({
      message: "Users fetched successfully",
      count: users.length,
      users,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

const deleteUser = asyncHandler(async (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // First delete all trips for the user
    await db.query(adminDeleteQueries.deleteTripsById, [user_id]);

    // Then delete the user
    const [result] = await db.query(adminDeleteQueries.deleteUserById, [user_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User and related trips deleted successfully",
      user_id,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});


const editUser = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  const {
    firstName,
    lastName,
    email,
    address,
    cityName,
    zipCode,
    phoneNo
  } = req.body;

  if (!firstName || !lastName || !email || !phoneNo) {
    return res.status(400).json({ message: "Required fields are missing" });
  }

  try {
    const [result] = await db.query(adminUpdateQueries.updateUserDetails, [
      firstName,
      lastName,
      email,
      address,
      cityName,
      zipCode,
      phoneNo,
      user_id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User details updated successfully",
      user_id,
      updatedFields: {
        firstName,
        lastName,
        email,
        address,
        cityName,
        zipCode,
        phoneNo
      }
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Get dashboard statistics for admin - ENHANCED with proper data formatting
const getDashboardStats = asyncHandler(async (req, res) => {
  try { 
    // Get all required data in parallel with better error handling
      const [
      [drivers],
      [vehicles],
      [trips],
      [users],
      [fleetPartners]
    ] = await Promise.all([
      db.query(adminGetQueries.getAllDrivers),
      db.query(adminGetQueries.getAllCars),
      db.query(adminGetQueries.getDashboardTrips),
      db.query(adminGetQueries.getAllUsers),
      db.query(adminGetQueries.getFleetPartnersOnly).catch(() => [[]])
    ]);

    // Calculate statistics with proper number handling
    const completedTrips = trips.filter(t => t.status === 'completed');
    const totalRevenue = completedTrips.reduce((sum, trip) => {
      return sum + (parseFloat(trip.total_price) || 0);
    }, 0);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = completedTrips
      .filter(t => {
        const tripDate = new Date(t.created_at);
        return tripDate.getMonth() === currentMonth && 
               tripDate.getFullYear() === currentYear;
      })
      .reduce((sum, trip) => sum + (parseFloat(trip.total_price) || 0), 0);

    const stats = {
      totalDrivers: drivers.length,
      totalVehicles: vehicles.length,
      totalTrips: trips.length,
      totalUsers: users.length,
      totalFleetPartners: fleetPartners.length,
      
      // Driver stats
      approvedDrivers: drivers.filter(d => d.status === 1).length,
      pendingDrivers: drivers.filter(d => d.status === 0).length,
      rejectedDrivers: drivers.filter(d => d.status === 2).length,
      
      // Vehicle stats
      approvedVehicles: vehicles.filter(v => v.status === 1).length,
      pendingVehicles: vehicles.filter(v => v.status === 0).length,
      
      // Trip stats
      pendingTrips: trips.filter(t => t.status === 'pending' || t.status === '0').length,
      confirmedTrips: trips.filter(t => t.status === 'confirmed').length,
      inProgressTrips: trips.filter(t => t.status === 'in_progress').length,
      completedTrips: completedTrips.length,
      cancelledTrips: trips.filter(t => t.status === 'cancelled').length,
      
      // Revenue calculation - properly formatted
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2)),
      
      // Pending approvals
      pendingApprovals: drivers.filter(d => d.status === 0).length + 
                       vehicles.filter(v => v.status === 0).length +
                       fleetPartners.filter(fp => fp.status === 0).length
    };

    // Get recent trips (last 10) with proper formatting
    const recentTrips = trips.slice(0, 10).map(trip => ({
      ...trip,
      total_price: parseFloat(trip.total_price) || 0,
      base_price: parseFloat(trip.base_price) || 0,
      tax_amount: parseFloat(trip.tax_amount) || 0
    }));

    console.log("Dashboard stats calculated successfully");

    res.status(200).json({
      message: "Dashboard statistics fetched successfully",
      stats,
      recentTrips
    });

  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Get all fleet partners for admin - FIXED with proper column handling
const getAllFleetPartners = asyncHandler(async (req, res) => {
  try {
    
    // First check if the enhanced columns exist
    const [columnCheck] = await db.query(`
      SHOW COLUMNS FROM drivers LIKE 'created_at'
    `);

    let query;
    if (columnCheck.length > 0) {
      // Enhanced query if columns exist
      query = adminGetQueries.getFleetPartnersEnhanced;
    } else {
      // Fallback query for basic structure
      query = adminGetQueries.getFleetPartnersBasic;
    }

    const [fleetPartners] = await db.query(query);

    console.log(`Found ${fleetPartners.length} fleet partners`);

    res.status(200).json({
      message: "Fleet partners fetched successfully",
      count: fleetPartners.length,
      fleetPartners
    });

  } catch (error) {
    console.error("Error fetching fleet partners:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

const deleteFleetPartnerByAdmin = asyncHandler(async (req, res) => {
  const { company_id } = req.params;

  if (!company_id) {
    return res.status(400).json({ message: "Company ID is required" });
  }

  try {
    const [company] = await db.query(fleetPartnerQueries.getFleetCompanyById, [company_id]);
    if (company.length === 0) {
      return res.status(404).json({ message: "Fleet partner not found" });
    }

    const [drivers] = await db.query(fleetPartnerQueries.getDriversByCompanyId, [company_id]);
    const driverIds = drivers.map((d) => d.driver_id);

    for (const driver_id of driverIds) {
      const [cars] = await db.query(fleetPartnerQueries.getCarsByDriverId, [driver_id]);
      
      for (const car of cars) {
        const car_id = car.car_id;

        await db.query(fleetPartnerQueries.deleteTripsByCarId, [car_id]);

        await db.query(fleetPartnerQueries.deleteCarById, [car_id]);
      }

      await db.query(fleetPartnerQueries.deleteFleetCertifications, [driver_id]);
      await db.query(fleetPartnerQueries.deleteFleetDocuments, [driver_id]);
      await db.query(fleetPartnerQueries.deleteFleetReferences, [driver_id]);
      await db.query(fleetPartnerQueries.deleteFleetServiceAreas, [driver_id]);

      await db.query(fleetPartnerQueries.deleteDriver, [driver_id]);
    }

    await db.query(fleetPartnerQueries.deleteFleetCompany, [company_id]);

    res.status(200).json({
      message: "Fleet partner and all related drivers, cars, and trips deleted successfully.",
      company_id,
      deleted_drivers: driverIds,
    });
  } catch (error) {
    console.error("Error deleting fleet partner:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Admin: Edit Fleet Partner
const editFleetPartnerByAdmin = asyncHandler(async (req, res) => {
  const { driver_id } = req.params;

  const {
    driverName,
    email,
    phoneNo,
    address,
    cityName,
    zipCode,
    company_name,
    legal_entity_type,
    business_address,
    contact_person_name,
    contact_person_position,
    fleet_size,
    service_areas,
    operating_hours,
    safety_protocols,
    insurance_policy_number,
    business_license_number,
    years_experience,
    certifications,
    references,
    additional_services,
    sustainability_practices,
    special_offers,
    communication_channels,
    status
  } = req.body;

  if (!driver_id) {
    return res.status(400).json({ message: "Driver ID is required" });
  }

  // Helper to safely stringify optional fields
  const safeStringify = (value) => JSON.stringify(value || []);

  try {
    // Check if the fleet partner exists
    const [existing] = await db.query(fleetPartnerQueries.getFleetPartnerById, [driver_id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Fleet partner not found" });
    }

    // Update fleet partner data
    await db.query(fleetPartnerQueries.updateFleetPartnerByAdmin, [
      driverName || "",
      email || "",
      phoneNo || "",
      address || "",
      cityName || "",
      zipCode || "",
      company_name || "",
      legal_entity_type || "",
      business_address || "",
      contact_person_name || "",
      contact_person_position || "",
      fleet_size || 0,
      safeStringify(service_areas),
      operating_hours || "",
      years_experience || 0,
      safety_protocols || "",
      insurance_policy_number || "",
      business_license_number || "",
      safeStringify(certifications),
      safeStringify(references),
      safeStringify(additional_services),
      sustainability_practices || "",
      special_offers || "",
      safeStringify(communication_channels),
      status ?? 0, // use 0 as default if undefined
      driver_id
    ]);

    res.status(200).json({
      message: "Fleet partner profile updated successfully",
      driver_id,
      status
    });

  } catch (error) {
    console.error("Error updating fleet partner:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Get payout summary for admin - FIXED with proper data formatting
const getPayoutSummary = asyncHandler(async (req, res) => {
  try {    
    // Get completed trips with driver/fleet partner info
    const [payoutData] = await db.query(adminGetQueries.getPayoutSummary);

    // Calculate summary statistics with proper number handling
    const totalRevenue = payoutData.reduce((sum, trip) => {
      return sum + (parseFloat(trip.total_price) || 0);
    }, 0);
    
    const totalCommission = payoutData.reduce((sum, trip) => {
      return sum + (parseFloat(trip.admin_commission) || 0);
    }, 0);
    
    const totalPayouts = payoutData.reduce((sum, trip) => {
      return sum + (parseFloat(trip.driver_payout) || 0);
    }, 0);

    // Group by driver for payout summary
    const driverPayouts = {};
    payoutData.forEach(trip => {
      const driverId = trip.driver_id;
      if (!driverPayouts[driverId]) {
        driverPayouts[driverId] = {
          driver_id: driverId,
          driverName: trip.driverName,
          email: trip.driver_email,
          registration_type: trip.registration_type,
          company_name: trip.company_name,
          total_trips: 0,
          total_earnings: 0,
          total_payout: 0,
          commission_rate: trip.registration_type === 'fleet_partner' ? 15 : 20
        };
      }
      driverPayouts[driverId].total_trips += 1;
      driverPayouts[driverId].total_earnings += parseFloat(trip.total_price) || 0;
      driverPayouts[driverId].total_payout += parseFloat(trip.driver_payout) || 0;
    });

    // Format the response data properly
    const formattedPayoutData = payoutData.map(trip => ({
      ...trip,
      total_price: parseFloat(trip.total_price) || 0,
      admin_commission: parseFloat(trip.admin_commission) || 0,
      driver_payout: parseFloat(trip.driver_payout) || 0
    }));

    res.status(200).json({
      message: "Payout summary fetched successfully",
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalCommission: parseFloat(totalCommission.toFixed(2)),
        totalPayouts: parseFloat(totalPayouts.toFixed(2)),
        totalTrips: payoutData.length
      },
      driverPayouts: Object.values(driverPayouts).map(driver => ({
        ...driver,
        total_earnings: parseFloat(driver.total_earnings.toFixed(2)),
        total_payout: parseFloat(driver.total_payout.toFixed(2))
      })),
      recentPayouts: formattedPayoutData.slice(0, 20)
    });

  } catch (error) {
    console.error("Error fetching payout summary:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

module.exports = {
    getAllDrivers,
    getAllCars,
    getAllTrips,
    getAllUsers,
    deleteUser,
    editUser,
    getDashboardStats,
    getAllFleetPartners,
    editFleetPartnerByAdmin,
    deleteFleetPartnerByAdmin,
    getPayoutSummary
}