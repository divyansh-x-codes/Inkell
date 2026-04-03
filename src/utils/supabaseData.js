import { supabase } from '../supabaseClient';

export const fetchArticles = async () => {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      profiles!articles_author_id_fkey (
        full_name,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
  return data;
};

export const fetchComments = async (articleId) => {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('article_id', articleId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
  return data;
};

export const postComment = async (articleId, userId, userName, content) => {
  const { data, error } = await supabase
    .from('comments')
    .insert([
      { article_id: articleId, user_id: userId, user_name: userName, content }
    ])
    .select();

  return { data, error };
};

export const seedMockArticles = async (articles) => {
  // Only use this for initial setup if needed
  const { data: existing } = await supabase.from('articles').select('id').limit(1);
  if (existing && existing.length > 0) return;

  const formatted = articles.map(a => ({
    title: a.title,
    tagline: a.tagline,
    category: a.category,
    cover_image: a.coverImage,
    body: a.body,
    author_name: a.name,
    pub_date: a.pub,
    likes_count: parseInt(a.likes) || 0
  }));

  const { error } = await supabase.from('articles').insert(formatted);
  if (error) console.error('Error seeding:', error);
};
