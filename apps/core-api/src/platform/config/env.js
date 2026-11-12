import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

config({ path: fileURLToPath(new URL('../../../../../.env', import.meta.url)) });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  QR_HMAC_SECRET: z.string().min(16),
  CLIENT_URL: z.string().default('http://localhost:4200'),
  CORS_ORIGIN: z.string().default('http://localhost:4200'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GEMINI_EMBEDDING_MODEL: z.string().default('gemini-embedding-001'),
  GEMINI_EMBEDDING_DIMS: z.coerce.number().int().positive().default(768),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  SHOWTIMES_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  SHOWTIMES_UPSTREAM_RETRY_SECONDS: z.coerce.number().int().positive().default(30),
  MONGODB_DB: z.string().default('cinehub'),
  SMTP_HOST: z.string().default('sandbox.smtp.mailtrap.io'),
  SMTP_PORT: z.coerce.number().default(2525),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('CineHub <no-reply@cinehub.vn>'),
  PAYMENT_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  PAYMENT_SIMULATION: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(false),
  MOMO_PARTNER_CODE: z.string().default('MOMO'),
  MOMO_ACCESS_KEY: z.string().default('F8BBA842ECF85'),
  MOMO_SECRET_KEY: z.string().default('K951B6PE1waDMi640xX08PD3vg6EkVlz'),
  MOMO_ENDPOINT: z.string().default('https://test-payment.momo.vn/v2/gateway/api/create'),
  MOMO_REDIRECT_URL: z.string().default('http://localhost:4200/checkout'),
  MOMO_IPN_URL: z.string().default('http://localhost:4000/api/v1/payments/momo-ipn'),
  VNP_TMN_CODE: z.string().default('DEMOV210'),
  VNP_HASH_SECRET: z.string().default('RAXEFVWWCAJIJILJXYEUJYLJJLNRLJYL'),
  VNP_URL: z.string().default('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
  VNP_RETURN_URL: z.string().default('http://localhost:4200/checkout'),
  ZALOPAY_APP_ID: z.coerce.number().default(2554),
  ZALOPAY_KEY1: z.string().default('sdngD8w4FiMuCoyFSeamless'),
  ZALOPAY_KEY2: z.string().default('tr9rEbcMoSpeMfBkmSt2jap8'),
  ZALOPAY_ENDPOINT: z.string().default('https://sb-openapi.zalopay.vn/v2/create'),
  ZALOPAY_REDIRECT_URL: z.string().default('http://localhost:4200/checkout'),
  ZALOPAY_CALLBACK_URL: z
    .string()
    .default('http://localhost:4000/api/v1/payments/zalopay-callback'),
});

export const env = schema.parse(process.env);
