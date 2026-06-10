// controllers/approval.controller.js
const pool = require('../config/db');
const { sendApprovalEmail } = require('../utils/email');
const { sendPushNotification } = require('../utils/push');

const requestApproval = async (req, res, next) => {
  try {
    const { landlord_id, property_id } = req.body;
    const tenant_id = req.user.user_id;

    if (!landlord_id || !property_id) {
      return res.status(400).json({ error: 'Landlord ID and property ID are required' });
    }

    const connection = await pool.getConnection();

    // Check if approval already exists
    const [existingApprovals] = await connection.query(
      'SELECT * FROM tenant_approvals WHERE tenant_id = ? AND property_id = ? AND status = ?',
      [tenant_id, property_id, 'pending']
    );

    if (existingApprovals.length > 0) {
      connection.release();
      return res.status(400).json({ error: 'Approval request already exists' });
    }

    // Create approval request
    const [result] = await connection.query(
      'INSERT INTO tenant_approvals (tenant_id, landlord_id, property_id, status) VALUES (?, ?, ?, ?)',
      [tenant_id, landlord_id, property_id, 'pending']
    );

    connection.release();

    return res.status(201).json({
      message: 'Approval request submitted',
      data: {
        approval_id: result.insertId,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getPendingApprovals = async (req, res, next) => {
  try {
    const landlord_id = req.user.user_id;

    const connection = await pool.getConnection();
    const [approvals] = await connection.query(
      `SELECT ta.*, u.username, u.full_name, u.email, u.phone_number, p.property_name, r.room_number
       FROM tenant_approvals ta
       JOIN users u ON ta.tenant_id = u.user_id
       JOIN properties p ON ta.property_id = p.property_id
       LEFT JOIN rooms r ON p.property_id = r.property_id
       WHERE ta.landlord_id = ? AND ta.status = 'pending'
       ORDER BY ta.created_at DESC`,
      [landlord_id]
    );
    connection.release();

    return res.status(200).json({
      message: 'Pending approvals retrieved successfully',
      data: approvals,
    });
  } catch (error) {
    next(error);
  }
};

const processApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status (approved or rejected) is required' });
    }

    const connection = await pool.getConnection();

    // Get approval details
    const [approvals] = await connection.query(
      `SELECT ta.*, u.email, u.full_name FROM tenant_approvals ta
       JOIN users u ON ta.tenant_id = u.user_id
       WHERE ta.approval_id = ? AND ta.landlord_id = ?`,
      [id, req.user.user_id]
    );

    if (approvals.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Approval request not found' });
    }

    const approval = approvals[0];

    // Update approval status
    await connection.query(
      'UPDATE tenant_approvals SET status = ?, approved_at = NOW() WHERE approval_id = ?',
      [status, id]
    );

    // If approved, update user's is_approved status
    if (status === 'approved') {
      await connection.query('UPDATE users SET is_approved = 1 WHERE user_id = ?', [
        approval.tenant_id,
      ]);
    }

    connection.release();

    // Send approval email
    const [properties] = await pool.query(
      'SELECT property_name FROM properties WHERE property_id = ?',
      [approval.property_id]
    );

    const propertyName = properties.length > 0 ? properties[0].property_name : 'Your Property';

    await sendApprovalEmail(approval.email, approval.full_name, status === 'approved', propertyName);

    // Send push notification
    const message =
      status === 'approved'
        ? 'Your account has been approved!'
        : 'Your account request was not approved.';
    await sendPushNotification(approval.tenant_id, 'Account Status Update', message);

    return res.status(200).json({
      message: 'Approval processed successfully',
      data: {
        status,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestApproval,
  getPendingApprovals,
  processApproval,
};
