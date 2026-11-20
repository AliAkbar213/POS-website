BEGIN;

ALTER TABLE public.inventory
  ADD COLUMN product_id bigint REFERENCES public.products(id),
  ADD CONSTRAINT inventory_store_product_key UNIQUE (store_id, product_id);

COMMIT;
