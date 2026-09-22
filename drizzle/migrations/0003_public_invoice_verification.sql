CREATE OR REPLACE FUNCTION public.verify_invoice(p_invoice_number text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inv record;
  v_num text;
BEGIN
  v_num := upper(trim(COALESCE(p_invoice_number, '')));

  IF v_num = '' OR length(v_num) > 40 THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid_format');
  END IF;

  SELECT
    i.invoice_number,
    i.invoice_date,
    i.amount,
    i.currency,
    i.status::text AS status,
    i.service_description,
    i.client_first_name,
    i.client_last_name,
    i.created_at
  INTO v_inv
  FROM public.invoices i
  WHERE upper(i.invoice_number) = v_num
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'invoice_number', v_inv.invoice_number,
    'invoice_date', v_inv.invoice_date,
    'amount', v_inv.amount,
    'currency', v_inv.currency,
    'status', v_inv.status,
    'service', v_inv.service_description,
    'client_masked', left(v_inv.client_first_name, 1) || '. ' || initcap(v_inv.client_last_name),
    'issued_at', v_inv.created_at,
    'issuer', 'KPB Education'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_invoice(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_invoice(text) TO anon, authenticated;