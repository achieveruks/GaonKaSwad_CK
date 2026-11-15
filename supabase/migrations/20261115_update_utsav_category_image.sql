-- Update Utsav Specials category banner image to the local festive feast asset
UPDATE public.categories
SET image = '/images/categories/utsav_specials.jpg'
WHERE slug IN ('utsav_specials', 'utsav-specials');
