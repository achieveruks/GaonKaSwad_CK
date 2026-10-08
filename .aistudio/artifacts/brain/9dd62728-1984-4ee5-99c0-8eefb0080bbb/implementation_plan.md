# Owner & Staff Authentication Overhaul, In-App Password Change & Recovery

A focused overhaul of the staff authentication flow: removing demo/auto-fill artifacts from the login portal, enabling authenticated staff password updates from the top-right navbar, and implementing a complete self-service password reset and recovery loop via Supabase Auth.

## User Review & Critical Decisions

> [!IMPORTANT]
> Please review the planned UX flows and architecture decisions below before we proceed to implementation.

- **Login Screen Simplification**: Removal of "Quick Owner Sign In" banner, "Fill default" / "Fill pass" helper buttons, and initial prefilled credentials so inputs start clean.
- **Generic Admin Provisioning Copy**: Replace database-specific terminology ("in Supabase Dashboard") with clean, professional language ("provisioned by the System Administrator").
- **Top-Right Password Change Flow**: Place a dedicated "Change Password" action in the authenticated top navigation bar for both Owner (`OwnerLayout`) and Manager (`ManagerDashboardPage`). Includes current password verification prior to executing `supabase.auth.updateUser({ password: newPassword })`.
- **Forgot Password & Recovery Route**: Implement a clean toggle on `/owner/login` for requesting reset links via `supabase.auth.resetPasswordForEmail()`, and create `/owner/reset-password` (with disabled email preview) to finalize updates via `supabase.auth.updateUser()`.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. Cleans the `/owner/login` portal so it operates as a production-grade, secure login without hardcoded demo credentials, 1-click test buttons, or internal vendor names.
  2. Adds a "Forgot Password?" trigger on the login form that sends a secure reset link to the staff member's email without leaking account existence.
  3. Provides a dedicated `/owner/reset-password` recovery page that reads the recovery session token, displays the read-only recipient email, and updates the user's password.
  4. Provides authenticated staff (Owner & Outlet Managers) with a "Change Password" modal accessible from the top-right navbar profile menu.
- **Target Audience / Persona**: Kitchen Outlet Managers and System Owners accessing the kitchen management and multi-outlet administration dashboards.
- **Key Value**: Eliminates hardcoded credential risks, gives managers full self-service password control, and provides recovery without database administrator intervention.

---

## 2. User Experience & Visual Design

### Key User Flows

```
[ Flow 1: Clean Sign In ]
/owner/login ──> Clean Email & Password Inputs ──> Click "Sign In" ──> Dashboard

[ Flow 2: Forgot Password ]
/owner/login ──> Click "Forgot Password?" ──> Enter Email ──> Click "Send Reset Link"
              ──> Generic Confirmation: "If an account exists, a link has been sent"
              ──> User receives recovery email ──> Clicks reset link
              ──> Redirected to /owner/reset-password
              ──> Sees disabled email + enters new password ──> "Password updated successfully"
              ──> [ Go to Login ]

[ Flow 3: Authenticated Password Change ]
Logged-in Dashboard ──> Top-right Navbar [Key Icon / Profile Menu] ──> "Change Password"
                    ──> Modal: Current Password + New Password + Confirm New Password
                    ──> "Update Password" ──> Toast confirmation & clean modal close
```

### Visual Identity & Theme
- **Color Palette & Atmosphere**: Deep stone canvas (`#0C0A09`), warm amber accents (`#92400E` / `#D97706`), clean white form cards with hairline dividers (`border-stone-200`).
- **Typography & Scale**: Crisp `Plus Jakarta Sans` for labels and helper text; tabular figures for numerical counts; high-contrast focus rings for input accessibility.
- **Form States**: Uncluttered single-column inputs with inline password visibility toggle (`Eye`/`EyeOff`), subtle spinner states during Supabase API calls, and clean success notifications.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct Form Toggle vs Separate Page for Forgot Password**
  - *Chosen Approach*: In-place view toggle on `/owner/login` (swapping between Login card and "Request Reset Link" card).
  - *Why*: Keeps the user on the primary auth screen, avoids unnecessary page reloads, and allows easy 1-click return to "Back to Sign In".
- **Decision 2: Reusable Modal for Authenticated Password Change**
  - *Chosen Approach*: A shared `ChangePasswordModal` mounted in `OwnerLayout` and `ManagerDashboardPage`.
  - *Why*: Allows owners and managers to update their password from any active screen (products, outlets, live orders) without losing their filtered view or table state.
- **Decision 3: Current Password Verification**
  - *Chosen Approach*: When logged in, verify `currentPassword` using `supabase.auth.signInWithPassword` before calling `supabase.auth.updateUser`.
  - *Why*: Prevents unauthorized password changes if a physical dashboard workstation was left unattended.
- **Decision 4: Privacy-Preserving Reset Message**
  - *Chosen Approach*: Always display `"If an account exists for this email, a password reset link has been sent. Please check your inbox."` regardless of server lookup status.
  - *Why*: Adheres to standard security guidelines by preventing email enumeration attacks.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION LIFECYCLE                        │
└────────────────────────────────────────────────────────────────────────┘

  1. Login & Recovery Entry:
  ┌────────────────────────────────────────────────────────────────────┐
  │                         OwnerLoginPage                             │
  │  ┌───────────────────────────────┐  ┌───────────────────────────┐  │
  │  │         Login View            │  │   Forgot Password View    │  │
  │  │  • Email (empty default)      │  │  • Email input            │  │
  │  │  • Password (empty default)   │  │  • "Send Reset Link" btn  │  │
  │  │  • "Forgot Password?" trigger │  │  • Generic success notice │  │
  │  └──────────────┬────────────────┘  └─────────────┬─────────────┘  │
  └─────────────────┼─────────────────────────────────┼────────────────┘
                    │ signInWithPassword              │ resetPasswordForEmail
                    ▼                                 ▼
         ┌──────────────────────────────────────────────────┐
         │                  Supabase Auth                   │
         └──────────┬─────────────────────────┬─────────────┘
                    │                         │
                    ▼                         ▼ (Email Link with token)
     ┌────────────────────────────┐    ┌─────────────────────────────────┐
     │   Authenticated Dashboards │    │      OwnerResetPasswordPage     │
     │   • OwnerLayout            │    │  • Reads recovery session token │
     │   • ManagerDashboardPage   │    │  • Displays disabled user email │
     │  ┌──────────────────────┐  │    │  • New & Confirm Password       │
     │  │ ChangePasswordModal  │  │    │  • supabase.auth.updateUser()   │
     │  │ • Current Password   │  │    │  • "Go to Login" button         │
     │  │ • New Password       │  │    └─────────────────────────────────┘
     │  │ • updateUser()       │  │
     │  └──────────────────────┘  │
     └────────────────────────────┘
```

### Detailed Component & State Strategy

1. **`OwnerLoginPage.tsx` Modifications**:
   - Remove `Quick Owner Sign In` block and 1-click test button.
   - Remove `handleFillDefault`, `Fill default`, `Fill pass`, and initialize `email` and `password` as empty strings `''`.
   - Update banner copy from `"Staff accounts and roles are provisioned by the Administrator directly in Supabase Dashboard."` to `"Staff accounts and roles are provisioned by the System Administrator."`.
   - Add state `authMode: 'login' | 'forgot_password'`.
   - Add forgot password form with email input, call `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/owner/reset-password` })`, and display the confirmation message.

2. **New `OwnerResetPasswordPage.tsx` (`/owner/reset-password` & `/owner/login/reset-password`)**:
   - Detects recovery session from Supabase client (`supabase.auth.onAuthStateChange` listening for `PASSWORD_RECOVERY` / `SIGNED_IN`).
   - Retrieves active user email and displays it in a disabled, styled text field.
   - Accepts New Password and Confirm Password with minimum 8-character validation.
   - Executes `supabase.auth.updateUser({ password: newPassword })`.
   - On success, renders a clean success badge and a button navigating back to `/owner/login`.

3. **New `ChangePasswordModal.tsx`**:
   - Accessible via a key/lock icon button beside the user email in the top-right header of `OwnerLayout.tsx` and `ManagerDashboardPage.tsx`.
   - Fields: Current Password, New Password, Confirm New Password.
   - Reauthenticates using current credentials, then executes `supabase.auth.updateUser({ password: newPassword })`.
   - Emits toast notification and closes smoothly.

4. **Routing (`App.tsx` & `NavigationContext.tsx`)**:
   - Register `/owner/reset-password` and `/owner/login/reset-password` routes so external email clicks resolve directly to the new recovery component.
