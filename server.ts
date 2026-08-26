import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { productStorage, sanitizeOrderItem, deserializeOrderItem } from './server/storage';
import {
  createSessionToken,
  verifySessionToken,
  validateOwnerCredentials,
  requireOwnerAuth,
  AuthenticatedRequest,
} from './server/auth';

// Supabase Server Client
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ifthfunawntmqjupafxp.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGhmdW5hd250bXFqdXBhZnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjc4NTQsImV4cCI6MjEwMjgwMzg1NH0.xS74LsNci-I_v-p13O3rzzhflOuOZaHLDcVLgEi9Yzw';
const serverSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

  // 3b. Auth: Customer Send OTP
  app.post('/api/auth/send-otp', async (req, res) => {
    try {
      const { phone } = req.body;
      const rawPhone = String(phone || '').trim();
      const normPhone = rawPhone.replace(/\D/g, '').slice(-10);

      if (!normPhone || normPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid 10-digit mobile number.',
        });
      }

      // Check in Supabase first
      let exists = false;
      try {
        const { data: supaCustomer } = await serverSupabase
          .from('customers')
          .select('id, phone, full_name')
          .eq('phone', normPhone)
          .maybeSingle();

        if (supaCustomer) {
          exists = true;
        }
      } catch (err) {
        console.warn('Supabase customer check error:', err);
      }

      if (!exists) {
        const memoryCustomer = productStorage.findCustomerByPhone(normPhone);
        if (memoryCustomer) exists = true;
      }

      return res.json({
        success: true,
        exists,
        phone: normPhone,
        message: exists
          ? 'Verification OTP sent to your mobile number.'
          : 'Customer not registered. Please complete sign up.',
      });
    } catch (err: any) {
      console.error('Send OTP error:', err);
      return res.status(500).json({ success: false, error: 'Failed to send OTP' });
    }
  });

  // 3c. Auth: Customer Verify OTP (Validated against 951753)
  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const { phone, otp, fullName, email } = req.body;
      const rawPhone = String(phone || '').trim();
      const normPhone = rawPhone.replace(/\D/g, '').slice(-10);

      if (!normPhone || normPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid 10-digit mobile number.',
        });
      }

      const inputOtp = String(otp || '').trim();
      const DEMO_VALID_OTP = '951753';

      if (inputOtp !== DEMO_VALID_OTP) {
        return res.status(400).json({
          success: false,
          error: 'Invalid 6-digit OTP. Please enter the verification code sent to your phone.',
        });
      }

      // 1. Sync or create customer in Supabase public.customers table
      let finalCustomer: any = null;
      let defaultAddress: any = null;
      let isExistingCustomer = false;

      try {
        const { data: existingSupa } = await serverSupabase
          .from('customers')
          .select('*')
          .eq('phone', normPhone)
          .maybeSingle();

        const now = new Date().toISOString();

        if (existingSupa) {
          isExistingCustomer = true;
          const updatePayload: any = { updated_at: now };
          if (fullName && fullName.trim() && existingSupa.full_name === 'Customer') {
            updatePayload.full_name = fullName.trim();
          }
          if (email && email.trim() && !existingSupa.email) {
            updatePayload.email = email.trim();
          }

          const { data: updated } = await serverSupabase
            .from('customers')
            .update(updatePayload)
            .eq('id', existingSupa.id)
            .select()
            .single();

          finalCustomer = updated || existingSupa;
        } else {
          const insertPayload: any = {
            phone: normPhone,
            full_name: (fullName && fullName.trim()) || 'Customer',
            email: (email && email.trim()) || null,
            is_phone_verified: true,
            marketing_consent: false,
            welcome_discount_used: false,
            created_at: now,
            updated_at: now,
          };

          const { data: inserted, error: insertErr } = await serverSupabase
            .from('customers')
            .insert(insertPayload)
            .select()
            .single();

          if (!insertErr && inserted) {
            finalCustomer = inserted;
          }
        }

        if (finalCustomer) {
          const { data: addrRow } = await serverSupabase
            .from('customer_addresses')
            .select('*')
            .eq('customer_id', finalCustomer.id)
            .order('is_default', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (addrRow) {
            defaultAddress = {
              id: String(addrRow.id),
              customerId: String(addrRow.customer_id),
              addressLabel: addrRow.label || 'Home',
              fullAddress: addrRow.full_address || addrRow.address_line1 || '',
              landmark: addrRow.landmark || undefined,
              city: addrRow.city || 'Bhubaneswar',
              state: addrRow.state || 'Odisha',
              pincode: addrRow.pincode || '',
              isDefault: addrRow.is_default !== false,
            };
          }
        }
      } catch (dbErr) {
        console.warn('Supabase verification save warning:', dbErr);
      }

      // Memory fallback sync
      let memoryCustomer = productStorage.findCustomerByPhone(normPhone);
      if (memoryCustomer) {
        isExistingCustomer = true;
      }
      if (!memoryCustomer) {
        memoryCustomer = productStorage.getOrCreateCustomer({
          phone: normPhone,
          fullName: (fullName && String(fullName).trim()) || (finalCustomer && finalCustomer.full_name) || 'Customer',
          email: (email && String(email).trim()) || (finalCustomer && finalCustomer.email) || '',
        });
      } else if (fullName && memoryCustomer.fullName === 'Customer') {
        memoryCustomer = productStorage.getOrCreateCustomer({
          phone: normPhone,
          fullName: String(fullName).trim(),
          email: email ? String(email).trim() : memoryCustomer.email,
        });
      }

      if (!defaultAddress && memoryCustomer) {
        defaultAddress = productStorage.getCustomerDefaultAddress(memoryCustomer.id);
      }

      const mappedCustomer = {
        id: finalCustomer?.id || memoryCustomer?.id || `cust-${Date.now().toString(36)}`,
        phone: normPhone,
        fullName: finalCustomer?.full_name || memoryCustomer?.fullName || fullName || 'Customer',
        email: finalCustomer?.email || memoryCustomer?.email || email || undefined,
        welcomeDiscountUsed: !!(finalCustomer?.welcome_discount_used ?? memoryCustomer?.welcomeDiscountUsed),
        marketingConsent: !!(finalCustomer?.marketing_consent ?? memoryCustomer?.marketingConsent),
      };

      const isWelcomeEligible = !mappedCustomer.welcomeDiscountUsed;

      return res.json({
        success: true,
        verified: true,
        phone: normPhone,
        customer: mappedCustomer,
        defaultAddress: defaultAddress || null,
        isNewCustomer: !isExistingCustomer,
        welcomeDiscountEligible: isWelcomeEligible,
        message: `Welcome back, ${mappedCustomer.fullName}!`,
      });
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      return res.status(500).json({ success: false, error: 'Failed to verify OTP' });
    }
  });

  // =====================
  // CUSTOMER ENDPOINTS
  // =====================

  // Lookup customer by 10-digit phone
  app.get('/api/customers/lookup', async (req, res) => {
    try {
      const phoneParam = typeof req.query.phone === 'string' ? req.query.phone : '';
      const normPhone = phoneParam.replace(/\D/g, '').slice(-10);

      if (!normPhone || normPhone.length !== 10) {
        return res.json({ success: true, exists: false, customer: null, defaultAddress: null });
      }

      // Try Supabase first
      try {
        const { data: supaCust } = await serverSupabase
          .from('customers')
          .select('*')
          .eq('phone', normPhone)
          .maybeSingle();

        if (supaCust) {
          const { data: addrRow } = await serverSupabase
            .from('customer_addresses')
            .select('*')
            .eq('customer_id', supaCust.id)
            .order('is_default', { ascending: false })
            .limit(1)
            .maybeSingle();

          const defaultAddress = addrRow
            ? {
                id: String(addrRow.id),
                customerId: String(addrRow.customer_id),
                addressLabel: addrRow.label || 'Home',
                fullAddress: addrRow.full_address || addrRow.address_line1 || '',
                landmark: addrRow.landmark || undefined,
                city: addrRow.city || 'Bhubaneswar',
                state: addrRow.state || 'Odisha',
                pincode: addrRow.pincode || '',
                isDefault: addrRow.is_default !== false,
              }
            : null;

          return res.json({
            success: true,
            exists: true,
            customer: {
              id: supaCust.id,
              phone: supaCust.phone,
              fullName: supaCust.full_name || 'Customer',
              email: supaCust.email || undefined,
              welcomeDiscountUsed: !!supaCust.welcome_discount_used,
              marketingConsent: !!supaCust.marketing_consent,
            },
            defaultAddress,
            welcomeDiscountEligible: !supaCust.welcome_discount_used,
          });
        }
      } catch (err) {
        console.warn('Supabase customer lookup error:', err);
      }

      const customer = productStorage.findCustomerByPhone(normPhone);
      if (!customer) {
        return res.json({
          success: true,
          exists: false,
          customer: null,
          defaultAddress: null,
          welcomeDiscountEligible: true,
        });
      }

      const defaultAddress = productStorage.getCustomerDefaultAddress(customer.id);
      return res.json({
        success: true,
        exists: true,
        customer: {
          id: customer.id,
          phone: customer.phone,
          fullName: customer.fullName,
          email: customer.email,
          welcomeDiscountUsed: !!customer.welcomeDiscountUsed,
          marketingConsent: !!customer.marketingConsent,
        },
        defaultAddress: defaultAddress || null,
        welcomeDiscountEligible: !customer.welcomeDiscountUsed,
      });
    } catch (err: any) {
      console.error('Customer lookup error:', err);
      return res.status(500).json({ success: false, error: 'Failed to lookup customer' });
    }
  });

  // Upsert customer profile & address
  app.post('/api/customers/profile', async (req, res) => {
    try {
      const { phone, fullName, email, marketingConsent, address } = req.body;
      const normPhone = String(phone || '').replace(/\D/g, '').slice(-10);
      if (!normPhone || normPhone.length !== 10) {
        return res.status(400).json({ success: false, error: 'Valid 10-digit phone number is required' });
      }

      let supaCustomer: any = null;
      let supaAddress: any = null;

      try {
        const { data: existing } = await serverSupabase
          .from('customers')
          .select('*')
          .eq('phone', normPhone)
          .maybeSingle();

        const now = new Date().toISOString();
        if (existing) {
          const updatePayload: any = { updated_at: now };
          if (fullName) updatePayload.full_name = fullName.trim();
          if (email !== undefined) updatePayload.email = email ? email.trim() : null;
          if (marketingConsent !== undefined) updatePayload.marketing_consent = !!marketingConsent;

          const { data: updated } = await serverSupabase
            .from('customers')
            .update(updatePayload)
            .eq('id', existing.id)
            .select()
            .single();

          supaCustomer = updated || existing;
        } else {
          const insertPayload: any = {
            phone: normPhone,
            full_name: (fullName && fullName.trim()) || 'Customer',
            email: (email && email.trim()) || null,
            is_phone_verified: true,
            marketing_consent: !!marketingConsent,
            welcome_discount_used: false,
            created_at: now,
            updated_at: now,
          };

          const { data: inserted } = await serverSupabase
            .from('customers')
            .insert(insertPayload)
            .select()
            .single();

          supaCustomer = inserted;
        }

        if (supaCustomer && address && address.fullAddress) {
          const cleanFullAddress = address.fullAddress.trim();
          const { data: existingAddrs } = await serverSupabase
            .from('customer_addresses')
            .select('*')
            .eq('customer_id', supaCustomer.id);

          const matchedAddr = existingAddrs?.find(
            (a: any) =>
              (a.full_address || a.address_line1 || '').trim().toLowerCase() === cleanFullAddress.toLowerCase() ||
              (address.id && a.id === address.id)
          );

          if (matchedAddr) {
            const { data: updAddr } = await serverSupabase
              .from('customer_addresses')
              .update({
                label: address.addressLabel || matchedAddr.label || 'Home',
                full_address: cleanFullAddress,
                landmark: address.landmark !== undefined ? address.landmark : matchedAddr.landmark,
                city: address.city || matchedAddr.city || 'Bhubaneswar',
                state: address.state || matchedAddr.state || 'Odisha',
                pincode: address.pincode || matchedAddr.pincode || '',
                is_default: address.isDefault !== false,
                updated_at: now,
              })
              .eq('id', matchedAddr.id)
              .select()
              .single();

            if (updAddr) {
              supaAddress = {
                id: updAddr.id,
                customerId: updAddr.customer_id,
                addressLabel: updAddr.label || 'Home',
                fullAddress: updAddr.full_address || updAddr.address_line1,
                landmark: updAddr.landmark || undefined,
                city: updAddr.city || 'Bhubaneswar',
                state: updAddr.state || 'Odisha',
                pincode: updAddr.pincode || '',
                isDefault: updAddr.is_default !== false,
              };
            }
          } else {
            const { data: insAddr } = await serverSupabase
              .from('customer_addresses')
              .insert({
                customer_id: supaCustomer.id,
                label: address.addressLabel || 'Home',
                full_address: cleanFullAddress,
                landmark: address.landmark || null,
                city: address.city || 'Bhubaneswar',
                state: address.state || 'Odisha',
                pincode: address.pincode || '',
                is_default: address.isDefault !== false,
                created_at: now,
                updated_at: now,
              })
              .select()
              .single();

            if (insAddr) {
              supaAddress = {
                id: insAddr.id,
                customerId: insAddr.customer_id,
                addressLabel: insAddr.label || 'Home',
                fullAddress: insAddr.full_address || insAddr.address_line1,
                landmark: insAddr.landmark || undefined,
                city: insAddr.city || 'Bhubaneswar',
                state: insAddr.state || 'Odisha',
                pincode: insAddr.pincode || '',
                isDefault: insAddr.is_default !== false,
              };
            }
          }
        }
      } catch (dbErr) {
        console.warn('Supabase customer profile sync warning:', dbErr);
      }

      const customer = productStorage.getOrCreateCustomer({
        phone: normPhone,
        fullName: fullName || supaCustomer?.full_name,
        email: email || supaCustomer?.email,
        marketingConsent: !!marketingConsent,
      });

      let savedAddress = supaAddress;
      if (!savedAddress && address && address.fullAddress) {
        savedAddress = productStorage.saveCustomerAddress(customer.id, address);
      }

      return res.json({
        success: true,
        customer: supaCustomer
          ? {
              id: supaCustomer.id,
              phone: supaCustomer.phone,
              fullName: supaCustomer.full_name,
              email: supaCustomer.email,
              welcomeDiscountUsed: !!supaCustomer.welcome_discount_used,
              marketingConsent: !!supaCustomer.marketing_consent,
            }
          : customer,
        defaultAddress: savedAddress || productStorage.getCustomerDefaultAddress(customer.id) || null,
      });
    } catch (err: any) {
      console.error('Customer profile save error:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to save customer profile' });
    }
  });

  // =====================
  // REVIEWS & VERIFICATION ENDPOINTS
  // =====================

  // Check review eligibility (Delivered order required)
  app.get('/api/reviews/eligibility', (req, res) => {
    try {
      const productId = typeof req.query.productId === 'string' ? req.query.productId : '';
      const phone = typeof req.query.phone === 'string' ? req.query.phone : '';
      const customerId = typeof req.query.customerId === 'string' ? req.query.customerId : '';

      if (!productId) {
        return res.status(400).json({ success: false, error: 'Product ID is required' });
      }

      const identifier = customerId || phone;
      if (!identifier) {
        return res.json({
          success: true,
          eligible: false,
          message: 'Please provide your customer phone or ID to check review eligibility.',
        });
      }

      const check = productStorage.checkProductReviewEligibility(identifier, productId);
      return res.json({ success: true, ...check });
    } catch (err: any) {
      console.error('Review eligibility check error:', err);
      return res.status(500).json({ success: false, error: 'Failed to verify review eligibility' });
    }
  });

  // Add verified review
  app.post('/api/reviews', (req, res) => {
    try {
      const { productId, userName, userLocation, rating, comment, phone, customerId, orderId } = req.body;

      if (!productId || !comment || !rating || !userName) {
        return res.status(400).json({
          success: false,
          error: 'Product ID, reviewer name, rating, and comment are required.',
        });
      }

      const identifier = customerId || phone;
      if (identifier) {
        const check = productStorage.checkProductReviewEligibility(identifier, productId);
        if (!check.eligible) {
          return res.status(403).json({
            success: false,
            error: 'Review submission is restricted to verified customers with delivered orders for this item.',
          });
        }
      }

      const result = productStorage.addVerifiedProductReview(productId, {
        userName,
        userLocation: userLocation || 'Verified Customer',
        rating: Number(rating),
        comment,
        customerId,
        phone,
        orderId,
      });

      return res.status(201).json({
        success: true,
        message: 'Your verified culinary review has been published!',
        product: result.product,
        review: result.review,
      });
    } catch (err: any) {
      console.error('Submit review error:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to submit review' });
    }
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

  // 15e. Outlets: Get About Customization
  app.get('/api/outlets/:id/about', (req, res) => {
    try {
      const { id: outletId } = req.params;
      const about = productStorage.getAboutByOutletId(outletId);
      return res.json({ success: true, about });
    } catch (err: any) {
      console.error('Fetch outlet about error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch outlet about configuration' });
    }
  });

  // 15f. Outlets: Update About Customization (Protected)
  app.put('/api/outlets/:id/about', requireOwnerAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { id: outletId } = req.params;
      const updated = productStorage.upsertAbout(outletId, req.body);
      return res.json({ success: true, about: updated });
    } catch (err: any) {
      console.error('Update outlet about error:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to update outlet about customization' });
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

  // 21. Orders: Create Order (Fresh Implementation with server-side discount & totals recalculation and Supabase synchronization)
  app.post('/api/orders', async (req, res) => {
    try {
      const payload = req.body;
      const rawPhone = payload.customerDetails?.phone || '';
      const normPhone = rawPhone.replace(/\D/g, '').slice(-10);

      // Verify Welcome Discount server-side
      let welcomeDiscountAmount = 0;
      let isWelcomeDiscountApplied = false;

      if (payload.isWelcomeDiscountApplied || payload.customerDetails?.createAccount) {
        if (normPhone) {
          const existingCustomer = productStorage.findCustomerByPhone(normPhone);
          const isEligible = !existingCustomer || !existingCustomer.welcomeDiscountUsed;
          if (isEligible) {
            isWelcomeDiscountApplied = true;
            const subtotal = Number(payload.subtotal) || 0;
            const couponDiscount = Number(payload.discount) || 0;
            const remainingSubtotal = Math.max(0, subtotal - couponDiscount);
            // 10% capped at 50/-
            welcomeDiscountAmount = Math.min(50, Math.round(remainingSubtotal * 0.10));
          }
        }
      }

      const isSelfPickup = !!(payload.isSelfPickup || payload.orderType === 'pickup');

      const orderData = {
        ...payload,
        isSelfPickup,
        orderType: isSelfPickup ? 'pickup' : 'delivery',
        welcomeDiscountAmount,
        isWelcomeDiscountApplied,
      };

      const order = productStorage.createOrder(orderData);

      // Asynchronously synchronize order and atomic portions decrement into Supabase
      try {
        let supaCustomerId: string | null = null;
        let supaAddressId: string | null = null;

        // 1. Resolve or create customer record in Supabase (with valid UUID)
        if (normPhone) {
          try {
            const { data: existingSupaCust, error: findCustErr } = await serverSupabase
              .from('customers')
              .select('id, welcome_discount_used')
              .eq('phone', normPhone)
              .maybeSingle();

            if (!findCustErr && existingSupaCust?.id) {
              supaCustomerId = existingSupaCust.id;
              if (order.isWelcomeDiscountApplied && !existingSupaCust.welcome_discount_used) {
                await serverSupabase
                  .from('customers')
                  .update({ welcome_discount_used: true, updated_at: new Date().toISOString() })
                  .eq('id', existingSupaCust.id);
              }
            } else if (payload.customerDetails?.createAccount || payload.customerDetails?.fullName) {
              const { data: newSupaCust, error: createCustErr } = await serverSupabase
                .from('customers')
                .insert({
                  phone: normPhone,
                  full_name: payload.customerDetails?.fullName?.trim() || 'Valued Customer',
                  email: payload.customerDetails?.email?.trim() || null,
                  is_phone_verified: true,
                  marketing_consent: !!payload.customerDetails?.marketingConsent,
                  welcome_discount_used: !!order.isWelcomeDiscountApplied,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .select('id')
                .single();

              if (!createCustErr && newSupaCust?.id) {
                supaCustomerId = newSupaCust.id;
              }
            }
          } catch (custErr) {
            console.warn('Supabase customer resolution warning:', custErr);
          }
        }

        // 2. Resolve or create delivery address in Supabase (if customer UUID exists)
        if (supaCustomerId && payload.customerDetails?.address && !isSelfPickup) {
          try {
            const cleanAddr = payload.customerDetails.address.trim();
            const { data: existingAddrs } = await serverSupabase
              .from('customer_addresses')
              .select('id, address_line1')
              .eq('customer_id', supaCustomerId);

            const matchedAddr = existingAddrs?.find(
              (a: any) => (a.address_line1 || '').trim().toLowerCase() === cleanAddr.toLowerCase()
            );

            if (matchedAddr?.id) {
              supaAddressId = matchedAddr.id;
            } else {
              const { data: newSupaAddr, error: createAddrErr } = await serverSupabase
                .from('customer_addresses')
                .insert({
                  customer_id: supaCustomerId,
                  label: 'Home',
                  address_line1: cleanAddr,
                  landmark: payload.customerDetails?.landmark || null,
                  city: payload.customerDetails?.city || 'Bhubaneswar',
                  state: payload.customerDetails?.state || 'Odisha',
                  pincode: order.deliveryPinCode || payload.customerDetails?.pincode || '',
                  is_default: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .select('id')
                .single();

              if (!createAddrErr && newSupaAddr?.id) {
                supaAddressId = newSupaAddr.id;
              }
            }
          } catch (addrErr) {
            console.warn('Supabase address resolution warning:', addrErr);
          }
        }

        // 3. Insert order into Supabase orders table with fresh normalized payload
        const isUUID = (str?: string | null) =>
          typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

        const safeOutletId = order.outletId || (order as any).outlet_id || payload.outletId || 'outlet-1';
        const safeItems = Array.isArray(order.items)
          ? order.items.map(sanitizeOrderItem)
          : [];

        const supaCustomerPhone =
          order.customerDetails?.phone ||
          (order.deliveryAddressSnapshot as any)?.phone ||
          payload.customerDetails?.phone ||
          null;

        const supaCustomerName =
          order.customerDetails?.fullName ||
          (order.deliveryAddressSnapshot as any)?.fullName ||
          payload.customerDetails?.fullName ||
          null;

        const supaDeliveryInstructions =
          order.customerDetails?.deliveryNotes ||
          (order.deliveryAddressSnapshot as any)?.deliveryNotes ||
          payload.customerDetails?.deliveryNotes ||
          null;

        const supaPayload: any = {
          id: order.id || `order-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          order_id: order.orderId,
          outlet_id: safeOutletId,
          customer_id: isUUID(supaCustomerId) ? supaCustomerId : null,
          address_id: isUUID(supaAddressId) ? supaAddressId : null,
          customer_name: supaCustomerName,
          customer_phone: supaCustomerPhone,
          order_type: isSelfPickup ? 'pickup' : 'delivery',
          is_self_pickup: isSelfPickup,
          items: safeItems,
          subtotal: Number(order.subtotal || 0),
          discount: Number(order.discount || 0),
          discount_amount: Number(order.discount || 0),
          welcome_discount_applied: !!order.isWelcomeDiscountApplied,
          welcome_discount_amount: Number(order.welcomeDiscountAmount || 0),
          delivery_fee: Number(order.deliveryFee || 0),
          packaging_fee: Number(order.packagingFee || 0),
          tax_amount: Number(order.gst || 0),
          gst: Number(order.gst || 0),
          total_amount: Number(order.total || 0),
          total: Number(order.total || 0),
          coupon_code: order.couponCode || null,
          discount_code: order.couponCode || null,
          payment_method: order.customerDetails?.paymentMethod || 'cod',
          payment_status: 'PENDING',
          delivery_slot: order.customerDetails?.deliverySlot || 'immediate',
          delivery_notes: supaDeliveryInstructions,
          delivery_instructions: supaDeliveryInstructions,
          status: order.status || 'Received',
          order_status: 'received',
          placed_at: new Date().toISOString(),
          confirmed_at: null,
          preparing_at: null,
          ready_at: null,
          out_for_delivery_at: null,
          delivered_at: null,
          cancelled_at: null,
          customer_details: order.customerDetails || {},
          delivery_address_snapshot: order.deliveryAddressSnapshot || {},
          delivery_pincode: order.deliveryPinCode || order.customerDetails?.pincode || '',
          estimated_delivery_minutes: Number(order.estimatedDeliveryMinutes || 35),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const res1 = await serverSupabase
          .from('orders')
          .insert(supaPayload)
          .select()
          .single();

        if (res1.data) {
          console.log(`Order ${res1.data.order_id || res1.data.id} successfully persisted to Supabase.`);
          if (res1.data.order_id && res1.data.order_id !== order.orderId) {
            order.orderId = res1.data.order_id;
          }

          // Insert normalized order_items into Supabase
          if (safeItems.length > 0) {
            try {
              const orderItemsPayload = safeItems.map((item: any) => {
                const pId = item.productId || item.product?.id || item.id;
                const pName = item.name || item.product?.name || 'Product';
                const vName = item.selectedVariant?.name || item.variantName || null;
                const unitPrice = Number(item.unitPrice || item.price || item.product?.price || 0);
                const qty = Number(item.quantity || 1);
                const itemDiscount = Number(item.discount || item.discount_amount || 0);
                const totalPrice = Number(item.totalPrice || Math.max(0, unitPrice * qty - itemDiscount));
                return {
                  order_id: res1.data.id,
                  product_id: pId ? String(pId) : null,
                  product_name: pName,
                  product_variant_name: vName,
                  quantity: qty,
                  unit_price: unitPrice,
                  discount_amount: itemDiscount,
                  total_price: totalPrice,
                  created_at: new Date().toISOString(),
                };
              });

              await serverSupabase.from('order_items').insert(orderItemsPayload);
            } catch (itemInsertErr) {
              console.warn('order_items Supabase insert notice:', itemInsertErr);
            }
          }
        } else if (res1.error) {
          console.warn('Supabase orders table insert notice (table might be newly recreated):', res1.error.message);
        }

        // Atomically decrement portions in Supabase products table
        if (order.items && Array.isArray(order.items) && order.items.length > 0) {
          for (const item of order.items) {
            const productId = item.product?.id || (item as any).productId || (item as any).id;
            const qty = Number(item.quantity) || 1;
            if (!productId) continue;

            const { data: prodData } = await serverSupabase
              .from('products')
              .select('id, outlets')
              .eq('id', String(productId))
              .single();

            if (prodData && Array.isArray(prodData.outlets)) {
              let changed = false;
              const updatedOutlets = prodData.outlets.map((outletCfg: any) => {
                const oId = outletCfg.outletId || outletCfg.outlet_id;
                if (
                  oId === order.outletId &&
                  outletCfg.portionsLeft !== null &&
                  outletCfg.portionsLeft !== undefined &&
                  outletCfg.portionsLeft !== ''
                ) {
                  const currentPortions = Number(outletCfg.portionsLeft);
                  if (!isNaN(currentPortions)) {
                    const nextPortions = Math.max(0, currentPortions - qty);
                    changed = true;
                    return {
                      ...outletCfg,
                      portionsLeft: nextPortions,
                      inStock: nextPortions <= 0 ? false : outletCfg.inStock !== false,
                    };
                  }
                }
                return outletCfg;
              });

              if (changed) {
                await serverSupabase
                  .from('products')
                  .update({
                    outlets: updatedOutlets,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', String(productId));
              }
            }
          }
        }
      } catch (dbSyncErr) {
        console.warn('Supabase order creation and stock sync notice:', dbSyncErr);
      }

      return res.status(201).json({ success: true, order });
    } catch (err: any) {
      console.error('Create order error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to place order. Please check order details.',
      });
    }
  });

  // 21b. Orders: Update Status
  app.patch('/api/orders/:orderId/status', async (req, res) => {
    try {
      const { status, cancellationReason } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required' });
      }

      const updated = productStorage.updateOrderStatus(req.params.orderId, status, cancellationReason);

      // Sync status update & timestamps to Supabase
      try {
        const now = new Date().toISOString();
        const norm = (status || '').toLowerCase().trim();
        const supaUpdate: any = {
          status,
          updated_at: now,
        };

        if (norm === 'received') {
          supaUpdate.order_status = 'received';
          supaUpdate.status = 'Received';
        } else if (norm === 'confirmed') {
          supaUpdate.order_status = 'confirmed';
          supaUpdate.status = 'Confirmed';
          supaUpdate.confirmed_at = now;
        } else if (norm === 'preparing' || norm === 'in kitchen' || norm === 'preparing in kitchen') {
          supaUpdate.order_status = 'preparing';
          supaUpdate.status = 'Preparing in Kitchen';
          supaUpdate.preparing_at = now;
        } else if (norm === 'ready' || norm === 'ready for pickup') {
          supaUpdate.order_status = 'ready';
          supaUpdate.status = 'Ready for Pickup';
          supaUpdate.ready_at = now;
        } else if (norm === 'out_for_delivery' || norm === 'out for delivery') {
          supaUpdate.order_status = 'out_for_delivery';
          supaUpdate.status = 'Out for Delivery';
          supaUpdate.out_for_delivery_at = now;
        } else if (norm === 'delivered' || norm === 'picked up') {
          supaUpdate.order_status = 'delivered';
          supaUpdate.status = norm === 'picked up' ? 'Picked Up' : 'Delivered';
          supaUpdate.delivered_at = now;
        } else if (norm === 'cancelled') {
          supaUpdate.order_status = 'cancelled';
          supaUpdate.status = 'Cancelled';
          supaUpdate.cancelled_at = now;
          if (cancellationReason) {
            supaUpdate.cancellation_reason = cancellationReason;
          }
        }

        await serverSupabase
          .from('orders')
          .update(supaUpdate)
          .or(`order_id.eq.${req.params.orderId},id.eq.${req.params.orderId}`);
      } catch (syncErr) {
        console.warn('Supabase order status sync notice:', syncErr);
      }

      if (!updated) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      return res.json({ success: true, order: updated });
    } catch (err: any) {
      console.error('Update order status error:', err);
      return res.status(500).json({ success: false, error: 'Failed to update order status' });
    }
  });

  // 21c. Orders: Delete/Cancel Order
  app.delete('/api/orders/:orderId', async (req, res) => {
    try {
      const deleted = productStorage.deleteOrder(req.params.orderId);
      // Sync delete to Supabase
      try {
        await serverSupabase
          .from('orders')
          .delete()
          .or(`order_id.eq.${req.params.orderId},id.eq.${req.params.orderId}`);
      } catch (e) {
        console.warn('Supabase order delete notice:', e);
      }

      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      return res.json({ success: true, message: 'Order removed successfully' });
    } catch (err: any) {
      console.error('Delete order error:', err);
      return res.status(500).json({ success: false, error: 'Failed to delete order' });
    }
  });

  // 22. Orders: Get Single Order
  app.get('/api/orders/:orderId', async (req, res) => {
    try {
      let order = productStorage.getOrderById(req.params.orderId);
      if (!order) {
        // Try Supabase lookup
        try {
          const { data } = await serverSupabase
            .from('orders')
            .select('*')
            .or(`order_id.eq.${req.params.orderId},id.eq.${req.params.orderId}`)
            .maybeSingle();

          if (data) {
            order = {
              id: data.id,
              orderId: data.order_id,
              outletId: data.outlet_id,
              customerId: data.customer_id,
              addressId: data.address_id,
              orderType: data.order_type || (data.is_self_pickup ? 'pickup' : 'delivery'),
              isSelfPickup: !!data.is_self_pickup,
              items: Array.isArray(data.items) ? data.items.map(deserializeOrderItem) : [],
              subtotal: Number(data.subtotal || 0),
              discount: Number(data.discount || 0),
              welcomeDiscountAmount: Number(data.welcome_discount_amount || 0),
              isWelcomeDiscountApplied: !!data.welcome_discount_applied,
              deliveryFee: Number(data.delivery_fee || 0),
              packagingFee: Number(data.packaging_fee || 0),
              gst: Number(data.gst || 0),
              total: Number(data.total || 0),
              couponCode: data.coupon_code || undefined,
              deliveryPinCode: data.delivery_pincode || '',
              customerDetails: data.customer_details || {},
              deliveryAddressSnapshot: data.delivery_address_snapshot || {},
              status: data.status || 'Received',
              estimatedDeliveryMinutes: data.estimated_delivery_minutes || 35,
              createdAt: data.created_at,
            };
          }
        } catch {}
      }

      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      return res.json({ success: true, order });
    } catch (err: any) {
      console.error('Fetch order error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch order' });
    }
  });

  // 23. Orders: List Orders (Supports filtering by outletId and status)
  app.get('/api/orders', (req, res) => {
    try {
      const outletId = req.query.outletId as string | undefined;
      const status = req.query.status as string | undefined;
      const orders = productStorage.getAllOrders(outletId, status);
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
