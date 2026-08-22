-- Store verified donation amounts in their original supported currency.
-- amount_ngn remains for legacy NGN reporting; USD rows leave it null.

alter table public.donations
  alter column amount_ngn drop not null;

alter table public.donations
  add column if not exists amount_major numeric(14, 2);

update public.donations
set amount_major = amount_ngn
where amount_major is null and amount_ngn is not null;

alter table public.donations
  add constraint donations_amount_major_positive_check check (amount_major is null or amount_major > 0);
