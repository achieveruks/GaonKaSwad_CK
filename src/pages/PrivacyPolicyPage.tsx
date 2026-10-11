import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { ShieldCheck, Lock, Eye, FileText, CheckCircle2, Mail, Phone, MapPin, ArrowLeft } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
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
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Digital Personal Data Protection (DPDP) Compliant</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Last Updated & Effective Date: October 10, 2026 • Version 1.0.3
          </p>
          <p className="mt-4 text-sm text-stone-600 leading-relaxed">
            At <strong>Swad Click Cloud Kitchen</strong> (&quot;Swad Click&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), accessible via 
            swadclick.com, we prioritize the protection and confidentiality of your personal information. 
            This Privacy Policy details how we collect, store, process, and safeguard your data when you visit our website, 
            order fresh delicacies, and use our loyalty coin services.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-6">
          {/* Section 1 */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h2 className="text-lg font-bold text-stone-900">Information We Collect</h2>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed mb-3">
              We collect information strictly necessary to process your food orders, arrange speedy doorstep delivery, 
              and maintain your customer loyalty account:
            </p>
            <ul className="space-y-2 text-sm text-stone-600 list-disc pl-5">
              <li>
                <strong>Contact Information:</strong> Full name, 10-digit mobile phone number (for OTP verification and delivery coordinates), and optional email address.
              </li>
              <li>
                <strong>Delivery Coordinates:</strong> Door/flat number, street address, landmarks, and PIN code.
              </li>
              <li>
                <strong>Order & Dining History:</strong> Items ordered, customized spice/dum preferences, order timestamps, Swad Coins accumulated and redeemed.
              </li>
              <li>
                <strong>Transactional Information:</strong> Payment mode selected (UPI, COD, Netbanking, Credit/Debit Card), payment gateway transaction identifiers, and invoice details. <em>Note: We never store your full debit/credit card numbers or UPI MPINs on our servers.</em>
              </li>
              <li>
                <strong>Device & Browser Data:</strong> IP address, device type, operating system, and session cookies used exclusively for authentication and cart persistence.
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h2 className="text-lg font-bold text-stone-900">How We Use Your Information</h2>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed mb-3">
              We utilize your personal information for lawful, transparent culinary operations:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-stone-700">
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-100 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>Preparing, packing, and dispatching fresh hot orders from our assigned kitchen outlet.</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-100 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>Real-time SMS/WhatsApp order updates and dispatch rider tracking notifications.</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-100 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>Managing your Swad Coins cashback wallet and applying promotional discount coupons.</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-100 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>Complying with statutory food safety regulations (FSSAI) and tax accounting laws (GST).</span>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h2 className="text-lg font-bold text-stone-900">Third-Party Data Sharing & Partners</h2>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed mb-3">
              <strong>We do not sell, rent, or trade your personal information to data brokers or advertising third parties.</strong>
            </p>
            <p className="text-sm text-stone-600 leading-relaxed mb-3">
              Your data is shared strictly with authorized partners necessary for fulfillment:
            </p>
            <ul className="space-y-2 text-sm text-stone-600 list-disc pl-5">
              <li>
                <strong>Delivery Logistics Fleet:</strong> Assigned delivery drivers receive your name, masked phone contact, and address to navigate directly to your location.
              </li>
              <li>
                <strong>Payment Gateways:</strong> PCI-DSS certified payment aggregators (e.g., Razorpay, Cashfree, UPI networks) process payments via encrypted channels.
              </li>
              <li>
                <strong>Communications Infrastructure:</strong> Transactional SMS & OTP messaging gateways to deliver one-time login passcodes.
              </li>
              <li>
                <strong>Law Enforcement & Regulators:</strong> If required by valid court order, government directive, or statutory compliance under Indian law.
              </li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h2 className="text-lg font-bold text-stone-900">Data Security & Storage</h2>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed mb-3">
              Swad Click enforces stringent administrative and technical safeguards:
            </p>
            <ul className="space-y-2 text-sm text-stone-600 list-disc pl-5">
              <li>All web traffic is transmitted across modern 256-bit TLS/SSL encrypted HTTPS connections.</li>
              <li>Customer authentication uses cryptographic JSON Web Tokens (JWT) secured via HTTP-only, SameSite cookies.</li>
              <li>Production databases utilize secure Row-Level Security (RLS) policies ensuring isolated tenant and user data access.</li>
              <li>Routine security audits and vulnerability monitoring to protect against unauthorized system access.</li>
            </ul>
          </div>

          {/* Section 5 */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                5
              </div>
              <h2 className="text-lg font-bold text-stone-900">Cookies & Local Storage</h2>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              We use functional cookies and browser storage solely to remember your chosen delivery PIN code, 
              keep your selected handi dishes in your shopping cart during checkout, and keep you securely logged in. 
              We do not utilize cross-site tracking cookies or invasive third-party ad pixels.
            </p>
          </div>

          {/* Section 6 - Grievance Officer */}
          <div className="bg-stone-900 text-stone-100 rounded-xl p-6 sm:p-8 shadow-xs border border-stone-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-sm">
                6
              </div>
              <h2 className="text-lg font-bold text-white">Grievance Officer & Privacy Inquiries</h2>
            </div>
            <p className="text-sm text-stone-300 leading-relaxed mb-4">
              In accordance with the Information Technology Act 2000 and the Digital Personal Data Protection Act, 
              2023, the contact details of the Grievance Officer for Swad Click are provided below:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-stone-800/80 p-4 rounded-lg border border-stone-700">
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-white">Email Address</p>
                  <a href="mailto:privacy@swadclick.com" className="text-orange-400 hover:underline">
                    privacy@swadclick.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-white">Helpdesk</p>
                  <p className="text-stone-300">+91 94370 12345</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-white">Headquarters</p>
                  <p className="text-stone-300">Swad Click Cloud Kitchen, Odisha, India</p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs text-stone-400">
              For any questions regarding personal data correction or deletion requests, please contact our Grievance Desk. 
              Responses will be provided within 48 business hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
