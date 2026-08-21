-- staff_phone_key (unique on email, misnamed — a leftover from an earlier
-- single-tenant schema) blocked the same email from having a staff row in
-- more than one restaurant, defeating the point of 0012. Uniqueness is now
-- enforced per (user_id, restaurant_id) instead; email is just a
-- denormalized copy of auth.users.email for display.
alter table staff drop constraint staff_phone_key;
