This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## YooKassa

Required production environment variables:

```bash
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
YOOKASSA_RETURN_URL=https://artistcrm.ru/cabinet/tariff-select?payment=yookassa
YOOKASSA_WEBHOOK_SECRET=
```

Webhook URL in YooKassa:

```text
https://artistcrm.ru/api/billing/yookassa/webhook?token=YOOKASSA_WEBHOOK_SECRET
```

For balance top-ups paid through SBP, the app credits an additional 2% bonus
after YooKassa returns a successful payment with `payment_method.type = sbp`.

Optional receipt variables, if YooKassa fiscalization is enabled:

```bash
YOOKASSA_SEND_RECEIPT=true
YOOKASSA_VAT_CODE=1
NEXT_PUBLIC_LEGAL_NAME=
NEXT_PUBLIC_LEGAL_INN=
NEXT_PUBLIC_SUPPORT_EMAIL=support@artistcrm.ru
```

## Tochka acquiring

Required production environment variables:

```bash
TOCHKA_API_TOKEN=
TOCHKA_CLIENT_ID=
TOCHKA_CUSTOMER_CODE=302258794
TOCHKA_MERCHANT_ID=200000000037708
TOCHKA_RETURN_URL=https://artistcrm.ru/cabinet/tariff-select?payment=tochka
TOCHKA_SEND_RECEIPT=true
TOCHKA_TAX_SYSTEM_CODE=npd
TOCHKA_VAT_TYPE=none
TOCHKA_RECEIPT_ITEM_NAME=Оплата ArtistCRM
```

Webhook URL in Tochka:

```text
https://artistcrm.ru/api/billing/tochka/webhook
```

Use the local diagnostic command to check available companies and retailers:

```bash
npm run tochka:discover
```

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
