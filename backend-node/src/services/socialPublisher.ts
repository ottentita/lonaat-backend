import { PrismaClient } from '@prisma/client';
import { updatePostStatus } from './socialQueue';

const prisma = new PrismaClient();

interface SocialPost {
  id: number;
  product_id: number | null;
  user_id: number | null;
  platform: string;
  content: string;
  status: string;
}

interface SocialAccount {
  id: number;
  user_id: number;
  platform: string;
  access_token: string | null;
  page_id: string | null;
  config: any;
}

export async function publishPost(post: SocialPost): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  try {
    const account = await prisma.socialAccount.findFirst({
      where: {
        user_id: post.user_id || undefined,
        platform: post.platform,
        enabled: true
      }
    });

    if (!account) {
      return { success: false, error: `No ${post.platform} account configured` };
    }

    switch (post.platform) {
      case 'telegram':
        return await publishTelegram(post, account);
      case 'twitter':
        return await publishTwitter(post, account);
      case 'facebook':
        return await publishFacebook(post, account);
      default:
        return { success: false, error: `Unsupported platform: ${post.platform}` };
    }
  } catch (error: any) {
    console.error(`[SocialPublisher] Error publishing to ${post.platform}:`, error);
    return { success: false, error: error.message };
  }
}

async function publishTelegram(post: SocialPost, account: SocialAccount): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  const botToken = account.access_token;
  const chatId = account.page_id;

  if (!botToken || !chatId) {
    return { success: false, error: 'Telegram bot token or chat ID not configured' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: post.content,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });

    const data = await response.json();
    
    if (data.ok) {
      const messageId = data.result?.message_id;
      const postUrl = `https://t.me/c/${chatId.replace('-100', '')}/${messageId}`;
      return { success: true, postUrl };
    } else {
      return { success: false, error: data.description || 'Telegram API error' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function publishTwitter(post: SocialPost, account: SocialAccount): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  const config = account.config as any;
  
  if (!config?.bearerToken) {
    return { 
      success: false, 
      error: 'Twitter/X requires API v2 Bearer Token. Get one from developer.twitter.com and add to config.bearerToken' 
    };
  }

  try {
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.bearerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: post.content })
    });

    const data = await response.json();
    
    if (data.data?.id) {
      return { success: true, postUrl: `https://twitter.com/i/web/status/${data.data.id}` };
    } else {
      return { success: false, error: data.detail || data.errors?.[0]?.message || 'Twitter API error' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function publishFacebook(post: SocialPost, account: SocialAccount): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  const accessToken = account.access_token;
  const pageId = account.page_id;

  if (!accessToken || !pageId) {
    return { success: false, error: 'Facebook page access token or page ID not configured' };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: post.content,
        access_token: accessToken
      })
    });

    const data = await response.json();
    
    if (data.id) {
      const postUrl = `https://www.facebook.com/${data.id.replace('_', '/posts/')}`;
      return { success: true, postUrl };
    } else {
      return { success: false, error: data.error?.message || 'Facebook API error' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function processPendingPosts(limit: number = 10): Promise<{ processed: number; published: number; failed: number }> {
  const pendingPosts = await prisma.socialPost.findMany({
    where: { status: 'pending' },
    orderBy: { created_at: 'asc' },
    take: limit
  });

  let published = 0;
  let failed = 0;

  for (const post of pendingPosts) {
    const result = await publishPost(post as SocialPost);
    
    if (result.success) {
      await updatePostStatus(post.id, 'published', { postUrl: result.postUrl });
      published++;
    } else {
      await updatePostStatus(post.id, 'failed', { error: result.error });
      failed++;
    }
  }

  return { processed: pendingPosts.length, published, failed };
}

export async function getSocialStats(userId?: number): Promise<any> {
  const where = userId ? { user_id: userId } : {};
  
  const [total, pending, published, failed] = await Promise.all([
    prisma.socialPost.count({ where }),
    prisma.socialPost.count({ where: { ...where, status: 'pending' } }),
    prisma.socialPost.count({ where: { ...where, status: 'published' } }),
    prisma.socialPost.count({ where: { ...where, status: 'failed' } })
  ]);

  const byPlatform = await prisma.socialPost.groupBy({
    by: ['platform'],
    where,
    _count: true
  });

  return { total, pending, published, failed, byPlatform };
}
