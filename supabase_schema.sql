-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. PROFILES TABLE
-- ==========================================
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 2. POSTS TABLE
-- ==========================================
create table public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
  image_url text,
  likes_count integer default 0 not null,
  comments_count integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 3. LIKES TABLE
-- ==========================================
create table public.likes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, post_id)
);

-- ==========================================
-- 4. COMMENTS TABLE
-- ==========================================
create table public.comments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 5. FOLLOWS TABLE
-- ==========================================
create table public.follows (
  id uuid default uuid_generate_v4() primary key,
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(follower_id, following_id)
);

-- ==========================================
-- 6. NOTIFICATIONS TABLE
-- ==========================================
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null, -- receiver
  actor_id uuid references public.profiles(id) on delete cascade not null, -- who did it
  type text not null, -- 'like', 'comment', 'follow'
  post_id uuid references public.posts(id) on delete cascade, -- optional, if related to a post
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 7. CONVERSATIONS & MESSAGES
-- ==========================================
create table public.conversations (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.conversation_participants (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  unique(conversation_id, user_id)
);

create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.notifications enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- Profiles: Anyone can view, users can edit their own
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Posts: Anyone can view, users can insert/update/delete their own
create policy "Posts are viewable by everyone." on public.posts for select using (true);
create policy "Users can insert own posts." on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can update own posts." on public.posts for update using (auth.uid() = user_id);
create policy "Users can delete own posts." on public.posts for delete using (auth.uid() = user_id);

-- Likes: Anyone can view, creators can insert/delete
create policy "Likes are viewable by everyone." on public.likes for select using (true);
create policy "Users can insert own likes." on public.likes for insert with check (auth.uid() = user_id);
create policy "Users can delete own likes." on public.likes for delete using (auth.uid() = user_id);

-- Comments: Anyone can view, users can insert their own, update their own, delete their own
create policy "Comments are viewable by everyone." on public.comments for select using (true);
create policy "Users can insert own comments." on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can delete own comments." on public.comments for delete using (auth.uid() = user_id);

-- Follows: Anyone can view, followers can insert/delete
create policy "Follows viewable by everyone." on public.follows for select using (true);
create policy "Users can insert own follow." on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can delete own follow." on public.follows for delete using (auth.uid() = follower_id);

-- Notifications: Users can only see/update their own
create policy "Users view own notifications." on public.notifications for select using (auth.uid() = user_id);
create policy "System can insert notifications" on public.notifications for insert with check (true);
create policy "Users update own notifications." on public.notifications for update using (auth.uid() = user_id);

-- Conversations & Messages
create policy "Users view conversations they are in" on public.conversations for select using (
  exists (
    select 1 from public.conversation_participants
    where conversation_id = id and user_id = auth.uid()
  )
);
create policy "Users insert conversations" on public.conversations for insert with check (true);

create policy "Users view participants of their convos" on public.conversation_participants for select using (
  exists (
    select 1 from public.conversation_participants cp2
    where cp2.conversation_id = conversation_id and cp2.user_id = auth.uid()
  )
);
create policy "Users insert participants" on public.conversation_participants for insert with check (true);

create policy "Users view messages in their convos" on public.messages for select using (
  exists (
    select 1 from public.conversation_participants
    where conversation_id = conversation_id and user_id = auth.uid()
  )
);
create policy "Users insert own messages to their convos" on public.messages for insert with check (
  sender_id = auth.uid() and
  exists (
    select 1 from public.conversation_participants
    where conversation_id = conversation_id and user_id = auth.uid()
  )
);


-- ==========================================
-- REALTIME
-- ==========================================
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table likes;
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;


-- ==========================================
-- INDEXES
-- ==========================================
create index if not exists idx_posts_created_at on public.posts (created_at desc);
create index if not exists idx_likes_post_id on public.likes (post_id);
create index if not exists idx_comments_post_id on public.comments (post_id);

-- ==========================================
-- TRIGGERS & FUNCTIONS
-- ==========================================

-- Auto-create profile on auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, name, avatar_url)
  values (new.id, split_part(new.email, '@', 1), new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger for increasing likes count
create or replace function increment_likes_count()
returns trigger as $$
begin
  update public.posts
  set likes_count = likes_count + 1
  where id = new.post_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger tr_increment_likes
  after insert on public.likes
  for each row execute procedure increment_likes_count();

-- Trigger for decreasing likes count
create or replace function decrement_likes_count()
returns trigger as $$
begin
  update public.posts
  set likes_count = likes_count - 1
  where id = old.post_id;
  return old;
end;
$$ language plpgsql security definer;

create trigger tr_decrement_likes
  after delete on public.likes
  for each row execute procedure decrement_likes_count();

-- Trigger for increasing comments count
create or replace function increment_comments_count()
returns trigger as $$
begin
  update public.posts
  set comments_count = comments_count + 1
  where id = new.post_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger tr_increment_comments
  after insert on public.comments
  for each row execute procedure increment_comments_count();

-- Trigger for decreasing comments count
create or replace function decrement_comments_count()
returns trigger as $$
begin
  update public.posts
  set comments_count = comments_count - 1
  where id = old.post_id;
  return old;
end;
$$ language plpgsql security definer;

create trigger tr_decrement_comments
  after delete on public.comments
  for each row execute procedure decrement_comments_count();
