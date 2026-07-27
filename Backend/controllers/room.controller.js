// controllers/room.controller.js
const pool = require('../config/db');

const createRoom = async (req, res, next) => {
  try {
    const { property_id, room_number, room_type, yearly_rent } = req.body;
    const rentAmount = yearly_rent ?? req.body.monthly_rent;

    if (!property_id || !room_number || typeof rentAmount === 'undefined') {
      return res.status(400).json({ error: 'Property ID, room number, and yearly rent are required' });
    }

    // Verify property belongs to landlord
    const propertiesResult = await pool.query(
      'SELECT property_id FROM properties WHERE property_id = $1 AND landlord_id = $2',
      [property_id, req.user.user_id]
    );

    if (propertiesResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const result = await pool.query(
      'INSERT INTO rooms (property_id, room_number, room_type, monthly_rent) VALUES ($1, $2, $3, $4) RETURNING room_id',
      [property_id, room_number, room_type || 'Single', rentAmount]
    );

    return res.status(201).json({
      message: 'Room created successfully',
      data: {
        room_id: result.rows[0].room_id,
        room_number,
        room_type: room_type || 'Single',
        yearly_rent: rentAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getRoomsByProperty = async (req, res, next) => {
  try {
    const { property_id } = req.params;

    // Verify property belongs to landlord
    const propertiesResult = await pool.query(
      'SELECT property_id FROM properties WHERE property_id = $1 AND landlord_id = $2',
      [property_id, req.user.user_id]
    );

    if (propertiesResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const roomsResult = await pool.query(
      `SELECT room_id, property_id, room_number, room_type, monthly_rent AS yearly_rent, is_occupied, created_at, updated_at
       FROM rooms
       WHERE property_id = $1
       ORDER BY COALESCE(NULLIF(regexp_replace(room_number, '\\D', '', 'g'), ''), '0')::int ASC, room_id ASC`,
      [property_id]
    );

    return res.status(200).json({
      message: 'Rooms retrieved successfully',
      data: roomsResult.rows,
    });
  } catch (error) {
    next(error);
  }
};

const getRoomById = async (req, res, next) => {
  try {
    const { room_id } = req.params;

    const roomsResult = await pool.query(
      'SELECT r.room_id, r.property_id, r.room_number, r.room_type, r.monthly_rent AS yearly_rent, r.is_occupied, r.created_at, r.updated_at, p.landlord_id FROM rooms r JOIN properties p ON r.property_id = p.property_id WHERE r.room_id = $1',
      [room_id]
    );

    if (roomsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Verify ownership
    if (roomsResult.rows[0].landlord_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    return res.status(200).json({
      message: 'Room retrieved successfully',
      data: roomsResult.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const updateRoom = async (req, res, next) => {
  try {
    const { room_id } = req.params;
    const { room_number, room_type, yearly_rent } = req.body;
    const rentAmount = yearly_rent ?? req.body.monthly_rent;

    const roomsResult = await pool.query(
      'SELECT r.room_id, r.room_number, r.room_type, r.monthly_rent AS yearly_rent, p.landlord_id FROM rooms r JOIN properties p ON r.property_id = p.property_id WHERE r.room_id = $1',
      [room_id]
    );

    if (roomsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (roomsResult.rows[0].landlord_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const room = roomsResult.rows[0];

    await pool.query(
      'UPDATE rooms SET room_number = $1, room_type = $2, monthly_rent = $3 WHERE room_id = $4',
      [
        room_number || room.room_number,
        room_type || room.room_type,
        typeof rentAmount === 'undefined' ? room.yearly_rent : rentAmount,
        room_id
      ]
    );

    return res.status(200).json({
      message: 'Room updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

const bulkUpdateRooms = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

const deleteRoom = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRoom,
  getRoomsByProperty,
  getRoomById,
  updateRoom,
  bulkUpdateRooms,
  deleteRoom,
};
