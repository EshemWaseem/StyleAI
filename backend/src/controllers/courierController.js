// backend/src/controllers/courierController.js
const prisma = require('../config/prisma');

const COURIER_STATUS_MAP = {
  "booked": "PROCESSING",
  "picked": "PROCESSING",
  "in_transit": "SHIPPED",
  "out_for_delivery": "SHIPPED",
  "delivered": "DELIVERED",
  "returned": "CANCELLED",
  "cancelled": "CANCELLED"
};

async function handleCourierWebhook(req, res, next) {
  try {
    const { trackingNumber, status, remarks } = req.body;
    
    // Security Check
    const authHeader = req.headers['x-courier-secret'];
    if (process.env.COURIER_WEBHOOK_SECRET && authHeader !== process.env.COURIER_WEBHOOK_SECRET) {
      return res.status(401).json({ message: 'Unauthorized webhook' });
    }

    if (!trackingNumber || !status) {
      return res.status(400).json({ message: 'trackingNumber and status are required' });
    }

    const normalizedStatus = COURIER_STATUS_MAP[status.toLowerCase()];
    if (!normalizedStatus) {
       return res.status(400).json({ message: `Unknown status: ${status}` });
    }

    const order = await prisma.order.findFirst({
      where: { trackingNumber: trackingNumber }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found for this tracking number' });
    }

    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
       return res.json({ message: 'Order already finalized', status: order.status });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: normalizedStatus,
        updatedAt: new Date(),
      }
    });

    console.log(`[Courier Webhook] Order ${order.id} updated to ${normalizedStatus}`);
    res.json({ success: true, orderId: order.id, newStatus: normalizedStatus });

  } catch (err) {
    next(err);
  }
}

module.exports = { handleCourierWebhook };