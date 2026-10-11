import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { FileCheck, AlertCircle, ShoppingBag, ShieldAlert, Award, ArrowLeft, UtensilsCrossed } from 'lucide-react';

export const TermsPage: React.FC = () => {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-xs font-bold uppercase tracking-wider mb-4">
            <FileCheck className="w-4 h-4 text-orange-600" />
            <span>Service Agreement & Conditions</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Terms & Conditions
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Last Updated: October 10, 2026 • Effective Version: 1.0.3
          </p>
          <p className="mt-4 text-sm text-stone-600 leading-relaxed">
            Welcome to <strong>Swad Click Cloud Kitchen</strong> (&quot;swadclick.com&quot;). These Terms and Conditions govern your access to 
            and use of our digital ordering platform, cloud kitchen services, customer loyalty programs, and culinary products. 
            By placing an order or registering an account, you agree to be bound by these Terms in full.
          </p>
        </div>

        {/* Terms Sections */}
        <div className="space-y-6">
          {/* Section 1 */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h2 className="text-lg font-bold text-stone-900">User Eligibility & Account Registration</h2>
            </div>
            <ul className="space-y-2 text-sm text-stone-600 list-disc pl-5">
              <li>
                You must be at least 18 years of age or possess legal parental/guardian consent to enter into transactions on swadclick.com.
              </li>
              <li>
                Customer accounts are authenticated via a verified 10-digit Indian mobile number and One-Time Password (OTP). You are responsible for maintaining the confidentiality of your mobile device and OTP.
              </li>
              <li>
                You agree to provide accurate, current, and complete delivery coordinates, contact numbers, and recipient names. Swad Click is not liable for delayed or failed deliveries resulting from inaccurate address submissions.
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h2 className="text-lg font-bold text-stone-900">Ordering, Menu & Availability</h2>
            </div>
            <ul className="space-y-2 text-sm text-stone-600 list-disc pl-5">
              <li>
                <strong>Artisanal Slow-Cooking:</strong> All dishes are prepared fresh using handi dum and authentic spices. Menu items are subject to stock and batch availability.
              </li>
              <li>
                <strong>Pricing & Invoicing:</strong> All prices displayed on our website are in Indian Rupees (INR) and are inclusive or exclusive of applicable Goods and Services Tax (GST) as specified during checkout summary.
              </li>
              <li>
                <strong>Kitchen Outlets:</strong> Orders are routed dynamically to the closest authorized Swad Click cloud kitchen hub servicing your delivery PIN code. Menu availability and delivery fees may vary slightly across kitchen clusters.
              </li>
              <li>
                <strong>Order Acceptance:</strong> An order confirmation email/SMS constitutes an acknowledgement of receipt, not a final contract. We reserve the right to decline or cancel orders in cases of unexpected ingredient shortages, extreme weather, or delivery rider unavailability.
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h2 className="text-lg font-bold text-stone-900">Food Safety, Allergens & FSSAI Standards</h2>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mb-4 flex items-start gap-3">
              <UtensilsCrossed className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong>Allergen Notice:</strong> Our kitchens prepare dishes containing dairy (pure desi ghee, paneer, cream), tree nuts (cashews, almonds in gravies and biryani garnishes), and gluten. While we maintain strict segregation between pure vegetarian and non-vegetarian cooking stations, we cannot guarantee an entirely allergen-free kitchen environment.
              </div>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              All Swad Click cloud kitchen locations hold valid regulatory licenses issued by the Food Safety and Standards Authority of India (FSSAI). License numbers are transparently printed on our packaging seals, order bills, and website footer.
            </p>
          </div>

          {/* Section 4 */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h2 className="text-lg font-bold text-stone-900">Swad Coins Loyalty Program</h2>
            </div>
            <ul className="space-y-2 text-sm text-stone-600 list-disc pl-5">
              <li>
                Customers receive Swad Coins as cashback rewards on qualifying completed orders as defined by active promotional terms.
              </li>
              <li>
                Swad Coins hold no cash liquidation value and cannot be transferred, exchanged, or withdrawn to bank accounts. They can solely be redeemed as deductions on subsequent food orders placed on swadclick.com.
              </li>
              <li>
                Swad Click reserves the right to audit, modify, or revoke coin balances in the event of suspected fraudulent referral activity, chargebacks, or abusive system exploitation.
              </li>
            </ul>
          </div>

          {/* Section 5 */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                5
              </div>
              <h2 className="text-lg font-bold text-stone-900">Intellectual Property & Website Usage</h2>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              All website content, culinary photographs, trademarks, logos, brand assets, source codes, and dish names 
              are the proprietary intellectual property of Swad Click. Unauthorized copying, scraping, reproduction, 
              or commercial exploitation without explicit prior written authorization is strictly prohibited.
            </p>
          </div>

          {/* Section 6 */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                6
              </div>
              <h2 className="text-lg font-bold text-stone-900">Limitation of Liability & Governing Law</h2>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed mb-3">
              To the maximum extent permitted under applicable law, Swad Click shall not be liable for any indirect, 
              incidental, or consequential damages resulting from inability to use the service, delivery delays caused by 
              natural disruptions, or third-party payment gateway failures.
            </p>
            <p className="text-sm text-stone-600 leading-relaxed">
              These Terms are governed by the laws of India. Any legal disputes arising out of or related to these Terms 
              shall be subject to the exclusive jurisdiction of the competent courts in Bhubaneswar, Odisha.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
