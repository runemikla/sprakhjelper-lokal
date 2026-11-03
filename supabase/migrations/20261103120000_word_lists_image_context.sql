-- Context for every picture in a word list (written by the teacher in the
-- editor and added to the image prompt for each word). Saved by the editor
-- with a plain update after save_word_list, so the function is unchanged.
alter table public.word_lists
  add column if not exists image_context text not null default '';
