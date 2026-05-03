// Smoke setup — apenas variáveis públicas que o cliente Ju espera.
// NÃO setar nada server-side / service_role / secrets.
process.env.NEXT_PUBLIC_YZI_API_URL =
  process.env.NEXT_PUBLIC_YZI_API_URL ?? "https://yzi-os.test.local";
process.env.NEXT_PUBLIC_JUREMA_TENANT_ID =
  process.env.NEXT_PUBLIC_JUREMA_TENANT_ID ??
  "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";
