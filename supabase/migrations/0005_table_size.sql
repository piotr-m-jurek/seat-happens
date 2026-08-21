-- Tables were fixed-size boxes in the UI (not stored at all). Adding
-- normalized width/height, same convention as `obstacles`, so table size on
-- the floor plan is persisted and resizable by dragging a corner handle.
alter table tables
  add column width real not null default 0.18 check (width > 0),
  add column height real not null default 0.2 check (height > 0);
