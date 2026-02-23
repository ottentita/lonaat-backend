import { useState, useEffect } from 'react';
import { Wallet as WalletIcon, Plus, Copy, Check, History, Package, CreditCard, Upload, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { walletAPI } from '../../services/api';
import { formatCurrency, formatNumber, parseNumericInput } from '../../lib/currency';

const Wallet = () => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [referralLink, setReferralLink] = useState('');

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const [walletRes, transactionsRes, profileRes, packagesRes] = await Promise.all([
        walletAPI.getSummary(),
        api.get('/wallet/transactions'),
        api.get('/user/profile'),
        api.get('/wallet/packages')
      ]);
      setWallet(walletRes.data.wallet);
      setTransactions(transactionsRes.data.transactions);
      setPackages(packagesRes.data.packages || []);
      
      const userId = profileRes.data.user?.id || 'USER';
      setReferralLink(`${window.location.origin}/register?ref=${userId}`);
    } catch (error) {
      toast.error('Failed to load wallet');
      setReferralLink(`${window.location.origin}/register`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPackage = async (pkg) => {
    setSelectedPackage(pkg);
    try {
      const amountNum = parseNumericInput(pkg.price)
      const { data } = await api.post('/wallet/buy_credits', {
        amount: amountNum,
        package_id: pkg.id
      });

      setBankDetails(data.bank_details);
      setPaymentId(data.payment_id);
      setShowBuyModal(false);
      setShowBankDetails(true);
      toast.success('Payment request created! Please complete the bank transfer.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to initiate payment');
    }
  };

  const handleBuyCredits = async () => {
    if (!selectedPackage) {
      toast.error('Please select a package');
      return;
    }
    await handleSelectPackage(selectedPackage);
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
            <p className="text-5xl font-bold mt-2">{formatNumber(wallet?.credits || 0)}</p>
            <p className="text-sm opacity-80 mt-2">1 Credit = $1</p>
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
                {formatNumber(transactions.filter(t => t.type === 'credit_purchase').length)} times
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Total Spent</span>
              <span className="font-semibold">
                {formatNumber(transactions
                  .filter(t => t.type === 'ad_boost')
                  .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0))} credits
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
                      {tx.amount > 0 ? '+' : ''}{formatNumber(Math.abs(tx.amount || 0))} credits
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Buy Credits Modal - Package Selection */}
      {showBuyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-4">Buy AdBoost Credits</h3>
            <p className="text-dark-400 mb-6">
              Select a credit package. Payment is via bank transfer.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedPackage?.id === pkg.id
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-700 hover:border-dark-500'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg">{pkg.name}</h4>
                    {pkg.bonus_credits > 0 && (
                      <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded">
                        +{pkg.bonus_credits} bonus
                      </span>
                    )}
                  </div>
                  <p className="text-3xl font-bold text-primary-400">{formatCurrency(pkg.price, pkg.currency || 'USD')}</p>
                  <p className="text-dark-400 text-sm mt-1">
                    {pkg.credits} credits {pkg.bonus_credits > 0 && `+ ${pkg.bonus_credits} bonus`}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowBuyModal(false); setSelectedPackage(null); }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleBuyCredits}
                disabled={!selectedPackage}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bank Transfer Details Modal */}
      {showBankDetails && bankDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary-500" />
              Bank Transfer Details
            </h3>
            
            <div className="bg-dark-800 rounded-lg p-4 mb-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-dark-400">Bank Name:</span>
                <span className="font-semibold">{bankDetails.bank_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Account Name:</span>
                <span className="font-semibold">{bankDetails.account_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Account Number:</span>
                <span className="font-semibold text-primary-400">{bankDetails.account_number}</span>
              </div>
              {bankDetails.swift_code && (
                <div className="flex justify-between">
                  <span className="text-dark-400">SWIFT Code:</span>
                  <span className="font-semibold">{bankDetails.swift_code}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-dark-400">Amount:</span>
                <span className="font-bold text-green-400">{formatCurrency(selectedPackage?.price, selectedPackage?.currency || 'USD')}</span>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
              <p className="text-yellow-400 text-sm">
                <strong>Important:</strong> {bankDetails.instructions}
              </p>
              <p className="text-yellow-400 text-sm mt-1">
                Payment ID: <strong>#{paymentId}</strong> - Include this in your transfer reference.
              </p>
            </div>

            <p className="text-dark-400 text-sm mb-4">
              After completing the transfer, go to <strong>Transactions</strong> to upload your payment receipt.
              Credits will be added after admin approval.
            </p>

            <button
              onClick={() => { setShowBankDetails(false); setSelectedPackage(null); fetchWalletData(); }}
              className="btn-primary w-full"
            >
              I've Noted the Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
