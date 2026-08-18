import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { productStorage } from './server/storage';
import {
  createSessionToken,
  verifySessionToken,
  validateOwnerCredentials,
  requireOwnerAuth,
  AuthenticatedRequest,
} from './server/auth';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Global Middlewares
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // --- API Routes ---

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 1. Auth: Owner Login
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
      }

      const isValid = validateOwnerCredentials(email, password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials. Please verify your email and password.',
        });
      }

      const token = createSessionToken(email, 'owner');
      return res.json({
        success: true,
        token,
        user: {
          email: email.toLowerCase().trim(),
          role: 'owner',
          name: 'Kitchen Owner',
        },
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({
        success: false,
        error: 'An internal error occurred during authentication.',
      });
    }
  });

  // 2. Auth: Verify Session
  app.get('/api/auth/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifySessionToken(token);

    if (!payload) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session token' });
    }

    return res.json({
      success: true,
      user: {
        email: payload.email,
        role: payload.role,
        name: 'Kitchen Owner',
      },
    });
  });

  // 3. Auth: Logout
  app.post('/api/auth/logout', (req, res) => {
    return res.json({ success: true, message: 'Logged out successfully' });
  });

  // =====================
  // PRODUCTS ENDPOINTS
  // =====================

  // 4. Products: List All (Optional: ?outletId=... & ?includeInactive=true)
  app.get('/api/products', (req, res) => {
    try {
      const includeInactiveParam = req.query.includeInactive === 'true';
      const outletId = typeof req.query.outletId === 'string' ? req.query.outletId : undefined;
      let includeInactive = false;

      if (includeInactiveParam) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1];
          const payload = verifySessionToken(token);
          if (payload) {
            includeInactive = true;
          }
        }
      }

      const products = productStorage.getAllProducts(includeInactive, outletId);
      return res.json({ success: true, products, count: products.length });
    } catch (err: any) {
      console.error('Fetch products error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch products' });
    }
  });

  // 5. Products: Single Item by ID or Slug
  app.get('/api/products/:idOrSlug', (req, res) => {
    try {
      const { idOrSlug } = req.params;
      let product = productStorage.getProductById(idOrSlug);
      if (!product) {
        product = productStorage.getProductBySlug(idOrSlug);
      }

      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      return res.json({ success: true, product });
    } catch (err: any) {
      console.error('Fetch product detail error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch product' });
    }
  });

  // 6. Products: Create (Protected)
  app.post('/api/products', requireOwnerAuth, (req: AuthenticatedRequest, res) => {
    try {
      const product = productStorage.createProduct(req.body);
      return res.status(201).json({ success: true, product });
    } catch (err: any) {
      console.error('Create product error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to create product. Please check form values.',
      });
    }
  });

  // 7. Products: Update (Protected)
  app.put('/api/products/:id', requireOwnerAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updated = productStorage.updateProduct(id, req.body);

      if (!updated) {
        return res.status(404).json({ success: false, error: 'Product not found for update' });
      }

      return res.json({ success: true, product: updated });
    } catch (err: any) {
      console.error('Update product error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to update product',
      });
    }
  });

  // 8. Products: Delete (Protected)
  app.delete('/api/products/:id', requireOwnerAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const deleted = productStorage.deleteProduct(id);

      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Product not found to delete' });
      }

      return res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err: any) {
      console.error('Delete product error:', err);
      return res.status(500).json({ success: false, error: 'Failed to delete product' });
    }
  });

  // 9. Products: Quick Toggle Active Status (Protected)
  app.patch('/api/products/:id/toggle-active', requireOwnerAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updated = productStorage.toggleProductActive(id);

      if (!updated) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      return res.json({ success: true, product: updated });
    } catch (err: any) {
      console.error('Toggle active error:', err);
      return res.status(500).json({ success: false, error: 'Failed to toggle product status' });
    }
  });

  // 10. Products: Quick Toggle Stock Status (Protected)
  app.patch('/api/products/:id/toggle-stock', requireOwnerAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updated = productStorage.toggleProductStock(id);

      if (!updated) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      return res.json({ success: true, product: updated });
    } catch (err: any) {
      console.error('Toggle stock error:', err);
      return res.status(500).json({ success: false, error: 'Failed to toggle stock status' });
    }
  });

  // =====================
  // OUTLETS ENDPOINTS
  // =====================

  // 11. Outlets: List All (Optional ?includeInactive=true)
  app.get('/api/outlets', (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const outlets = productStorage.getAllOutlets(includeInactive);
      return res.json({ success: true, outlets });
    } catch (err: any) {
      console.error('Fetch outlets error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch outlets' });
    }
  });

  // 12. Outlets: Single by ID
  app.get('/api/outlets/:id', (req, res) => {
    try {
      const outlet = productStorage.getOutletById(req.params.id);
      if (!outlet) {
        return res.status(404).json({ success: false, error: 'Outlet not found' });
      }
      return res.json({ success: true, outlet });
    } catch (err: any) {
      console.error('Fetch outlet error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch outlet' });
    }
  });

  // 13. Outlets: Create (Protected)
  app.post('/api/outlets', requireOwnerAuth, (req: AuthenticatedRequest, res) => {
    try {
      const outlet = productStorage.createOutlet(req.body);
      return res.status(201).json({ success: true, outlet });
    } catch (err: any) {
      console.error('Create outlet error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to create outlet. Please check form values.',
      });
    }
  });

  // 14. Outlets: Update (Protected)
  app.put('/api/outlets/:id', requireOwnerAuth, (req: AuthenticatedRequest, res) => {
    try {
      const updated = productStorage.updateOutlet(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Outlet not found for update' });
      }
      return res.json({ success: true, outlet: updated });
    } catch (err: any) {
      console.error('Update outlet error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to update outlet',
      });
    }
  });

  // 15. Outlets: Toggle Active Status (Protected)
  app.patch('/api/outlets/:id/toggle-active', requireOwnerAuth, (req: AuthenticatedRequest, res) => {
    try {
      const updated = productStorage.toggleOutletActive(req.params.id);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Outlet not found' });
      }
      return res.json({ success: true, outlet: updated });
    } catch (err: any) {
      console.error('Toggle outlet active error:', err);
      return res.status(500).json({ success: false, error: 'Failed to toggle outlet active state' });
    }
  });

  // 15b. Outlets: Delete (Protected)
  app.delete('/api/outlets/:id', requireOwnerAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const deleted = productStorage.deleteOutlet(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Outlet not found to delete' });
      }
      return res.json({ success: true, message: 'Outlet deleted successfully' });
    } catch (err: any) {
      console.error('Delete outlet error:', err);
      return res.status(500).json({ success: false, error: 'Failed to delete outlet' });
    }
  });

  // 15c. Outlets: Update Single Product Config for Outlet (Protected)
  app.patch('/api/outlets/:id/products/:productId', requireOwnerAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { id: outletId, productId } = req.params;
      const updated = productStorage.updateOutletProductConfig(outletId, productId, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Product or Outlet not found' });
      }
      return res.json({ success: true, product: updated });
    } catch (err: any) {
      console.error('Update outlet product error:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to update product for outlet' });
    }
  });

  // 15d. Outlets: Batch Update Products for Outlet (Protected)
  app.put('/api/outlets/:id/products', requireOwnerAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { id: outletId } = req.params;
      const { updates } = req.body;
      if (!Array.isArray(updates)) {
        return res.status(400).json({ success: false, error: 'updates array is required' });
      }
      const products = productStorage.batchUpdateOutletProducts(outletId, updates);
      return res.json({ success: true, products });
    } catch (err: any) {
      console.error('Batch update outlet products error:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to batch update outlet products' });
    }
  });

  // =====================
  // DELIVERY ZONES ENDPOINTS
  // =====================

  // 16. Delivery Zones: List All (Optional ?includeInactive=true)
  app.get('/api/delivery-zones', (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const zones = productStorage.getAllZones(includeInactive);
      return res.json({ success: true, zones });
    } catch (err: any) {
      console.error('Fetch delivery zones error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch delivery zones' });
    }
  });

  // 17. Delivery Zones: PIN Code Availability Check (Customer & Cart)
  app.get('/api/delivery-zones/check/:pinCode', (req, res) => {
    try {
      const pinCode = req.params.pinCode.trim();
      if (!/^\d{6}$/.test(pinCode)) {
        return res.status(400).json({
          success: false,
          available: false,
          error: 'Please enter a valid 6-digit Indian PIN code',
        });
      }

      const zone = productStorage.getDeliveryZoneByPinCode(pinCode);
      if (!zone) {
        return res.json({
          success: true,
          available: false,
          error: `Delivery is currently not available for PIN code ${pinCode}. We are expanding to new areas soon!`,
        });
      }

      const outlet = productStorage.getOutletById(zone.outletId);
      if (!outlet || !outlet.isActive) {
        return res.json({
          success: true,
          available: false,
          error: `Our kitchen outlet serving PIN code ${pinCode} is temporarily offline.`,
        });
      }

      return res.json({
        success: true,
        available: true,
        pinCode,
        outlet,
        zone: {
          id: zone.id,
          outletId: zone.outletId,
          deliveryFee: zone.deliveryFee,
          minimumOrderValue: zone.minimumOrderValue,
        },
      });
    } catch (err: any) {
      console.error('Check PIN code error:', err);
      return res.status(500).json({ success: false, error: 'Failed to check delivery availability' });
    }
  });

  // 18. Delivery Zones: Create (Protected)
  app.post('/api/delivery-zones', requireOwnerAuth, (req: AuthenticatedRequest, res) => {
    try {
      const zone = productStorage.createZone(req.body);
      return res.status(201).json({ success: true, zone });
    } catch (err: any) {
      console.error('Create delivery zone error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to create delivery zone',
      });
    }
  });

  // 19. Delivery Zones: Update (Protected)
  app.put('/api/delivery-zones/:id', requireOwnerAuth, (req: AuthenticatedRequest, res) => {
    try {
      const updated = productStorage.updateZone(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Delivery zone not found for update' });
      }
      return res.json({ success: true, zone: updated });
    } catch (err: any) {
      console.error('Update delivery zone error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to update delivery zone',
      });
    }
  });

  // 20. Delivery Zones: Toggle Active Status (Protected)
  app.patch('/api/delivery-zones/:id/toggle-active', requireOwnerAuth, (req: AuthenticatedRequest, res) => {
    try {
      const updated = productStorage.toggleZoneActive(req.params.id);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Delivery zone not found' });
      }
      return res.json({ success: true, zone: updated });
    } catch (err: any) {
      console.error('Toggle delivery zone active error:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to toggle delivery zone state' });
    }
  });

  // 21. Delivery Zones: Delete (Protected)
  app.delete('/api/delivery-zones/:id', requireOwnerAuth, (req: AuthenticatedRequest, res) => {
    try {
      const deleted = productStorage.deleteZone(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Delivery zone not found to delete' });
      }
      return res.json({ success: true, message: 'Delivery zone deleted successfully' });
    } catch (err: any) {
      console.error('Delete delivery zone error:', err);
      return res.status(500).json({ success: false, error: 'Failed to delete delivery zone' });
    }
  });

  // =====================
  // ORDERS ENDPOINTS
  // =====================

  // 21. Orders: Create Order
  app.post('/api/orders', (req, res) => {
    try {
      const order = productStorage.createOrder(req.body);
      return res.status(201).json({ success: true, order });
    } catch (err: any) {
      console.error('Create order error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to place order. Please check order details.',
      });
    }
  });

  // 22. Orders: Get Single Order
  app.get('/api/orders/:orderId', (req, res) => {
    try {
      const order = productStorage.getOrderById(req.params.orderId);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      return res.json({ success: true, order });
    } catch (err: any) {
      console.error('Fetch order error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch order' });
    }
  });

  // 23. Orders: List All (Protected)
  app.get('/api/orders', requireOwnerAuth, (req: AuthenticatedRequest, res) => {
    try {
      const orders = productStorage.getAllOrders();
      return res.json({ success: true, orders, count: orders.length });
    } catch (err: any) {
      console.error('Fetch orders error:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve orders' });
    }
  });

  // =====================
  // STATS ENDPOINTS
  // =====================

  // 24. Owner Dashboard Stats (Protected)
  app.get('/api/stats', requireOwnerAuth, (req: AuthenticatedRequest, res) => {
    try {
      const stats = productStorage.getStats();
      return res.json({ success: true, stats });
    } catch (err: any) {
      console.error('Dashboard stats error:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve stats' });
    }
  });

  // --- Vite Dev Middleware or Static Production Serving ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gaon Ka Swad server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
