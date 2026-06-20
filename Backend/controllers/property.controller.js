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

    const propertiesResult = await pool.query(
      'SELECT property_id, landlord_id, property_name, address, city, total_rooms, created_at, updated_at FROM properties WHERE landlord_id = $1 ORDER BY created_at DESC',
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
      'SELECT property_id, landlord_id, property_name, address, city, total_rooms, created_at, updated_at FROM properties WHERE property_id = $1 AND landlord_id = $2',
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
      'SELECT property_id, property_name, address, city, total_rooms FROM properties WHERE property_id = $1 AND landlord_id = $2',
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

const deleteProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const landlord_id = req.user.user_id;

    const propertiesResult = await pool.query(
      'SELECT property_id FROM properties WHERE property_id = $1 AND landlord_id = $2',
      [id, landlord_id]
    );

    if (propertiesResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    await pool.query('DELETE FROM properties WHERE property_id = $1', [id]);

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
