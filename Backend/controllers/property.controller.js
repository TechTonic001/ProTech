// controllers/property.controller.js
const pool = require('../config/db');

const createProperty = async (req, res, next) => {
  try {
    const { property_name, address, city, total_rooms } = req.body;
    const landlord_id = req.user.user_id;

    if (!property_name || !address) {
      return res.status(400).json({ error: 'Property name and address are required' });
    }

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO properties (landlord_id, property_name, address, city, total_rooms) VALUES (?, ?, ?, ?, ?)',
      [landlord_id, property_name, address, city || 'Ogbomoso', total_rooms || 0]
    );
    connection.release();

    return res.status(201).json({
      message: 'Property created successfully',
      data: {
        property_id: result.insertId,
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

    const connection = await pool.getConnection();
    const [properties] = await connection.query(
      'SELECT * FROM properties WHERE landlord_id = ? ORDER BY created_at DESC',
      [landlord_id]
    );
    connection.release();

    return res.status(200).json({
      message: 'Properties retrieved successfully',
      data: properties,
    });
  } catch (error) {
    next(error);
  }
};

const getPropertyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const landlord_id = req.user.user_id;

    const connection = await pool.getConnection();
    const [properties] = await connection.query(
      'SELECT * FROM properties WHERE property_id = ? AND landlord_id = ?',
      [id, landlord_id]
    );
    connection.release();

    if (properties.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    return res.status(200).json({
      message: 'Property retrieved successfully',
      data: properties[0],
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

    const connection = await pool.getConnection();
    const [properties] = await connection.query(
      'SELECT * FROM properties WHERE property_id = ? AND landlord_id = ?',
      [id, landlord_id]
    );

    if (properties.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Property not found' });
    }

    await connection.query(
      'UPDATE properties SET property_name = ?, address = ?, city = ?, total_rooms = ? WHERE property_id = ?',
      [property_name || properties[0].property_name, address || properties[0].address, city || properties[0].city, total_rooms || properties[0].total_rooms, id]
    );
    connection.release();

    return res.status(200).json({
      message: 'Property updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

const deleteProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const landlord_id = req.user.user_id;

    const connection = await pool.getConnection();
    const [properties] = await connection.query(
      'SELECT * FROM properties WHERE property_id = ? AND landlord_id = ?',
      [id, landlord_id]
    );

    if (properties.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Property not found' });
    }

    await connection.query('DELETE FROM properties WHERE property_id = ?', [id]);
    connection.release();

    return res.status(200).json({
      message: 'Property deleted successfully',
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
  deleteProperty,
};
