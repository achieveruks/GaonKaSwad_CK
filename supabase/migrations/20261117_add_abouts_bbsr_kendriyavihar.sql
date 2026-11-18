-- ==============================================================================
-- MIGRATION: Add About Us row for bbsr-kendriyavihar outlet
-- Date: 2026-11-17
-- ==============================================================================

INSERT INTO public.abouts (
  outlet_id,
  hero_fire_line,
  hero_header,
  hero_description,
  story_line,
  story_title,
  story_description,
  story_highlight1_title,
  story_highlight1_description,
  story_highlight2_title,
  story_highlight2_description,
  outlet_image,
  exp_line,
  exp_header,
  exp_description,
  exp_card1_title,
  exp_card1_header,
  exp_card1_description,
  exp_card2_title,
  exp_card2_header,
  exp_card2_description,
  exp_card3_title,
  exp_card3_header,
  exp_card3_description
)
VALUES (
  'bbsr-kendriyavihar',
  'THE HERITAGE BEHIND SWAD CLICK • KENDRIYA VIHAR',
  'Authentic Earthen-Pot Flavors for Kendriya Vihar & Tamando',
  'Serving slow-simmered handi curries, aromatic dum biryanis, charcoal-kissed kebabs, and fresh tiffins to families across Kendriya Vihar, Tamando, and nearby Bhubaneswar neighborhoods.',
  'KENDRIYA VIHAR CLOUD KITCHEN',
  'Warm Home-Style Kitchen Craft in South Bhubaneswar',
  E'Swad Click Kendriya Vihar honors time-tested Indian kitchen traditions using clay handis, hand-ground raw spices, and pure desi ghee without artificial colors or preservatives.\n\nFrom daily family meals to festive Utsav feasts, our Tamando kitchen maintains strict hygiene, eco-friendly packaging, and swift doorstep delivery or counter pickup.',
  '100% Pure Desi Ghee',
  'Pure Desi Ghee & Raw Spices',
  '24 Hrs Slow-Simmered',
  'Slow-Simmered Dal Bukhara',
  '/images/categories/slow_cooked_curries.jpg',
  'THE SWAD CLICK EXPERIENCE',
  'Food That Feels Like Home',
  'From the way we cook to the way we serve, every detail is designed to make your meal feel a little more special.',
  '🏠 Familiar Flavours',
  'Taste That Feels Like Home',
  'Comforting Indian flavours inspired by the food we know, love, and grew up sharing.',
  '🍽️ Made With Care',
  'Every Order Matters',
  'We prepare each order with attention to freshness, consistency, and the little details that make a meal memorable.',
  '❤️ Your Experience',
  'We Listen & Improve',
  'Your feedback helps us get better. Every rating, review, and suggestion helps shape the Swad Click experience.'
)
ON CONFLICT (outlet_id) DO NOTHING;
