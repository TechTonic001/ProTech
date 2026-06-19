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

    // Check if approval already exists
    const existingResult = await pool.query(
      'SELECT * FROM tenant_approvals WHERE tenant_id = $1 AND property_id = $2 AND status = $3',
      [tenant_id, property_id, 'pending']
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Approval request already exists' });
    }

    // Create approval request
    const result = await pool.query(
      'INSERT INTO tenant_approvals (tenant_id, landlord_id, property_id, status) VALUES ($1, $2, $3, $4) RETURNING approval_id',
      [tenant_id, landlord_id, property_id, 'pending']
    );

    return res.status(201).json({
      message: 'Approval request submitted',
      data: {
        approval_id: result.rows[0].approval_id,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getPendingApprovals = async (req, res, next) => {
  try {
    const landlord_id = req.user.user_id;

    const result = await pool.query(
      `SELECT ta.*, u.username, u.full_name, u.email, u.phone_number, p.property_name, r.room_number
       FROM tenant_approvals ta
       JOIN users u ON ta.tenant_id = u.user_id
       LEFT JOIN properties p ON ta.property_id = p.property_id
       LEFT JOIN rooms r ON p.property_id = r.property_id
       WHERE ta.landlord_id = $1 AND ta.status = 'pending'
       ORDER BY ta.created_at DESC`,
      [landlord_id]
    );

    return res.status(200).json({
      message: 'Pending approvals retrieved successfully',
      data: result.rows,
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

    // Get approval details
    const approvalsResult = await pool.query(
      `SELECT ta.*, u.email, u.full_name FROM tenant_approvals ta
       JOIN users u ON ta.tenant_id = u.user_id
       WHERE ta.approval_id = $1 AND ta.landlord_id = $2`,
      [id, req.user.user_id]
    );

    if (approvalsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    const approval = approvalsResult.rows[0];

    // Update approval status
    await pool.query(
      'UPDATE tenant_approvals SET status = $1, approved_at = NOW() WHERE approval_id = $2',
      [status, id]
    );

    // If approved, update user's is_approved status
    if (status === 'approved') {
      await pool.query('UPDATE users SET is_approved = 1 WHERE user_id = $1', [
        approval.tenant_id,
      ]);
    }

    // Send approval email
    const propertiesResult = await pool.query(
      'SELECT property_name FROM properties WHERE property_id = $1',
      [approval.property_id]
    );

    const propertyName = propertiesResult.rows.length > 0 ? propertiesResult.rows[0].property_name : 'Your Property';

    // Send approval email in background
    sendApprovalEmail(approval.email, approval.full_name, status === 'approved', propertyName)
      .catch((emailError) => console.error(`[ERROR] Failed to send approval email:`, emailError.message));

    // Send push notification in background
    const message =
      status === 'approved'
        ? 'Your account has been approved!'
        : 'Your account request was not approved.';
    sendPushNotification(approval.tenant_id, 'Account Status Update', message)
      .catch((pushError) => console.error(`[ERROR] Failed to send approval push:`, pushError.message));

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

const getApprovedApprovals = async (req, res, next) => {
  try {
    const landlord_id = req.user.user_id;
    const result = await pool.query(
      `SELECT ta.*, u.username, u.full_name, u.email, u.phone_number, p.property_name
       FROM tenant_approvals ta
       JOIN users u ON ta.tenant_id = u.user_id
       LEFT JOIN properties p ON ta.property_id = p.property_id
       WHERE ta.landlord_id = $1 AND ta.status = 'approved'
       ORDER BY ta.approved_at DESC`,
      [landlord_id]
    );
    return res.status(200).json({
      message: 'Approved tenants retrieved successfully',
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestApproval,
  getPendingApprovals,
  processApproval,
  getApprovedApprovals,
};
