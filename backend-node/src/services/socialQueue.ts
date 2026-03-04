import { prisma } from '../prisma';
import { generateSocialContent, generateQuickContent } from './socialAI';

interface Product {
  id: number;
  name: string;
  price?: string | null;
  category?: string | null;
  description?: string | null;
  affiliate_link?: string | null;
}

export async function enqueueSocialPosts(product: Product, userId?: number, useAI: boolean = true): Promise<void> {
  try {
    const content = useAI 
      ? await generateSocialContent(product)
      : generateQuickContent(product);

    const platforms = ['facebook', 'twitter', 'telegram', 'instagram', 'tiktok'] as const;
    
    for (const platform of platforms) {
      const existingPost = await prisma.socialPost.findFirst({
        where: {
          product_id: product.id,
          platform: platform
        }
      });

      if (!existingPost) {
        await prisma.socialPost.create({
          data: {
            product_id: product.id,
            user_id: userId || null,
            platform,
            content: content[platform],
            status: 'pending'
          }
        });
        
      }
    }
  } catch (error) {
    console.error('[SocialQueue] Error enqueueing posts:', error);
    throw error;
  }
}

export async function getPendingPosts(limit: number = 10): Promise<any[]> {
  return prisma.socialPost.findMany({
    where: { status: 'pending' },
    orderBy: { created_at: 'asc' },
    take: limit
  });
}

export async function updatePostStatus(
  postId: number, 
  status: 'pending' | 'published' | 'failed',
  options: { postUrl?: string; error?: string } = {}
): Promise<void> {
  await prisma.socialPost.update({
    where: { id: postId },
    data: {
      status,
      post_url: options.postUrl,
      error: options.error,
      published_at: status === 'published' ? new Date() : undefined
    }
  });
}

export async function retryFailedPosts(): Promise<number> {
  const result = await prisma.socialPost.updateMany({
    where: { status: 'failed' },
    data: { status: 'pending', error: null }
  });
  return result.count;
}
