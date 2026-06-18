// controllers/room.controller.js
const pool = require('../config/db');

const createRoom = async (req, res, next) => {
  try {
    const { property_id, room_number, room_type, monthly_rent } = req.body;

    if (!property_id || !room_number || !monthly_rent) {
      return res.status(400).json({ error: 'Property ID, room number, and monthly rent are required' });
    }

    // Verify property belongs to landlord
    const propertiesResult = await pool.query(
      'SELECT * FROM properties WHERE property_id = $1 AND landlord_id = $2',
      [property_id, req.user.user_id]
    );

    if (propertiesResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const result = await pool.query(
      'INSERT INTO rooms (property_id, room_number, room_type, monthly_rent) VALUES ($1, $2, $3, $4) RETURNING room_id',
      [property_id, room_number, room_type || 'Single', monthly_rent]
    );

    return res.status(201).json({
      message: 'Room created successfully',
      data: {
        room_id: result.rows[0].room_id,
        room_number,
        room_type: room_type || 'Single',
        monthly_rent,
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
      'SELECT * FROM properties WHERE property_id = $1 AND landlord_id = $2',
      [property_id, req.user.user_id]
    );

    if (propertiesResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const roomsResult = await pool.query(
      'SELECT * FROM rooms WHERE property_id = $1 ORDER BY room_number ASC',
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
      'SELECT r.*, p.landlord_id FROM rooms r JOIN properties p ON r.property_id = p.property_id WHERE r.room_id = $1',
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
    const { room_number, room_type, monthly_rent } = req.body;

    const roomsResult = await pool.query(
      'SELECT r.*, p.landlord_id FROM rooms r JOIN properties p ON r.property_id = p.property_id WHERE r.room_id = $1',
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
        monthly_rent || room.monthly_rent,
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

const deleteRoom = async (req, res, next) => {
  try {
    const { room_id } = req.params;

    const roomsResult = await pool.query(
      'SELECT r.*, p.landlord_id FROM rooms r JOIN properties p ON r.property_id = p.property_id WHERE r.room_id = $1',
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
  deleteRoom,
};
