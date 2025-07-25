import React, { useState, useEffect } from 'react'
import { Search, Filter, Play, CheckCircle, Eye, MapPin, Clock, Phone } from 'lucide-react'
import { driverAPI } from '../../services/api'
import toast from 'react-hot-toast'

const Trips = () => {
  const [trips, setTrips] = useState([])
  const [filteredTrips, setFilteredTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchTrips()
  }, [])

  useEffect(() => {
    filterTrips()
  }, [trips, searchTerm, statusFilter])

  const fetchTrips = async () => {
    try {
      setLoading(true)
      const response = await driverAPI.getTrips()
      setTrips(response.data.trips || [])
    } catch (error) {
      console.error('Error fetching trips:', error)
      toast.error('Failed to fetch trips')
    } finally {
      setLoading(false)
    }
  }

  const filterTrips = () => {
    let filtered = trips

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(trip =>
        trip.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.pickupLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.dropLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.trip_id.toString().includes(searchTerm)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(trip => trip.status === statusFilter)
    }

    setFilteredTrips(filtered)
  }

  const startTrip = async (tripId) => {
    try {
      await driverAPI.startTrip(tripId)
      toast.success('Trip started successfully!')
      fetchTrips()
    } catch (error) {
      console.error('Error starting trip:', error)
      toast.error('Failed to start trip')
    }
  }

  const completeTrip = async (tripId) => {
    try {
      await driverAPI.completeTrip(tripId)
      toast.success('Trip completed successfully!')
      fetchTrips()
    } catch (error) {
      console.error('Error completing trip:', error)
      toast.error('Failed to complete trip')
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': 'status-pending',
      'confirmed': 'status-confirmed',
      'in_progress': 'status-in-progress',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    }
    
    return (
      <span className={`status-badge ${statusMap[status] || 'status-pending'}`}>
        {status?.replace('_', ' ') || 'Unknown'}
      </span>
    )
  }

  const openTripModal = (trip) => {
    setSelectedTrip(trip)
    setShowModal(true)
  }

  // Helper function to safely format currency
  const formatCurrency = (value) => {
    const numValue = Number(value) || 0
    return numValue.toFixed(2)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">My Trips</h1>
          <p className="text-secondary-600">Manage your assigned trips and bookings</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-secondary-600">Total: {trips.length}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">
            {trips.filter(t => t.status === 'confirmed').length}
          </div>
          <div className="text-sm text-secondary-600">Upcoming</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-600">
            {trips.filter(t => t.status === 'in_progress').length}
          </div>
          <div className="text-sm text-secondary-600">In Progress</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-success-600">
            {trips.filter(t => t.status === 'completed').length}
          </div>
          <div className="text-sm text-secondary-600">Completed</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">
            ${trips.filter(t => t.status === 'completed').reduce((sum, trip) => sum + (parseFloat(trip.total_price) || 0), 0).toFixed(2)}
          </div>
          <div className="text-sm text-secondary-600">Total Earnings</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search trips..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-secondary-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-secondary-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="confirmed">Upcoming</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Trips Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-secondary-200">
                <th className="table-header">Trip ID</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Route</th>
                <th className="table-header">Date & Time</th>
                <th className="table-header">Status</th>
                <th className="table-header">Earnings</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {filteredTrips.map((trip) => (
                <tr key={trip.trip_id} className="hover:bg-secondary-50">
                  <td className="table-cell font-medium">
                    #{trip.trip_id}
                  </td>
                  <td className="table-cell">
                    <div>
                      <p className="font-medium text-secondary-900">
                        {trip.firstName} {trip.lastName}
                      </p>
                      <p className="text-sm text-secondary-500">{trip.userEmail}</p>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-green-500" />
                        <span className="text-sm truncate max-w-32">{trip.pickupLocation}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-red-500" />
                        <span className="text-sm truncate max-w-32">{trip.dropLocation}</span>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-secondary-400" />
                        <span className="text-sm">
                          {new Date(trip.tripStartDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm text-secondary-500">{trip.tripTime}</div>
                    </div>
                  </td>
                  <td className="table-cell">
                    {getStatusBadge(trip.status)}
                  </td>
                  <td className="table-cell font-medium">
                    ${formatCurrency(trip.total_price)}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openTripModal(trip)}
                        className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {trip.status === 'confirmed' && (
                        <button
                          onClick={() => startTrip(trip.trip_id)}
                          className="p-2 text-success-600 hover:text-success-700 hover:bg-success-100 rounded-lg transition-colors"
                          title="Start Trip"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {trip.status === 'in_progress' && (
                        <button
                          onClick={() => completeTrip(trip.trip_id)}
                          className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-100 rounded-lg transition-colors"
                          title="Complete Trip"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTrips.length === 0 && (
            <div className="text-center py-12">
              <p className="text-secondary-500">No trips found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Trip Details Modal */}
      {showModal && selectedTrip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-secondary-900">
                  Trip Details - #{selectedTrip.trip_id}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Customer Information */}
                <div>
                  <h4 className="font-semibold text-secondary-900 mb-3">Customer Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700">Name</label>
                      <p className="text-secondary-900">
                        {selectedTrip.firstName} {selectedTrip.lastName}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700">Email</label>
                      <p className="text-secondary-900">{selectedTrip.userEmail}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700">Phone</label>
                      <div className="flex items-center space-x-2">
                        <p className="text-secondary-900">{selectedTrip.userPhone}</p>
                        <a
                          href={`tel:${selectedTrip.userPhone}`}
                          className="p-1 text-primary-600 hover:text-primary-700"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trip Information */}
                <div>
                  <h4 className="font-semibold text-secondary-900 mb-3">Trip Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700">Pickup Location</label>
                      <p className="text-secondary-900">{selectedTrip.pickupLocation}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700">Drop Location</label>
                      <p className="text-secondary-900">{selectedTrip.dropLocation}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700">Date</label>
                        <p className="text-secondary-900">
                          {new Date(selectedTrip.tripStartDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700">Time</label>
                        <p className="text-secondary-900">{selectedTrip.tripTime}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700">Distance</label>
                        <p className="text-secondary-900">{selectedTrip.distance_km} km</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700">Duration</label>
                        <p className="text-secondary-900">{selectedTrip.durationHours} hours</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700">Status</label>
                        {getStatusBadge(selectedTrip.status)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700">Earnings</label>
                        <p className="text-lg font-bold text-green-600">
                          ${formatCurrency(selectedTrip.total_price)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4 border-t border-secondary-200">
                  {selectedTrip.status === 'confirmed' && (
                    <button
                      onClick={() => {
                        startTrip(selectedTrip.trip_id)
                        setShowModal(false)
                      }}
                      className="btn-success flex-1"
                    >
                      Start Trip
                    </button>
                  )}
                  {selectedTrip.status === 'in_progress' && (
                    <button
                      onClick={() => {
                        completeTrip(selectedTrip.trip_id)
                        setShowModal(false)
                      }}
                      className="btn-primary flex-1"
                    >
                      Complete Trip
                    </button>
                  )}
                  <a
                    href={`tel:${selectedTrip.userPhone}`}
                    className="btn-secondary flex items-center justify-center space-x-2"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call Customer</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Trips