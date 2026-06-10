// controllers/room.controller.js
const pool = require('../config/db');

const createRoom = async (req, res, next) => {
  try {
    const { property_id, room_number, room_type, monthly_rent } = req.body;

    if (!property_id || !room_number || !monthly_rent) {
      return res.status(400).json({ error: 'Property ID, room number, and monthly rent are required' });
    }

    const connection = await pool.getConnection();

    // Verify property belongs to landlord
    const [properties] = await connection.query(
      'SELECT * FROM properties WHERE property_id = ? AND landlord_id = ?',
      [property_id, req.user.user_id]
    );

    if (properties.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Property not found' });
    }

    const [result] = await connection.query(
      'INSERT INTO rooms (property_id, room_number, room_type, monthly_rent) VALUES (?, ?, ?, ?)',
      [property_id, room_number, room_type || 'Single', monthly_rent]
    );
    connection.release();

    return res.status(201).json({
      message: 'Room created successfully',
      data: {
        room_id: result.insertId,
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

    const connection = await pool.getConnection();

    // Verify property belongs to landlord
    const [properties] = await connection.query(
      'SELECT * FROM properties WHERE property_id = ? AND landlord_id = ?',
      [property_id, req.user.user_id]
    );

    if (properties.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Property not found' });
    }

    const [rooms] = await connection.query(
      'SELECT * FROM rooms WHERE property_id = ? ORDER BY room_number ASC',
      [property_id]
    );
    connection.release();

    return res.status(200).json({
      message: 'Rooms retrieved successfully',
      data: rooms,
    });
  } catch (error) {
    next(error);
  }
};

const getRoomById = async (req, res, next) => {
  try {
    const { room_id } = req.params;

    const connection = await pool.getConnection();
    const [rooms] = await connection.query(
      'SELECT r.*, p.landlord_id FROM rooms r JOIN properties p ON r.property_id = p.property_id WHERE r.room_id = ?',
      [room_id]
    );
    connection.release();

    if (rooms.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Verify ownership
    if (rooms[0].landlord_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    return res.status(200).json({
      message: 'Room retrieved successfully',
      data: rooms[0],
    });
  } catch (error) {
    next(error);
  }
};

const updateRoom = async (req, res, next) => {
  try {
    const { room_id } = req.params;
    const { room_number, room_type, monthly_rent } = req.body;

    const connection = await pool.getConnection();
    const [rooms] = await connection.query(
      'SELECT r.*, p.landlord_id FROM rooms r JOIN properties p ON r.property_id = p.property_id WHERE r.room_id = ?',
      [room_id]
    );

    if (rooms.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Room not found' });
    }

    if (rooms[0].landlord_id !== req.user.user_id && req.user.role !== 'admin') {
      connection.release();
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await connection.query(
      'UPDATE rooms SET room_number = ?, room_type = ?, monthly_rent = ? WHERE room_id = ?',
      [room_number || rooms[0].room_number, room_type || rooms[0].room_type, monthly_rent || rooms[0].monthly_rent, room_id]
    );
    connection.release();

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

    const connection = await pool.getConnection();
    const [rooms] = await connection.query(
      'SELECT r.*, p.landlord_id FROM rooms r JOIN properties p ON r.property_id = p.property_id WHERE r.room_id = ?',
      [room_id]
    );

    if (rooms.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Room not found' });
    }

    if (rooms[0].landlord_id !== req.user.user_id && req.user.role !== 'admin') {
      connection.release();
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await connection.query('DELETE FROM rooms WHERE room_id = ?', [room_id]);
    connection.release();

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
