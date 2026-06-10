// controllers/lease.controller.js
const pool = require('../config/db');

const createLease = async (req, res, next) => {
  try {
    const { tenant_id, room_id, start_date, end_date, rent_amount, due_day } = req.body;
    const landlord_id = req.user.user_id;

    if (!tenant_id || !room_id || !start_date || !end_date || !rent_amount) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    const connection = await pool.getConnection();

    // Verify room belongs to landlord's property
    const [rooms] = await connection.query(
      'SELECT r.*, p.landlord_id FROM rooms r JOIN properties p ON r.property_id = p.property_id WHERE r.room_id = ?',
      [room_id]
    );

    if (rooms.length === 0 || rooms[0].landlord_id !== landlord_id) {
      connection.release();
      return res.status(404).json({ error: 'Room not found' });
    }

    // Create lease
    const [result] = await connection.query(
      'INSERT INTO leases (tenant_id, room_id, landlord_id, start_date, end_date, rent_amount, due_day) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tenant_id, room_id, landlord_id, start_date, end_date, rent_amount, due_day || 5]
    );

    // Update room occupancy
    await connection.query('UPDATE rooms SET is_occupied = 1 WHERE room_id = ?', [room_id]);

    connection.release();

    return res.status(201).json({
      message: 'Lease created successfully',
      data: {
        lease_id: result.insertId,
        tenant_id,
        room_id,
        start_date,
        end_date,
        rent_amount,
        due_day: due_day || 5,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getLeasesByLandlord = async (req, res, next) => {
  try {
    const landlord_id = req.user.user_id;

    const connection = await pool.getConnection();
    const [leases] = await connection.query(
      `SELECT l.*, u.full_name as tenant_name, u.email as tenant_email, r.room_number, p.property_name
       FROM leases l
       JOIN users u ON l.tenant_id = u.user_id
       JOIN rooms r ON l.room_id = r.room_id
       JOIN properties p ON r.property_id = p.property_id
       WHERE l.landlord_id = ?
       ORDER BY l.created_at DESC`,
      [landlord_id]
    );
    connection.release();

    return res.status(200).json({
      message: 'Leases retrieved successfully',
      data: leases,
    });
  } catch (error) {
    next(error);
  }
};

const getLeasesByTenant = async (req, res, next) => {
  try {
    const tenant_id = req.user.user_id;

    const connection = await pool.getConnection();
    const [leases] = await connection.query(
      `SELECT l.*, u.full_name as landlord_name, u.email as landlord_email, r.room_number, r.monthly_rent, p.property_name
       FROM leases l
       JOIN users u ON l.landlord_id = u.user_id
       JOIN rooms r ON l.room_id = r.room_id
       JOIN properties p ON r.property_id = p.property_id
       WHERE l.tenant_id = ?
       ORDER BY l.created_at DESC`,
      [tenant_id]
    );
    connection.release();

    return res.status(200).json({
      message: 'Leases retrieved successfully',
      data: leases,
    });
  } catch (error) {
    next(error);
  }
};

const getLeaseById = async (req, res, next) => {
  try {
    const { lease_id } = req.params;

    const connection = await pool.getConnection();
    const [leases] = await connection.query(
      `SELECT l.*, u.full_name as landlord_name, u.email as landlord_email, t.full_name as tenant_name, t.email as tenant_email, r.room_number, p.property_name
       FROM leases l
       JOIN users u ON l.landlord_id = u.user_id
       JOIN users t ON l.tenant_id = t.user_id
       JOIN rooms r ON l.room_id = r.room_id
       JOIN properties p ON r.property_id = p.property_id
       WHERE l.lease_id = ?`,
      [lease_id]
    );
    connection.release();

    if (leases.length === 0) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    const lease = leases[0];
    if (lease.landlord_id !== req.user.user_id && lease.tenant_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    return res.status(200).json({
      message: 'Lease retrieved successfully',
      data: lease,
    });
  } catch (error) {
    next(error);
  }
};

const updateLease = async (req, res, next) => {
  try {
    const { lease_id } = req.params;
    const { start_date, end_date, rent_amount, due_day, lease_status } = req.body;

    const connection = await pool.getConnection();
    const [leases] = await connection.query('SELECT * FROM leases WHERE lease_id = ?', [lease_id]);

    if (leases.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Lease not found' });
    }

    const lease = leases[0];
    if (lease.landlord_id !== req.user.user_id && req.user.role !== 'admin') {
      connection.release();
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await connection.query(
      'UPDATE leases SET start_date = ?, end_date = ?, rent_amount = ?, due_day = ?, lease_status = ? WHERE lease_id = ?',
      [
        start_date || lease.start_date,
        end_date || lease.end_date,
        rent_amount || lease.rent_amount,
        due_day || lease.due_day,
        lease_status || lease.lease_status,
        lease_id,
      ]
    );
    connection.release();

    return res.status(200).json({
      message: 'Lease updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

const terminateLease = async (req, res, next) => {
  try {
    const { lease_id } = req.params;

    const connection = await pool.getConnection();
    const [leases] = await connection.query('SELECT * FROM leases WHERE lease_id = ?', [lease_id]);

    if (leases.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Lease not found' });
    }

    const lease = leases[0];
    if (lease.landlord_id !== req.user.user_id && req.user.role !== 'admin') {
      connection.release();
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await connection.query('UPDATE leases SET lease_status = ? WHERE lease_id = ?', [
      'terminated',
      lease_id,
    ]);

    // Update room occupancy
    await connection.query('UPDATE rooms SET is_occupied = 0 WHERE room_id = ?', [lease.room_id]);
    connection.release();

    return res.status(200).json({
      message: 'Lease terminated successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLease,
  getLeasesByLandlord,
  getLeasesByTenant,
  getLeaseById,
  updateLease,
  terminateLease,
};
