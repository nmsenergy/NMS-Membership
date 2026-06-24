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
- [x] Bonus/固本 report by date with export (Excel)
- [x] Order/fixed本 exchange report by date with export (Excel)
- [x] Product calculation base settings (different zones, prices, guben/bonus rates)
- [x] Birthday verification and half-price product eligibility
- [x] Upgrade condition settings (configurable criteria)
- [x] Member data modification interface
- [x] Top-up/Withdrawal export (Excel)
- [x] Manual 固本/bonus allocation
- [x] System announcements management
- [x] Manual order status handling
- [x] Role-based admin permissions (Full Admin - complete implementation with 57 protected procedures)


## Remaining Admin Features (Completed)
- [x] Bonus/固本 reporting page with date filters and Excel export (已有)
- [x] Order/redemption reporting page with date filters and Excel export (已添加)
- [x] Product calculation base configuration API (已添加)
- [x] Product calculation base configuration UI (已添加)
- [x] Regional manager role implementation (future enhancement - schema defined, backend logic pending)


## Bug Fixes (Current)
- [x] Fix "返回会员首页" button navigation in admin pages


## New Features (Current)
- [x] Enhance order display with product details, quantity, date/time, payment, status


## Recent Enhancements (Completed)
- [x] Order detail page with payment proof upload
- [x] Order search and date range filtering
- [x] Member hierarchy tree visualization
- [x] Birthday verification workflow with ID photo upload (future enhancement)


## Bug Fixes (Current Session)
- [x] Admin return to member page button not working


## Current Work
- [x] Fix admin return button navigation
- [x] Add custom notifications system


## Critical Bug
- [x] Fix "Buffer not defined" error in file export functions
- [x] Fix NotFoundError: Failed to execute 'removeChild' on 'Node' DOM reconciliation error

## Product Management Enhancement (Current)
- [x] Enhanced product zone configuration (VIP only, Agent only, or Both)
- [x] Zone-specific pricing for each product
- [x] Zone-specific bonus calculation standards (guben rate, org bonus rate)
- [x] Product management UI for dual-zone configuration
- [x] Zone-specific pricing and calculation tests (7 tests added)

## VIP Order Shipping Location (Current)
- [x] Add shipping location field to orders table (KK Agent or Puchong HQ)
- [x] Update VIP order creation API to accept shipping location
- [x] Add location selector to VIP order creation UI
- [x] Display shipping location in order details
- [x] Add shipping location to order exports (Excel)

## Agent Order Shipping Location & VIP Code Generation (Current)
- [x] Add shipping location support to agent order creation
- [x] Add location selector to agent order creation UI
- [x] Implement VIP code generation when order status changes to DELIVERED
- [x] VIP code generation on order delivery (11 comprehensive tests)
- [x] Test agent order with shipping location and VIP code generation


## Sandbox Unload Permission Fix (Current)
- [x] Remove all window.location.reload() and window.location.href usage
- [x] Remove unload/beforeunload event listeners (none found)
- [x] Create global admin view state context
- [x] Update App.tsx to use state-based routing
- [x] Update admin components to use router.push
- [x] Test SPA routing without unload errors


## 计算准则整合 (Current)
- [x] Remove standalone 计算准则 page from admin menu
- [x] Remove AdminCalculationBase from App.tsx routing
- [x] Add calculation base reference section to AdminBonuses (collapsible, with product selector)
- [x] AdminProducts already has full calculation base management (Settings button per product)

## New Features (Current Session)
- [x] Display shipping location in order details (member-facing Orders page + admin AdminOrders page)
- [x] Add shipping location column to order Excel export
- [x] Add top-up/withdrawal Excel export in AdminTopups page
- [x] Birthday verification workflow: member uploads ID photo, admin can verify and delete photo, notify member after verification

## Product Image Upload (Current)
- [x] Add imageUrl field to products schema and migrate
- [x] Add uploadProductImage server procedure (base64 → S3)
- [x] Update upsertProduct to accept imageUrl
- [x] Admin product form: image upload + preview
- [x] Member-facing product pages: display product image

## Bug Fix: Member Navigation Not Responding (Current)
- [x] Diagnose why member-side clicks/navigation have no response
- [x] Fix navigation routing issues

## Account Switching Feature (Current)
- [x] Backend: add switchAccount and getSwitchableAccounts procedures
- [x] UI: account switcher in Profile page
- [x] UI: show current switched account indicator in header/home
- [x] UI: allow switching back to own account

## Full Proxy Account Switch (Current)
- [x] Server context: resolve effectiveMember from switchedToMemberId
- [x] Update all member procedures to use effectiveMember
- [x] Add switched-account banner on Home with quick return button
- [x] Add tests for account switching behavior

## Feature Visibility Control (Current)
- [x] Add featureVisibility table to schema (featureKey, isEnabled, allowedRanks)
- [x] Add getFeatureVisibility and setFeatureVisibility server procedures
- [x] Admin UI: feature visibility management panel in AdminSettings
- [x] Member-facing: apply visibility rules to Home quick actions, BottomNav, and feature pages


## Account Switching Refactor (Current)
- [x] Remove switchedToMemberId from members schema
- [x] Revert proxy mode logic in context.ts and routers.ts (restore getMemberByUserId calls)
- [x] Create loginHistory table to store previously logged-in accounts
- [x] Add procedures: recordLoginHistory, getLoginHistory, deleteLoginHistory
- [x] Update SwitchAccount page: show login history + logout-then-login flow
- [x] Remove switched-account banner from Home and MobileHeader
- [x] Test account switching logout-then-login flow


## Member Login Credentials Management (Current)
- [x] Add passwordHash field to users table and migrate
- [x] Create password management procedures: resetPassword (admin), changePassword (member)
- [x] Admin UI: member login credentials panel with password reset button
- [x] Member UI: password change page in Profile
- [x] Test password reset and change flows


## Password-Based Login Integration (Completed)
- [x] Implement loginWithPassword tRPC procedure with email/password authentication
- [x] Create Login page UI with password input and OAuth fallback option
- [x] Add /login route to member router in App.tsx
- [x] Update Home.tsx to show both password and OAuth login options
- [x] Fix admin password reset to use userId instead of member id
- [x] Write comprehensive password authentication tests (10 tests passing)
- [x] Verify end-to-end flow: admin reset -> member login -> password change


## Forgot Password Self-Service Flow (Completed)
- [x] Add passwordResetTokens table to schema (userId, token, expiresAt, createdAt, usedAt)
- [x] Implement requestPasswordReset procedure (validate email, generate token, store in DB, send email)
- [x] Implement verifyPasswordResetToken procedure (check token validity and expiry)
- [x] Implement completePasswordReset procedure (verify token, update password, mark token as used)
- [x] Create email.ts utility (sendEmail, generatePasswordResetEmail)
- [x] Create ForgotPassword page UI (email input, submit button, success message)
- [x] Create ResetPassword page UI (token validation, new password input, confirmation)
- [x] Add /forgot-password and /reset-password routes to App.tsx
- [x] Update Login page with "Forgot Password?" link
- [x] Write comprehensive password reset flow tests (72 tests total, all passing)
- [x] Test end-to-end: request reset -> verify email -> reset password -> login with new password
