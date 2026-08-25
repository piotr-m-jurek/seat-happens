-- Nullable, matching `notes`'s existing optional-field pattern — doesn't
-- force every booking to carry a phone number.
alter table reservations add column phone text;

-- Cross-date guest search. security invoker (the default) so it inherits
-- the caller's RLS exactly like a normal query — no manual
-- restaurant-membership check needed inside the function, same reasoning
-- already used for private.is_restaurant_owner(). An RPC rather than a
-- PostgREST `.or()` filter string, since PostgREST's filter mini-language
-- treats `,`, `.`, `(`, `)` as syntax and a guest name/search term
-- containing any of those would silently break or misparse the filter.
create function search_reservations(p_restaurant_id bigint, p_query text) returns setof reservations
language sql
security invoker
stable
set search_path = ''
as $$
  select * from public.reservations
  where restaurant_id = p_restaurant_id
    and (guest_name ilike '%' || p_query || '%' or phone ilike '%' || p_query || '%')
  order by date desc, start_time desc
  limit 20;
$$;

revoke execute on function search_reservations(bigint, text) from public, anon;
grant execute on function search_reservations(bigint, text) to authenticated;
