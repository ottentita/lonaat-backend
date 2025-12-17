import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import toast from 'react-hot-toast';

export default function Subscriptions() {
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, currentRes] = await Promise.all([
        fetch('/api/plans', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/subscription/current', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);
      
      const plansData = await plansRes.json();
      const currentData = await currentRes.json();
      
      setPlans(plansData.plans || []);
      setCurrentPlan(currentData.subscription || null);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    try {
      const response = await fetch('/api/subscription/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ plan_id: planId })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Subscription request submitted');
        loadData();
      } else {
        toast.error(data.error || 'Failed to subscribe');
      }
    } catch (error) {
      toast.error('Failed to subscribe');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold">Subscription Plans</h1>

      {currentPlan && (
        <Card className="bg-gradient-to-r from-primary-500/10 to-primary-600/10 border-primary/30">
          <CardContent className="pt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="text-xl font-bold">{currentPlan.plan_name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Status</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  currentPlan.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {currentPlan.status}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative ${plan.is_popular ? 'border-primary ring-2 ring-primary/20' : ''}`}
          >
            {plan.is_popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                  POPULAR
                </span>
              </div>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <div className="text-3xl font-bold">
                ₦{plan.price?.toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground">/{plan.duration_days} days</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-sm">
                  <span className="text-green-500">✓</span>
                  {plan.max_products || 'Unlimited'} Products
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className="text-green-500">✓</span>
                  {plan.max_ads || 'Unlimited'} Ad Campaigns
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className="text-green-500">✓</span>
                  {plan.commission_rate || 0}% Commission Rate
                </li>
                {plan.features && plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <span className="text-green-500">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full" 
                variant={currentPlan?.plan_id === plan.id ? 'outline' : 'default'}
                onClick={() => handleSubscribe(plan.id)}
                disabled={currentPlan?.plan_id === plan.id}
              >
                {currentPlan?.plan_id === plan.id ? 'Current Plan' : 'Subscribe'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
