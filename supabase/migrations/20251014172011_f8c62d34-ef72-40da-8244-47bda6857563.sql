-- Ajouter les champs pour les informations de vol (optionnel)
ALTER TABLE public.invoices
ADD COLUMN flight_departure_city TEXT,
ADD COLUMN flight_arrival_city TEXT,
ADD COLUMN flight_departure_date DATE,
ADD COLUMN flight_return_date DATE,
ADD COLUMN flight_traveler_name TEXT;

-- Ajouter les champs pour les informations d'hébergement (optionnel)
ALTER TABLE public.invoices
ADD COLUMN hotel_name TEXT,
ADD COLUMN hotel_city TEXT,
ADD COLUMN hotel_checkin_date DATE,
ADD COLUMN hotel_checkout_date DATE,
ADD COLUMN hotel_guest_name TEXT,
ADD COLUMN hotel_room_type TEXT;

COMMENT ON COLUMN public.invoices.flight_departure_city IS 'Ville de départ du vol (optionnel)';
COMMENT ON COLUMN public.invoices.flight_arrival_city IS 'Ville d''arrivée du vol (optionnel)';
COMMENT ON COLUMN public.invoices.flight_departure_date IS 'Date de départ du vol (optionnel)';
COMMENT ON COLUMN public.invoices.flight_return_date IS 'Date de retour du vol (optionnel)';
COMMENT ON COLUMN public.invoices.flight_traveler_name IS 'Nom du voyageur (optionnel)';
COMMENT ON COLUMN public.invoices.hotel_name IS 'Nom de l''hôtel (optionnel)';
COMMENT ON COLUMN public.invoices.hotel_city IS 'Ville de l''hôtel (optionnel)';
COMMENT ON COLUMN public.invoices.hotel_checkin_date IS 'Date d''entrée à l''hôtel (optionnel)';
COMMENT ON COLUMN public.invoices.hotel_checkout_date IS 'Date de sortie de l''hôtel (optionnel)';
COMMENT ON COLUMN public.invoices.hotel_guest_name IS 'Nom du client de l''hôtel (optionnel)';
COMMENT ON COLUMN public.invoices.hotel_room_type IS 'Type de chambre (optionnel)';