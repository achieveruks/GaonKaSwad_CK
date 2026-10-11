import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { RotateCcw, ShieldCheck, Clock, CheckCircle2, HelpCircle, ArrowLeft, AlertCircle, Phone, Mail } from 'lucide-react';

export const RefundPolicyPage: React.FC = () => {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold uppercase tracking-wider mb-4">
            <RotateCcw className="w-4 h-4 text-blue-600" />
            <span>Fair Culinary Transparency</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Cancellation & Refund Policy
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Last Updated: October 10, 2026 • Effective Version: 1.0.3
          </p>
          <p className="mt-4 text-sm text-stone-600 leading-relaxed">
            At <strong>Swad Click Cloud Kitchen</strong>, every dum handi and artisanal specialty is cooked fresh to order 
            using high-grade, perishable culinary ingredients. Because freshly cooked meals cannot be restocked or reused once prepared, 
            we operate transparent cancellation and refund guidelines detailed below.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {/* Section 1 - Cancellation Windows */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h2 className="text-lg font-bold text-stone-900">Order Cancellation Window</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                <div className="flex items-center gap-2 text-emerald-800 font-bold mb-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Within 3–5 Minutes of Order</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  You may cancel your order free of cost if our kitchen chefs have not yet accepted the ticket and commenced fresh handi preparation. A 100% full refund is issued instantly.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/80">
                <div className="flex items-center gap-2 text-rose-800 font-bold mb-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>After Cooking Begins or Dispatch</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Once our kitchen team has begun dum-cooking or the order has been handed over to the delivery partner, cancellations cannot be accepted as the perishable food cannot be repurposed.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2 - Refund Eligibility */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h2 className="text-lg font-bold text-stone-900">Valid Grounds for Full or Partial Refund</h2>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed mb-4">
              We stand 100% behind the taste, freshness, and safety of our food. You are eligible for an immediate refund, credit note, or replacement in the following scenarios:
            </p>
            <ul className="space-y-3 text-sm text-stone-600">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1 shrink-0" />
                <div>
                  <strong>Tampered Packaging or Broken Quality Seal:</strong> Every Swad Click order arrives with an intact security seal. If the package was tampered with during transit, please refuse delivery and notify us immediately.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1 shrink-0" />
                <div>
                  <strong>Incorrect or Missing Items:</strong> If a dish is missing from your package or a completely incorrect item was packed, we will issue a pro-rata refund for the item or immediately dispatch a replacement.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1 shrink-0" />
                <div>
                  <strong>Food Quality or Spill Issues:</strong> If food is received severely spilled, damaged in transit, or not matching our quality standards. Photos must be shared with support within 45 minutes of delivery.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1 shrink-0" />
                <div>
                  <strong>Kitchen Non-Fulfillment:</strong> If an unforeseen operational stoppage prevents our kitchen from preparing or dispatching your order.
                </div>
              </li>
            </ul>
          </div>

          {/* Section 3 - Refund Processing Timelines */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h2 className="text-lg font-bold text-stone-900">Refund Methods & Settlement Timelines</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 border-b border-stone-200">
                    <th className="p-3 font-bold">Payment Method Used</th>
                    <th className="p-3 font-bold">Refund Destination</th>
                    <th className="p-3 font-bold">Expected Credit Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-stone-600">
                  <tr>
                    <td className="p-3 font-semibold text-stone-900">UPI (Google Pay, PhonePe, Paytm)</td>
                    <td className="p-3">Original Bank Account via UPI VPA</td>
                    <td className="p-3 text-emerald-700 font-bold">Instant to 24–48 Hours</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-stone-900">Credit / Debit Cards</td>
                    <td className="p-3">Card Issuing Bank</td>
                    <td className="p-3">3 to 5 Banking Days</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-stone-900">Net Banking</td>
                    <td className="p-3">Source Bank Account</td>
                    <td className="p-3">2 to 4 Banking Days</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-stone-900">Cash on Delivery (COD)</td>
                    <td className="p-3">Instant Swad Coins or Bank UPI Transfer</td>
                    <td className="p-3 text-emerald-700 font-bold">Within 24 Hours</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-stone-900">Swad Coins / Wallet Credits</td>
                    <td className="p-3">Swad Click Customer Balance</td>
                    <td className="p-3 text-emerald-700 font-bold">Instant (Real-time)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4 - How to Request a Refund */}
          <div className="bg-stone-900 text-stone-100 rounded-xl p-6 sm:p-8 shadow-xs border border-stone-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h2 className="text-lg font-bold text-white">How to File a Quick Refund Request</h2>
            </div>
            <p className="text-sm text-stone-300 leading-relaxed mb-4">
              To expedite resolution, please reach out with your <strong>Order ID</strong> and a clear picture of the delivered food/seal within 45 minutes of delivery:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-stone-800/80 p-4 rounded-lg border border-stone-700">
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-white">Helpline / WhatsApp</p>
                  <p className="text-stone-300">+91 94370 12345</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-white">Support Email</p>
                  <a href="mailto:support@swadclick.com" className="text-orange-400 hover:underline">
                    support@swadclick.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
