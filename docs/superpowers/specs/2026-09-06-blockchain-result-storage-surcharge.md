# Vote Usage Surcharge Specification

## Goal

Charge an additional 3,000 KRW for every child vote whose effective result
storage mode is `BLOCKCHAIN`, and an additional 30,000 KRW per started 100
electors when identity verification is required for the parent vote. The server
calculates and snapshots the complete price when it creates a vote usage billing
order, so clients cannot choose or alter either surcharge.

## Current behavior

- `VoteUsagePrice.forElectorCount` charges 3,000 KRW for each started block of
  100 eligible electors.
- `CreateVoteUsageBillingOrderHandler` reads only the eligible elector count
  before issuing an order.
- `billing_orders` snapshots the elector count, pricing unit size/count, unit
  price and total amount. Its amount constraint currently permits only
  `unit_price * pricing_unit_count`.
- Result storage mode is a vote policy. A child vote inherits the parent
  `defaultPolicy.resultStorageMode` unless its override supplies a different
  value.
- Billing order responses and payment integration events expose the snapshotted
  total amount. They do not expose a blockchain surcharge breakdown.

Repository evidence:

- `server/src/modules/billing/domain/vo/vote-usage-price.vo.ts`
- `server/src/modules/billing/application/command/handler/create-vote-usage-billing-order.handler.ts`
- `server/src/modules/billing/infrastructure/database/entity/billing.entities.ts`
- `server/src/shared/domain/voting/vo/vote-policy.vo.ts`
- `server/src/modules/vote/domain/vote/vote-detail.aggregate.ts`

## Pricing policy

The order total is calculated as follows:

```text
base unit size                  = 100 eligible electors
base unit price                 = 3,000 KRW
base pricing unit count         = ceil(eligible elector count / 100)
base amount                     = base pricing unit count * 3,000 KRW
blockchain storage unit price   = 3,000 KRW
blockchain storage count        = number of included child votes whose
                                  effective result storage mode is BLOCKCHAIN
blockchain surcharge amount     = blockchain storage count * 3,000 KRW
identity verification required  = parent vote identity verification policy
identity verification unit price = 30,000 KRW
identity verification amount    = pricing unit count * 30,000 KRW when required,
                                  otherwise 0 KRW
total amount                    = base amount + blockchain surcharge amount
                                  + identity verification amount
```

A child vote is included in the count when it belongs to the billed parent vote
and has not been canceled. Its effective mode is the child override when one is
present, otherwise the parent default. This means:

- a parent default of `BLOCKCHAIN` charges for each non-canceled child vote that
  does not override the mode to `DATABASE`;
- a parent default of `DATABASE` charges only for non-canceled child votes that
  override the mode to `BLOCKCHAIN`;
- a parent with no effective blockchain child votes has no surcharge;
- canceled child votes never contribute to the surcharge.

The accepted surcharge is fixed at 3,000 KRW per effective blockchain child
vote. It is independent of elector count.

Identity verification adds 30,000 KRW per started 100-elector pricing unit when
the parent vote requires verification. It uses the same electorate snapshot and
pricing unit count as the base amount.

## Order creation and consistency

The existing order creation transaction remains the consistency boundary.
After locking the parent vote for billing, the handler reads the eligible
elector count and effective blockchain child-vote count, and uses the locked
parent vote's identity verification policy. It builds one server-side price,
locks the vote with the new billing order ID, persists the order and records its
outbox event.

All price inputs and the resulting breakdown are immutable order snapshots.
Changing a vote policy is already forbidden after billing locks the vote, so the
charged blockchain count cannot diverge from the finalized vote configuration.
Repeated order creation by the same orderer returns the existing order and does
not recalculate its price.

The billing application depends on a capability port that returns the effective
blockchain child-vote count for one parent vote. The vote database adapter owns
the policy inheritance query. Billing does not depend on vote ORM entities or
reimplement policy inheritance from raw rows.

## Price and persistence model

The existing fields keep their current base-usage meaning:

- `electorCount`
- `pricingUnitSize`
- `pricingUnitCount`
- `unitPrice`

The price and billing order snapshots add:

- `blockchainStorageCount`
- `blockchainStorageUnitPrice`
- `blockchainStorageAmount`
- `identityVerificationRequired`
- `identityVerificationUnitPrice`
- `identityVerificationAmount`
- `baseAmount`

`baseAmount`, `blockchainStorageAmount` and `identityVerificationAmount` may be
derived in memory and in API responses. Persistence must store the blockchain
count and unit price plus the identity verification requirement and unit price
alongside the existing base inputs so historical totals can be reconstructed
without consulting current product policy.

The database migration must:

- initialize existing orders with `blockchain_storage_count = 0`;
- initialize their blockchain unit price to 3,000 KRW;
- initialize identity verification as not required and its unit price to 30,000
  KRW;
- preserve every existing order total and status;
- replace the current amount constraint with one that validates base amount
  plus both surcharges;
- enforce a non-negative blockchain count and positive surcharge unit prices.

Existing orders are never repriced, including active orders.

## HTTP and integration contracts

Create-order and get-order responses append the following fields while retaining
all current fields:

```json
{
  "electorCount": 120,
  "pricingUnitSize": 100,
  "pricingUnitCount": 2,
  "unitPrice": 3000,
  "baseAmount": 6000,
  "blockchainStorageCount": 2,
  "blockchainStorageUnitPrice": 3000,
  "blockchainStorageAmount": 6000,
  "identityVerificationRequired": true,
  "identityVerificationUnitPrice": 30000,
  "identityVerificationAmount": 60000,
  "amount": 72000,
  "currency": "KRW"
}
```

These additions are backward compatible for clients that already use `amount`
as the payable total. UI clients should display the base amount, blockchain
surcharge and identity verification surcharge separately, with `amount` as the
final payable total.

Payment integration continues to receive the snapshotted total `amount` and
`currency`. No event name or schema-version change is required because the
payment contract does not calculate the price and does not require the
breakdown.

## Failure behavior

- An order still fails when there are no eligible electors.
- Invalid, negative or internally inconsistent price snapshots fail closed in
  the domain and database constraints.
- A missing parent vote continues to return not found.
- No partial order is persisted if either pricing input cannot be read or the
  calculated price is invalid.
- Payment success continues to be rejected unless the paid total and currency
  exactly match the order snapshot, including the surcharge.

## Security and compatibility

- The client supplies only `voteId`; all counts, unit prices and totals are
  server-owned.
- Price calculation runs under the existing serializable order-creation
  transaction and vote setup lock.
- The change stores no ballot selections, identity data or blockchain secrets.
- Existing orders and existing API consumers retain their current payable total
  semantics.
- The surcharge covers the selected blockchain result-storage service. Actual
  chain gas reconciliation, variable network fees and post-payment price
  adjustment are outside this change.

## Scope

In scope:

- effective blockchain child-vote counting;
- identity verification surcharge calculation;
- domain price calculation and invariants;
- billing order snapshot persistence and migration;
- create/read response breakdowns and Swagger documentation;
- billing API documentation;
- UI display of the price breakdown;
- focused domain, application, persistence, migration and HTTP contract tests.

Out of scope:

- changing the blockchain result-writing workflow;
- selecting a blockchain network or estimating gas dynamically;
- separate products, coupons, tax or discounts;
- repricing or modifying an existing billing order;
- changing payment event names or their schema version.

## Implementation stages

1. **Backend:** add the effective blockchain-count capability and vote adapter,
   then update the price value object and billing order aggregate snapshot.
2. **Backend:** add persistence fields, mapper/repository support and a safe
   migration for existing orders.
3. **Backend:** expose the additive response fields and update billing API
   documentation.
4. **Frontend:** render base usage, blockchain surcharge and final total from
   the server response without recalculating the payable amount.
5. **QA:** run focused price/handler/adapter/migration/HTTP tests, the full server
   test suite, lint and build; run the affected UI tests, type check and build.

## Acceptance criteria

- A vote with 120 eligible electors, no effective blockchain child votes and no
  required identity verification is billed 6,000 KRW.
- A vote with 120 eligible electors and two effective blockchain child votes is
  billed 12,000 KRW: 6,000 KRW base plus 6,000 KRW surcharge.
- Parent defaults and child overrides produce the effective counts described in
  the pricing policy.
- Canceled child votes do not affect the price.
- Required identity verification adds 30,000 KRW per started 100 electors.
- A vote with 120 eligible electors, two effective blockchain child votes and
  required identity verification is billed 72,000 KRW.
- A repeated create-order request returns the original price snapshot even if
  current pricing constants later change.
- Existing orders migrate with a zero surcharge and unchanged totals.
- The database rejects an amount that differs from the snapshotted base plus
  both surcharge calculations.
- Create and get responses expose the same breakdown and total.
- Payment completion accepts only the total snapshotted on the order.
- The UI shows the server-provided base amount, surcharge and final total.
