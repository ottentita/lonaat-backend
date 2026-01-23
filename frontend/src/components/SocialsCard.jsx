import { GlassCard } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { FadeIn, Stagger, StaggerItem } from './ui/motion';
import { Share2, Check, X } from 'lucide-react';

export default function SocialsCard() {
  const socialPlatforms = [
    { id: 'facebook', name: 'Facebook', status: 'disconnected', icon: '📘' },
    { id: 'instagram', name: 'Instagram', status: 'disconnected', icon: '📷' },
    { id: 'twitter', name: 'Twitter / X', status: 'disconnected', icon: '🐦' },
    { id: 'tiktok', name: 'TikTok', status: 'disconnected', icon: '🎵' },
    { id: 'pinterest', name: 'Pinterest', status: 'disconnected', icon: '📌' },
  ];

  return (
    <FadeIn delay={0.1}>
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Share2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Social Platforms</h2>
              <p className="text-sm text-muted-foreground">Connect your accounts</p>
            </div>
          </div>
          <Button size="sm" variant="glass">
            Connect Platform
          </Button>
        </div>

        <Stagger className="space-y-3">
          {socialPlatforms.map((platform) => (
            <StaggerItem key={platform.id}>
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{platform.icon}</span>
                  <div>
                    <div className="font-medium">{platform.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {platform.status === 'connected' ? 'Active' : 'Not connected'}
                    </div>
                  </div>
                </div>
                {platform.status === 'connected' ? (
                  <Badge variant="success">
                    <Check className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="glass">
                    <X className="w-3 h-3 mr-1" />
                    Disconnected
                  </Badge>
                )}
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-sm text-muted-foreground text-center">
            Connect social platforms to auto-post affiliate content
          </p>
        </div>
      </GlassCard>
    </FadeIn>
  );
}
