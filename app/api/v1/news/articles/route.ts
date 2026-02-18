import { NextResponse } from 'next/server';

export async function GET() {
  const mockArticles = [
    {
      id: 1,
      title: 'Pickleball Tournament Season Kicks Off',
      excerpt: 'Join us for the biggest tournament of the year with players from across the region competing for glory.',
      category: 'Tournament',
      published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      image: 'https://images.unsplash.com/photo-1554531086-264fdcd1579a?auto=format&fit=crop&q=80&w=800',
      author: 'Sports Team',
      body: 'Join us for the biggest tournament of the year with players from across the region competing for glory and prizes.'
    },
    {
      id: 2,
      title: 'New Court Opening in Downtown District',
      excerpt: 'State-of-the-art pickleball facility now open for all community members to enjoy.',
      category: 'Community',
      published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=800',
      author: 'Community News',
      body: 'A brand new state-of-the-art pickleball facility has opened downtown with 8 professional-grade courts.'
    },
    {
      id: 3,
      title: 'Pro Tips: Improving Your Serve',
      excerpt: 'Learn from champion players about techniques to take your serve to the next level.',
      category: 'Training',
      published_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      image: 'https://images.unsplash.com/photo-1542438348-2cc0ee02007e?auto=format&fit=crop&q=80&w=800',
      author: 'Coach Alex',
      body: 'In this comprehensive guide, we explore the fundamental techniques used by professional pickleball players.'
    },
    {
      id: 4,
      title: 'Community Doubles League Now Accepting Signups',
      excerpt: 'Team up with a partner and compete in our exciting weekly doubles league.',
      category: 'League',
      published_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      image: 'https://images.unsplash.com/photo-1517836357463-d25ddfcbf042?auto=format&fit=crop&q=80&w=800',
      author: 'League Coordinator',
      body: 'Sign up now for our winter doubles league with matches every weekend.'
    },
    {
      id: 5,
      title: 'Equipment Guide: Choosing the Right Paddle',
      excerpt: 'Everything you need to know about selecting the perfect paddle for your playing style.',
      category: 'Equipment',
      published_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      image: 'https://images.unsplash.com/photo-1599586120434-d5a2b48d84ca?auto=format&fit=crop&q=80&w=800',
      author: 'Equipment Expert',
      body: 'A detailed breakdown of different paddle materials, weights, and styles to help you find your perfect match.'
    }
  ];

  return NextResponse.json({
    success: true,
    data: {
      data: mockArticles
    }
  });
}
