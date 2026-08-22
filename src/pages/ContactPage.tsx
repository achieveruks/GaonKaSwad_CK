import React, { useState, useEffect, useMemo } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useCart } from '../context/CartContext';
import { useLocation } from '../context/LocationContext';
import { INITIAL_OUTLETS, INITIAL_DELIVERY_ZONES } from '../data/outlets';
import { Outlet } from '../types';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageSquare,
  Send,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  Sparkles,
  Flame,
  Store,
  Navigation,
  ExternalLink,
  Timer,
  ShieldCheck,
  Truck
} from 'lucide-react';

export const ContactPage: React.FC = () => {
  const { goToShop } = useNavigation();
  const { showToast } = useCart();
  const {
    currentOutlet,
    outlets,
    selectedLocation,
    setIsLocationModalOpen,
    deliveryZones
  } = useLocation();

  // Active list of all outlets with fallback to initial data
  const availableOutlets: Outlet[] = useMemo(() => {
    const active = outlets.filter((o) => o.isActive);
    return active.length > 0 ? active : INITIAL_OUTLETS;
  }, [outlets]);

  // Current outlet for the left-side Kitchen Concierge & Helpline card
  const currentHub: Outlet = useMemo(() => {
    return currentOutlet || availableOutlets[0] || INITIAL_OUTLETS[0];
  }, [currentOutlet, availableOutlets]);

  // Target outlet chosen by the user in the right-hand inquiry form
  const [targetOutletId, setTargetOutletId] = useState<string>(() => {
    return currentHub?.id || (availableOutlets[0]?.id ?? 'blr-hsr');
  });

  // Sync default target outlet when current outlet changes if user hasn't explicitly changed it
  useEffect(() => {
    if (currentHub?.id) {
      setTargetOutletId(currentHub.id);
    }
  }, [currentHub?.id]);

  const targetOutlet: Outlet = useMemo(() => {
    return (
      availableOutlets.find((o) => o.id === targetOutletId) ||
      currentHub ||
      availableOutlets[0] ||
      INITIAL_OUTLETS[0]
    );
  }, [availableOutlets, targetOutletId, currentHub]);

  // City calculation for the "Active Cloud Kitchen Network" card (current city only)
  const currentCity = currentHub.city || 'Bangalore';

  // Outlets in the current city only
  const cityOutlets = useMemo(() => {
    const matched = availableOutlets.filter(
      (o) => o.city.trim().toLowerCase() === currentCity.trim().toLowerCase()
    );
    return matched.length > 0 ? matched : [currentHub];
  }, [availableOutlets, currentCity, currentHub]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    outletId: targetOutlet.id,
    subject: 'General Inquiry',
    isCatering: false,
    message: ''
  });

  // Keep form.outletId in sync with targetOutlet
  useEffect(() => {
    if (targetOutlet?.id) {
      setForm((prev) => ({ ...prev, outletId: targetOutlet.id }));
    }
  }, [targetOutlet?.id]);

  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;

    setSubmitted(true);
    showToast(
      'Message Sent!',
      `Our concierge at ${targetOutlet.name} will reach out to you within 1 hour.`,
      'success'
    );
  };

  // Helper to format phone for WhatsApp and Tel for the current outlet
  const rawPhone = currentHub.phone || '+91 98765 43210';
  const cleanDigits = rawPhone.replace(/\D/g, '');
  const waPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
  const waMessage = encodeURIComponent(
    `Hi ${currentHub.name}, I would like to inquire about ordering / catering.`
  );
  const waLink = `https://wa.me/${waPhone}?text=${waMessage}`;
  const googleMapsQuery = encodeURIComponent(
    currentHub.address ? `${currentHub.name}, ${currentHub.address}` : `${currentHub.name}, ${currentHub.city}`
  );
  const googleMapsUrl = currentHub.latitude && currentHub.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${currentHub.latitude},${currentHub.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${googleMapsQuery}`;

  const faqs = [
    {
      q: 'How does your cloud kitchen ensure food arrives steaming hot?',
      a: 'We use high-grade 3-layer insulated thermal pouches with sealed earthen handis that maintain serving temperatures (above 65°C) for up to 60 minutes after leaving our clay ovens.'
    },
    {
      q: 'Are vegetarian and non-vegetarian dishes cooked separately?',
      a: 'Yes, absolutely. We maintain completely segregated kitchen bays, separate cooktops, cutting boards, tandoors, and utensils with strict non-cross-contamination protocols.'
    },
    {
      q: 'Do you accept bulk corporate orders and family catering?',
      a: `Yes! We cater for house parties, corporate gatherings, and festive celebrations with customized dum handis and chaffing dish warmers from all our outlets including ${currentHub.name}. Select "Bulk / Party Catering" in the contact form or call our helpline.`
    },
    {
      q: 'Can I customize the spice levels or make dishes Jain-friendly?',
      a: 'Yes! On every product page, you can choose your preferred spice intensity (Mild to Extra Spicy) and select Jain-compliant options for our vegetarian curries and paneer specialties.'
    },
    {
      q: 'What are your delivery hours and average delivery time?',
      a: `Operating hours for ${currentHub.name} are ${currentHub.operatingHours || '11:00 AM - 11:30 PM'}. Average preparation & delivery time is ${currentHub.avgCookingTime || '25-35 mins'} within our verified delivery zones.`
    }
  ];

  return (
    <div className="space-y-10 sm:space-y-14 pb-16">
      {/* 1. Header Banner */}
      <section className="relative overflow-hidden bg-amber-50/60 border-b border-amber-200/70 py-10 sm:py-12 text-center">
        <div className="max-w-3xl mx-auto px-4 space-y-2.5">
          <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
            <span>Direct Culinary Concierge</span>
          </div>
          <h1 className="font-extrabold text-2xl sm:text-4xl text-stone-900 tracking-tight">
            Get in Touch with Gaon Ka Swad
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 max-w-xl mx-auto">
            Have questions about an order, want to arrange royal party catering, or connect with our cloud kitchen hub? We are here to help.
          </p>
        </div>
      </section>

      {/* 2. Contact Grid: Left Current Outlet Info + Right Outlet Inquiry Form */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left Column: Current Outlet Helpline Card & City Network (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Kitchen Concierge & Helpline Card - Current Outlet ONLY */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-5">
              
              {/* Card Header: Shows Current Outlet */}
              <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900 leading-tight">
                    Kitchen Concierge & Helpline
                  </h3>
                  <p className="text-[11px] text-stone-500 font-medium">
                    Current Selected Outlet
                  </p>
                </div>
              </div>

              {/* Current Outlet Details Body */}
              <div className="space-y-4 text-xs sm:text-sm text-stone-600 bg-stone-50/70 p-4 rounded-xl border border-stone-200/80">
                
                {/* Outlet Name & City Badge */}
                <div className="border-b border-stone-200/60 pb-3">
                  <h4 className="font-extrabold text-sm sm:text-base text-stone-900">
                    {currentHub.name}
                  </h4>
                  <p className="text-[11px] text-stone-500 font-medium">
                    {currentHub.city}, {currentHub.state || 'India'}
                  </p>
                </div>

                {/* 1. Phone & Helpline */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-stone-900">Direct Kitchen Hotline</p>
                    <a
                      href={`tel:${currentHub.phone || '+91 98765 43210'}`}
                      className="text-stone-800 hover:text-orange-700 font-semibold transition-colors block"
                    >
                      {currentHub.phone || '+91 98765 43210'}
                    </a>
                    <p className="text-[10px] text-stone-400">Direct line to kitchen dispatch manager</p>
                  </div>
                </div>

                {/* 2. Email Address */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-stone-900">Email Inquiries</p>
                    <a
                      href={`mailto:${currentHub.email || 'orders@gaonkaswad.com'}`}
                      className="text-stone-800 hover:text-blue-700 font-semibold transition-colors truncate block"
                    >
                      {currentHub.email || `${currentHub.city.toLowerCase()}@gaonkaswad.com`}
                    </a>
                    <p className="text-[10px] text-stone-400">Response within 2 business hours</p>
                  </div>
                </div>

                {/* 3. Operating Hours */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-stone-900">Kitchen Operating Hours</p>
                    <p className="text-stone-800 font-semibold">
                      {currentHub.operatingHours || '11:00 AM - 11:30 PM'}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                      Open 7 Days a week • Clay ovens active
                    </p>
                  </div>
                </div>

                {/* 4. Physical Kitchen Address */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-stone-900">Kitchen Hub Address</p>
                    <p className="text-stone-800 font-medium leading-snug">
                      {currentHub.address || 'Central Cloud Kitchen Facility'}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {currentHub.city}, {currentHub.state || 'Karnataka'}
                    </p>
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-purple-700 hover:text-purple-900 font-semibold mt-1 underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>View on Google Maps</span>
                    </a>
                  </div>
                </div>

                {/* 5. Kitchen Prep SLA & Minimums */}
                <div className="pt-2 border-t border-stone-200/60 grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white p-2 rounded-lg border border-stone-200">
                    <p className="text-[10px] text-stone-500 font-bold uppercase">Avg Cooking Time</p>
                    <p className="text-xs font-black text-stone-800 flex items-center justify-center gap-1">
                      <Timer className="w-3 h-3 text-amber-700" />
                      {currentHub.avgCookingTime || '25-35 mins'}
                    </p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-stone-200">
                    <p className="text-[10px] text-stone-500 font-bold uppercase">Free Delivery Above</p>
                    <p className="text-xs font-black text-stone-800 flex items-center justify-center gap-1">
                      <Truck className="w-3 h-3 text-emerald-600" />
                      ₹{currentHub.freeDeliveryThreshold ?? 499}
                    </p>
                  </div>
                </div>
              </div>

              {/* WhatsApp Quick Action Button for Current Outlet */}
              <div className="pt-1">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat with {currentHub.name.replace('Gaon Ka Swad - ', '')} on WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Active Cloud Kitchen Network - City Specific Outlets & PINs */}
            <div className="bg-stone-900 text-stone-200 rounded-2xl p-5 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Active Cloud Kitchen Network ({currentCity})</span>
                </h4>
                <span className="text-[10px] bg-amber-950 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-800">
                  {cityOutlets.length} {cityOutlets.length === 1 ? 'Hub' : 'Hubs'}
                </span>
              </div>

              <p className="text-xs text-stone-400 leading-relaxed">
                Currently cooking and delivering piping hot meals across <strong>{currentCity}</strong> from our registered kitchen hubs:
              </p>

              {/* Location Pins with Delivery Zone PINs beside it */}
              <div className="flex flex-wrap gap-2 pt-1">
                {cityOutlets.map((o) => {
                  const allZones = deliveryZones.length > 0 ? deliveryZones : INITIAL_DELIVERY_ZONES;
                  const outletPins = Array.from(
                    new Set(
                      allZones
                        .filter((z) => z.isActive && z.outletId === o.id)
                        .flatMap((z) => z.pinCodes)
                    )
                  );

                  return (
                    <div
                      key={o.id}
                      className="inline-flex items-center flex-wrap gap-2 text-xs bg-stone-800 text-stone-200 px-3 py-1.5 rounded-lg border border-stone-700 font-medium shadow-xs"
                    >
                      <span className="flex items-center gap-1 text-white font-bold">
                        📍 {o.name.replace('Gaon Ka Swad - ', '')}
                      </span>
                      {outletPins.length > 0 && (
                        <span className="text-amber-300 font-mono text-[11px] bg-stone-900/90 px-2 py-0.5 rounded border border-stone-700/80">
                          PIN: {outletPins.join(', ')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Contact / Catering Form with Outlet Dropdown (7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs">
              {submitted ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-stone-900">
                    Thank You, {form.name}!
                  </h3>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    We have received your message regarding <strong>{targetOutlet.name} ({targetOutlet.city})</strong>. A dedicated culinary concierge will connect with you via phone or email shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setForm({
                        name: '',
                        email: '',
                        phone: '',
                        outletId: targetOutlet.id,
                        subject: 'General Inquiry',
                        isCatering: false,
                        message: ''
                      });
                    }}
                    className="px-5 py-2 bg-amber-900 hover:bg-amber-950 text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-base text-stone-900">
                      Send a Message to Our Culinary Team
                    </h3>
                    <p className="text-xs text-stone-500">
                      Direct inquiry to <strong className="text-stone-800">{targetOutlet.name}</strong> ({targetOutlet.city})
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Outlet Selection Dropdown (All Outlets Available) */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        Select Kitchen Outlet for Inquiry *
                      </label>
                      <div className="relative">
                        <select
                          value={targetOutletId}
                          onChange={(e) => setTargetOutletId(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-amber-50/50 hover:bg-amber-50/80 border border-amber-300 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all cursor-pointer"
                        >
                          {availableOutlets.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name} — {o.city}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1">
                        Select any of our outlets across India to inquire about orders, handi bulk catering, or reservations.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Ananya Roy"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-amber-700 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-amber-700 focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="e.g. ananya@example.com"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-amber-700 focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Inquiry Topic
                      </label>
                      <select
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-amber-700 focus:bg-white"
                      >
                        <option value="General Inquiry">General Inquiry / Order Status</option>
                        <option value="Bulk Party Catering">Bulk / Party Handi Catering (10+)</option>
                        <option value="Corporate Meal Plans">Corporate Meal Subscription</option>
                        <option value="Chef Feedback">Feedback on a Dish</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="flex items-center gap-2 p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.isCatering}
                          onChange={(e) => setForm({ ...form, isCatering: e.target.checked })}
                          className="w-3.5 h-3.5 accent-amber-800 rounded"
                        />
                        <span className="text-xs font-semibold text-amber-950">
                          This is a Bulk / Royal Handi Catering Request (10+ people)
                        </span>
                      </label>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Your Message *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        placeholder={`Tell us your requirements, party date, preferred handis for ${targetOutlet.name}...`}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-amber-700 focus:bg-white resize-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Mail to {targetOutlet.name.replace('Gaon Ka Swad - ', '')}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Frequently Asked Questions */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-amber-800 font-bold text-xs uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Got Questions?</span>
          </div>
          <h2 className="font-extrabold text-xl sm:text-2xl text-stone-900">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-2.5">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 font-bold text-xs sm:text-sm text-stone-900 hover:bg-stone-50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-stone-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-amber-800' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-3.5 sm:px-4 pb-4 pt-1 text-xs text-stone-600 leading-relaxed border-t border-stone-100">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};


