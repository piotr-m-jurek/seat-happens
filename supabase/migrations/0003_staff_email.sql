-- Switch the login identifier from phone/SMS OTP to email OTP: SMS requires
-- a paid provider (Twilio etc.) that hasn't been set up yet, while email OTP
-- works out of the box with Supabase's built-in email sending. Swapping back
-- (or supporting both) later is a small, isolated change since all Supabase
-- Auth calls live behind authRepo.ts.
alter table staff rename column phone to email;
