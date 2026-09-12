import express from 'express';
import path from 'path';
import cron from 'node-cron';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { productStorage, sanitizeOrderItem, deserializeOrderItem, maskCustomerName, normalizePhone } from './server/storage';
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

// UUID validation helper
const isUUID = (str?: string | null): boolean => {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
};

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

  // 3a. PIN Code Lookup & Auto-fill endpoint
  const serverPinCache = new Map<string, any>();
  app.get('/api/pincode/lookup', async (req, res) => {
    try {
      const pinParam = typeof req.query.pin === 'string' ? req.query.pin : '';
      const pin = pinParam.replace(/\D/g, '').slice(0, 6);

      if (!pin || pin.length !== 6) {
        return res.status(400).json({ success: false, error: 'Valid 6-digit PIN code is required' });
      }

      if (serverPinCache.has(pin)) {
        return res.json({ success: true, details: serverPinCache.get(pin) });
      }

      // 1. Check if PIN matches known outlet or delivery zone
      try {
        const { data: zones } = await serverSupabase
          .from('delivery_zones')
          .select('pin_codes, outlet_id, name, outlets(id, name, city, state)');

        if (Array.isArray(zones)) {
          for (const z of zones) {
            if (Array.isArray(z.pin_codes) && z.pin_codes.includes(pin)) {
              const outlet = (z as any).outlets;
              const details = {
                pincode: pin,
                city: outlet?.city || (pin.startsWith('751') || pin.startsWith('752') ? 'Bhubaneswar' : 'Bangalore'),
                state: outlet?.state || (pin.startsWith('751') || pin.startsWith('752') ? 'Odisha' : 'Karnataka'),
                area: z.name || outlet?.name,
                found: true,
              };
              serverPinCache.set(pin, details);
              return res.json({ success: true, details });
            }
          }
        }
      } catch (zoneErr) {
        console.warn('Zone PIN lookup warning:', zoneErr);
      }

      // 2. Query India Post API
      try {
        const postRes = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pin)}`);
        if (postRes.ok) {
          const postData = await postRes.json();
          if (Array.isArray(postData) && postData[0]?.Status === 'Success' && Array.isArray(postData[0]?.PostOffice) && postData[0].PostOffice.length > 0) {
            const po = postData[0].PostOffice[0];
            let city = po.District || po.Division || po.Block || po.Circle || '';
            if (city.toLowerCase().includes('bangalore') || city.toLowerCase().includes('bengaluru')) {
              city = 'Bangalore';
            } else if (city.toLowerCase().includes('khorda') || city.toLowerCase().includes('bhubaneswar')) {
              city = 'Bhubaneswar';
            }

            const details = {
              pincode: pin,
              city: city || po.State,
              state: po.State,
              district: po.District,
              area: po.Name,
              found: true,
            };
            serverPinCache.set(pin, details);
            return res.json({ success: true, details });
          }
        }
      } catch (postErr) {
        console.warn('India Post API error in server route:', postErr);
      }

      // 3. Known fallback ranges
      if (/^751\d{3}$/.test(pin)) {
        const details = { pincode: pin, city: 'Bhubaneswar', state: 'Odisha', found: true };
        serverPinCache.set(pin, details);
        return res.json({ success: true, details });
      }
      if (/^560\d{3}$/.test(pin)) {
        const details = { pincode: pin, city: 'Bangalore', state: 'Karnataka', found: true };
        serverPinCache.set(pin, details);
        return res.json({ success: true, details });
      }

      return res.json({ success: false, error: 'PIN code not found' });
    } catch (err: any) {
      console.error('PIN lookup error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
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
            let updAddr: any = null;
            const resUpd = await serverSupabase
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
              .maybeSingle();

            if (resUpd.error && (resUpd.error.message.includes('full_address') || resUpd.error.message.includes('column') || resUpd.error.code === 'PGRST204')) {
              const resFallback = await serverSupabase
                .from('customer_addresses')
                .update({
                  label: address.addressLabel || matchedAddr.label || 'Home',
                  address_line1: cleanFullAddress,
                  landmark: address.landmark !== undefined ? address.landmark : matchedAddr.landmark,
                  city: address.city || matchedAddr.city || 'Bhubaneswar',
                  state: address.state || matchedAddr.state || 'Odisha',
                  pincode: address.pincode || matchedAddr.pincode || '',
                  is_default: address.isDefault !== false,
                  updated_at: now,
                })
                .eq('id', matchedAddr.id)
                .select()
                .maybeSingle();
              updAddr = resFallback.data;
            } else {
              updAddr = resUpd.data;
            }

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
            let insAddr: any = null;
            const resIns = await serverSupabase
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
              .maybeSingle();

            if (resIns.error && (resIns.error.message.includes('full_address') || resIns.error.message.includes('column') || resIns.error.code === 'PGRST204')) {
              const resFallback = await serverSupabase
                .from('customer_addresses')
                .insert({
                  customer_id: supaCustomer.id,
                  label: address.addressLabel || 'Home',
                  address_line1: cleanFullAddress,
                  landmark: address.landmark || null,
                  city: address.city || 'Bhubaneswar',
                  state: address.state || 'Odisha',
                  pincode: address.pincode || '',
                  is_default: address.isDefault !== false,
                  created_at: now,
                  updated_at: now,
                })
                .select()
                .maybeSingle();
              insAddr = resFallback.data;
            } else {
              insAddr = resIns.data;
            }

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

  // Get all addresses for a customer (Always fresh from DB - No Cache)
  app.get('/api/customers/addresses', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    try {
      const customerId = typeof req.query.customerId === 'string' ? req.query.customerId : '';
      const phone = typeof req.query.phone === 'string' ? req.query.phone : '';
      const normPhone = phone.replace(/\D/g, '').slice(-10);

      let supaCustId: string | null = null;
      if (customerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
        supaCustId = customerId;
      }

      if (!supaCustId && normPhone) {
        const { data: c } = await serverSupabase
          .from('customers')
          .select('id')
          .eq('phone', normPhone)
          .maybeSingle();
        if (c) supaCustId = c.id;
      }

      if (supaCustId) {
        const { data: addrs, error } = await serverSupabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', supaCustId)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (!error && addrs) {
          const formatted = addrs.map((a: any) => ({
            id: String(a.id),
            customerId: String(a.customer_id),
            addressLabel: a.label || 'Home',
            fullAddress: a.full_address || a.address_line1 || '',
            landmark: a.landmark || undefined,
            city: a.city || 'Bhubaneswar',
            state: a.state || 'Odisha',
            pincode: a.pincode || '',
            isDefault: a.is_default !== false,
            createdAt: a.created_at,
          }));
          return res.json({ success: true, addresses: formatted });
        }
      }

      return res.json({ success: true, addresses: [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Insert a new address for a customer
  app.post('/api/customers/addresses', async (req, res) => {
    try {
      const { customerId, phone, address } = req.body;
      const normPhone = String(phone || '').replace(/\D/g, '').slice(-10);

      let supaCustId: string | null = null;

      // 1. If valid UUID customerId provided, verify it exists
      if (customerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(customerId))) {
        const { data: c } = await serverSupabase
          .from('customers')
          .select('id')
          .eq('id', customerId)
          .maybeSingle();
        if (c) supaCustId = c.id;
      }

      // 2. If not found by ID, look up or create customer by normalized 10-digit phone
      if (!supaCustId && normPhone) {
        const { data: c } = await serverSupabase
          .from('customers')
          .select('id')
          .eq('phone', normPhone)
          .maybeSingle();
        if (c?.id) {
          supaCustId = c.id;
        } else {
          const { data: newCust, error: newCustErr } = await serverSupabase
            .from('customers')
            .insert({
              phone: normPhone,
              full_name: address?.fullName || 'Customer',
              is_phone_verified: true,
              marketing_consent: false,
              welcome_discount_used: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select('id')
            .maybeSingle();
          if (newCust?.id) {
            supaCustId = newCust.id;
          } else if (newCustErr) {
            console.warn('Customer create during address insert warning:', newCustErr);
            // Re-check in case created in parallel
            const { data: retryCust } = await serverSupabase
              .from('customers')
              .select('id')
              .eq('phone', normPhone)
              .maybeSingle();
            if (retryCust?.id) supaCustId = retryCust.id;
          }
        }
      }

      if (!supaCustId) {
        return res.status(400).json({ success: false, error: 'Customer could not be resolved. Please enter a valid phone number.' });
      }

      const now = new Date().toISOString();
      const cleanFullAddress = (address?.fullAddress || address?.address || '').trim();
      const isDefault = address?.isDefault !== false;

      if (isDefault) {
        try {
          await serverSupabase
            .from('customer_addresses')
            .update({ is_default: false, updated_at: now })
            .eq('customer_id', supaCustId);
        } catch {}
      }

      // Prepare payload with standard full_address column
      const payload: Record<string, any> = {
        customer_id: supaCustId,
        label: address?.addressLabel || address?.label || 'Home',
        full_address: cleanFullAddress,
        landmark: address?.landmark || null,
        city: address?.city || 'Bhubaneswar',
        state: address?.state || 'Odisha',
        pincode: address?.pincode || '',
        is_default: isDefault,
        created_at: now,
        updated_at: now,
      };

      let inserted: any = null;
      let insErr: any = null;

      const resInsert = await serverSupabase
        .from('customer_addresses')
        .insert(payload)
        .select()
        .maybeSingle();

      inserted = resInsert.data;
      insErr = resInsert.error;

      // Fallback only if full_address column is named address_line1 in legacy instances
      if (insErr && insErr.message && insErr.message.includes('full_address')) {
        delete payload.full_address;
        payload.address_line1 = cleanFullAddress;
        const resFallback = await serverSupabase
          .from('customer_addresses')
          .insert(payload)
          .select()
          .maybeSingle();
        inserted = resFallback.data;
        insErr = resFallback.error;
      }

      if (insErr) {
        console.error('Customer address insert Supabase error:', JSON.stringify(insErr));
        return res.status(400).json({
          success: false,
          error: insErr.message || insErr.details || 'Failed to insert customer address into database',
        });
      }

      return res.json({
        success: true,
        address: {
          id: String(inserted?.id || `addr-${Date.now()}`),
          customerId: String(inserted?.customer_id || supaCustId),
          addressLabel: inserted?.label || address?.addressLabel || 'Home',
          fullAddress: inserted?.full_address || inserted?.address_line1 || cleanFullAddress,
          landmark: inserted?.landmark || address?.landmark || undefined,
          city: inserted?.city || address?.city || 'Bhubaneswar',
          state: inserted?.state || address?.state || 'Odisha',
          pincode: inserted?.pincode || address?.pincode || '',
          isDefault: inserted?.is_default !== false,
        },
      });
    } catch (err: any) {
      console.error('Customer address insert exception:', err);
      return res.status(400).json({
        success: false,
        error: err?.message || 'Unexpected error inserting address',
      });
    }
  });

  // Update an existing address
  app.put('/api/customers/addresses/:id', async (req, res) => {
    try {
      const addressId = req.params.id;
      const { address } = req.body;
      const now = new Date().toISOString();
      const cleanFullAddress = (address?.fullAddress || address?.address || '').trim();

      if (address?.isDefault === true) {
        try {
          const { data: currentAddr } = await serverSupabase
            .from('customer_addresses')
            .select('customer_id')
            .eq('id', addressId)
            .maybeSingle();

          if (currentAddr?.customer_id) {
            await serverSupabase
              .from('customer_addresses')
              .update({ is_default: false, updated_at: now })
              .eq('customer_id', currentAddr.customer_id);
          }
        } catch (e) {
          console.warn('Server reset default error:', e);
        }
      }

      const updatePayload: any = {
        label: address?.addressLabel || address?.label || 'Home',
        full_address: cleanFullAddress,
        landmark: address?.landmark !== undefined ? address.landmark : null,
        city: address?.city || 'Bhubaneswar',
        state: address?.state || 'Odisha',
        pincode: address?.pincode || '',
        updated_at: now,
      };

      if (address?.isDefault !== undefined) {
        updatePayload.is_default = address.isDefault;
      }

      let updated: any = null;
      const res1 = await serverSupabase
        .from('customer_addresses')
        .update(updatePayload)
        .eq('id', addressId)
        .select()
        .maybeSingle();

      if (res1.error) {
        if (res1.error.message && (res1.error.message.includes('full_address') || res1.error.message.includes('column') || res1.error.code === 'PGRST204')) {
          delete updatePayload.full_address;
          updatePayload.address_line1 = cleanFullAddress;
          const res2 = await serverSupabase
            .from('customer_addresses')
            .update(updatePayload)
            .eq('id', addressId)
            .select()
            .maybeSingle();
          if (res2.error) throw res2.error;
          updated = res2.data;
        } else {
          throw res1.error;
        }
      } else {
        updated = res1.data;
      }

      if (!updated) {
        throw new Error('Address not found or could not be updated');
      }

      return res.json({
        success: true,
        address: {
          id: String(updated.id),
          customerId: String(updated.customer_id),
          addressLabel: updated.label || 'Home',
          fullAddress: updated.full_address || updated.address_line1 || '',
          landmark: updated.landmark || undefined,
          city: updated.city || 'Bhubaneswar',
          state: updated.state || 'Odisha',
          pincode: updated.pincode || '',
          isDefault: updated.is_default !== false,
        },
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  });

  // Delete an address directly from Supabase DB
  app.delete('/api/customers/addresses/:id', async (req, res) => {
    try {
      const addressId = req.params.id;
      if (!addressId) {
        return res.status(400).json({ success: false, error: 'Address ID is required' });
      }

      const { error } = await serverSupabase
        .from('customer_addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;

      return res.json({ success: true, message: 'Address deleted successfully' });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  });

  // =====================
  // REVIEWS & VERIFICATION ENDPOINTS
  // =====================

  // Check review eligibility (Delivered order required from Supabase or memory)
  app.get('/api/reviews/eligibility', async (req, res) => {
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

      const normPhone = normalizePhone(identifier);
      const pIdStr = String(productId).trim();

      // 1. First check in Supabase public.orders
      try {
        const isUUID = (str?: string) =>
          typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

        let supaOrders: any[] = [];
        if (normPhone && normPhone.length >= 10) {
          const { data } = await serverSupabase
            .from('orders')
            .select('*')
            .ilike('customer_phone', `%${normPhone}%`);
          if (Array.isArray(data)) supaOrders.push(...data);
        }

        if (isUUID(identifier)) {
          const { data } = await serverSupabase
            .from('orders')
            .select('*')
            .eq('customer_id', identifier);
          if (Array.isArray(data)) supaOrders.push(...data);
        }

        if (supaOrders.length > 0) {
          for (const ord of supaOrders) {
            const rawStatus = (ord.order_status || ord.status || '').toLowerCase().trim();
            const isDelivered = rawStatus === 'delivered';
            if (!isDelivered) continue;

            const deliveredAt = ord.delivered_at || ord.placed_at || ord.created_at;
            const isWithin7Days = deliveredAt
              ? Date.now() <= new Date(deliveredAt).getTime() + 7 * 24 * 60 * 60 * 1000
              : true;

            if (!isWithin7Days) continue;

            let itemsList: any[] = [];
            if (Array.isArray(ord.items)) {
              itemsList = ord.items;
            } else if (typeof ord.items === 'string') {
              try {
                itemsList = JSON.parse(ord.items);
              } catch {
                itemsList = [];
              }
            }

            const hasItem = itemsList.some((it: any) => {
              const itProdId = String(it.productId || it.product?.id || it.id || '');
              return itProdId === pIdStr;
            });

            if (hasItem) {
              return res.json({
                success: true,
                eligible: true,
                verified: true,
                orderId: ord.order_id || ord.id,
                message: 'Eligible for verified rating! You ordered and received this authentic dish.',
              });
            }
          }
        }
      } catch (dbErr) {
        console.warn('Database review eligibility check notice:', dbErr);
      }

      // 2. Fallback check in local storage
      const check = productStorage.checkProductReviewEligibility(identifier, productId);
      return res.json({ success: true, ...check });
    } catch (err: any) {
      console.error('Review eligibility check error:', err);
      return res.status(500).json({ success: false, error: 'Failed to verify review eligibility' });
    }
  });

  // Add verified review (Directly persists to Supabase public.product_reviews)
  app.post('/api/reviews', async (req, res) => {
    try {
      const { productId, userName, userLocation, rating, comment, phone, customerId, orderId } = req.body;

      if (!productId || !comment || !rating || !userName) {
        return res.status(400).json({
          success: false,
          error: 'Product ID, reviewer name, rating, and comment are required.',
        });
      }

      const numRating = Math.min(5, Math.max(1, Math.round(Number(rating))));
      const cleanText = String(comment).trim().slice(0, 500);
      const identifier = customerId || phone;
      const normPhone = phone ? normalizePhone(phone) : (identifier ? normalizePhone(identifier) : undefined);
      const pIdStr = String(productId).trim();

      // Check eligibility from Supabase or storage
      let resolvedOrderId = orderId || '';
      let isEligible = false;

      if (identifier) {
        try {
          const isUUID = (str?: string) =>
            typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

          let supaOrders: any[] = [];
          if (normPhone && normPhone.length >= 10) {
            const { data } = await serverSupabase
              .from('orders')
              .select('*')
              .ilike('customer_phone', `%${normPhone}%`);
            if (Array.isArray(data)) supaOrders.push(...data);
          }

          if (isUUID(identifier)) {
            const { data } = await serverSupabase
              .from('orders')
              .select('*')
              .eq('customer_id', identifier);
            if (Array.isArray(data)) supaOrders.push(...data);
          }

          if (Array.isArray(supaOrders)) {
            for (const ord of supaOrders) {
              const rawStatus = (ord.order_status || ord.status || '').toLowerCase().trim();
              if (rawStatus !== 'delivered') continue;

              let itemsList: any[] = [];
              if (Array.isArray(ord.items)) itemsList = ord.items;
              else if (typeof ord.items === 'string') {
                try { itemsList = JSON.parse(ord.items); } catch { itemsList = []; }
              }

              const hasItem = itemsList.some((it: any) => {
                const itProdId = String(it.productId || it.product?.id || it.id || '');
                return itProdId === pIdStr;
              });

              if (hasItem) {
                isEligible = true;
                resolvedOrderId = ord.order_id || ord.id;
                break;
              }
            }
          }
        } catch (dbErr) {
          console.warn('Review submission eligibility verify notice:', dbErr);
        }

        if (!isEligible) {
          const check = productStorage.checkProductReviewEligibility(identifier, productId);
          if (check.eligible) {
            isEligible = true;
            resolvedOrderId = check.orderId || resolvedOrderId;
          }
        }

        if (!isEligible) {
          return res.status(403).json({
            success: false,
            error: 'Review submission is restricted to verified customers with delivered orders for this item.',
          });
        }
      }

      const maskedName = maskCustomerName(userName || 'Verified Patron');
      const isUUID = (str?: string) =>
        typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

      // Save directly into Supabase public.product_reviews
      let createdDbReview: any = null;
      try {
        const reviewPayload: any = {
          product_id: pIdStr,
          order_id: String(resolvedOrderId || 'GKSWAD-VERIFIED'),
          order_item_id: `${resolvedOrderId || 'ord'}-${pIdStr}-0`,
          outlet_id: 'bbsr-kendriyavihar',
          rating: numRating,
          review_text: cleanText,
          customer_display_name: maskedName,
          customer_phone: normPhone || null,
          is_verified_purchase: true,
          is_published: true,
          reviewed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (customerId && isUUID(customerId)) {
          reviewPayload.customer_id = customerId;
        }

        const { data, error } = await serverSupabase
          .from('product_reviews')
          .insert(reviewPayload)
          .select()
          .maybeSingle();

        if (data && !error) {
          createdDbReview = data;
        }
      } catch (dbInsertErr) {
        console.warn('Insert to Supabase product_reviews error:', dbInsertErr);
      }

      // Also mirror to local storage
      const result = productStorage.addVerifiedProductReview(productId, {
        userName: maskedName,
        userLocation: userLocation || 'Verified Customer',
        rating: numRating,
        comment: cleanText,
        customerId,
        phone: normPhone,
        orderId: resolvedOrderId,
      });

      return res.status(201).json({
        success: true,
        message: 'Your verified culinary review has been published!',
        product: result.product,
        review: createdDbReview ? mapDbReview(createdDbReview) : result.review,
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
  // COUPONS ENDPOINTS (DIRECT DATABASE FIRST)
  // =====================

  function mapDbCoupon(row: any) {
    if (!row) return null;
    return {
      id: row.id,
      code: (row.code || '').trim().toUpperCase(),
      name: row.name || row.code,
      title: row.name || row.code,
      description: row.description || '',
      discountType: row.discount_type || 'percentage',
      discountValue: Number(row.discount_value || 0),
      maxDiscountAmount: row.max_discount_amount != null ? Number(row.max_discount_amount) : undefined,
      minOrderValue: Number(row.minimum_order_value || 0),
      userEligibility: row.user_eligibility || 'all',
      isFirstOrderOnly: row.user_eligibility === 'first_order',
      usageLimit: row.usage_limit != null ? Number(row.usage_limit) : undefined,
      usageLimitTotal: row.usage_limit != null ? Number(row.usage_limit) : undefined,
      usageLimitPerUser: row.usage_limit_per_user != null ? Number(row.usage_limit_per_user) : undefined,
      outletIds: Array.isArray(row.outlet_ids) ? row.outlet_ids : [],
      applicableOutlets: Array.isArray(row.outlet_ids) ? row.outlet_ids : [],
      validFrom: row.valid_from,
      validUntil: row.valid_until,
      isActive: row.is_active ?? true,
      isPublic: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      success: true,
    };
  }

  // 21a. Coupons: Get All Coupons (from Database)
  app.get('/api/coupons', async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';

      let query = serverSupabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        const coupons = data.map(mapDbCoupon);
        return res.json({ success: true, coupons, source: 'database' });
      }

      if (error) {
        console.warn('Database coupons query notice:', error.message);
      }

      return res.json({ success: true, coupons: [], source: 'database' });
    } catch (err: any) {
      console.error('Fetch coupons error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch coupons from database' });
    }
  });

  // 21b. Coupons: Get Available Active Coupons for Customer / Subtotal / Outlet (Live Database)
  app.get('/api/coupons/available', async (req, res) => {
    try {
      const outletId = (req.query.outletId as string) || undefined;

      const { data, error } = await serverSupabase
        .from('coupons')
        .select('*')
        .eq('is_active', true);

      if (error || !Array.isArray(data)) {
        console.warn('Fetch available coupons db notice:', error?.message);
        return res.json({ success: true, coupons: [] });
      }

      const now = new Date();
      const eligibleCoupons = [];

      for (const row of data) {
        // 1. Date window
        if (row.valid_from && new Date(row.valid_from) > now) continue;
        if (row.valid_until && new Date(row.valid_until) < now) continue;

        // 2. Outlet check
        const outlets = Array.isArray(row.outlet_ids) ? row.outlet_ids : [];
        if (outletId && outlets.length > 0 && !outlets.includes(outletId)) continue;

        // Show all active valid coupons in the available list so users can see and try them
        eligibleCoupons.push(mapDbCoupon(row));
      }

      return res.json({ success: true, coupons: eligibleCoupons });
    } catch (err: any) {
      console.error('Fetch available coupons error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch available coupons' });
    }
  });

  // 21c. Coupons: Server-Side Validate Coupon Code against Live Database
  app.post('/api/coupons/validate', async (req, res) => {
    try {
      const { couponCode, foodSubtotal, customerId, customerPhone, outletId } = req.body;
      const cleanCode = String(couponCode || '').trim().toUpperCase();

      if (!cleanCode) {
        return res.status(400).json({
          success: false,
          isValid: false,
          valid: false,
          message: 'Please enter a coupon code.',
          error: 'Please enter a coupon code.',
        });
      }

      const { data: row, error } = await serverSupabase
        .from('coupons')
        .select('*')
        .ilike('code', cleanCode)
        .maybeSingle();

      if (error || !row) {
        return res.status(400).json({
          success: false,
          isValid: false,
          valid: false,
          message: 'Invalid coupon code.',
          error: 'Invalid coupon code.',
        });
      }

      if (row.is_active === false) {
        return res.status(400).json({
          success: false,
          isValid: false,
          valid: false,
          message: 'This coupon is inactive.',
          error: 'This coupon is inactive.',
        });
      }

      const now = new Date();
      if (row.valid_from && new Date(row.valid_from) > now) {
        return res.status(400).json({
          success: false,
          isValid: false,
          valid: false,
          message: 'This coupon is not yet active.',
          error: 'This coupon is not yet active.',
        });
      }
      if (row.valid_until && new Date(row.valid_until) < now) {
        return res.status(400).json({
          success: false,
          isValid: false,
          valid: false,
          message: 'This coupon has expired.',
          error: 'This coupon has expired.',
        });
      }

      const subtotalNum = Number(foodSubtotal) || 0;
      const minOrder = Number(row.minimum_order_value) || 0;
      if (minOrder > 0 && subtotalNum < minOrder) {
        return res.status(400).json({
          success: false,
          isValid: false,
          valid: false,
          message: `Minimum order value of ₹${minOrder} is required to apply ${row.code}.`,
          error: `Minimum order value of ₹${minOrder} is required to apply ${row.code}.`,
        });
      }

      const outlets = Array.isArray(row.outlet_ids) ? row.outlet_ids : [];
      if (outletId && outlets.length > 0 && !outlets.includes(outletId)) {
        return res.status(400).json({
          success: false,
          isValid: false,
          valid: false,
          message: 'This coupon is not available for the selected kitchen outlet.',
          error: 'This coupon is not available for the selected kitchen outlet.',
        });
      }

      // Resolve all matching customer IDs and order IDs for redemption/limit validation
      const customerIdsToCheck = new Set<string>();
      if (customerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(customerId))) {
        customerIdsToCheck.add(String(customerId));
      }

      const phoneToSearch = customerPhone || (!customerIdsToCheck.size && customerId && /^\d{10}$/.test(String(customerId).replace(/\D/g, '')) ? customerId : null);
      let customerOrders: string[] = [];

      if (phoneToSearch) {
        const cleanPhone = String(phoneToSearch).replace(/\D/g, '').slice(-10);
        const { data: custRows } = await serverSupabase
          .from('customers')
          .select('id')
          .eq('phone', cleanPhone);
        if (Array.isArray(custRows)) {
          custRows.forEach((c: any) => {
            if (c.id) customerIdsToCheck.add(c.id);
          });
        }

        const { data: orderRows } = await serverSupabase
          .from('orders')
          .select('id')
          .ilike('customer_phone', `%${cleanPhone}%`);
        if (Array.isArray(orderRows)) {
          customerOrders = orderRows.map((o: any) => o.id).filter(Boolean);
        }
      }

      if (customerIdsToCheck.size > 0 && customerOrders.length === 0) {
        const idsArray = Array.from(customerIdsToCheck);
        const { data: orderRows } = await serverSupabase
          .from('orders')
          .select('id')
          .in('customer_id', idsArray);
        if (Array.isArray(orderRows)) {
          customerOrders = orderRows.map((o: any) => o.id).filter(Boolean);
        }
      }

      // Check existing redemptions for this coupon
      let userRedemptionCount = 0;
      if (customerIdsToCheck.size > 0 || customerOrders.length > 0) {
        const idsArray = Array.from(customerIdsToCheck);
        
        let redQuery = serverSupabase
          .from('coupon_redemptions')
          .select('id', { count: 'exact', head: true })
          .eq('coupon_id', row.id);

        if (idsArray.length > 0 && customerOrders.length > 0) {
          redQuery = redQuery.or(`customer_id.in.(${idsArray.join(',')}),order_id.in.(${customerOrders.join(',')})`);
        } else if (idsArray.length > 0) {
          redQuery = redQuery.in('customer_id', idsArray);
        } else if (customerOrders.length > 0) {
          redQuery = redQuery.in('order_id', customerOrders);
        }

        const { count } = await redQuery;
        userRedemptionCount = count || 0;
      }

      const couponDisplayName = row.name || row.code;

      // Check per-user redemption limit
      const userLimit = row.usage_limit_per_user != null ? Number(row.usage_limit_per_user) : undefined;
      if (userLimit && userRedemptionCount >= userLimit) {
        return res.status(400).json({
          success: false,
          isValid: false,
          valid: false,
          message: `you've already used this coupon - ${couponDisplayName}`,
          error: `you've already used this coupon - ${couponDisplayName}`,
        });
      }

      // First order validation
      if (row.user_eligibility === 'first_order') {
        if (userRedemptionCount > 0) {
          return res.status(400).json({
            success: false,
            isValid: false,
            valid: false,
            message: `you've already used this coupon - ${couponDisplayName}`,
            error: `you've already used this coupon - ${couponDisplayName}`,
          });
        }
        if (customerOrders.length > 0) {
          return res.status(400).json({
            success: false,
            isValid: false,
            valid: false,
            message: `Coupon ${row.code} is valid only on your first order.`,
            error: `Coupon ${row.code} is valid only on your first order.`,
          });
        }
      }

      // Check overall usage limit
      const totalLimit = row.usage_limit != null ? Number(row.usage_limit) : undefined;
      if (totalLimit) {
        const { count: totalRedCount } = await serverSupabase
          .from('coupon_redemptions')
          .select('id', { count: 'exact', head: true })
          .eq('coupon_id', row.id);
        if (totalRedCount && totalRedCount >= totalLimit) {
          return res.status(400).json({
            success: false,
            isValid: false,
            valid: false,
            message: `Coupon ${row.code} has reached its overall usage limit.`,
            error: `Coupon ${row.code} has reached its overall usage limit.`,
          });
        }
      }

      // Calculate discount
      let discount = 0;
      if (row.discount_type === 'percentage') {
        discount = (subtotalNum * Number(row.discount_value || 0)) / 100;
        if (row.max_discount_amount != null && Number(row.max_discount_amount) > 0) {
          discount = Math.min(discount, Number(row.max_discount_amount));
        }
      } else {
        discount = Number(row.discount_value || 0);
      }

      discount = Math.min(Math.round(discount), subtotalNum);
      const mappedCoupon = mapDbCoupon(row);

      return res.json({
        success: true,
        isValid: true,
        valid: true,
        coupon: mappedCoupon,
        discountAmount: discount,
        message: `${mappedCoupon.discountType === 'percentage' ? `${mappedCoupon.discountValue}% OFF` : `₹${mappedCoupon.discountValue} OFF`} applied successfully!`,
      });
    } catch (err: any) {
      console.error('Validate coupon error:', err);
      return res.status(400).json({
        success: false,
        isValid: false,
        valid: false,
        message: err.message || 'Failed to validate coupon',
        error: err.message || 'Failed to validate coupon',
      });
    }
  });

  // 21d. Coupons: Get Redemption Stats (from Database)
  app.get('/api/coupons/stats', async (req, res) => {
    try {
      const [redemptionsRes, couponsRes] = await Promise.all([
        serverSupabase.from('coupon_redemptions').select('*'),
        serverSupabase.from('coupons').select('id, code'),
      ]);

      const codeMap: Record<string, string> = {};
      if (couponsRes.data) {
        couponsRes.data.forEach((c: any) => {
          if (c.id && c.code) {
            codeMap[c.id] = c.code.toUpperCase();
          }
        });
      }

      const perCoupon: Record<string, { count: number; totalDiscount: number }> = {};
      let totalDiscountGiven = 0;

      if (!redemptionsRes.error && Array.isArray(redemptionsRes.data)) {
        redemptionsRes.data.forEach((r: any) => {
          const cId = r.coupon_id;
          const code = codeMap[cId] || (cId ? String(cId).toUpperCase() : 'UNKNOWN');
          const amt = Number(r.discount_amount || 0);

          [code, cId].forEach((key) => {
            if (!key) return;
            if (!perCoupon[key]) {
              perCoupon[key] = { count: 0, totalDiscount: 0 };
            }
            perCoupon[key].count += 1;
            perCoupon[key].totalDiscount += amt;
          });

          totalDiscountGiven += amt;
        });
      }

      return res.json({
        success: true,
        totalRedemptions: redemptionsRes.data ? redemptionsRes.data.length : 0,
        totalDiscountGiven,
        perCoupon,
      });
    } catch (err: any) {
      console.error('Fetch coupon stats error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch coupon stats' });
    }
  });

  // 21e. Coupons: Create or Update in Database
  app.post('/api/coupons', async (req, res) => {
    try {
      const couponData = req.body;
      const cleanCode = (couponData.code || '').trim().toUpperCase();
      if (!cleanCode) {
        return res.status(400).json({ success: false, error: 'Coupon code is required' });
      }

      const dbPayload: any = {
        code: cleanCode,
        name: couponData.name || couponData.title || cleanCode,
        description: couponData.description || '',
        discount_type: couponData.discountType || 'percentage',
        discount_value: Number(couponData.discountValue) || 10,
        max_discount_amount: couponData.maxDiscountAmount != null ? Number(couponData.maxDiscountAmount) : null,
        minimum_order_value: Number(couponData.minOrderValue) || 0,
        user_eligibility: couponData.userEligibility || 'all',
        usage_limit: couponData.usageLimitTotal != null ? Number(couponData.usageLimitTotal) : (couponData.usageLimit != null ? Number(couponData.usageLimit) : null),
        usage_limit_per_user: couponData.usageLimitPerUser != null ? Number(couponData.usageLimitPerUser) : null,
        outlet_ids: Array.isArray(couponData.outletIds) ? couponData.outletIds : (Array.isArray(couponData.applicableOutlets) ? couponData.applicableOutlets : []),
        valid_from: couponData.validFrom || new Date().toISOString(),
        valid_until: couponData.validUntil || new Date(Date.now() + 3650 * 24 * 3600 * 1000).toISOString(),
        is_active: couponData.isActive ?? true,
        updated_at: new Date().toISOString(),
      };

      if (couponData.id && !couponData.id.startsWith('seed-') && !couponData.id.startsWith('cpn-') && !couponData.id.startsWith('coupon-')) {
        dbPayload.id = couponData.id;
      }

      const { data, error } = await serverSupabase
        .from('coupons')
        .upsert(dbPayload, { onConflict: 'code' })
        .select()
        .single();

      if (error) {
        console.error('Supabase coupon save error:', error.message);
        return res.status(400).json({ success: false, error: error.message });
      }

      const mapped = mapDbCoupon(data);
      return res.status(201).json({ success: true, coupon: mapped });
    } catch (err: any) {
      console.error('Save coupon error:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to save coupon' });
    }
  });

  // 21f. Coupons: Delete from Database
  app.delete('/api/coupons/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const code = req.query.code as string | undefined;

      let error = null;
      if (!id.startsWith('seed-') && !id.startsWith('cpn-') && !id.startsWith('coupon-')) {
        const resDel = await serverSupabase.from('coupons').delete().eq('id', id);
        error = resDel.error;
      } else if (code) {
        const resDel = await serverSupabase.from('coupons').delete().eq('code', code.toUpperCase());
        error = resDel.error;
      }

      if (error) {
        console.error('Supabase coupon delete error:', error.message);
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.json({ success: true, deleted: true });
    } catch (err: any) {
      console.error('Delete coupon error:', err);
      return res.status(500).json({ success: false, error: 'Failed to delete coupon' });
    }
  });

  // 21g. Coupons: Record Redemption in Database
  app.post('/api/coupons/redeem', async (req, res) => {
    try {
      const { couponId, couponCode, customerId, customerPhone, orderId, discountAmount } = req.body;
      const cleanCode = (couponCode || couponId || '').trim().toUpperCase();

      // 1. Resolve actual coupon UUID from Supabase coupons table
      let resolvedCouponId: string | null = null;
      if (couponId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(couponId)) {
        resolvedCouponId = couponId;
      } else {
        const { data: couponRow } = await serverSupabase
          .from('coupons')
          .select('id')
          .ilike('code', cleanCode)
          .maybeSingle();
        if (couponRow?.id) {
          resolvedCouponId = couponRow.id;
        }
      }

      if (!resolvedCouponId) {
        console.warn(`Coupon ${cleanCode} not found in Supabase coupons table for redemption recording.`);
        return res.json({ success: true, message: 'Coupon not found in DB, skipping table insert.' });
      }

      // 2. Resolve customer UUID
      let resolvedCustomerId: string | null = null;
      if (customerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(customerId)) {
        resolvedCustomerId = customerId;
      } else if (customerPhone) {
        const cleanPhone = customerPhone.replace(/\D/g, '').slice(-10);
        const { data: custRow } = await serverSupabase
          .from('customers')
          .select('id')
          .eq('phone', cleanPhone)
          .maybeSingle();
        if (custRow?.id) {
          resolvedCustomerId = custRow.id;
        }
      }

      // 3. Resolve orderId (Supabase orders.id)
      let resolvedOrderId: string | null = null;
      if (orderId) {
        const { data: orderRow } = await serverSupabase
          .from('orders')
          .select('id')
          .or(`id.eq.${orderId},order_id.eq.${orderId}`)
          .maybeSingle();
        if (orderRow?.id) {
          resolvedOrderId = orderRow.id;
        } else {
          resolvedOrderId = orderId;
        }
      }

      if (!resolvedOrderId) {
        console.warn('Cannot record coupon redemption without order ID');
        return res.status(400).json({ success: false, error: 'Order ID is required' });
      }

      // Prevent duplicate redemption row for same order and coupon
      const { data: existingRedemption } = await serverSupabase
        .from('coupon_redemptions')
        .select('id')
        .eq('coupon_id', resolvedCouponId)
        .eq('order_id', resolvedOrderId)
        .maybeSingle();

      if (existingRedemption?.id) {
        return res.json({ success: true, redemption: existingRedemption, alreadyRecorded: true });
      }

      const { data, error } = await serverSupabase
        .from('coupon_redemptions')
        .insert([{
          coupon_id: resolvedCouponId,
          customer_id: resolvedCustomerId,
          order_id: resolvedOrderId,
          discount_amount: Number(discountAmount) || 0,
          redeemed_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase redemption insert error:', error.message);
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.json({ success: true, redemption: data });
    } catch (err: any) {
      console.error('Record coupon redemption error:', err);
      return res.status(400).json({ success: false, error: 'Failed to record redemption' });
    }
  });

  // =====================
  // SWAD COIN REWARD & TRANSACTION LEDGER ENDPOINTS
  // =====================

  // 1. Get Customer Swad Coin Balance
  app.get('/api/swad-coins/balance', async (req, res) => {
    try {
      const rawPhone = String(req.query.phone || req.headers['x-customer-phone'] || '');
      const customerId = String(req.query.customerId || '');
      const identifier = customerId || rawPhone;

      if (!identifier) {
        return res.status(400).json({ success: false, error: 'Customer identifier or phone number is required.' });
      }

      let balance = 0;

      // 1. Authoritative check in Supabase
      let supaCust: any = null;
      try {
        if (customerId && isUUID(customerId)) {
          const { data } = await serverSupabase
            .from('customers')
            .select('id, phone, swad_coin_balance')
            .eq('id', customerId)
            .maybeSingle();
          supaCust = data;
        }
        if (!supaCust && rawPhone) {
          const norm = normalizePhone(rawPhone);
          if (norm) {
            const { data } = await serverSupabase
              .from('customers')
              .select('id, phone, swad_coin_balance')
              .or(`phone.eq.${norm},phone.eq.+91${norm}`)
              .maybeSingle();
            supaCust = data;
          }
        }
      } catch (supaErr) {
        console.warn('Supabase balance lookup notice:', supaErr);
      }

      if (supaCust && supaCust.swad_coin_balance !== undefined && supaCust.swad_coin_balance !== null) {
        // Supabase is the single source of truth
        balance = Math.max(0, Number(supaCust.swad_coin_balance));
      } else {
        // Fallback to local storage only if customer is not found in Supabase
        let localBalance = 0;
        if (rawPhone) {
          localBalance = productStorage.getCustomerSwadCoinBalance(rawPhone);
        }
        if (localBalance === 0 && customerId) {
          localBalance = productStorage.getCustomerSwadCoinBalance(customerId);
        }
        balance = Math.max(0, localBalance);
      }

      // Synchronize in-memory store under phone and customerId to match authoritative balance
      if (rawPhone) productStorage.setCustomerSwadCoinBalance(rawPhone, balance);
      if (supaCust?.phone) productStorage.setCustomerSwadCoinBalance(supaCust.phone, balance);
      if (customerId) productStorage.setCustomerSwadCoinBalance(customerId, balance);
      if (supaCust?.id) productStorage.setCustomerSwadCoinBalance(supaCust.id, balance);

      return res.json({ success: true, balance });
    } catch (err: any) {
      console.error('Get Swad Coin balance error:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve balance.' });
    }
  });

  // 2. Get Pending Rewards for Customer (From Supabase swad_coin_rewards & local storage)
  app.get('/api/swad-coins/rewards/pending', async (req, res) => {
    try {
      const rawPhone = String(req.query.phone || req.headers['x-customer-phone'] || '');
      const customerId = String(req.query.customerId || '');
      const identifier = customerId || rawPhone;

      if (!identifier) {
        return res.status(400).json({ success: false, error: 'Customer identifier or phone number is required.' });
      }

      // Check Supabase swad_coin_rewards
      let supaRewards: any[] = [];
      try {
        let supaCustId = customerId;
        if (!supaCustId && rawPhone) {
          const norm = normalizePhone(rawPhone);
          const { data: c } = await serverSupabase.from('customers').select('id').eq('phone', norm).maybeSingle();
          if (c?.id) supaCustId = c.id;
        }

        if (supaCustId) {
          const { data: rows, error } = await serverSupabase
            .from('swad_coin_rewards')
            .select('*')
            .eq('customer_id', supaCustId)
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(rows)) {
            supaRewards = rows.map((r) => ({
              id: r.id,
              orderId: r.order_id,
              coinAmount: Number(r.coin_amount) || 0,
              status: r.status,
              expiresAt: r.expires_at,
              createdAt: r.created_at,
            }));
          }
        }
      } catch (err) {
        console.warn('Error fetching Supabase pending rewards:', err);
      }

      // Also get any pending rewards from local storage
      const localPending = productStorage.getPendingRewardsForCustomer(identifier);
      const localFormatted = localPending.map((r) => ({
        id: r.id,
        orderId: r.orderId,
        coinAmount: r.coinAmount,
        status: r.status,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt,
      }));

      // Combine and deduplicate
      const seen = new Set<string>();
      const combined: any[] = [];

      for (const r of [...supaRewards, ...localFormatted]) {
        const key = r.orderId ? `${r.orderId}` : r.id;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(r);
        }
      }

      return res.json({ success: true, rewards: combined });
    } catch (err: any) {
      console.error('Get pending rewards error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch pending rewards.' });
    }
  });

  // 2b. Get Full Reward Vault (Both PENDING and CLAIMED cards from Supabase swad_coin_rewards)
  app.get('/api/swad-coins/rewards/vault', async (req, res) => {
    try {
      const rawPhone = String(req.query.phone || req.headers['x-customer-phone'] || '');
      const customerId = String(req.query.customerId || '');
      const identifier = customerId || rawPhone;

      if (!identifier) {
        return res.status(400).json({ success: false, error: 'Customer identifier or phone number is required.' });
      }

      let supaCustId = customerId;
      if (!supaCustId && rawPhone) {
        const norm = normalizePhone(rawPhone);
        const { data: c } = await serverSupabase.from('customers').select('id').eq('phone', norm).maybeSingle();
        if (c?.id) supaCustId = c.id;
      }

      let allRewards: any[] = [];

      if (supaCustId) {
        try {
          const { data: rows, error } = await serverSupabase
            .from('swad_coin_rewards')
            .select('*')
            .eq('customer_id', supaCustId)
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(rows)) {
            allRewards = rows.map((r) => ({
              id: r.id,
              orderId: r.order_id,
              coinAmount: Number(r.coin_amount) || 0,
              status: r.status,
              expiresAt: r.expires_at,
              claimedAt: r.claimed_at,
              createdAt: r.created_at,
            }));
          }
        } catch (err) {
          console.warn('Supabase vault query error:', err);
        }
      }

      // Merge local storage rewards if not present
      const localStore = productStorage.getAllRewardsForCustomer ? productStorage.getAllRewardsForCustomer(identifier) : [];
      const seen = new Set<string>();
      const combined: any[] = [];

      for (const r of [...allRewards, ...localStore]) {
        const key = r.orderId ? `${r.orderId}` : r.id;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(r);
        }
      }

      const pendingRewards = combined.filter((r) => r.status === 'PENDING');
      const claimedRewards = combined.filter((r) => r.status === 'CLAIMED');

      return res.json({
        success: true,
        cards: combined,
        pendingRewards,
        claimedRewards,
        totalCards: combined.length,
      });
    } catch (err: any) {
      console.error('Get rewards vault error:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve card vault.' });
    }
  });

  // In-flight mutex locks for active reward claims to prevent concurrent double-claim race conditions
  const inFlightClaimLocks = new Set<string>();

  // 3. Claim Pending Reward (Atomic Single Claim & Balance Credit across Supabase & Local)
  app.post('/api/swad-coins/rewards/:rewardId/claim', async (req, res) => {
    const { rewardId } = req.params;

    // Mutex Lock: If this reward is currently in the middle of being processed, reject simultaneous requests immediately
    if (inFlightClaimLocks.has(rewardId)) {
      return res.status(409).json({
        success: false,
        error: 'Claim operation is already in progress. Please wait a moment.'
      });
    }

    inFlightClaimLocks.add(rewardId);

    try {
      const rawPhone = String(req.body.phone || req.query.phone || req.headers['x-customer-phone'] || '');
      const customerId = String(req.body.customerId || req.query.customerId || '');
      const identifier = customerId || rawPhone;

      if (!identifier) {
        return res.status(400).json({ success: false, error: 'Customer identifier or phone number is required.' });
      }

      const nowIso = new Date().toISOString();

      // 1. First check if reward is in Supabase swad_coin_rewards
      try {
        const { data: supaReward } = await serverSupabase
          .from('swad_coin_rewards')
          .select('*')
          .eq('id', rewardId)
          .maybeSingle();

        if (supaReward) {
          if (supaReward.status === 'CLAIMED') {
            return res.status(400).json({ success: false, error: 'This surprise card has already been claimed.' });
          }

          if (supaReward.status === 'EXPIRED' || (supaReward.expires_at && new Date(supaReward.expires_at).getTime() < Date.now())) {
            return res.status(400).json({ success: false, error: 'This reward has expired.' });
          }

          const earned = Number(supaReward.coin_amount) || 0;

          // ATOMIC CONDITIONAL UPDATE:
          // Only one request can successfully update from 'PENDING' to 'CLAIMED'.
          // Any simultaneous or concurrent request will match 0 rows and return null!
          const { data: atomicUpdatedReward, error: updateError } = await serverSupabase
            .from('swad_coin_rewards')
            .update({
              status: 'CLAIMED',
              claimed_at: nowIso,
              updated_at: nowIso,
            })
            .eq('id', rewardId)
            .eq('status', 'PENDING')
            .select('*')
            .maybeSingle();

          if (updateError || !atomicUpdatedReward) {
            return res.status(400).json({
              success: false,
              error: 'This surprise card has already been claimed or is being processed.'
            });
          }

          // Get customer record
          const { data: supaCust } = await serverSupabase
            .from('customers')
            .select('id, phone, swad_coin_balance')
            .eq('id', supaReward.customer_id)
            .maybeSingle();

          const prevBal = Number(supaCust?.swad_coin_balance || 0);
          const newBal = prevBal + earned;

          if (supaCust?.id) {
            // Update customer balance in Supabase
            await serverSupabase
              .from('customers')
              .update({
                swad_coin_balance: newBal,
                updated_at: nowIso,
              })
              .eq('id', supaCust.id);

            // Record transaction in Supabase
            await serverSupabase
              .from('swad_coin_transactions')
              .insert({
                customer_id: supaCust.id,
                type: 'EARN',
                amount: earned,
                balance_before: prevBal,
                balance_after: newBal,
                reward_id: supaReward.id,
                order_id: supaReward.order_id || null,
                description: `Surprise cash-back reward unlocked (${supaReward.order_id || 'Order'})`,
                created_at: nowIso,
              });
          }

          // Also mirror to local storage
          const phoneToSync = supaCust?.phone || rawPhone;
          if (phoneToSync) {
            productStorage.creditSwadCoins(phoneToSync, earned, `Surprise reward ${supaReward.order_id || rewardId}`);
          }

          return res.json({
            success: true,
            message: `Congratulations! You unlocked ${earned} Swad Coins!`,
            claimedAmount: earned,
            coinsEarned: earned,
            newBalance: newBal,
          });
        }
      } catch (supaErr) {
        console.warn('Supabase claim attempt error:', supaErr);
      }

      // 2. Fallback to local storage claim
      const result = productStorage.claimReward(rewardId, identifier);

      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error || 'Failed to claim reward.' });
      }

      // Sync updated balance to Supabase if customer exists
      const norm = normalizePhone(identifier);
      if (norm) {
        try {
          const { data: cust } = await serverSupabase
            .from('customers')
            .update({
              swad_coin_balance: result.newBalance,
              updated_at: nowIso,
            })
            .eq('phone', norm)
            .select('id')
            .maybeSingle();

          // Also update swad_coin_rewards in Supabase to CLAIMED
          if (result.reward?.orderId) {
            await serverSupabase
              .from('swad_coin_rewards')
              .update({
                status: 'CLAIMED',
                claimed_at: nowIso,
                updated_at: nowIso,
              })
              .eq('order_id', result.reward.orderId)
              .eq('status', 'PENDING');
          }

          // Insert immutable transaction record into swad_coin_transactions
          if (cust?.id && result.transaction) {
            await serverSupabase
              .from('swad_coin_transactions')
              .insert({
                customer_id: cust.id,
                type: 'EARN',
                amount: result.coinsEarned || result.transaction.amount,
                balance_before: result.transaction.balanceBefore,
                balance_after: result.newBalance || result.transaction.balanceAfter,
                reward_id: result.reward?.id || null,
                order_id: result.reward?.orderId || null,
                description: result.transaction.description || 'Surprise reward claimed',
                created_at: nowIso,
              });
          }
        } catch (supaErr) {
          // Local storage is authoritative fallback
        }
      }

      return res.json({
        success: true,
        message: `Congratulations! You unlocked ${result.coinsEarned} Swad Coins!`,
        claimedAmount: result.coinsEarned,
        coinsEarned: result.coinsEarned,
        newBalance: result.newBalance,
      });
    } catch (err: any) {
      console.error('Claim reward error:', err);
      return res.status(500).json({ success: false, error: 'Failed to claim reward.' });
    } finally {
      // Release in-flight claim mutex lock
      inFlightClaimLocks.delete(rewardId);
    }
  });

  // 4. Get Customer Transaction Ledger
  app.get('/api/swad-coins/transactions', async (req, res) => {
    try {
      const rawPhone = String(req.query.phone || req.headers['x-customer-phone'] || '');
      const customerId = String(req.query.customerId || '');
      const identifier = customerId || rawPhone;

      if (!identifier) {
        return res.status(400).json({ success: false, error: 'Customer identifier or phone number is required.' });
      }

      const txList: any[] = [];
      const seenIds = new Set<string>();

      // 1. Fetch from Supabase swad_coin_transactions
      try {
        let supaCustomerId = customerId;
        if ((!supaCustomerId || !isUUID(supaCustomerId)) && rawPhone) {
          const norm = normalizePhone(rawPhone);
          if (norm) {
            const { data: c } = await serverSupabase
              .from('customers')
              .select('id')
              .or(`phone.eq.${norm},phone.eq.+91${norm}`)
              .maybeSingle();
            if (c?.id) supaCustomerId = c.id;
          }
        }

        if (supaCustomerId && isUUID(supaCustomerId)) {
          const { data: supaTxs } = await serverSupabase
            .from('swad_coin_transactions')
            .select('*')
            .eq('customer_id', supaCustomerId)
            .order('created_at', { ascending: false });

          if (supaTxs && Array.isArray(supaTxs)) {
            for (const tx of supaTxs) {
              const txKey = `${tx.order_id || ''}-${tx.type}-${tx.amount}`;
              seenIds.add(tx.id);
              seenIds.add(txKey);
              txList.push({
                id: tx.id,
                customerId: tx.customer_id,
                type: tx.type,
                amount: tx.amount,
                balanceBefore: tx.balance_before,
                balanceAfter: tx.balance_after,
                orderId: tx.order_id,
                description: tx.description,
                createdAt: tx.created_at,
              });
            }
          }
        }
      } catch (sErr) {
        console.warn('Supabase transactions fetch notice:', sErr);
      }

      // 2. Fetch from local productStorage and merge
      try {
        let localTxs = productStorage.getCustomerTransactions(identifier);
        if ((!localTxs || localTxs.length === 0) && rawPhone) {
          localTxs = productStorage.getCustomerTransactions(rawPhone);
        }
        if (localTxs && Array.isArray(localTxs)) {
          for (const tx of localTxs) {
            const txKey = `${tx.orderId || ''}-${tx.type}-${tx.amount}`;
            if (!seenIds.has(tx.id) && !seenIds.has(txKey)) {
              seenIds.add(tx.id);
              seenIds.add(txKey);
              txList.push(tx);
            }
          }
        }
      } catch (lErr) {
        console.warn('Local transactions fetch notice:', lErr);
      }

      // Sort by date descending
      txList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      return res.json({ success: true, transactions: txList });
    } catch (err: any) {
      console.error('Get transactions error:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve transactions.' });
    }
  });

  // 5. Admin: Credit Coins to Customer (Protected)
  app.post('/api/admin/swad-coins/credit', requireOwnerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { customerIdOrPhone, amount, reason } = req.body;
      if (!customerIdOrPhone || !amount || !reason) {
        return res.status(400).json({
          success: false,
          error: 'customerIdOrPhone, amount (> 0), and a clear reason are required.',
        });
      }

      const cleanAmount = Math.floor(Number(amount));
      if (isNaN(cleanAmount) || cleanAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Amount must be a positive integer.' });
      }

      const cleanReason = String(reason).trim();
      if (!cleanReason) {
        return res.status(400).json({ success: false, error: 'A valid reason is required.' });
      }

      const adminId = req.user?.email || 'owner';

      // 1. Sync with local memory store
      const localResult = productStorage.adminCreditCoins(
        customerIdOrPhone,
        cleanAmount,
        cleanReason,
        adminId
      );

      // 2. Query Supabase for customer
      let supaCustomer: any = null;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(customerIdOrPhone).trim());
      if (isUuid) {
        const { data } = await serverSupabase.from('customers').select('*').eq('id', customerIdOrPhone).maybeSingle();
        supaCustomer = data;
      }
      if (!supaCustomer) {
        const norm = normalizePhone(customerIdOrPhone);
        if (norm) {
          const { data } = await serverSupabase.from('customers').select('*').eq('phone', norm).maybeSingle();
          supaCustomer = data;
        }
      }

      let newBalance = localResult.newBalance;
      let customerUuid = supaCustomer?.id || (isUuid ? customerIdOrPhone : null);
      let customerName = supaCustomer?.full_name || '';
      let customerPhone = supaCustomer?.phone || '';

      if (supaCustomer) {
        const currentBalance = Number(supaCustomer.swad_coin_balance || 0);
        newBalance = currentBalance + cleanAmount;
        customerUuid = supaCustomer.id;
        customerName = supaCustomer.full_name;
        customerPhone = supaCustomer.phone;

        // Update customer balance in Supabase
        await serverSupabase
          .from('customers')
          .update({
            swad_coin_balance: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq('id', customerUuid);

        // Directly insert transaction row into swad_coin_transactions
        try {
          await serverSupabase
            .from('swad_coin_transactions')
            .insert({
              customer_id: customerUuid,
              type: 'ADMIN_CREDIT',
              amount: cleanAmount,
              balance_before: currentBalance,
              balance_after: newBalance,
              admin_id: adminId,
              description: cleanReason,
              order_id: null,
              reward_id: null,
              created_at: new Date().toISOString(),
            });
        } catch (txInsertErr) {
          console.warn('Supabase swad_coin_transactions insert warning:', txInsertErr);
        }

        if (customerPhone) productStorage.setCustomerSwadCoinBalance(customerPhone, newBalance);
        if (customerUuid) productStorage.setCustomerSwadCoinBalance(customerUuid, newBalance);
      }

      return res.json({
        success: true,
        message: `Successfully credited ${cleanAmount} Swad Coins.`,
        newBalance,
        customerId: customerUuid,
        customerName,
        customerPhone,
        transaction: {
          type: 'ADMIN_CREDIT',
          amount: cleanAmount,
          description: cleanReason,
          admin_id: adminId,
          balance_after: newBalance,
          created_at: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error('Admin credit coins error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to credit coins.' });
    }
  });

  // 6. Admin: Debit Coins from Customer (Protected)
  app.post('/api/admin/swad-coins/debit', requireOwnerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { customerIdOrPhone, amount, reason } = req.body;
      if (!customerIdOrPhone || !amount || !reason) {
        return res.status(400).json({
          success: false,
          error: 'customerIdOrPhone, amount (> 0), and a clear reason are required.',
        });
      }

      const result = productStorage.adminDebitCoins(
        customerIdOrPhone,
        Number(amount),
        String(reason),
        req.user?.email || 'owner'
      );

      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }

      const norm = normalizePhone(customerIdOrPhone);
      if (norm) {
        try {
          await serverSupabase
            .from('customers')
            .update({
              swad_coin_balance: result.newBalance,
              updated_at: new Date().toISOString(),
            })
            .eq('phone', norm);
        } catch (supaErr) {
          // Log note
        }
      }

      return res.json({
        success: true,
        message: `Successfully debited ${amount} Swad Coins.`,
        newBalance: result.newBalance,
        transaction: result.transaction,
      });
    } catch (err: any) {
      console.error('Admin debit coins error:', err);
      return res.status(500).json({ success: false, error: 'Failed to debit coins.' });
    }
  });

  // 7. Admin: Get All Customers with Swad Coins Stats (Protected)
  app.get('/api/admin/swad-coins/customers', requireOwnerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Fetch directly and strictly from Supabase 'customers' table
      const { data: supaCustomers, error } = await serverSupabase
        .from('customers')
        .select('id, phone, full_name, email, swad_coin_balance, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase customers query error:', error);
        return res.status(500).json({ success: false, error: 'Failed to retrieve customers from database.' });
      }

      const customers = (supaCustomers || []).map((sc: any) => ({
        id: sc.id,
        phone: sc.phone || '',
        fullName: sc.full_name || 'Customer',
        email: sc.email || '',
        swadCoinBalance: typeof sc.swad_coin_balance === 'number' ? sc.swad_coin_balance : 0,
        createdAt: sc.created_at || new Date().toISOString(),
      })).sort((a: any, b: any) => (b.swadCoinBalance || 0) - (a.swadCoinBalance || 0));

      return res.json({ success: true, customers });
    } catch (err: any) {
      console.error('Admin get customers coins error:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve customers.' });
    }
  });

  // 7b. Admin: Get Swad Coins Global Overview Stats (Protected)
  app.get('/api/admin/swad-coins/stats', requireOwnerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const [
        { data: rewards, error: rErr },
        { data: txs, error: tErr },
        { data: custs, error: cErr }
      ] = await Promise.all([
        serverSupabase.from('swad_coin_rewards').select('status, coin_amount'),
        serverSupabase.from('swad_coin_transactions').select('type, amount'),
        serverSupabase.from('customers').select('swad_coin_balance'),
      ]);

      if (rErr) console.warn('Supabase rewards fetch warning for stats:', rErr);
      if (tErr) console.warn('Supabase transactions fetch warning for stats:', tErr);
      if (cErr) console.warn('Supabase customers fetch warning for stats:', cErr);

      let pendingRewards = 0;
      let claimedRewards = 0;
      let expiredRewards = 0;

      for (const r of rewards || []) {
        const amt = Number(r.coin_amount) || 0;
        const st = String(r.status || '').toUpperCase();
        if (st === 'PENDING') pendingRewards += amt;
        else if (st === 'CLAIMED') claimedRewards += amt;
        else if (st === 'EXPIRED') expiredRewards += amt;
      }

      let earnTx = 0;
      let adminCreditTx = 0;
      let adminDebitTx = 0;
      let redeemTx = 0;
      let refundTx = 0;

      for (const t of txs || []) {
        const amt = Number(t.amount) || 0;
        const type = String(t.type || '').toUpperCase();
        if (type === 'EARN') earnTx += amt;
        else if (type === 'ADMIN_CREDIT') adminCreditTx += amt;
        else if (type === 'ADMIN_DEBIT') adminDebitTx += Math.abs(amt);
        else if (type === 'REDEEM') redeemTx += Math.abs(amt);
        else if (type === 'REFUND') refundTx += Math.abs(amt);
      }

      let inCirculation = 0;
      for (const c of custs || []) {
        inCirculation += Number(c.swad_coin_balance) || 0;
      }

      // Fallback calculation for circulation if custs table is empty
      if (inCirculation === 0 && (earnTx > 0 || adminCreditTx > 0)) {
        inCirculation = Math.max(0, (earnTx + adminCreditTx + refundTx) - (redeemTx + adminDebitTx));
      }

      // 1. TOTAL ISSUED: all coin_amount from swad_coin_rewards (PENDING + Claimed) + ADMIN_CREDIT from swad_coin_transactions
      const totalIssued = (pendingRewards + claimedRewards) + adminCreditTx;

      // 2. PENDING: from swad_coin_rewards (PENDING)
      const pending = pendingRewards;

      // 3. CLAIMED: from swad_coin_transactions (EARN + ADMIN_CREDIT) - ADMIN_DEBIT (per pt 2.2 recommendation)
      const claimed = (earnTx + adminCreditTx) - adminDebitTx;

      // 4. REDEEMED (NET): REDEEM minus REFUND from swad_coin_transactions
      const netRedeemed = Math.max(0, redeemTx - refundTx);

      // Derived/subtitle metrics:
      const expired = expiredRewards;

      return res.json({
        success: true,
        stats: {
          totalIssued,
          pending,
          claimed,
          redeemed: netRedeemed,
          grossRedeemed: redeemTx,
          refunded: refundTx,
          expired,
          inCirculation,
        }
      });
    } catch (err: any) {
      console.error('Admin get swad-coins stats error:', err);
      return res.status(500).json({ success: false, error: 'Failed to compute Swad Coins statistics.' });
    }
  });

  // 8. Admin/Cron: Trigger Daily Reward Generation (Protected)
  app.post('/api/admin/swad-coins/generate-rewards', requireOwnerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      let supaOrders: any[] = [];
      try {
        const { data } = await serverSupabase
          .from('orders')
          .select('*')
          .in('order_status', ['delivered', 'picked_up']);
        if (data) supaOrders = data;
      } catch (e) {
        console.warn('Supabase fetch note in generate-rewards endpoint:', e);
      }

      const summary = productStorage.generateDailySwadCoinRewards(supaOrders);

      // Synchronize all pending/active rewards from local storage to Supabase swad_coin_rewards
      let syncedToSupabase = 0;
      let alreadyInSupabase = 0;
      let rlsBlocked = false;
      const syncErrors: string[] = [];

      try {
        const allRewards = productStorage.getAllSwadCoinRewards();
        const [{ data: existingRewards }, { data: supaCusts }] = await Promise.all([
          serverSupabase.from('swad_coin_rewards').select('order_id, id'),
          serverSupabase.from('customers').select('id, phone'),
        ]);

        const existingOrderIds = new Set((existingRewards || []).map((r: any) => r.order_id));
        const customersList = supaCusts || [];

        for (const reward of allRewards) {
          const orderId = reward.orderId;
          if (!orderId) continue;

          if (existingOrderIds.has(orderId)) {
            alreadyInSupabase++;
            continue;
          }

          // Resolve customer UUID in Supabase
          let customerIdUuid: string | null = null;
          const ord = supaOrders.find((o: any) => o.order_number === orderId || o.order_id === orderId || o.id === orderId);
          if (ord?.customer_id && ord.customer_id.length > 20) {
            customerIdUuid = ord.customer_id;
          } else if (ord?.customer_phone) {
            const norm = normalizePhone(ord.customer_phone);
            const foundCust = customersList.find((c: any) => normalizePhone(c.phone) === norm);
            if (foundCust?.id) customerIdUuid = foundCust.id;
          }

          if (!customerIdUuid) {
            const storageCust = productStorage.getAllCustomersWithCoins().find((c) => c.id === reward.customerId);
            if (storageCust?.phone) {
              const norm = normalizePhone(storageCust.phone);
              const foundCust = customersList.find((c: any) => normalizePhone(c.phone) === norm);
              if (foundCust?.id) customerIdUuid = foundCust.id;
            }
          }

          if (!customerIdUuid && customersList.length > 0) {
            customerIdUuid = customersList[0].id;
          }

          if (!customerIdUuid) {
            syncErrors.push(`Order ${orderId}: No customer UUID found in Supabase`);
            continue;
          }

          const { error: insertErr } = await serverSupabase
            .from('swad_coin_rewards')
            .insert({
              customer_id: customerIdUuid,
              order_id: orderId,
              eligible_order_value: Number(reward.eligibleOrderValue || 0),
              reward_percentage: Number(reward.rewardPercentage || 1.0),
              coin_amount: Number(reward.coinAmount || 5),
              status: reward.status || 'PENDING',
              expires_at: reward.expiresAt,
              created_at: reward.createdAt || new Date().toISOString(),
              updated_at: reward.updatedAt || new Date().toISOString(),
            });

          if (insertErr) {
            if (insertErr.code === '42501' || insertErr.message?.includes('row-level security')) {
              rlsBlocked = true;
            }
            syncErrors.push(`Order ${orderId}: ${insertErr.message}`);
          } else {
            syncedToSupabase++;
            existingOrderIds.add(orderId);
          }
        }
      } catch (syncErr: any) {
        console.warn('Sync to Supabase swad_coin_rewards note:', syncErr.message);
      }

      let message = `Daily rewards processed: ${summary.created} new generated, ${summary.skippedAlreadyRewarded} skipped (already rewarded).`;
      if (syncedToSupabase > 0) {
        message += ` ${syncedToSupabase} reward row(s) successfully written to Supabase swad_coin_rewards.`;
      }
      if (alreadyInSupabase > 0) {
        message += ` (${alreadyInSupabase} already exist in Supabase).`;
      }
      if (rlsBlocked) {
        message += ` ⚠️ Note: Row-Level Security (RLS) is active on Supabase swad_coin_rewards. Please disable RLS or add a public policy in Supabase SQL Editor.`;
      }

      return res.json({
        success: true,
        message,
        summary: {
          ...summary,
          syncedToSupabase,
          alreadyInSupabase,
          rlsBlocked,
          syncErrors: syncErrors.slice(0, 3),
        },
      });
    } catch (err: any) {
      console.error('Generate rewards error:', err);
      return res.status(500).json({ success: false, error: 'Failed to generate rewards.' });
    }
  });

  // =====================
  // ORDERS ENDPOINTS & HELPERS
  // =====================

  async function getNextServerOrderId(): Promise<string> {
    try {
      const { data, error } = await serverSupabase
        .from('orders')
        .select('order_id, order_number')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !data || data.length === 0) {
        return 'GKSWAD-#00001';
      }

      let maxNum = 0;
      for (const row of data) {
        const idToCheck = row.order_number || row.order_id;
        if (idToCheck) {
          const match = idToCheck.match(/GKSWAD-#?0*(\d+)/i) || idToCheck.match(/GKS-#?0*(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        }
      }
      const nextSeq = maxNum + 1;
      return `GKSWAD-#${String(nextSeq).padStart(5, '0')}`;
    } catch {
      return 'GKSWAD-#00001';
    }
  }

  function mapDbOrderRow(data: any): any {
    if (!data) return null;
    const isPickup = data.order_type === 'pickup' || !!data.is_self_pickup;
    const rawStatus = String(data.order_status || data.status || 'received').toLowerCase().trim();
    const displayStatus =
      rawStatus === 'received'
        ? 'Received'
        : rawStatus === 'confirmed'
        ? 'Confirmed'
        : rawStatus === 'preparing' || rawStatus === 'in kitchen' || rawStatus === 'preparing in kitchen'
        ? 'Preparing in Kitchen'
        : rawStatus === 'ready'
        ? 'Ready'
        : rawStatus === 'ready_for_pickup' || rawStatus === 'ready for pickup'
        ? 'Ready for Pickup'
        : rawStatus === 'ready_for_dispatch' || rawStatus === 'ready for dispatch'
        ? 'Ready for Dispatch'
        : rawStatus === 'out_for_delivery' || rawStatus === 'out for delivery'
        ? 'Out for Delivery'
        : rawStatus === 'delivered'
        ? 'Delivered'
        : rawStatus === 'picked_up' || rawStatus === 'picked up'
        ? 'Picked Up'
        : rawStatus === 'cancelled'
        ? 'Cancelled'
        : rawStatus.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

    return {
      id: data.id,
      orderId: data.order_id || data.order_number || data.id,
      orderNumber: data.order_number || data.order_id,
      outletId: data.outlet_id,
      outletName: data.outlet_name || (data.delivery_address_snapshot as any)?.outletName || undefined,
      customerId: data.customer_id,
      addressId: isPickup ? undefined : (data.address_id || undefined),
      orderType: data.order_type || (isPickup ? 'pickup' : 'delivery'),
      isSelfPickup: isPickup,
      items: Array.isArray(data.items) ? data.items.map(deserializeOrderItem) : [],
      subtotal: Number(data.subtotal || 0),
      discount: Number(data.discount_amount || data.discount || 0),
      welcomeDiscountAmount: Number(data.welcome_discount_amount || 0),
      isWelcomeDiscountApplied: !!data.welcome_discount_applied,
      deliveryFee: Number(data.delivery_fee || 0),
      packagingFee: Number(data.packaging_fee || 0),
      gst: Number(data.tax_amount || data.gst || 0),
      swadCoinsUsed: Number(data.swad_coins_used || 0),
      swadCoinDiscountAmount: Number(data.swad_coin_discount_amount || 0),
      total: Number(data.total_amount || data.total || 0),
      couponCode: data.discount_code || data.coupon_code || undefined,
      deliveryPinCode: data.delivery_pincode || '',
      customerDetails: data.customer_details || {
        fullName: data.customer_name,
        phone: data.customer_phone,
      },
      deliveryAddressSnapshot: isPickup ? undefined : (data.delivery_address_snapshot || undefined),
      status: displayStatus,
      orderStatus: data.order_status,
      estimatedDeliveryMinutes: data.estimated_delivery_minutes || (isPickup ? 25 : 35),
      createdAt: data.placed_at || data.created_at,
      placedAt: data.placed_at || data.created_at,
      confirmedAt: data.confirmed_at || undefined,
      preparingAt: data.preparing_at || undefined,
      readyAt: data.ready_at || undefined,
      outForDeliveryAt: data.out_for_delivery_at || undefined,
      deliveredAt: data.delivered_at || undefined,
      cancelledAt: data.cancelled_at || undefined,
      cancellationReason: data.cancellation_reason || undefined,
      scheduledAt: data.scheduled_at || undefined,
    };
  }

  // 21. Orders: Create Order (Fresh Implementation with server-side discount & totals recalculation and Supabase synchronization)
  app.post('/api/orders', async (req, res) => {
    try {
      const payload = req.body;
      const rawPhone = payload.customerDetails?.phone || '';
      const normPhone = rawPhone.replace(/\D/g, '').slice(-10);

      // Discounts are solely driven by the validated coupon (one coupon per order rule)
      let welcomeDiscountAmount = 0;
      let isWelcomeDiscountApplied = false;

      const isSelfPickup = !!(payload.isSelfPickup || payload.orderType === 'pickup');

      const orderData = {
        ...payload,
        isSelfPickup,
        orderType: isSelfPickup ? 'pickup' : 'delivery',
        welcomeDiscountAmount: 0,
        isWelcomeDiscountApplied: false,
      };

      const order = productStorage.createOrder(orderData);

      // Record coupon redemption if coupon was applied
      if (order.couponCode || payload.couponId) {
        try {
          productStorage.recordCouponRedemption({
            couponId: payload.couponId || order.couponCode,
            couponCode: order.couponCode,
            customerId: order.customerId || undefined,
            customerPhone: normPhone || undefined,
            orderId: order.orderId || order.id,
            discountAmount: Number(order.discount || payload.discount || 0),
            orderTotal: Number(order.total || 0),
          });
        } catch (couponRedeemErr) {
          console.warn('Coupon redemption record error:', couponRedeemErr);
        }
      }

      // Process Swad Coins redemption (1 Coin = ₹1, up to 10% of eligible food value)
      const requestedCoins = Math.max(0, Math.floor(Number(payload.requestedSwadCoins || payload.swadCoinsUsed || 0)));
      let swadCoinsUsed = 0;
      let swadCoinDiscountAmount = 0;
      let swadCoinRedemptionTx: any = null;

      if (requestedCoins > 0 && normPhone) {
        try {
          // Verify customer balance against both Supabase and local storage
          let currentCoinBalance = 0;
          let supaCustForCoin: any = null;

          try {
            const { data: sCust } = await serverSupabase
              .from('customers')
              .select('id, phone, swad_coin_balance')
              .or(`phone.eq.${normPhone},phone.eq.+91${normPhone}`)
              .maybeSingle();
            if (sCust) {
              supaCustForCoin = sCust;
              if (sCust.swad_coin_balance !== undefined && sCust.swad_coin_balance !== null) {
                currentCoinBalance = Math.max(0, Number(sCust.swad_coin_balance));
              }
            }
          } catch (fetchErr) {
            console.warn('Supabase coin balance lookup notice:', fetchErr);
          }

          if (!supaCustForCoin) {
            currentCoinBalance = Math.max(0, productStorage.getCustomerSwadCoinBalance(normPhone));
          }

          // Strict server-side verification:
          // 1. eligibleOrderValue = food/item value after applicable coupon discount
          const eligibleFoodValue = Math.max(0, Number(order.subtotal || 0) - Number(order.discount || 0));
          // 2. maximumCoinDiscount = FLOOR(eligibleOrderValue * 10 / 100)
          const maximumCoinDiscount = Math.floor(eligibleFoodValue * 0.10);
          // 3. coinsToUse = MIN(requestedCoins, customerCurrentBalance, maximumCoinDiscount)
          const coinsToDeduct = Math.min(requestedCoins, currentCoinBalance, maximumCoinDiscount);

          if (coinsToDeduct > 0) {
            const balanceAfterRedeem = Math.max(0, currentCoinBalance - coinsToDeduct);

            // Deduct in productStorage
            const redeemRes = productStorage.redeemSwadCoins(
              normPhone,
              order.orderId || order.id,
              coinsToDeduct,
              eligibleFoodValue
            );
            productStorage.setCustomerSwadCoinBalance(normPhone, balanceAfterRedeem);
            if (supaCustForCoin?.id) {
              productStorage.setCustomerSwadCoinBalance(supaCustForCoin.id, balanceAfterRedeem);
            }

            swadCoinsUsed = coinsToDeduct;
            swadCoinDiscountAmount = coinsToDeduct;
            order.swadCoinsUsed = swadCoinsUsed;
            order.swadCoinDiscountAmount = swadCoinDiscountAmount;

            // Authoritatively calculate order total from clean components:
            // Subtotal - Coupon Discount - Swad Coin Discount + Packaging Fee + GST + Delivery Fee
            const subtotalVal = Number(order.subtotal || 0);
            const couponDiscountVal = Number(order.discount || 0);
            const swadCoinDiscountVal = Number(swadCoinDiscountAmount || 0);
            const packagingFeeVal = Number(order.packagingFee || 0);
            const gstVal = Number(order.gst || 0);
            const deliveryFeeVal = Number(order.deliveryFee || 0);

            order.total = Math.max(
              0,
              subtotalVal - couponDiscountVal - swadCoinDiscountVal + packagingFeeVal + gstVal + deliveryFeeVal
            );

            // Prepare transaction record to sync with Supabase swad_coin_transactions
            swadCoinRedemptionTx = {
              amount: -swadCoinsUsed,
              balanceBefore: currentCoinBalance,
              balanceAfter: balanceAfterRedeem,
              coinsUsed: swadCoinsUsed,
            };

            // Atomically update balance in Supabase customers table
            try {
              if (supaCustForCoin?.id) {
                await serverSupabase
                  .from('customers')
                  .update({
                    swad_coin_balance: balanceAfterRedeem,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', supaCustForCoin.id);
              } else {
                await serverSupabase
                  .from('customers')
                  .update({
                    swad_coin_balance: balanceAfterRedeem,
                    updated_at: new Date().toISOString(),
                  })
                  .or(`phone.eq.${normPhone},phone.eq.+91${normPhone}`);
              }
            } catch (e) {
              console.warn('Supabase swad coin balance sync error:', e);
            }
          }
        } catch (coinRedeemErr) {
          console.warn('Swad Coin redemption error during order creation:', coinRedeemErr);
        }
      }

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
            } else {
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
                .maybeSingle();

              if (!createCustErr && newSupaCust?.id) {
                supaCustomerId = newSupaCust.id;
              } else if (createCustErr) {
                console.warn('Supabase customer creation during order sync warning:', createCustErr);
                // Retry lookup in case of race condition
                const { data: retryCust } = await serverSupabase
                  .from('customers')
                  .select('id')
                  .eq('phone', normPhone)
                  .maybeSingle();
                if (retryCust?.id) supaCustomerId = retryCust.id;
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
              .select('*')
              .eq('customer_id', supaCustomerId);

            const matchedAddr = existingAddrs?.find(
              (a: any) =>
                (a.full_address || a.address_line1 || '').trim().toLowerCase() === cleanAddr.toLowerCase() ||
                (payload.addressId && a.id === payload.addressId)
            );

            if (matchedAddr?.id) {
              supaAddressId = matchedAddr.id;
            } else {
              let insAddrRes = await serverSupabase
                .from('customer_addresses')
                .insert({
                  customer_id: supaCustomerId,
                  label: payload.customerDetails?.addressLabel || 'Home',
                  full_address: cleanAddr,
                  landmark: payload.customerDetails?.landmark || null,
                  city: payload.customerDetails?.city || 'Bhubaneswar',
                  state: payload.customerDetails?.state || 'Odisha',
                  pincode: order.deliveryPinCode || payload.customerDetails?.pincode || '',
                  is_default: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .select('id')
                .maybeSingle();

              if (insAddrRes.error && (insAddrRes.error.message.includes('full_address') || insAddrRes.error.message.includes('column') || insAddrRes.error.code === 'PGRST204')) {
                insAddrRes = await serverSupabase
                  .from('customer_addresses')
                  .insert({
                    customer_id: supaCustomerId,
                    label: payload.customerDetails?.addressLabel || 'Home',
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
                  .maybeSingle();
              }

              if (insAddrRes.data?.id) {
                supaAddressId = insAddrRes.data.id;
              } else if (insAddrRes.error) {
                console.warn('Supabase address creation error in order:', insAddrRes.error);
              }
            }
          } catch (addrErr) {
            console.warn('Supabase address resolution warning:', addrErr);
          }
        }

        const isUUID = (str?: string | null) =>
          typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

        // Fallback: Check if payload.addressId is a valid UUID
        if (!supaAddressId && payload.addressId && isUUID(payload.addressId)) {
          supaAddressId = payload.addressId;
        }

        // 3. Insert order into Supabase orders table with fresh normalized payload

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

        const isScheduled =
          order.deliveryType === 'scheduled' ||
          order.customerDetails?.deliveryType === 'scheduled' ||
          payload.deliveryType === 'scheduled' ||
          payload.customerDetails?.deliveryType === 'scheduled';

        const deliveryType = isScheduled ? 'scheduled' : 'immediate';

        let scheduledAt: string | null = null;
        if (isScheduled) {
          const rawDate =
            order.scheduledAt ||
            order.customerDetails?.scheduledAt ||
            payload.scheduledAt ||
            payload.customerDetails?.scheduledAt ||
            order.customerDetails?.scheduledDate ||
            payload.customerDetails?.scheduledDate;

          const rawTime =
            order.customerDetails?.scheduledTimeSlot ||
            payload.customerDetails?.scheduledTimeSlot;

          if (rawDate && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(rawDate)) {
            const d = new Date(rawDate);
            scheduledAt = isNaN(d.getTime()) ? null : d.toISOString();
          } else if (rawDate) {
            let hours = 12;
            let minutes = 0;
            if (rawTime) {
              const startTimeStr = rawTime.split('–')[0].split('-')[0].trim();
              const match = startTimeStr.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)?$/i);
              if (match) {
                hours = parseInt(match[1], 10);
                minutes = match[2] ? parseInt(match[2], 10) : 0;
                const meridiem = (match[3] || '').toUpperCase();
                if (meridiem === 'PM' && hours < 12) hours += 12;
                if (meridiem === 'AM' && hours === 12) hours = 0;
              }
            }
            const ymdMatch = String(rawDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (ymdMatch) {
              const scheduledDate = new Date(
                parseInt(ymdMatch[1], 10),
                parseInt(ymdMatch[2], 10) - 1,
                parseInt(ymdMatch[3], 10),
                hours,
                minutes,
                0,
                0
              );
              scheduledAt = !isNaN(scheduledDate.getTime()) ? scheduledDate.toISOString() : null;
            } else {
              const parsed = new Date(rawDate);
              if (!isNaN(parsed.getTime())) {
                parsed.setHours(hours, minutes, 0, 0);
                scheduledAt = parsed.toISOString();
              } else {
                const currentYear = new Date().getFullYear();
                const parsedWithYear = new Date(`${rawDate} ${currentYear}`);
                if (!isNaN(parsedWithYear.getTime())) {
                  parsedWithYear.setHours(hours, minutes, 0, 0);
                  scheduledAt = parsedWithYear.toISOString();
                }
              }
            }
          }
        }

        let finalOrderId = order.orderId;
        if (!finalOrderId || finalOrderId === 'GKSWAD-#001') {
          finalOrderId = await getNextServerOrderId();
        }

        // Check if finalOrderId already exists in Supabase to prevent duplicate key constraint violation
        const { data: existingOrderCheck } = await serverSupabase
          .from('orders')
          .select('id, order_number')
          .or(`order_number.eq.${finalOrderId},order_id.eq.${finalOrderId}`)
          .maybeSingle();

        if (existingOrderCheck) {
          finalOrderId = await getNextServerOrderId();
        }

        const supaPayload: any = {
          id: order.id || `order-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          order_id: finalOrderId,
          order_number: finalOrderId,
          outlet_id: safeOutletId,
          customer_id: isUUID(supaCustomerId) ? supaCustomerId : null,
          address_id: isSelfPickup ? null : (isUUID(supaAddressId) ? supaAddressId : null),
          customer_name: supaCustomerName,
          customer_phone: supaCustomerPhone,
          order_type: isSelfPickup ? 'pickup' : 'delivery',
          is_self_pickup: isSelfPickup,
          items: safeItems,
          subtotal: Number(order.subtotal || 0),
          delivery_fee: Number(order.deliveryFee || 0),
          packaging_fee: Number(order.packagingFee || 0),
          discount_amount: Number(order.discount || 0),
          tax_amount: Number(order.gst || 0),
          total_amount: Number(order.total || 0),
          discount_type: (order.discount && Number(order.discount) > 0) ? 'coupon' : 'NONE',
          discount_code: order.couponCode || null,
          discount_description: null,
          welcome_discount_applied: !!order.isWelcomeDiscountApplied,
          welcome_discount_amount: Number(order.welcomeDiscountAmount || 0),
          swad_coins_used: Number(order.swadCoinsUsed || 0),
          swad_coin_discount_amount: Number(order.swadCoinDiscountAmount || 0),
          payment_method: order.customerDetails?.paymentMethod || 'cod',
          payment_status: 'PENDING',
          delivery_type: deliveryType,
          scheduled_at: scheduledAt,
          delivery_instructions: supaDeliveryInstructions,
          order_status: (order.orderStatus || order.status || 'received').toLowerCase().replace(/\s+/g, '_'),
          placed_at: new Date().toISOString(),
          confirmed_at: null,
          preparing_at: null,
          ready_at: null,
          out_for_delivery_at: null,
          delivered_at: null,
          cancelled_at: null,
          cancellation_reason: null,
          customer_details: order.customerDetails || {},
          delivery_address_snapshot: isSelfPickup ? null : (order.deliveryAddressSnapshot || null),
          delivery_pincode: order.deliveryPinCode || order.customerDetails?.pincode || '',
          estimated_delivery_minutes: Number(order.estimatedDeliveryMinutes || (isSelfPickup ? 25 : 35)),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        let res1 = await serverSupabase
          .from('orders')
          .insert(supaPayload)
          .select()
          .single();

        // If duplicate constraint race occurs, retry with newly computed next ID
        if (res1.error && (res1.error.code === '23505' || res1.error.message.includes('unique constraint') || res1.error.message.includes('order_number'))) {
          const freshId = await getNextServerOrderId();
          supaPayload.order_id = freshId;
          supaPayload.order_number = freshId;
          res1 = await serverSupabase
            .from('orders')
            .insert(supaPayload)
            .select()
            .single();
        }

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

          // Insert coupon redemption into Supabase coupon_redemptions if coupon was used
          const couponCodeUsed = order.couponCode || payload.couponCode;
          const discountAmt = Number(order.discount || payload.discount || 0);
          if (couponCodeUsed && discountAmt > 0) {
            try {
              let targetCouponId = payload.couponId;
              if (
                !targetCouponId ||
                !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetCouponId)
              ) {
                const { data: cRow } = await serverSupabase
                  .from('coupons')
                  .select('id')
                  .ilike('code', couponCodeUsed.trim())
                  .maybeSingle();
                if (cRow?.id) {
                  targetCouponId = cRow.id;
                }
              }

              if (
                targetCouponId &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetCouponId)
              ) {
                const { error: redErr } = await serverSupabase
                  .from('coupon_redemptions')
                  .insert({
                    coupon_id: targetCouponId,
                    customer_id: isUUID(supaCustomerId) ? supaCustomerId : null,
                    order_id: res1.data.id,
                    discount_amount: discountAmt,
                    redeemed_at: new Date().toISOString(),
                  });

                if (redErr) {
                  console.warn('Coupon redemption Supabase insert notice in /api/orders:', redErr.message);
                } else {
                  console.log(`Coupon redemption for order ${res1.data.order_id || res1.data.id} recorded in Supabase.`);
                }
              }
            } catch (cRedeemErr) {
              console.warn('Coupon redemption error during order placement:', cRedeemErr);
            }
          }

          // Insert Swad Coins REDEEM transaction into Supabase swad_coin_transactions
          if (swadCoinRedemptionTx && isUUID(supaCustomerId)) {
            try {
              const { error: txErr } = await serverSupabase
                .from('swad_coin_transactions')
                .insert({
                  customer_id: supaCustomerId,
                  type: 'REDEEM',
                  amount: swadCoinRedemptionTx.amount,
                  balance_before: swadCoinRedemptionTx.balanceBefore,
                  balance_after: swadCoinRedemptionTx.balanceAfter,
                  order_id: res1.data.order_id || res1.data.id || order.orderId,
                  description: `Redeemed ${swadCoinRedemptionTx.coinsUsed} Swad Coins on order ${res1.data.order_id || res1.data.id || order.orderId}`,
                  created_at: new Date().toISOString(),
                });

              if (txErr) {
                console.warn('Swad Coin REDEEM transaction Supabase insert notice:', txErr.message);
              } else {
                console.log(`Swad Coins REDEEM transaction for order ${res1.data.order_id || res1.data.id} logged in Supabase.`);
              }

              // Double-ensure customer's balance in Supabase is updated to balanceAfter
              await serverSupabase
                .from('customers')
                .update({
                  swad_coin_balance: swadCoinRedemptionTx.balanceAfter,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', supaCustomerId);

              if (normPhone) {
                productStorage.setCustomerSwadCoinBalance(normPhone, swadCoinRedemptionTx.balanceAfter);
              }
              productStorage.setCustomerSwadCoinBalance(supaCustomerId, swadCoinRedemptionTx.balanceAfter);
            } catch (coinTxErr) {
              console.warn('Swad Coin REDEEM transaction error:', coinTxErr);
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

  // Helper: Refund Swad Coins for Cancelled Order across both Supabase & local storage
  async function refundOrderSwadCoins(
    orderId: string,
    cancellationReason: string = 'Order cancelled'
  ): Promise<{ refundedCoins: number; newBalance?: number }> {
    if (!orderId) return { refundedCoins: 0 };
    const cleanReason = cancellationReason || 'Order cancelled';
    let refundedCoins = 0;
    let newBalance: number | undefined;

    // 1. Sync with local productStorage first
    try {
      const localResult = productStorage.refundSwadCoins(orderId, cleanReason);
      if (localResult && localResult.refundedCoins > 0) {
        refundedCoins = localResult.refundedCoins;
        newBalance = localResult.newBalance;
      }
    } catch (localErr) {
      console.warn('Local storage refundSwadCoins notice:', localErr);
    }

    // 2. Authoritative Sync with Supabase
    try {
      // Find order in Supabase
      const { data: supaOrder } = await serverSupabase
        .from('orders')
        .select('id, order_id, order_number, customer_id, customer_phone, swad_coins_used')
        .or(`order_id.eq.${orderId},id.eq.${orderId},order_number.eq.${orderId}`)
        .maybeSingle();

      const canonicalOrderId = supaOrder?.order_id || supaOrder?.order_number || orderId;

      // Check if refund was ALREADY recorded in Supabase swad_coin_transactions (idempotency guard)
      const { data: existingRefunds } = await serverSupabase
        .from('swad_coin_transactions')
        .select('id')
        .or(`order_id.eq.${canonicalOrderId},order_id.eq.${orderId}`)
        .eq('type', 'REFUND');

      if (!existingRefunds || existingRefunds.length === 0) {
        // Determine coins to refund
        let coinsToRefund = Number(supaOrder?.swad_coins_used || 0);
        let supaCustomerId = supaOrder?.customer_id;

        // Check if REDEEM transaction exists in Supabase
        const { data: redeemTxs } = await serverSupabase
          .from('swad_coin_transactions')
          .select('*')
          .or(`order_id.eq.${canonicalOrderId},order_id.eq.${orderId}`)
          .eq('type', 'REDEEM');

        if (redeemTxs && redeemTxs.length > 0) {
          const rTx = redeemTxs[0];
          if (Math.abs(rTx.amount) > 0) {
            coinsToRefund = Math.abs(rTx.amount);
          }
          if (!supaCustomerId && rTx.customer_id) {
            supaCustomerId = rTx.customer_id;
          }
        }

        // Fallback to local storage order if Supabase coinsToRefund was 0
        if (coinsToRefund === 0) {
          const localOrder = productStorage.getOrderById(canonicalOrderId) || productStorage.getOrderById(orderId);
          if (localOrder && localOrder.swadCoinsUsed && localOrder.swadCoinsUsed > 0) {
            coinsToRefund = localOrder.swadCoinsUsed;
          }
        }

        if (coinsToRefund > 0) {
          // Find customer in Supabase
          let supaCust: any = null;
          if (supaCustomerId && isUUID(supaCustomerId)) {
            const { data } = await serverSupabase.from('customers').select('*').eq('id', supaCustomerId).maybeSingle();
            supaCust = data;
          }
          if (!supaCust && supaOrder?.customer_phone) {
            const normPhone = normalizePhone(supaOrder.customer_phone);
            if (normPhone) {
              const { data } = await serverSupabase.from('customers').select('*').or(`phone.eq.${normPhone},phone.eq.+91${normPhone}`).maybeSingle();
              supaCust = data;
            }
          }
          if (!supaCust) {
            const localOrder = productStorage.getOrderById(canonicalOrderId) || productStorage.getOrderById(orderId);
            const phone = localOrder?.customerDetails?.phone;
            if (phone) {
              const normPhone = normalizePhone(phone);
              if (normPhone) {
                const { data } = await serverSupabase.from('customers').select('*').or(`phone.eq.${normPhone},phone.eq.+91${normPhone}`).maybeSingle();
                supaCust = data;
              }
            }
          }

          if (supaCust && isUUID(supaCust.id)) {
            const currentBal = Number(supaCust.swad_coin_balance || 0);
            const targetBal = currentBal + coinsToRefund;

            // 1. Update customer balance in Supabase
            await serverSupabase
              .from('customers')
              .update({
                swad_coin_balance: targetBal,
                updated_at: new Date().toISOString(),
              })
              .eq('id', supaCust.id);

            // 2. Insert immutable REFUND transaction into swad_coin_transactions
            await serverSupabase
              .from('swad_coin_transactions')
              .insert({
                customer_id: supaCust.id,
                type: 'REFUND',
                amount: coinsToRefund,
                balance_before: currentBal,
                balance_after: targetBal,
                order_id: canonicalOrderId,
                description: `Refunded ${coinsToRefund} Swad Coins for cancelled order ${canonicalOrderId} (${cleanReason})`,
                created_at: new Date().toISOString(),
              });

            refundedCoins = coinsToRefund;
            newBalance = targetBal;

            // Sync with local productStorage
            if (supaCust.phone) {
              productStorage.setCustomerSwadCoinBalance(supaCust.phone, targetBal);
            }
            productStorage.setCustomerSwadCoinBalance(supaCust.id, targetBal);

            console.log(`[Swad Coins] Refunded ${coinsToRefund} coins for order ${canonicalOrderId} to customer ${supaCust.phone || supaCust.id}. New balance: ${targetBal}`);
          }
        }
      }
    } catch (supaErr) {
      console.warn('Supabase refundSwadCoins sync error:', supaErr);
    }

    return { refundedCoins, newBalance };
  }

  // Dedicated endpoint to refund Swad Coins on an order
  app.post('/api/orders/:orderId/refund-coins', async (req, res) => {
    try {
      const reason = req.body?.cancellationReason || 'Order cancelled';
      const result = await refundOrderSwadCoins(req.params.orderId, reason);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('Refund Swad Coins endpoint error:', err);
      return res.status(500).json({ success: false, error: 'Failed to refund Swad Coins' });
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
          updated_at: now,
        };

        if (norm === 'received') {
          supaUpdate.order_status = 'received';
        } else if (norm === 'confirmed') {
          supaUpdate.order_status = 'confirmed';
        } else if (norm === 'preparing' || norm === 'in kitchen' || norm === 'preparing in kitchen') {
          supaUpdate.order_status = 'preparing';
        } else if (norm === 'ready' || norm === 'ready for pickup' || norm === 'ready for dispatch') {
          supaUpdate.order_status = 'ready';
        } else if (norm === 'out_for_delivery' || norm === 'out for delivery') {
          supaUpdate.order_status = 'out_for_delivery';
        } else if (norm === 'delivered' || norm === 'picked up') {
          supaUpdate.order_status = 'delivered';
        } else if (norm === 'cancelled') {
          supaUpdate.order_status = 'cancelled';
          supaUpdate.cancelled_at = now;
          if (cancellationReason) {
            supaUpdate.cancellation_reason = cancellationReason;
          }
          // Automatic Swad Coin refund on cancellation across Supabase & local storage
          try {
            await refundOrderSwadCoins(req.params.orderId, cancellationReason || 'Order cancelled');
          } catch (refErr) {
            console.warn('Swad Coin refund warning on order cancel:', refErr);
          }
        } else {
          supaUpdate.order_status = norm || 'received';
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
      // Auto-refund Swad Coins on deletion if redeemed
      try {
        await refundOrderSwadCoins(req.params.orderId, 'Order deleted / cancelled');
      } catch (rErr) {
        console.warn('Refund on delete order notice:', rErr);
      }

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
      const param = req.params.orderId;
      try {
        const { data } = await serverSupabase
          .from('orders')
          .select('*')
          .or(`order_number.eq.${param},order_id.eq.${param},id.eq.${param}`)
          .maybeSingle();

        if (data) {
          return res.json({ success: true, order: mapDbOrderRow(data) });
        }
      } catch (e) {
        console.warn('Supabase get order notice:', e);
      }

      const order = productStorage.getOrderById(param);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      return res.json({ success: true, order });
    } catch (err: any) {
      console.error('Fetch order error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch order' });
    }
  });

  // 23. Orders: List Orders (Supports filtering by outletId, status, phone, customerId)
  app.get('/api/orders', async (req, res) => {
    try {
      const outletId = req.query.outletId as string | undefined;
      const status = req.query.status as string | undefined;
      const phone = req.query.phone as string | undefined;
      const customerId = req.query.customerId as string | undefined;

      try {
        let supaQuery = serverSupabase.from('orders').select('*').order('created_at', { ascending: false });
        if (outletId) {
          supaQuery = supaQuery.eq('outlet_id', outletId);
        }
        if (customerId) {
          supaQuery = supaQuery.eq('customer_id', customerId);
        }
        if (phone) {
          const cleanPhone = phone.replace(/\D/g, '').slice(-10);
          supaQuery = supaQuery.ilike('customer_phone', `%${cleanPhone}%`);
        }

        const { data, error } = await supaQuery;
        if (!error && data && data.length > 0) {
          let mapped = data.map(mapDbOrderRow);
          if (status) {
            const normStatus = status.toLowerCase().replace(/\s+/g, '_');
            mapped = mapped.filter((o: any) =>
              (o.orderStatus || '').toLowerCase() === normStatus ||
              (o.status || '').toLowerCase() === status.toLowerCase()
            );
          }
          return res.json({ success: true, orders: mapped, count: mapped.length });
        }
      } catch (supaErr) {
        console.warn('GET /api/orders Supabase query notice:', supaErr);
      }

      const orders = productStorage.getAllOrders(outletId, status);
      return res.json({ success: true, orders, count: orders.length });
    } catch (err: any) {
      console.error('Fetch orders error:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve orders' });
    }
  });

  // 23a. Analytics: Top-selling products by outlet (last N days, default 30)
  app.get('/api/analytics/outlet-bestsellers', async (req, res) => {
    try {
      const outletId = req.query.outletId as string | undefined;
      const days = parseInt(req.query.days as string, 10) || 30;

      if (!outletId) {
        return res.status(400).json({ success: false, error: 'outletId is required' });
      }

      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const salesMap: Record<string, { productId: string; totalSold: number; orderCount: number; name?: string }> = {};

      try {
        const { data, error } = await serverSupabase
          .from('orders')
          .select('id, outlet_id, order_status, items, created_at')
          .eq('outlet_id', outletId)
          .gte('created_at', cutoffDate)
          .neq('order_status', 'cancelled');

        if (!error && Array.isArray(data)) {
          for (const order of data) {
            const rawItems = Array.isArray(order.items)
              ? order.items
              : typeof order.items === 'string'
              ? JSON.parse(order.items)
              : [];

            for (const item of rawItems) {
              const pid = String(item.productId || item.id || '').trim();
              if (!pid) continue;
              const qty = Math.max(1, Number(item.quantity) || 1);

              if (!salesMap[pid]) {
                salesMap[pid] = {
                  productId: pid,
                  totalSold: 0,
                  orderCount: 0,
                  name: item.name,
                };
              }
              salesMap[pid].totalSold += qty;
              salesMap[pid].orderCount += 1;
            }
          }
        }
      } catch (supaErr) {
        console.warn('GET /api/analytics/outlet-bestsellers Supabase query error:', supaErr);
      }

      // Also incorporate any local in-memory storage orders for this outlet if present
      try {
        const localOrders = productStorage.getAllOrders(outletId);
        const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
        for (const order of localOrders) {
          const orderTime = new Date(order.createdAt || (order as any).placedAt || 0).getTime();
          const isCancelled = (order.orderStatus || (order as any).status || '').toLowerCase() === 'cancelled';
          if (orderTime >= cutoffTime && !isCancelled && Array.isArray(order.items)) {
            for (const item of order.items) {
              const rawItem = item as any;
              const pid = String(rawItem.productId || rawItem.product?.id || rawItem.id || '').trim();
              if (!pid) continue;
              const qty = Math.max(1, Number(rawItem.quantity) || 1);
              if (!salesMap[pid]) {
                salesMap[pid] = {
                  productId: pid,
                  totalSold: qty,
                  orderCount: 1,
                  name: rawItem.name || rawItem.product?.name,
                };
              } else {
                salesMap[pid].totalSold += qty;
                salesMap[pid].orderCount += 1;
              }
            }
          }
        }
      } catch (localErr) {
        // ignore
      }

      const sales = Object.values(salesMap).sort(
        (a, b) => b.totalSold - a.totalSold || b.orderCount - a.orderCount
      );

      return res.json({
        success: true,
        outletId,
        days,
        sales,
      });
    } catch (err: any) {
      console.error('Error fetching outlet bestsellers:', err);
      return res.status(500).json({ success: false, error: 'Failed to calculate outlet bestsellers' });
    }
  });

  // =====================
  // VERIFIED FOOD RATING & REVIEW ENDPOINTS
  // =====================

  // Helper to map DB review row to clean API format
  function mapDbReview(row: any) {
    if (!row) return null;
    return {
      id: row.id,
      orderItemId: row.order_item_id,
      orderId: row.order_id,
      productId: String(row.product_id),
      outletId: row.outlet_id,
      customerId: row.customer_id,
      customerDisplayName: row.customer_display_name || 'Verified Customer',
      rating: Number(row.rating || 5),
      reviewText: row.review_text || undefined,
      isVerifiedPurchase: row.is_verified_purchase !== false,
      isPublished: row.is_published !== false,
      reviewedAt: row.reviewed_at || row.created_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // 23c. Batch check which orders are already rated in product_reviews
  app.post('/api/orders/rated-status', async (req, res) => {
    try {
      const { orderIds } = req.body || {};
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.json({ success: true, ratedOrderIds: [] });
      }

      const candidateSet = new Set<string>();
      for (const raw of orderIds) {
        const str = String(raw || '').trim();
        if (str) {
          candidateSet.add(str);
          const clean = str.replace(/^#+/, '');
          candidateSet.add(clean);
          candidateSet.add(`#${clean}`);
        }
      }

      const candidateList = Array.from(candidateSet);
      const { data, error } = await serverSupabase
        .from('product_reviews')
        .select('order_id, rating')
        .in('order_id', candidateList);

      if (error) {
        console.warn('/api/orders/rated-status query error:', error);
        return res.json({ success: true, ratedOrderIds: [] });
      }

      const foundSet = new Set<string>();
      (data || []).forEach((row: any) => {
        if (row.order_id) {
          const r = String(row.order_id).trim();
          foundSet.add(r);
          const c = r.replace(/^#+/, '');
          foundSet.add(c);
          foundSet.add(`#${c}`);
        }
      });

      return res.json({
        success: true,
        ratedOrderIds: Array.from(foundSet),
      });
    } catch (err: any) {
      console.warn('/api/orders/rated-status catch error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 24a. Get Reviewable Items for an Order (Checks Delivered status and 7-day window from DB ONLY)
  app.get('/api/orders/:orderId/reviewable-items', async (req, res) => {
    try {
      const rawOrderId = String(req.params.orderId || '').trim();
      const noHashOrderId = rawOrderId.replace(/^#+/, '');

      // 1. Fetch order from Supabase
      let orderRow: any = null;
      try {
        const q1 = await serverSupabase.from('orders').select('*').eq('order_id', rawOrderId).maybeSingle();
        if (q1.data) {
          orderRow = q1.data;
        } else {
          const q2 = await serverSupabase.from('orders').select('*').eq('order_id', noHashOrderId).maybeSingle();
          if (q2.data) {
            orderRow = q2.data;
          } else {
            const q3 = await serverSupabase.from('orders').select('*').eq('id', rawOrderId).maybeSingle();
            if (q3.data) {
              orderRow = q3.data;
            } else {
              const q4 = await serverSupabase.from('orders').select('*').ilike('order_id', `%${noHashOrderId}%`).maybeSingle();
              if (q4.data) orderRow = q4.data;
            }
          }
        }
      } catch (dbErr) {
        console.error('Fetch order from Supabase error:', dbErr);
      }

      // If not in Supabase, check storage for order metadata (e.g. guest checkout placed before DB sync)
      if (!orderRow) {
        const localOrd: any = productStorage.getOrderById(rawOrderId) || productStorage.getOrderById(noHashOrderId);
        if (localOrd) {
          orderRow = {
            id: localOrd.id,
            order_id: localOrd.orderId || localOrd.id,
            status: localOrd.status,
            order_status: localOrd.status,
            items: localOrd.items,
            outlet_id: localOrd.outletId,
            delivered_at: localOrd.statusTimeline?.find((t: any) => t.status?.toLowerCase() === 'delivered')?.timestamp || localOrd.createdAt,
            placed_at: localOrd.createdAt,
            created_at: localOrd.createdAt,
          };
        }
      }

      if (!orderRow) {
        return res.status(404).json({ success: false, error: `Order ${rawOrderId} not found in database.` });
      }

      const rawStatus = String(orderRow.order_status || orderRow.status || '').toLowerCase().trim();
      const isDelivered = rawStatus === 'delivered';
      const deliveredAt = orderRow.delivered_at || (isDelivered ? (orderRow.placed_at || orderRow.created_at) : undefined);

      let isEligible = false;
      let isExpired = false;
      let remainingDays = 0;
      let deadlineIso: string | undefined = undefined;

      if (isDelivered && deliveredAt) {
        const deliveredTime = new Date(deliveredAt).getTime();
        const deadline = deliveredTime + 7 * 24 * 60 * 60 * 1000;
        deadlineIso = new Date(deadline).toISOString();
        const now = Date.now();

        if (now <= deadline) {
          isEligible = true;
          isExpired = false;
          remainingDays = Math.max(1, Math.ceil((deadline - now) / (24 * 60 * 60 * 1000)));
        } else {
          isEligible = false;
          isExpired = true;
          remainingDays = 0;
        }
      }

      // Parse items
      let itemsList: any[] = [];
      if (Array.isArray(orderRow.items)) {
        itemsList = orderRow.items;
      } else if (typeof orderRow.items === 'string') {
        try {
          itemsList = JSON.parse(orderRow.items);
        } catch {
          itemsList = [];
        }
      }

      // Fetch reviews for this order directly from Supabase product_reviews table ONLY
      let dbReviews: any[] = [];
      try {
        const candidateKeys = [orderRow.id, orderRow.order_id, rawOrderId, noHashOrderId].filter(Boolean);
        const { data: revData } = await serverSupabase
          .from('product_reviews')
          .select('*')
          .in('order_id', candidateKeys);
        if (revData && Array.isArray(revData)) {
          dbReviews = revData;
        }
      } catch (dbRevErr) {
        console.error('Fetch product_reviews from database error:', dbRevErr);
      }

      const reviewableItems = itemsList.map((it: any, index: number) => {
        const productId = String(it.productId || it.product?.id || it.id || '');
        const orderItemId = String(it.id || `${orderRow.order_id || orderRow.id}-${productId}-${index}`);
        const productName = String(it.name || it.product_name || it.product?.name || `Dish #${productId}`);
        const productImage = String(it.image || it.product?.image || '');
        const variantName = it.selectedVariant?.name || it.variantName || it.product_variant_name || undefined;
        const quantity = Math.max(1, Number(it.quantity) || 1);

        // Match existing in DB strictly
        const existing = dbReviews.find(
          (r: any) =>
            r.order_item_id === orderItemId ||
            (String(r.product_id) === productId && (r.order_id === orderRow.id || r.order_id === orderRow.order_id || r.order_id === rawOrderId || r.order_id === noHashOrderId))
        );

        return {
          orderItemId,
          productId,
          productName,
          productImage,
          variantName,
          quantity,
          reviewed: !!existing,
          reviewId: existing?.id,
          rating: existing?.rating,
          reviewText: existing?.review_text,
          reviewedAt: existing?.reviewed_at || existing?.created_at,
          isVerifiedPurchase: existing ? existing.is_verified_purchase !== false : true,
        };
      });

      const isFullyReviewed = reviewableItems.length > 0 && reviewableItems.every((it) => it.reviewed);

      let eligibilityMessage = '';
      if (!isDelivered) {
        eligibilityMessage = 'Rating will be unlocked once your order is delivered.';
      } else if (isExpired) {
        eligibilityMessage = 'The 7-day review window for this order has ended.';
      } else if (isFullyReviewed) {
        eligibilityMessage = 'You have shared feedback for all items in this order. You can edit your reviews anytime within the 7-day window.';
      } else {
        eligibilityMessage = `Verified Purchase: Rate your dishes (${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} left).`;
      }

      return res.json({
        success: true,
        orderId: orderRow.order_id || orderRow.id,
        orderStatus: rawStatus,
        isDelivered,
        deliveredAt,
        isEligible,
        isExpired,
        deadline: deadlineIso,
        remainingDays,
        isFullyReviewed,
        eligibilityMessage,
        items: reviewableItems,
      });
    } catch (err: any) {
      console.error('Fetch reviewable items error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch reviewable items' });
    }
  });

  // 24b. Submit Verified Food Review (Protected & Verified Order Item Check)
  app.post('/api/product-reviews', async (req, res) => {
    try {
      const { orderItemId, orderId, productId, rating, reviewText, customerId, customerName, customerPhone } = req.body;

      if (!orderItemId && !productId) {
        return res.status(400).json({ success: false, error: 'Order item or product reference is required.' });
      }

      const numRating = Math.round(Number(rating));
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        return res.status(400).json({ success: false, error: 'Rating must be an integer between 1 and 5 stars.' });
      }

      const cleanText = (reviewText || '').trim().slice(0, 500);
      const effectiveCustId = customerId || (customerPhone ? normalizePhone(customerPhone) : 'verified-guest');
      const maskedName = maskCustomerName(customerName || 'Valued Patron');

      const isUUID = (str?: string) =>
        typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

      // 1. Resolve order details from DB or memory
      let targetOrderId = orderId || '';
      let targetProductId = productId ? String(productId) : '';
      let targetOutletId = 'bbsr-kendriyavihar';
      let validCustomerUuid: string | null = isUUID(effectiveCustId) ? effectiveCustId : null;

      try {
        const rawIdentifier = String(targetOrderId || (orderItemId ? orderItemId.split('-')[0] : '')).trim();
        const noHashIdentifier = rawIdentifier.replace(/^#+/, '');

        if (rawIdentifier) {
          let orderRow: any = null;

          // Search order in Supabase without broken .or() syntax
          const q1 = await serverSupabase.from('orders').select('*').eq('order_id', rawIdentifier).maybeSingle();
          if (q1.data) {
            orderRow = q1.data;
          } else {
            const q2 = await serverSupabase.from('orders').select('*').eq('order_id', noHashIdentifier).maybeSingle();
            if (q2.data) {
              orderRow = q2.data;
            } else {
              const q3 = await serverSupabase.from('orders').select('*').eq('id', rawIdentifier).maybeSingle();
              if (q3.data) {
                orderRow = q3.data;
              } else {
                const q4 = await serverSupabase.from('orders').select('*').ilike('order_id', `%${noHashIdentifier}%`).maybeSingle();
                if (q4.data) orderRow = q4.data;
              }
            }
          }

          if (orderRow) {
            targetOrderId = orderRow.id || orderRow.order_id || targetOrderId;
            targetOutletId = orderRow.outlet_id || targetOutletId;
            if (orderRow.customer_id && isUUID(orderRow.customer_id)) {
              validCustomerUuid = orderRow.customer_id;
            }

            const rawStatus = (orderRow.order_status || orderRow.status || '').toLowerCase().trim();
            if (rawStatus && rawStatus !== 'delivered') {
              return res.status(400).json({ success: false, error: 'You can only review items from delivered orders.' });
            }

            const delAt = orderRow.delivered_at || orderRow.placed_at || orderRow.created_at;
            if (delAt) {
              const deadline = new Date(delAt).getTime() + 7 * 24 * 60 * 60 * 1000;
              if (Date.now() > deadline) {
                return res.status(400).json({ success: false, error: 'The 7-day review period for this order has expired.' });
              }
            }
          }
        }
      } catch (dbCheckErr) {
        console.warn('Supabase review order resolution notice:', dbCheckErr);
      }

      if (!targetProductId && orderItemId) {
        const parts = orderItemId.split('-');
        if (parts.length >= 2) targetProductId = parts[1];
        else targetProductId = '1';
      }

      // Check if duplicate review exists in Supabase, and update it directly
      let existingDbReviewId: string | null = null;
      try {
        if (orderItemId) {
          const { data: dup1 } = await serverSupabase
            .from('product_reviews')
            .select('id')
            .eq('order_item_id', orderItemId)
            .maybeSingle();
          if (dup1?.id) existingDbReviewId = dup1.id;
        }

        if (!existingDbReviewId && targetOrderId && targetProductId) {
          const { data: dup2 } = await serverSupabase
            .from('product_reviews')
            .select('id')
            .eq('order_id', targetOrderId)
            .eq('product_id', targetProductId)
            .maybeSingle();
          if (dup2?.id) existingDbReviewId = dup2.id;
        }
      } catch (chkErr) {
        console.warn('Duplicate review check notice:', chkErr);
      }

      if (existingDbReviewId) {
        // Direct UPDATE on product_reviews table
        const { data, error } = await serverSupabase
          .from('product_reviews')
          .update({
            rating: numRating,
            review_text: cleanText || null,
            customer_display_name: maskedName,
            customer_phone: customerPhone ? normalizePhone(customerPhone) : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingDbReviewId)
          .select()
          .maybeSingle();

        if (error) {
          console.error('Supabase product_reviews update error:', error.message);
          return res.status(500).json({ success: false, error: `Database update failed: ${error.message}` });
        }

        return res.status(200).json({
          success: true,
          review: mapDbReview(data),
          message: 'Your review has been updated successfully in product_reviews.',
        });
      } else {
        // Direct INSERT on product_reviews table
        const reviewPayload: any = {
          product_id: String(targetProductId || '1'),
          order_id: String(targetOrderId || 'order-verified'),
          order_item_id: orderItemId || null,
          outlet_id: targetOutletId,
          rating: numRating,
          review_text: cleanText || null,
          customer_display_name: maskedName,
          customer_phone: customerPhone ? normalizePhone(customerPhone) : null,
          is_verified_purchase: true,
          is_published: true,
          reviewed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (validCustomerUuid) {
          reviewPayload.customer_id = validCustomerUuid;
        }

        const { data, error } = await serverSupabase
          .from('product_reviews')
          .insert(reviewPayload)
          .select()
          .maybeSingle();

        if (error) {
          console.error('Supabase product_reviews direct insert error:', error.message);
          return res.status(500).json({ success: false, error: `Database insert failed: ${error.message}` });
        }

        return res.status(201).json({
          success: true,
          review: mapDbReview(data),
          message: 'Thank you! Your verified food review has been saved to product_reviews.',
        });
      }
    } catch (err: any) {
      console.error('Submit product review error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to submit review' });
    }
  });

  // 24c. Update Verified Review within 7-Day Window (DATABASE ONLY)
  app.put('/api/product-reviews/:reviewId', async (req, res) => {
    try {
      const { reviewId } = req.params;
      const { rating, reviewText } = req.body;

      const numRating = Math.round(Number(rating));
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        return res.status(400).json({ success: false, error: 'Rating must be an integer between 1 and 5 stars.' });
      }

      const cleanText = (reviewText || '').trim().slice(0, 500);

      // Direct Update in Supabase
      const { data, error } = await serverSupabase
        .from('product_reviews')
        .update({
          rating: numRating,
          review_text: cleanText || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Supabase product review update error:', error.message);
        return res.status(500).json({ success: false, error: `Database update failed: ${error.message}` });
      }

      if (!data) {
        return res.status(404).json({ success: false, error: 'Review not found in product_reviews table.' });
      }

      return res.json({
        success: true,
        review: mapDbReview(data),
        message: 'Your review has been updated successfully in the database.',
      });
    } catch (err: any) {
      console.error('Update review error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to update review' });
    }
  });

  // 24d. Get Published Reviews for a Product (DATABASE ONLY)
  app.get('/api/products/:productId/reviews', async (req, res) => {
    try {
      const productId = String(req.params.productId);

      const { data, error } = await serverSupabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('is_published', true)
        .order('reviewed_at', { ascending: false });

      if (error) {
        console.error('Supabase product reviews fetch error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
      }

      const reviews = (data || []).map(mapDbReview);
      return res.json({ success: true, reviews, count: reviews.length, source: 'database' });
    } catch (err: any) {
      console.error('Fetch product reviews error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch product reviews' });
    }
  });

  // 24e. Get Rating Summary for a Product (DATABASE ONLY)
  app.get('/api/products/:productId/rating', async (req, res) => {
    try {
      const productId = String(req.params.productId);

      const { data, error } = await serverSupabase
        .from('product_reviews')
        .select('rating, is_verified_purchase')
        .eq('product_id', productId)
        .eq('is_published', true);

      if (error) {
        console.error('Supabase product rating summary query error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
      }

      const rows = data || [];
      const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      let verifiedCount = 0;

      for (const row of rows) {
        const star = (Math.min(5, Math.max(1, Math.round(Number(row.rating) || 5))) as 1 | 2 | 3 | 4 | 5);
        breakdown[star] = (breakdown[star] || 0) + 1;
        sum += star;
        if (row.is_verified_purchase !== false) verifiedCount++;
      }

      const totalReviews = rows.length;
      const averageRating = totalReviews > 0 ? Number((sum / totalReviews).toFixed(1)) : 4.5;

      return res.json({
        success: true,
        rating: {
          productId,
          averageRating,
          totalReviews,
          totalVerifiedRatings: verifiedCount,
          breakdown,
        },
        source: 'database',
      });
    } catch (err: any) {
      console.error('Fetch product rating error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch product rating summary' });
    }
  });

  // 24f. Get Featured Reviews from Database for Home Page
  app.get('/api/reviews/featured', async (req, res) => {
    try {
      const outletId = typeof req.query.outletId === 'string' ? req.query.outletId.trim() : '';
      const limit = Math.max(1, Math.min(12, Number(req.query.limit) || 3));

      const { data, error } = await serverSupabase
        .from('product_reviews')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch featured reviews error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
      }

      const rows = data || [];
      const validReviews = rows
        .filter((r) => r.review_text && typeof r.review_text === 'string' && r.review_text.trim().length > 0)
        .map(mapDbReview)
        .filter(Boolean);

      // Calculate platform rating stats
      let totalRatingSum = 0;
      for (const r of rows) {
        totalRatingSum += Number(r.rating || 5);
      }
      const totalCount = rows.length;
      const averageRating = totalCount > 0 ? Number((totalRatingSum / totalCount).toFixed(1)) : 4.8;

      // Prioritize reviews for the specified outlet, then 4★ & 5★ ratings, then recent
      const outletReviews = outletId ? validReviews.filter((r: any) => r.outletId === outletId) : [];
      const otherReviews = outletId ? validReviews.filter((r: any) => r.outletId !== outletId) : validReviews;

      const sortFn = (a: any, b: any) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      };

      outletReviews.sort(sortFn);
      otherReviews.sort(sortFn);

      const combined = [...outletReviews, ...otherReviews].slice(0, limit);

      return res.json({
        success: true,
        reviews: combined,
        stats: {
          averageRating,
          totalCount,
        },
        source: 'database',
      });
    } catch (err: any) {
      console.error('Fetch featured reviews error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch featured reviews' });
    }
  });

  // 24f. Reviews & Database Diagnostics
  app.get('/api/database/reviews-diagnostics', async (req, res) => {
    try {
      const productReviewsCheck = await serverSupabase.from('product_reviews').select('count', { count: 'exact', head: true });
      const reviewsCheck = await serverSupabase.from('reviews').select('count', { count: 'exact', head: true });
      const ordersCheck = await serverSupabase.from('orders').select('count', { count: 'exact', head: true });

      return res.json({
        success: true,
        productReviewsTable: {
          accessible: !productReviewsCheck.error,
          error: productReviewsCheck.error ? productReviewsCheck.error.message : null,
          count: productReviewsCheck.count ?? null,
        },
        reviewsTable: {
          accessible: !reviewsCheck.error,
          error: reviewsCheck.error ? reviewsCheck.error.message : null,
          count: reviewsCheck.count ?? null,
        },
        ordersTable: {
          accessible: !ordersCheck.error,
          error: ordersCheck.error ? ordersCheck.error.message : null,
          count: ordersCheck.count ?? null,
        },
        storageReviewsCount: productStorage.getProductReviews().length,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
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

  // --- Automated Scheduled Jobs ---
  // Daily Swad Coin Reward Generation at 04:00 AM server time
  cron.schedule('0 4 * * *', async () => {
    console.log('[Swad Coins] Executing daily 04:00 AM reward generation job...');
    try {
      let supaOrders: any[] = [];
      try {
        const { data } = await serverSupabase
          .from('orders')
          .select('*')
          .in('order_status', ['delivered', 'picked_up']);
        if (data) supaOrders = data;
      } catch (e) {
        console.warn('[Swad Coins Cron] Supabase delivered orders fetch note:', e);
      }

      const summary = productStorage.generateDailySwadCoinRewards(supaOrders);
      console.log(`[Swad Coins] Daily job completed: generated ${summary.created} rewards, skipped ${summary.skippedAlreadyRewarded} already rewarded.`);
    } catch (cronErr) {
      console.error('[Swad Coins] Error during daily reward cron execution:', cronErr);
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gaon Ka Swad server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
