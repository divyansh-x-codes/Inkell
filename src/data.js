export const articles = [
  {
    id: 0,
    pub: 'DAY 2 • MARCH 26, 2026',
    category: 'Productivity',
    coverImage: 'https://images.unsplash.com/photo-1550439062-609e1531270e?q=80&w=2070&auto=format&fit=crop',
    title: "I Quit ChatGPT for 30 Days — Here's What Actually Happened",
    tagline: 'A brutally honest account of what happens when you go cold turkey on AI — and what it reveals about how we actually think.',
    author: '👨‍💻', name: 'Divyansh Codespace', date: 'Mar 26', readTime: '5 min read',
    body: `<p style="font-style: italic; color: #888; font-size: 0.95rem;">Reading Time: 5 minutes</p>
    <p>I didn't quit ChatGPT for some deep reason. No "self-growth journey." No productivity challenge. I just had this weird thought one day:</p>
    
    <blockquote>"What if I can't do basic stuff without it anymore?"</blockquote>
    
    <p>That question was enough to make me uncomfortable. So I stopped using it. Completely. 30 days.</p>
    
    <hr class="reader-inline-divider" />
    
    <h3>day 1-5: instant regret</h3>
    <p>I didn't realize how often I used it until I stopped. Every few hours, I'd get stuck and think: <em>"Let me just ask—oh wait."</em> And then I had to actually figure it out myself.</p>
    <p>Small things became irritating:</p>
    <ul>
      <li><span style="font-size: 1.2rem;">🍷</span> Writing anything took longer</li>
      <li><span style="font-size: 1.2rem;">🐛</span> Fixing bugs felt like guesswork</li>
      <li><span style="font-size: 1.2rem;">🔍</span> Googling felt slow and messy</li>
    </ul>
    <p>It wasn't hard. It was just... annoying.</p>
    
    <hr class="reader-inline-divider" />
    
    <h3>the real problem (that i didn't expect)</h3>
    <p>The biggest issue wasn't difficulty. It was <strong>impatience</strong>.</p>
    <p>I noticed I had lost the habit of sitting with a problem. Earlier, if something didn't work in 5 minutes, my brain went: <em>"Why struggle? Just use ChatGPT."</em></p>
    <p>That's not efficiency. That's dependency.</p>
    
    <img src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1665&auto=format&fit=crop" class="reader-inline-img" alt="Brain AI" />
    
    <h3>around day 10: brain slowly starts working again</h3>
    <p>Nothing dramatic happened. No "sudden transformation." But I started doing something I wasn't doing before: <strong>thinking a bit longer before giving up.</strong></p>
    <p>Instead of jumping to answers, I:</p>
    <ul>
      <li><span style="font-size: 1.2rem;">🔄</span> Tried different approaches</li>
      <li><span style="font-size: 1.2rem;">📖</span> Read errors more carefully</li>
      <li><span style="font-size: 1.2rem;">🧠</span> Made more mistakes (and understood them)</li>
    </ul>
    <p>It felt slower—but more real.</p>
    
    <hr class="reader-inline-divider" />
    
    <h3>week 3-4: not easier, just normal again</h3>
    <p>Things didn't become "easy." They just stopped feeling frustrating.</p>
    <p>I got used to:</p>
    <ul>
      <li><span style="font-size: 1.2rem;">🚫</span> Not having instant answers</li>
      <li><span style="font-size: 1.2rem;">⏳</span> Taking time to solve things</li>
      <li><span style="font-size: 1.2rem;">🧘</span> Being stuck without panicking</li>
    </ul>

    <div style="height: 60px;"></div>`,
    hasPoll: false,
    likes: '1.2k',
    comments: 84,
    reposts: 10,
    commentsList: [
      { id: 1, user: 'Eleanor', text: 'Completely agree. Whitespace is heavily underutilized.', time: '2h ago' },
      { id: 2, user: 'Marcus', text: 'But doesn\'t extreme minimalism hurt discoverability?', time: '4h ago' }
    ]
  },
  {
    id: 1,
    pub: 'NITHIN\'S NOTES',
    category: 'TECHNOLOGY',
    coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop',
    title: 'How Distributed Systems are Powering AI Infrastructure',
    tagline: 'A deep dive into the complex web of servers that makes modern machine learning possible.',
    author: '👨‍💼', name: 'Sarah Chen', date: 'Oct 14', readTime: '8 min read',
    body: `<p>Watched the documentary...</p>`,
    hasPoll: false,
    likes: 842,
    comments: 22,
    reposts: 36,
    commentsList: [
      { id: 1, user: 'David', text: 'Fascinating read on the architecture.', time: '1d ago' }
    ]
  },
  {
    id: 2,
    pub: 'THE PRODUCT FOLKS',
    category: 'DESIGN',
    coverImage: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?q=80&w=2070&auto=format&fit=crop',
    title: 'The Psychology of Micro-Interactions',
    tagline: 'Why the smallest details in your UI often matter the most for user retention.',
    author: '📦', name: 'Marcus Doe', date: 'Oct 12', readTime: '4 min read',
    body: `<p>You know you're in an interesting moment...</p>`,
    hasPoll: true,
    poll: {
      q: 'How many design tools do you use?',
      options: [
        { text: 'Just Figma', pct: 26 },
        { text: "2-3 tools", pct: 38 },
        { text: "4-6 tools", pct: 22 },
        { text: 'Too many to count', pct: 15 },
      ]
    },
    likes: 450,
    comments: 12,
    reposts: 5,
    commentsList: []
  },
  {
    id: 3,
    pub: 'NEWS',
    category: 'Digital Media',
    coverImage: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=2074&auto=format&fit=crop',
    title: 'OpenAI acquires TBPN reshapes AI media strategy now nationwide globally',
    tagline: 'A landmark deal signals a new era of AI-first journalism. What it means for the future of independent media.',
    author: '🏢', name: 'TBPN News', date: 'Oct 20', readTime: '3 min read',
    body: `<p>OpenAI has completed its acquisition...</p>`,
    hasPoll: false,
    likes: 920,
    comments: 120,
    reposts: 88,
    commentsList: []
  },
  {
    id: 4,
    pub: 'BUSINESS',
    category: 'Technology',
    coverImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
    title: 'Oracle layoffs',
    tagline: '30,000 workers cut globally as the company pivots hard toward cloud and AI infrastructure.',
    author: '📊', name: 'Oracle News', date: 'Oct 20', readTime: '4 min read',
    body: `<p>A massive restructuring...</p>`,
    hasPoll: false,
    likes: 210,
    comments: 50,
    reposts: 10,
    commentsList: []
  },
  {
    id: 5,
    pub: 'CRYPTO',
    category: 'Emerging Tech',
    coverImage: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?q=80&w=2069&auto=format&fit=crop',
    title: "Google's Quantum AI",
    tagline: 'A new research paper warns that today\'s encryption could be broken within years — and the crypto world is not ready.',
    author: '⚛️', name: 'Quantum News', date: 'Oct 19', readTime: '6 min read',
    body: `<p>Google has published a new paper...</p>`,
    hasPoll: false,
    likes: 671,
    comments: 94,
    reposts: 42,
    commentsList: []
  },
  {
    id: 6,
    pub: 'POLITICS',
    category: 'Politics',
    coverImage: 'https://images.unsplash.com/photo-1541872703874-fa590518d3a5?q=80&w=2070&auto=format&fit=crop',
    title: 'Trump fires Pam Bondi',
    tagline: 'The Attorney General is abruptly ousted in a late-night announcement that caught Washington completely off guard.',
    author: '🦅', name: 'Politics Desk', date: 'Oct 18', readTime: '2 min read',
    body: `<p>An abrupt firing...</p>`,
    hasPoll: false,
    likes: 1200,
    comments: 430,
    reposts: 300,
    commentsList: []
  }
];
