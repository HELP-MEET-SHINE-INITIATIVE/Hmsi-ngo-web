# Paystack international payment notes

Reviewed 2026-08-22 from official Paystack sources.

- Paystack says businesses can receive payments from customers anywhere in the world using supported international cards, subject to account activation and compliance approval.
- For Nigeria-based businesses, the listed payment currencies are NGN and USD.
- International payments are settled in the local currency by default. Nigeria-based businesses may receive USD settlement when the account has the required approved setup, including a USD domiciliary account.
- Paystack transaction initialization accepts a currency code and amounts in the subunit of the supported currency.
- HMSI must not claim to accept every world currency through Paystack. The implementation should offer only verified supported currencies (NGN and USD) and explain that the customer's bank may convert from another card currency.

Sources:
1. https://support.paystack.com/en/articles/2130690 — Enabling international payments for your business.
2. https://paystack.com/docs/api/transaction/ — Transactions API; initialize and verify transaction currency/amount requirements.
3. https://paystack.com/pricing — International payment and USD settlement notes.
