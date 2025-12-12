-- Add new category "تسبقة علي الراتب" (salary advance) to transaction_category enum
ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS 'avance_salaire';