-- Canonical county-level discovery. Existing town/locality values remain in products.location.
alter table public.products
  add column if not exists county text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.products drop constraint if exists products_county_valid_check;
alter table public.products add constraint products_county_valid_check check (county in (
  'Mombasa','Kwale','Kilifi','Tana River','Lamu','Taita-Taveta','Garissa','Wajir','Mandera','Marsabit','Isiolo','Meru','Tharaka-Nithi','Embu','Kitui','Machakos','Makueni','Nyandarua','Nyeri','Kirinyaga',
  'Murang''a','Kiambu','Turkana','West Pokot','Samburu','Trans Nzoia','Uasin Gishu','Elgeyo-Marakwet','Nandi','Baringo','Laikipia','Nakuru','Narok','Kajiado','Kericho','Bomet','Kakamega','Vihiga','Bungoma','Busia','Siaya','Kisumu','Homa Bay','Migori','Kisii','Nyamira','Nairobi City'
));

alter table public.products drop constraint if exists products_latitude_valid_check;
alter table public.products add constraint products_latitude_valid_check check (latitude is null or latitude between -4.8 and 5.2);
alter table public.products drop constraint if exists products_longitude_valid_check;
alter table public.products add constraint products_longitude_valid_check check (longitude is null or longitude between 33.8 and 42.2);
create index if not exists products_county_browse_idx on public.products(status, county, created_at desc);
