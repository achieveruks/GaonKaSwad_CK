import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { Truck, Clock, MapPin, PackageCheck, ThermometerSnowflake, ArrowLeft, ShieldCheck, Phone, CheckCircle2 } from 'lucide-react';

export const ShippingPolicyPage: React.FC = () => {
  const { goToHome, goToContact } = useNavigation();

  return (
    <div className="bg-stone-50 min-h-screen py-10 sm:py-14 text-stone-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb / Back button */}
        <div className="mb-6">
          <button
            onClick={goToHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </button>
        </div>

        {/* Header Banner */}
        <div className="bg-white rounded-2xl p-6 sm:p-10 border border-stone-200 shadow-xs mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-4">
            <Truck className="w-4 h-4 text-emerald-600" />
            <span>Express Insulated Food Logistics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Shipping & Delivery Policy
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Last Updated: October 10, 2026 • Effective Version: 1.0.3
          </p>
          <p className="mt-4 text-sm text-stone-600 leading-relaxed">
            At <strong>Swad Click Cloud Kitchen</strong>, we believe great regional cuisine should arrive at your dining table 
            just as hot, aromatic, and pristine as when it leaves our traditional dum handis. This Shipping & Delivery Policy explains 
            our delivery timeframes, serviceable zones, and temperature-controlled packaging standards.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-6">
          {/* Section 1 - Delivery Timelines */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h2 className="text-lg font-bold text-stone-900">Delivery Timelines & Express Dispatch</h2>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed mb-4">
              Because our biryanis, slow-simmered handi gravies, and breads are cooked fresh upon receipt of order, our typical timeline is:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                <Clock className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                <h3 className="font-bold text-stone-900 text-sm">15–20 Mins</h3>
                <p className="text-xs text-stone-600 mt-1">Fresh Dum Preparation & Thermal Sealing</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <Truck className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <h3 className="font-bold text-stone-900 text-sm">15–20 Mins</h3>
                <p className="text-xs text-stone-600 mt-1">Insulated Fleet Doorstep Transit</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <PackageCheck className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <h3 className="font-bold text-stone-900 text-sm">30–45 Mins Total</h3>
                <p className="text-xs text-stone-600 mt-1">Average Total Arrival Time</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-stone-500">
              *Delivery times may fluctuate during peak dinner hours (8:00 PM – 10:00 PM), heavy monsoons, or extreme traffic congestion. You will receive live status updates via SMS / WhatsApp.
            </p>
          </div>

          {/* Section 2 - Serviceable Locations */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h2 className="text-lg font-bold text-stone-900">Serviceable Delivery Clusters & PIN Codes</h2>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed mb-3">
              We operate centralized cloud kitchens servicing designated radius clusters (typically up to 8–10 km from each outlet):
            </p>
            <ul className="space-y-2 text-sm text-stone-600 list-disc pl-5">
              <li>
                Before browsing or checkout, customers select or enter their delivery PIN code using our location selector.
              </li>
              <li>
                Our platform automatically pairs your order with the nearest operational kitchen hub (e.g., Jayadev Vihar, Patia, Saheed Nagar) ensuring the shortest transit duration.
              </li>
              <li>
                If your address falls outside our direct radius, our system will notify you that delivery is temporarily unavailable to preserve dining temperature and food safety.
              </li>
            </ul>
          </div>

          {/* Section 3 - Packaging & Temperature Control */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h2 className="text-lg font-bold text-stone-900">Thermal Packaging & Safety Seals</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-stone-700">
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-stone-900">Food-Grade Thermal Containers</strong>
                  <span className="text-xs text-stone-600">Heavy-gauge, microwave-safe containers designed to retain heat above 65°C throughout the transit journey.</span>
                </div>
              </div>
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-stone-900">Tamper-Evident Security Seal</strong>
                  <span className="text-xs text-stone-600">Every bag is sealed with an adhesive barcode sticker. If the seal is broken or torn, do not accept the package.</span>
                </div>
              </div>
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-stone-900">Separate Hot & Cold Compartments</strong>
                  <span className="text-xs text-stone-600">Crispy raitas, salads, and chilled beverages are isolated from piping hot handi curries and breads.</span>
                </div>
              </div>
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-stone-900">Eco-Friendly Outer Packaging</strong>
                  <span className="text-xs text-stone-600">Recyclable kraft paper carry bags with reinforced handles for spill-free motorbike transit.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4 - Delivery Charges */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h2 className="text-lg font-bold text-stone-900">Delivery Charges & Minimum Order Value</h2>
            </div>
            <ul className="space-y-2 text-sm text-stone-600 list-disc pl-5">
              <li>
                <strong>Free Delivery Tier:</strong> Orders exceeding our specified cart threshold (e.g. ₹299 or as set by the local outlet) qualify for zero delivery fees.
              </li>
              <li>
                <strong>Nominal Distance Fee:</strong> A small delivery charge (ranging from ₹25 to ₹50) may apply for distant radii or sub-threshold carts, clearly itemized in the cart summary before payment.
              </li>
              <li>
                <strong>Zero Surge Pricing:</strong> We do not artificially inflate menu item costs during rush hours.
              </li>
            </ul>
          </div>

          {/* Section 5 - Customer Assistance */}
          <div className="bg-stone-900 text-stone-100 rounded-xl p-6 sm:p-8 shadow-xs border border-stone-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-sm">
                5
              </div>
              <h2 className="text-lg font-bold text-white">Live Delivery Assistance</h2>
            </div>
            <p className="text-sm text-stone-300 leading-relaxed mb-4">
              If your delivery rider is having difficulty locating your address or if your order is delayed past the estimated window, our kitchen dispatch team is available:
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2 bg-stone-800 px-3 py-2 rounded-lg border border-stone-700">
                <Phone className="w-4 h-4 text-orange-400" />
                <span>Dispatch Helpline: +91 94370 12345</span>
              </div>
              <button
                onClick={goToContact}
                className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors"
              >
                View Kitchen Addresses & Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
