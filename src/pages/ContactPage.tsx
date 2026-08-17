import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useCart } from '../context/CartContext';
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
  Flame
} from 'lucide-react';

export const ContactPage: React.FC = () => {
  const { goToShop } = useNavigation();
  const { showToast } = useCart();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    isCatering: false,
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;

    setSubmitted(true);
    showToast('Message Sent!', 'Our kitchen concierge will reach out within 1 hour.', 'success');
  };

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
      a: 'Yes! We cater for house parties, corporate gatherings, and festive celebrations with customized dum handis and chaffing dish warmers. Select "Bulk / Party Catering" in the contact form or call our helpline.'
    },
    {
      q: 'Can I customize the spice levels or make dishes Jain-friendly?',
      a: 'Yes! On every product page, you can choose your preferred spice intensity (Mild to Extra Spicy) and select Jain-compliant options for our vegetarian curries and paneer specialties.'
    },
    {
      q: 'What are your delivery hours and average delivery time?',
      a: 'We operate daily from 11:30 AM to 11:30 PM. Average delivery time is 30 to 45 minutes depending on your distance from our nearest cloud hub.'
    }
  ];

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* 1. Header Banner */}
      <section className="relative overflow-hidden bg-gray-50 border-b border-gray-200 py-10 sm:py-12 text-center">
        <div className="max-w-3xl mx-auto px-4 space-y-2.5">
          <div className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-900 border border-orange-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5 text-orange-600" />
            <span>We Love Hearing From Food Enthusiasts</span>
          </div>
          <h1 className="font-extrabold text-2xl sm:text-4xl text-gray-950">
            Get in Touch with Gaon Ka Swad
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 max-w-xl mx-auto">
            Have questions about an order, want to arrange party catering, or give feedback to our Master Chef? We are here to help.
          </p>
        </div>
      </section>

      {/* 2. Contact Grid: Info Cards + Form */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Contact Details & Kitchen Hubs (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-base text-gray-900">
                Kitchen Concierge & Helpline
              </h3>

              <div className="space-y-3.5 text-xs sm:text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Order Hotline & WhatsApp</p>
                    <p className="text-gray-700 font-medium">+91 98765 43210 / +91 98765 43211</p>
                    <p className="text-[10px] text-gray-400">Available 11:00 AM - 11:30 PM</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Email Inquiries</p>
                    <p className="text-gray-700 font-medium">orders@gaonkaswad.in</p>
                    <p className="text-[10px] text-gray-400">catering@gaonkaswad.in</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Operating Hours</p>
                    <p className="text-gray-700 font-medium">Monday – Sunday: 11:30 AM – 11:30 PM</p>
                    <p className="text-[10px] text-gray-400">Open 365 days including holidays</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Central Cloud Kitchen Hub</p>
                    <p className="text-gray-700 font-medium">
                      Unit 14, Gourmet Culinary Park, Linking Road, Bandra West, Mumbai 400050
                    </p>
                  </div>
                </div>
              </div>

              {/* WhatsApp Quick Order button */}
              <div className="pt-1">
                <a
                  href="https://wa.me/919876543210?text=Hi%20Gaon%20Ka%20Swad%2C%20I%20would%20like%20to%20place%20an%20order"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat on WhatsApp (+91 98765 43210)</span>
                </a>
              </div>
            </div>

            {/* Delivery coverage pill */}
            <div className="bg-gray-900 text-white rounded-2xl p-5 border border-gray-800 space-y-2">
              <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>Express 30-Min Service Zones</span>
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Currently serving all pincodes across Mumbai, Navi Mumbai, Thane, Pune (Koregaon Park / Baner), and Bengaluru (Indiranagar / Koramangala / Whitefield).
              </p>
            </div>
          </div>

          {/* Right Column: Interactive Contact / Catering Form (7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs">
              {submitted ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900">
                    Thank You, {form.name}!
                  </h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    We have received your message. A dedicated Gaon Ka Swad culinary manager will connect with you via phone or email shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setForm({
                        name: '',
                        email: '',
                        phone: '',
                        subject: 'General Inquiry',
                        isCatering: false,
                        message: ''
                      });
                    }}
                    className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-base text-gray-900">
                      Send a Message to Our Kitchen
                    </h3>
                    <p className="text-xs text-gray-500">
                      Fill in the details below and our team will get back to you promptly.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Ananya Roy"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="e.g. ananya@example.com"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Inquiry Topic
                      </label>
                      <select
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                      >
                        <option value="General Inquiry">General Inquiry / Order Status</option>
                        <option value="Bulk Party Catering">Bulk / Party Handi Catering</option>
                        <option value="Corporate Meal Plans">Corporate Meal Plans</option>
                        <option value="Chef Feedback">Feedback on a Dish</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="flex items-center gap-2 p-2.5 bg-orange-50/60 border border-orange-200 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.isCatering}
                          onChange={(e) => setForm({ ...form, isCatering: e.target.checked })}
                          className="w-3.5 h-3.5 accent-orange-600 rounded"
                        />
                        <span className="text-xs font-semibold text-orange-950">
                          This is a Bulk / Party Order (10+ people)
                        </span>
                      </label>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Your Message *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        placeholder="Tell us your requirements, party date, preferred delicacies, or questions..."
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white resize-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Message to Kitchen</span>
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
          <div className="inline-flex items-center gap-1.5 text-orange-600 font-bold text-xs uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Got Questions?</span>
          </div>
          <h2 className="font-extrabold text-xl sm:text-2xl text-gray-900">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-2.5">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 font-bold text-xs sm:text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-orange-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-3.5 sm:px-4 pb-4 pt-1 text-xs text-gray-600 leading-relaxed border-t border-gray-100">
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
