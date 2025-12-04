-- Change price column from numeric to text to allow free-form price entries like "$50-$200"
ALTER TABLE public.drinks 
ALTER COLUMN price TYPE text USING price::text;