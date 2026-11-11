# ALLIFY — Chattogram Digital Bazaar

Bengali-first multi-vendor marketplace for Chattogram, Bangladesh.

## Current status

This repository contains the exported Lovable starter and database foundation. It is **not yet a complete or production-ready marketplace**. The currently implemented public UI is primarily the home page. Customer product browsing/details, search, cart, checkout, account/order history, seller application/dashboard/store pages, and admin management UI still need implementation and end-to-end testing.

## Stack

- TanStack Start, React, TypeScript, Tailwind CSS
- Supabase Auth and PostgreSQL
- BDT (৳), Bangla-first, Chattogram delivery areas
- Cash on delivery/manual order confirmation only

## Security

- Do not commit `.env`, credentials, access tokens, or Supabase service-role keys.
- The unsafe first-user admin-claim function is removed by migration `0001_remove_first_admin_claim.sql`.
- Create the initial admin only through a trusted Supabase dashboard/service-role process; never through a public signup flow.
- Review all row-level security policies and test them with anon, customer, seller, and admin roles before launch.

## Integrations not configured

Online payment gateways, courier APIs, production email/SMS, and public product-image storage are not configured. Do not imply these are active.

## Build

```sh
npm install
npm run build
npm test
```

A GitHub Actions build workflow is included at `.github/workflows/ci.yml`.
