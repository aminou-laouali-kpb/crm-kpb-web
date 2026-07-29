REVOKE EXECUTE ON FUNCTION public.update_contract_request_client_info(text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_contract_request_client_info(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_contract_request_client_info(text, jsonb) TO service_role;