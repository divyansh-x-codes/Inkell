import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lfqxpghddphhkalgpoyy.supabase.co';
const supabaseAnonKey = 'sb_publishable_k_2PuuOz1u11JOBztlfz7Q_PZaWWllF';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DEMO_AUTHOR = {
  id: '00000000-0000-0000-0000-000000000000', // We might need to handle this UUID
  username: 'inktrix_editorial',
  name: 'Inktrix Editorial',
  avatar_url: 'https://images.unsplash.com/photo-1542435503-956c469947f6',
  bio: 'The daily chronicle of the future.'
};

const initialPosts = [
  {
    title: "The Future of AI in Design",
    tagline: "Exploring how generative models are transforming the creative process.",
    content: "AI is not just a tool; it's a collaborator. In this article, we look at how Figma's new AI features and Midjourney are reshaping the aesthetic landscape of 2026...",
    category: "Design",
    image_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
  },
  {
    title: "Mastering React Server Components",
    tagline: "A deep dive into the new architecture of modern web apps.",
    content: "Server components are changing the way we think about data fetching. By moving logic to the edge, we reduce bundle sizes and improve perceived performance...",
    category: "Technology",
    image_url: "https://images.unsplash.com/photo-1633356122544-f134324a6cee",
  },
  {
    title: "Digital Nomad Resilience",
    tagline: "How to stay productive while traveling through 12 time zones.",
    content: "Traveling the world while working full-time sounds like a dream, but the reality involves missed calls, bad Wi-Fi, and the constant search for power outlets...",
    category: "Productivity",
    image_url: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e",
  }
];

async function seed() {
  console.log('--- Starting Seed Process ---');
  
  // 1. Find or create a demo user
  console.log('Checking for demo author...');
  let authorId;
  const { data: profile } = await supabase.from('profiles').select('id').limit(1).single();
  
  if (profile) {
    authorId = profile.id;
    console.log('Using existing profile:', authorId);
  } else {
    // This might fail if RLS prevents insertion or if no auth user exists
    console.log('No profile found. Please log in to the app first to create your profile.');
    return;
  }

  // 2. Insert posts
  console.log(`Inserting ${initialPosts.length} posts...`);
  const postsToInsert = initialPosts.map(p => ({ ...p, user_id: authorId }));
  
  const { data, error } = await supabase.from('posts').insert(postsToInsert);
  
  if (error) {
    console.error('❌ Error seeding posts:', error.message);
    if (error.message.includes('not found')) {
      console.log('Trying fallback to "articles" table...');
      const articlesToInsert = initialPosts.map(p => ({ 
        title: p.title, 
        tagline: p.tagline, 
        category: p.category, 
        cover_image: p.image_url, 
        body: p.content,
        author_id: authorId
      }));
      const { error: err2 } = await supabase.from('articles').insert(articlesToInsert);
      if (err2) console.error('❌ Fallback failed:', err2.message);
      else console.log('✅ Successfully seeded to "articles" table!');
    }
  } else {
    console.log('✅ Successfully seeded posts!');
  }
}

seed();
