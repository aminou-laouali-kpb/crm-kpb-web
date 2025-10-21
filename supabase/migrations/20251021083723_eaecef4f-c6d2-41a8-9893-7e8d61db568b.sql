-- Create enum for sales representatives
CREATE TYPE public.sales_rep AS ENUM ('Josphin', 'Nadia', 'Donald', 'Richard');

-- Create enum for invoice status
CREATE TYPE public.invoice_status AS ENUM (
  'generated',
  'sent',
  'awaiting_payment',
  'to_follow_up',
  'paid'
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  client_first_name TEXT NOT NULL,
  client_last_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_whatsapp TEXT NOT NULL,
  service_description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  sales_representative sales_rep NOT NULL,
  status invoice_status NOT NULL DEFAULT 'generated',
  template_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_status_change TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (we'll add auth later)
CREATE POLICY "Allow all operations on invoices"
  ON public.invoices
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_updated_at();

-- Create function to update last_status_change when status changes
CREATE OR REPLACE FUNCTION public.update_invoice_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.last_status_change = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status changes
CREATE TRIGGER update_invoices_status_change
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_status_change();

-- Create index for faster queries
CREATE INDEX idx_invoices_sales_rep ON public.invoices(sales_representative);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_created_at ON public.invoices(created_at);
CREATE INDEX idx_invoices_last_status_change ON public.invoices(last_status_change);