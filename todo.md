# MLM Membership System - TODO

## Database Schema
- [x] Members table (5 tiers: VIP, M-Agent, SM, GM, CEO) with referral tree
- [x] Products table (VIP packages, benefit items, agent packages, assessment zone items)
- [x] Orders table (VIP orders, agent orders, birthday orders, redemption orders)
- [x] 固本 (bonus points) ledger table
- [x] Organizational bonus ledger table
- [x] Gratitude bonus ledger table
- [x] Withdrawals table
- [x] Top-up table
- [x] Announcements table
- [x] VIP payment codes table
- [x] System settings table

## Backend / API
- [x] Member registration and profile management
- [x] Role-based access control (VIP, M-Agent, SM, GM, CEO, Admin)
- [x] Member upgrade logic (auto-check conditions)
- [x] Product CRUD with zone assignment and calculation base value
- [x] Order creation flow (agent order → VIP code → VIP order)
- [x] 固本 calculation and allocation (15% of product base value)
- [x] Organizational bonus calculation (SM 10%, GM 15%/5%)
- [x] Gratitude bonus calculation (30%/10%/10% up 3 levels)
- [x] Birthday half-price eligibility check
- [x] Team hierarchy queries (referral tree traversal)
- [x] Car allowance calculation (RM300/RM200 thresholds)
- [x] Travel reward eligibility check
- [x] Year-end dividend calculation (display only)
- [x] Top-up endpoint (cash or bonus-to-固本 conversion)
- [x] Withdrawal endpoint (SM+ only)
- [x] System announcements CRUD
- [x] Admin: manual bonus/固本 allocation
- [x] Admin: Excel export (members, orders, bonuses)
- [x] Admin: Excel import for member migration
- [x] Admin: manual order status update
- [x] Admin: upgrade condition configuration via settings
- [x] Admin: birthday product limit configuration via settings
- [x] Admin: product base value configuration

## Member-Facing Frontend
- [x] Mobile-first layout with bottom navigation
- [x] Home page: user info, 固本 + bonus balance, quick actions
- [x] VIP Zone product listing and purchase flow
- [x] Agent Zone product listing (M-Agent+ only)
- [x] Birthday half-price product page
- [x] Redemption product page (use 固本)
- [x] Order history page with status tabs
- [x] My Profile / Member Center page
- [x] Team management page (hierarchy view, referral count)
- [x] Top Up page (cash or convert bonus to 固本)
- [x] Withdrawal page (SM+ only)
- [x] Upgrade page (buy packages to upgrade rank)
- [x] Extra rewards page (car allowance, travel rewards, year-end dividends)
- [x] Announcements / notifications page
- [x] Member registration with referral code

## Admin Backend
- [x] Admin dashboard overview with stats
- [x] Member management table (search, filter, pagination, export)
- [x] Member edit (rank, phone, birthday, birthday verification)
- [x] Order management (filter, manual status update)
- [x] Bonus ledger view and manual allocation
- [x] Top-up / withdrawal management (approve/reject/mark paid)
- [x] Product management (CRUD, zone, base value, birthday limits)
- [x] Announcement management (create, edit, delete)
- [x] System settings (upgrade conditions, bonus rates, birthday limits)
- [x] Year-end dividend report
- [x] Excel export for members, orders, bonuses

## Testing
- [x] Auth logout test
- [x] formatRM utility tests
- [x] Rank order logic tests
- [x] Bonus calculation tests (guben, org bonus, gratitude bonus)
- [x] Year-end dividend calculation tests
- [x] Birthday benefit tests
- [x] Car allowance tests
- [x] Admin stats procedure test

## New Features
- [x] Member profile edit (name, phone number)

## Recent Changes
- [x] Make referral code mandatory for registration

## In Progress
- [x] Admin auto-redirect to admin dashboard after login

## Bulk Import Feature
- [x] Excel template generation and download
- [x] Bulk import API with validation
- [x] Admin import page UI

## Bug Fixes
- [x] Fix zone field validation error in AdminProducts page


## Admin Backend Features (New Requirements)
- [x] Member detail export with referrer info (Excel)
- [ ] Bonus/固本 report by date with export (Excel)
- [ ] Order/fixed本 exchange report by date with export (Excel)
- [ ] Product calculation base settings (different zones, prices, guben/bonus rates)
- [x] Birthday verification and half-price product eligibility
- [x] Upgrade condition settings (configurable criteria)
- [x] Member data modification interface
- [ ] Top-up/Withdrawal export (Excel)
- [x] Manual 固本/bonus allocation
- [x] System announcements management
- [x] Manual order status handling
- [ ] Role-based admin permissions (Full Admin vs Regional Inventory Manager)


## Remaining Admin Features (Completed)
- [x] Bonus/固本 reporting page with date filters and Excel export (已有)
- [x] Order/redemption reporting page with date filters and Excel export (已添加)
- [x] Product calculation base configuration API (已添加)
- [x] Product calculation base configuration UI (已添加)
- [ ] Regional manager role implementation
- [ ] Top-up/Withdrawal export functionality


## Bug Fixes (Current)
- [x] Fix "返回会员首页" button navigation in admin pages


## New Features (Current)
- [x] Enhance order display with product details, quantity, date/time, payment, status
