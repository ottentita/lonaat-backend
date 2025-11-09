import { useState, useEffect } from 'react';
import { Wallet as WalletIcon, Plus, Copy, Check, History } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Wallet = () => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState('');
  const [referralLink, setReferralLink] = useState('');

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const [walletRes, transactionsRes, profileRes] = await Promise.all([
        api.get('/wallet'),
        api.get('/wallet/transactions'),
        api.get('/user/profile')
      ]);
      setWallet(walletRes.data.wallet);
      setTransactions(transactionsRes.data.transactions);
      
      const userId = profileRes.data.user?.id || 'USER';
      setReferralLink(`${window.location.origin}/register?ref=${userId}`);
    } catch (error) {
      toast.error('Failed to load wallet');
      setReferralLink(`${window.location.origin}/register`);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyCredits = async () => {
    if (!amount || isNaN(amount) || Number(amount) < 100) {
      toast.error('Minimum purchase is ₦100');
      return;
    }

    try {
      const { data } = await api.post('/wallet/buy_credits', {
        amount: Number(amount)
      });

      if (data.payment_link) {
        window.open(data.payment_link, '_blank');
        toast.success('Redirecting to payment...');
        setShowBuyModal(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to initiate payment');
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">💰 Wallet</h1>
        <button
          onClick={() => setShowBuyModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Buy Credits
        </button>
      </div>

      {/* Balance Card */}
      <div className="card bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">Available Credits</p>
            <p className="text-5xl font-bold mt-2">{wallet?.credits || 0}</p>
            <p className="text-sm opacity-80 mt-2">1 Credit = ₦10</p>
          </div>
          <WalletIcon className="w-24 h-24 opacity-20" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Referral Section */}
        <div className="card">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            🎁 Referral Program
          </h3>
          <p className="text-dark-400 mb-4">
            Invite friends and earn <span className="text-primary-400 font-bold">3 Boost Credits</span> for each signup!
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="input flex-1"
            />
            <button
              onClick={copyReferralLink}
              className="btn-primary flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Quick Stats
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-dark-400">Total Purchased</span>
              <span className="font-semibold">
                {transactions.filter(t => t.type === 'credit_purchase').length} times
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Total Spent</span>
              <span className="font-semibold">
                {transactions
                  .filter(t => t.type === 'ad_boost')
                  .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)} credits
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Referral Earnings</span>
              <span className="font-semibold text-green-400">0 credits</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Transaction History</h3>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-dark-400">
            <WalletIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-800">
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Type</th>
                  <th className="text-left py-3 px-4">Description</th>
                  <th className="text-right py-3 px-4">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 10).map((tx) => (
                  <tr key={tx.id} className="border-b border-dark-800 hover:bg-dark-800">
                    <td className="py-3 px-4">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        tx.type === 'credit_purchase' ? 'bg-green-900 text-green-300' :
                        tx.type === 'ad_boost' ? 'bg-blue-900 text-blue-300' :
                        'bg-gray-900 text-gray-300'
                      }`}>
                        {tx.type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-dark-300">{tx.description}</td>
                    <td className={`py-3 px-4 text-right font-semibold ${
                      tx.amount > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount} credits
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Buy Credits Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-4">Buy AdBoost Credits</h3>
            <p className="text-dark-400 mb-6">
              Enter amount in Naira. You'll be redirected to Flutterwave for secure payment.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Amount (₦)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                className="input"
                min="100"
              />
              <p className="text-xs text-dark-500 mt-1">
                You'll receive {amount ? Math.floor(Number(amount) / 10) : 0} credits
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBuyModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleBuyCredits}
                className="btn-primary flex-1"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
