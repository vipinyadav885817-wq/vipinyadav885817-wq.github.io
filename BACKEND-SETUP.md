# Secure account setup

CyberShield Academy uses Supabase Auth for real email/password accounts and a private `user_progress` row for each learner. The browser must use only the project's URL and publishable key. Never place a Supabase secret or service-role key in this site.

## Connect a Supabase project

1. Create a Supabase project and copy its Project URL and publishable key into `supabase-config.js`.
2. In the Supabase SQL Editor, run `supabase-setup.sql`. It creates the progress table, enables row-level security, and limits each signed-in learner to their own progress.
3. In Authentication URL Configuration, set the Site URL to `https://vipinyadav885817-wq.github.io/CyberShield-Academy/`. Add `https://vipinyadav885817-wq.github.io/CyberShield-Academy/auth.html` and `https://vipinyadav885817-wq.github.io/CyberShield-Academy/auth.html?mode=reset` to the allowed redirect URLs.
4. Keep email confirmation enabled. For public use beyond a small trial, configure a trusted SMTP sender and review Supabase's production security checklist.

Until the project URL and publishable key are set, sign-in and progress sync stay unavailable.
