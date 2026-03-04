import { useState, useEffect } from 'react';
import { Wallet as WalletIcon, Plus, Copy, Check, History } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { walletAPI } from '@/services/api';
import { formatCurrency, formatNumber, parseNumericInput } from '@/lib/currency';
import TransactionList from '@/components/TransactionList';
import BuyCreditsModal from '@/components/BuyCreditsModal';

const Wallet = () => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [bankDetails, setBankDetails] = useState(null);

  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const [walletRes, txRes, profileRes, pkgRes] = await Promise.all([
        walletAPI.getSummary(),
        api.get('/wallet/transactions'),
        api.get('/user/profile'),
        api.get('/wallet/packages')
      ]);
      setWallet(walletRes.data.wallet);
      setTransactions(txRes.data.transactions || []);
      setPackages(pkgRes.data.packages || []);
      const userId = profileRes.data.user?.id || 'USER';
      setReferralLink(`${window.location.origin}/register?ref=${userId}`);
    } catch (err) {
      console.error('wallet fetch error', err);
      toast.error('Failed to load wallet');
      setReferralLink(`${window.location.origin}/register`);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (pkg) => {
    try {
      const amt = parseNumericInput(pkg.price);
      const { data } = await api.post('/wallet/buy_credits', {
        amount: amt,
        package_id: pkg.id
      });
      setBankDetails(data.bank_details);
      setShowBankDetails(true);
    } catch (err) {
      console.error('buy error', err);
      toast.error(err.response?.data?.error || 'Failed to initiate payment');
      throw err;
    }
  };

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied');
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

      {/* balance card */}
      <div className="card bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">Available Credits</p>
            <p className="text-5xl font-bold mt-2">{formatNumber(wallet?.credits || 0)}</p>
            <p className="text-sm opacity-80 mt-2">1 Credit = $1</p>
          </div>
          <WalletIcon className="w-24 h-24 opacity-20" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* referral */}
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
              onClick={copyReferral}
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

        {/* quick stats */}
        <div className="card">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Quick Stats
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-dark-400">Total Purchased</span>
              <span className="font-semibold">
                {formatNumber(transactions.filter(t => t.type === 'credit_purchase').length)} times
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Total Spent</span>
              <span className="font-semibold">
                {formatNumber(
                  transactions
                    .filter(t => t.type === 'ad_boost')
                    .reduce((s, t) => s + Math.abs(t.amount || 0), 0)
                )} credits
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Referral Earnings</span>
              <span className="font-semibold text-green-400">0 credits</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Transaction History</h3>
        <TransactionList transactions={transactions} />
      </div>

      <BuyCreditsModal
        show={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        packages={packages}
        onPurchase={handleBuy}
      />

      {showBankDetails && bankDetails && (
        <div className="card bg-dark-800 p-4">
          <h4 className="text-lg font-semibold mb-2">Bank Transfer Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Bank:</span><span>{bankDetails.bank_name}</span></div>
            <div className="flex justify-between"><span>Account:</span><span>{bankDetails.account_name}</span></div>
            <div className="flex justify-between"><span>Number:</span><span className="font-mono">{bankDetails.account_number}</span></div>
            {bankDetails.swift_code && (
              <div className="flex justify-between"><span>SWIFT:</span><span>{bankDetails.swift_code}</span></div>
            )}
            <div className="flex justify-between"><span>Amount:</span><span className="font-semibold text-green-400">{formatCurrency(bankDetails.amount || 0)}</span></div>
          </div>
          <p className="text-yellow-400 text-xs mt-2">{bankDetails.instructions}</p>
          <button
            onClick={() => { setShowBankDetails(false); fetchWalletData(); }}
            className="btn btn-primary mt-4 w-full"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export default Wallet;

