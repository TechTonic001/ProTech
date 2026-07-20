// controllers/property.controller.js
const pool = require('../config/db');

const createProperty = async (req, res, next) => {
  try {
    const { property_name, address, city, total_rooms } = req.body;
    const landlord_id = req.user.user_id;

    if (!property_name || !address) {
      return res.status(400).json({ error: 'Property name and address are required' });
    }

    const result = await pool.query(
      'INSERT INTO properties (landlord_id, property_name, address, city, total_rooms) VALUES ($1, $2, $3, $4, $5) RETURNING property_id',
      [landlord_id, property_name, address, city || 'Ogbomoso', total_rooms || 0]
    );

    return res.status(201).json({
      message: 'Property created successfully',
      data: {
        property_id: result.rows[0].property_id,
        property_name,
        address,
        city: city || 'Ogbomoso',
      },
    });
  } catch (error) {
    next(error);
  }
};

const getProperties = async (req, res, next) => {
  try {
    const landlord_id = req.user.user_id;

    // Exclude soft-deleted properties
    const propertiesResult = await pool.query(
      `SELECT property_id, landlord_id, property_name, address, city, total_rooms, created_at, updated_at
       FROM properties
       WHERE landlord_id = $1
         AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [landlord_id]
    );

    return res.status(200).json({
      message: 'Properties retrieved successfully',
      data: propertiesResult.rows,
    });
  } catch (error) {
    next(error);
  }
};

const getPropertyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const landlord_id = req.user.user_id;

    const propertiesResult = await pool.query(
      `SELECT property_id, landlord_id, property_name, address, city, total_rooms, created_at, updated_at
       FROM properties
       WHERE property_id = $1
         AND landlord_id = $2
         AND deleted_at IS NULL`,
      [id, landlord_id]
    );

    if (propertiesResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    return res.status(200).json({
      message: 'Property retrieved successfully',
      data: propertiesResult.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const updateProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { property_name, address, city, total_rooms } = req.body;
    const landlord_id = req.user.user_id;

    const propertiesResult = await pool.query(
      'SELECT property_id, property_name, address, city, total_rooms FROM properties WHERE property_id = $1 AND landlord_id = $2 AND deleted_at IS NULL',
      [id, landlord_id]
    );

    if (propertiesResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const property = propertiesResult.rows[0];

    await pool.query(
      'UPDATE properties SET property_name = $1, address = $2, city = $3, total_rooms = $4 WHERE property_id = $5',
      [
        property_name || property.property_name,
        address || property.address,
        city || property.city,
        total_rooms || property.total_rooms,
        id
      ]
    );

    return res.status(200).json({
      message: 'Property updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ── SOFT DELETE property (Issue 1D) ───────────────────────────────────────────
// Route: DELETE /api/property/:property_id
// Auth:  verifyToken + requireRole('landlord')
const softDeleteProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const landlord_id = req.user.user_id;

    // Verify the property belongs to this landlord
    const propResult = await pool.query(
      'SELECT property_id FROM properties WHERE property_id = $1 AND landlord_id = $2 AND deleted_at IS NULL',
      [id, landlord_id]
    );

    if (propResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Check for active leases on this property's rooms
    const activeLeasesResult = await pool.query(
      `SELECT COUNT(*) FROM leases l
       JOIN rooms r ON l.room_id = r.room_id
       WHERE r.property_id = $1
         AND l.lease_status = 'active'`,
      [id]
    );

    if (parseInt(activeLeasesResult.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete property with active tenants. Remove all tenants first.',
      });
    }

    // Soft delete property and all its rooms
    await pool.query(
      'UPDATE properties SET deleted_at = NOW() WHERE property_id = $1',
      [id]
    );
    await pool.query(
      'UPDATE rooms SET deleted_at = NOW() WHERE property_id = $1',
      [id]
    );

    return res.status(200).json({
      message: 'Property deleted. Recovery available for 30 days.',
    });
  } catch (error) {
    next(error);
  }
};

// ── RESTORE soft-deleted property (Issue 1D) ──────────────────────────────────
// Route: POST /api/property/:property_id/restore
// Auth:  verifyToken + requireRole('landlord')
const restoreProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const landlord_id = req.user.user_id;

    const propResult = await pool.query(
      `SELECT property_id, deleted_at,
              (NOW() - deleted_at) AS time_since_deletion
       FROM properties
       WHERE property_id = $1
         AND landlord_id = $2
         AND deleted_at IS NOT NULL`,
      [id, landlord_id]
    );

    if (propResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deleted property not found' });
    }

    // Check 30-day window
    const deletedAt = new Date(propResult.rows[0].deleted_at);
    const daysSinceDelete = (Date.now() - deletedAt.getTime()) / 86400000;

    if (daysSinceDelete >= 30) {
      return res.status(400).json({
        error: 'Recovery window has expired. This property has been permanently deleted.',
      });
    }

    await pool.query(
      'UPDATE properties SET deleted_at = NULL WHERE property_id = $1',
      [id]
    );
    await pool.query(
      'UPDATE rooms SET deleted_at = NULL WHERE property_id = $1',
      [id]
    );

    return res.status(200).json({
      message: 'Property restored successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ── GET soft-deleted properties (Issue 1D — Recycle Bin) ─────────────────────
// Route: GET /api/property/deleted
// Auth:  verifyToken + requireRole('landlord')
const getDeletedProperties = async (req, res, next) => {
  try {
    const landlord_id = req.user.user_id;

    const result = await pool.query(
      `SELECT
         property_id, property_name, address, city, total_rooms,
         deleted_at,
         EXTRACT(DAY FROM (NOW() - deleted_at))::INTEGER AS days_since_deletion,
         (30 - EXTRACT(DAY FROM (NOW() - deleted_at))::INTEGER) AS days_remaining
       FROM properties
       WHERE landlord_id = $1
         AND deleted_at IS NOT NULL
         AND NOW() - deleted_at < INTERVAL '30 days'
       ORDER BY deleted_at DESC`,
      [landlord_id]
    );

    return res.status(200).json({
      message: 'Deleted properties retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  deleteProperty: softDeleteProperty, // backward-compat alias for existing route
  softDeleteProperty,
  restoreProperty,
  getDeletedProperties,
};
