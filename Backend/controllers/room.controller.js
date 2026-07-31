// controllers/room.controller.js
const pool = require('../config/db');
const { asyncHandler } = require('../utils/asyncHandler');

const createRoom = asyncHandler(async (req, res) => {
  const { property_id, room_number, room_type, yearly_rent, payment_frequency } = req.body;
  const rentAmount = yearly_rent ?? req.body.monthly_rent;
  const allowedFrequencies = ['monthly', 'annually'];

  if (!property_id || !room_number || typeof rentAmount === 'undefined') {
    return res.status(400).json({ error: 'Property ID, room number, and yearly rent are required' });
  }

  if (payment_frequency && !allowedFrequencies.includes(payment_frequency)) {
    return res.status(400).json({ error: 'payment_frequency must be monthly or annually' });
  }

  const propertiesResult = await pool.query(
    'SELECT property_id FROM properties WHERE property_id = $1 AND landlord_id = $2',
    [property_id, req.user.user_id]
  );

  if (propertiesResult.rows.length === 0) {
    return res.status(404).json({ error: 'Property not found' });
  }

  const result = await pool.query(
    'INSERT INTO rooms (property_id, room_number, room_type, monthly_rent, payment_frequency) VALUES ($1, $2, $3, $4, COALESCE($5, $6)) RETURNING room_id',
    [property_id, room_number, room_type || 'Single', rentAmount, payment_frequency, 'monthly']
  );

  return res.status(201).json({
    message: 'Room created successfully',
    data: {
      room_id: result.rows[0].room_id,
      room_number,
      room_type: room_type || 'Single',
      yearly_rent: rentAmount,
      monthly_rent: rentAmount,
      payment_frequency: payment_frequency || 'monthly',
    },
  });
});

const getAllRoomsWithLeases = asyncHandler(async (req, res) => {
  const landlordId = req.user.user_id;

  const result = await pool.query(
    `SELECT
      r.room_id,
      r.room_number,
      r.room_type,
      r.monthly_rent,
      r.is_occupied,
      r.payment_frequency,
      r.deleted_at,
      p.property_id,
      p.property_name,
      l.lease_id,
      TO_CHAR(l.end_date,   'YYYY-MM-DD') AS due_date,
      l.rent_amount,
      COALESCE(l.amount_paid_this_cycle,0) AS amount_paid_this_cycle,
      TO_CHAR(l.start_date, 'YYYY-MM-DD') AS start_date,
      TO_CHAR(l.end_date,   'YYYY-MM-DD') AS end_date,
      l.payment_frequency AS lease_frequency,
      u.full_name AS tenant_name,
      u.username  AS tenant_username,
      u.email     AS tenant_email
    FROM rooms r
    JOIN properties p ON r.property_id = p.property_id
    LEFT JOIN LATERAL (
      SELECT *
      FROM leases l
      WHERE l.room_id = r.room_id
        AND l.lease_status = 'active'
      ORDER BY l.start_date DESC, l.lease_id DESC
      LIMIT 1
    ) l ON TRUE
    LEFT JOIN users u ON l.tenant_id = u.user_id
      AND u.deleted_at IS NULL
    WHERE p.landlord_id = $1
      AND r.deleted_at IS NULL
      AND p.deleted_at IS NULL
    ORDER BY
      p.property_name ASC,
      COALESCE(NULLIF(regexp_replace(r.room_number, '\\D', '', 'g'), ''), '0')::int ASC,
      r.room_id ASC`,
    [landlordId]
  );

  return res.status(200).json(result.rows);
});

const getRoomsByProperty = asyncHandler(async (req, res) => {
  const { property_id } = req.params;

  const propertiesResult = await pool.query(
    'SELECT property_id FROM properties WHERE property_id = $1 AND landlord_id = $2',
    [property_id, req.user.user_id]
  );

  if (propertiesResult.rows.length === 0) {
    return res.status(404).json({ error: 'Property not found' });
  }

  const roomsResult = await pool.query(
    `SELECT room_id, property_id, room_number, room_type,
            monthly_rent AS yearly_rent, monthly_rent,
            payment_frequency, is_occupied,
            TO_CHAR(created_at AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') AS created_at,
            TO_CHAR(updated_at AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') AS updated_at
     FROM rooms
     WHERE property_id = $1 AND deleted_at IS NULL
     ORDER BY COALESCE(NULLIF(regexp_replace(room_number, '\\D', '', 'g'), ''), '0')::int ASC, room_id ASC`,
    [property_id]
  );

  return res.status(200).json({
    message: 'Rooms retrieved successfully',
    data: roomsResult.rows,
  });
});

const getRoomById = asyncHandler(async (req, res) => {
  const { room_id } = req.params;

  const roomsResult = await pool.query(
    `SELECT r.room_id, r.property_id, r.room_number, r.room_type,
            r.monthly_rent AS yearly_rent, r.monthly_rent,
            r.payment_frequency, r.is_occupied,
            TO_CHAR(r.created_at AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') AS created_at,
            TO_CHAR(r.updated_at AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') AS updated_at,
            p.landlord_id
     FROM rooms r
     JOIN properties p ON r.property_id = p.property_id
     WHERE r.room_id = $1`,
    [room_id]
  );

  if (roomsResult.rows.length === 0) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (roomsResult.rows[0].landlord_id !== req.user.user_id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  return res.status(200).json({
    message: 'Room retrieved successfully',
    data: roomsResult.rows[0],
  });
});

const updateRoom = asyncHandler(async (req, res) => {
  const { room_id } = req.params;
  const { room_number, room_type, monthly_rent, payment_frequency } = req.body;

  const allowedFrequencies = ['monthly', 'annually'];
  if (payment_frequency && !allowedFrequencies.includes(payment_frequency)) {
    return res.status(400).json({ error: 'payment_frequency must be monthly or annually' });
  }

  const check = await pool.query(
    `SELECT r.room_id, r.room_number, r.room_type, r.monthly_rent, p.landlord_id
     FROM rooms r
     JOIN properties p ON r.property_id = p.property_id
     WHERE r.room_id = $1
       AND p.landlord_id = $2
       AND r.deleted_at IS NULL`,
    [room_id, req.user.user_id]
  );

  if (check.rows.length === 0) {
    return res.status(403).json({
      error: 'Room not found or access denied.',
    });
  }

  const updated = await pool.query(
    `UPDATE rooms
     SET room_number       = COALESCE($1, room_number),
         room_type         = COALESCE($2, room_type),
         monthly_rent      = COALESCE($3, monthly_rent),
         payment_frequency = COALESCE($4, payment_frequency)
     WHERE room_id = $5
     RETURNING room_id, property_id, room_number, room_type, monthly_rent, payment_frequency, is_occupied`,
    [room_number, room_type, monthly_rent, payment_frequency, room_id]
  );

  return res.status(200).json({
    message: 'Room updated successfully',
    data: updated.rows[0],
  });
});

const bulkUpdateRooms = asyncHandler(async (req, res) => {
  const { property_id, yearly_rent } = req.body;
  const rentAmount = yearly_rent ?? req.body.monthly_rent;
  const landlordId = req.user.user_id;

  if (!property_id || typeof rentAmount === 'undefined') {
    return res.status(400).json({ error: 'Property ID and yearly rent are required' });
  }

  const propertyResult = await pool.query(
    'SELECT property_id FROM properties WHERE property_id = $1 AND landlord_id = $2 AND deleted_at IS NULL',
    [property_id, landlordId]
  );

  if (propertyResult.rows.length === 0) {
    return res.status(404).json({ error: 'Property not found' });
  }

  const result = await pool.query(
    'UPDATE rooms SET monthly_rent = $1 WHERE property_id = $2',
    [rentAmount, property_id]
  );

  return res.status(200).json({
    message: 'Room rents updated successfully',
    updated: result.rowCount,
  });
});

const deleteRoom = asyncHandler(async (req, res) => {
  const { room_id } = req.params;

  const roomsResult = await pool.query(
    'SELECT r.room_id, p.landlord_id FROM rooms r JOIN properties p ON r.property_id = p.property_id WHERE r.room_id = $1',
    [room_id]
  );

  if (roomsResult.rows.length === 0) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (roomsResult.rows[0].landlord_id !== req.user.user_id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  await pool.query('DELETE FROM rooms WHERE room_id = $1', [room_id]);

  return res.status(200).json({
    message: 'Room deleted successfully',
  });
});

module.exports = {
  createRoom,
  getAllRoomsWithLeases,
  getRoomsByProperty,
  getRoomById,
  updateRoom,
  bulkUpdateRooms,
  deleteRoom,
};
