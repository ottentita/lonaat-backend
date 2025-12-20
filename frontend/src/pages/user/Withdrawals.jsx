import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { withdrawalAPI, walletAPI } from '@/services/api';
import toast from 'react-hot-toast';
import { 
  Wallet, 
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  Loader2,
  Building2,
  CreditCard,
  Edit,
  Zap,
  DollarSign,
  AlertCircle,
  Shield
} from 'lucide-react';

const Withdrawals = () => {
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState([]);
  const [balance, setBalance] = useState(0);
  const [withdrawableBalance, setWithdrawableBalance] = useState(0);
  const [bankAccount, setBankAccount] = useState(null);
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showQuickWithdrawModal, setShowQuickWithdrawModal] = useState(false);
  const [showManualWithdrawModal, setShowManualWithdrawModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [bankFormData, setBankFormData] = useState({
    bank_name: '',
    account_name: '',
    account_number: '',
    country: 'Nigeria',
    swift_code: '',
    routing_code: ''
  });

  const [quickWithdrawAmount, setQuickWithdrawAmount] = useState('');

  const [manualFormData, setManualFormData] = useState({
    amount: '',
    bank_name: '',
    account_number: '',
    account_name: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [withdrawalsRes, balanceRes, bankRes] = await Promise.all([
        withdrawalAPI.getMy(),
        withdrawalAPI.getBalance(),
        walletAPI.getBankAccount()
      ]);
      
      setWithdrawals(withdrawalsRes.data.withdrawals || []);
      setBalance(balanceRes.data.balance || 0);
      setWithdrawableBalance(balanceRes.data.withdrawable_balance || 0);
      
      if (bankRes.data.has_bank_details) {
        setBankAccount(bankRes.data.bank_account);
        setHasBankDetails(true);
        setBankFormData({
          bank_name: bankRes.data.bank_account.bank_name || '',
          account_name: bankRes.data.bank_account.account_name || '',
          account_number: '',
          country: bankRes.data.bank_account.country || 'Nigeria',
          swift_code: bankRes.data.bank_account.swift_code || '',
          routing_code: bankRes.data.bank_account.routing_code || ''
        });
      }
    } catch (error) {
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBankDetails = async (e) => {
    e.preventDefault();
    if (!bankFormData.bank_name || !bankFormData.account_name || !bankFormData.account_number || !bankFormData.country) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const response = await walletAPI.saveBankAccount(bankFormData);
      setBankAccount(response.data.bank_account);
      setHasBankDetails(true);
      toast.success(response.data.message || 'Bank details saved successfully');
      setShowBankModal(false);
      setBankFormData(prev => ({ ...prev, account_number: '' }));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save bank details');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickWithdraw = async (e) => {
    e.preventDefault();
    const amount = parseFloat(quickWithdrawAmount);
    
    if (isNaN(amount) || amount < 10) {
      toast.error('Minimum withdrawal amount is $10');
      return;
    }

    if (amount > withdrawableBalance) {
      toast.error('Insufficient withdrawable balance');
      return;
    }

    try {
      setSubmitting(true);
      const response = await withdrawalAPI.quickWithdraw({ amount });
      toast.success(response.data.message || 'Withdrawal request submitted');
      setShowQuickWithdrawModal(false);
      setQuickWithdrawAmount('');
      fetchData();
    } catch (error) {
      if (error.response?.data?.requires_bank_details) {
        setShowQuickWithdrawModal(false);
        setShowBankModal(true);
        toast.error('Please add your bank details first');
      } else {
        toast.error(error.response?.data?.error || 'Failed to submit withdrawal request');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualWithdraw = async (e) => {
    e.preventDefault();
    const amount = parseFloat(manualFormData.amount);
    
    if (isNaN(amount) || amount < 10) {
      toast.error('Minimum withdrawal amount is $10');
      return;
    }

    if (amount > withdrawableBalance) {
      toast.error('Insufficient withdrawable balance');
      return;
    }

    try {
      setSubmitting(true);
      await withdrawalAPI.create(manualFormData);
      toast.success('Withdrawal request submitted successfully');
      setShowManualWithdrawModal(false);
      setManualFormData({ amount: '', bank_name: '', account_number: '', account_name: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle,
      paid: CheckCircle
    };
    return icons[status] || Clock;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-500 bg-yellow-500/10',
      approved: 'text-blue-500 bg-blue-500/10',
      rejected: 'text-red-500 bg-red-500/10',
      paid: 'text-green-500 bg-green-500/10'
    };
    return colors[status] || 'text-dark-400 bg-dark-800';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-dark-50">Withdrawals</h1>
            <p className="text-dark-400 mt-1">Withdraw your earnings to your bank account</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <Wallet className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">Withdrawable Balance</p>
                <p className="text-2xl font-bold text-dark-50">${withdrawableBalance.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary-500/10">
                <DollarSign className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">Total Balance</p>
                <p className="text-2xl font-bold text-dark-50">${balance.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${hasBankDetails ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                <Building2 className={`w-6 h-6 ${hasBankDetails ? 'text-green-500' : 'text-yellow-500'}`} />
              </div>
              <div className="flex-1">
                <p className="text-dark-400 text-sm">Bank Account</p>
                {hasBankDetails ? (
                  <div className="flex items-center justify-between">
                    <p className="text-dark-50 font-medium">{bankAccount?.bank_name}</p>
                    <button
                      onClick={() => setShowBankModal(true)}
                      className="text-primary-500 hover:text-primary-400 text-sm"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowBankModal(true)}
                    className="text-yellow-500 hover:text-yellow-400 text-sm font-medium"
                  >
                    Add Bank Details
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {hasBankDetails && (
          <div className="card bg-gradient-to-r from-primary-900/50 to-primary-800/30 border-primary-600/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary-500/20">
                  <Zap className="w-8 h-8 text-primary-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-dark-50">One-Click Withdrawal</h3>
                  <p className="text-dark-300">
                    Withdraw to {bankAccount?.bank_name} ({bankAccount?.account_number_masked})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickWithdrawModal(true)}
                className="btn-primary px-6 py-3 flex items-center gap-2"
                disabled={withdrawableBalance < 10}
              >
                <Zap className="w-5 h-5" />
                Quick Withdraw
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {!hasBankDetails && (
            <button
              onClick={() => setShowBankModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              Add Bank Details
            </button>
          )}
          <button
            onClick={() => setShowManualWithdrawModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Manual Withdrawal
          </button>
        </div>

        <div>
          <h2 className="text-xl font-bold text-dark-50 mb-4">Withdrawal History</h2>
          
          {withdrawals.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {withdrawals.map((withdrawal) => {
                const StatusIcon = getStatusIcon(withdrawal.status);
                return (
                  <div key={withdrawal.id} className="card-hover">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${getStatusColor(withdrawal.status)}`}>
                          <StatusIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-dark-50">
                              ${withdrawal.amount.toLocaleString()}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${getStatusColor(withdrawal.status)}`}>
                              {withdrawal.status}
                            </span>
                          </div>
                          <p className="text-dark-400 text-sm mt-1">
                            {withdrawal.bank_name} • {new Date(withdrawal.created_at).toLocaleDateString()}
                          </p>
                          {withdrawal.status === 'rejected' && withdrawal.rejection_reason && (
                            <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              {withdrawal.rejection_reason}
                            </p>
                          )}
                        </div>
                      </div>
                      {withdrawal.status === 'paid' && withdrawal.paid_at && (
                        <div className="text-right text-sm text-dark-400">
                          <p>Paid on</p>
                          <p className="text-green-500 font-medium">
                            {new Date(withdrawal.paid_at).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center py-12">
              <ArrowUpCircle className="w-16 h-16 text-dark-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-dark-50 mb-2">No withdrawals yet</h3>
              <p className="text-dark-400 mb-6">Request your first withdrawal to cash out your earnings</p>
            </div>
          )}
        </div>

        {showBankModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary-500/10">
                  <Building2 className="w-6 h-6 text-primary-500" />
                </div>
                <h2 className="text-xl font-bold text-dark-50">
                  {hasBankDetails ? 'Update Bank Details' : 'Add Bank Details'}
                </h2>
              </div>
              
              <form onSubmit={handleSaveBankDetails} className="space-y-4">
                <div>
                  <label className="block text-dark-300 text-sm mb-2">Bank Name *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. First Bank of Nigeria"
                    value={bankFormData.bank_name}
                    onChange={(e) => setBankFormData({ ...bankFormData, bank_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-dark-300 text-sm mb-2">Account Holder Name *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="John Doe"
                    value={bankFormData.account_name}
                    onChange={(e) => setBankFormData({ ...bankFormData, account_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-dark-300 text-sm mb-2">Account Number / IBAN *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder={hasBankDetails ? `Current: ****${bankAccount?.account_number_last4}` : "0123456789"}
                    value={bankFormData.account_number}
                    onChange={(e) => setBankFormData({ ...bankFormData, account_number: e.target.value })}
                    required={!hasBankDetails}
                  />
                  {hasBankDetails && (
                    <p className="text-xs text-dark-500 mt-1">Leave blank to keep existing account number</p>
                  )}
                </div>

                <div>
                  <label className="block text-dark-300 text-sm mb-2">Country *</label>
                  <select
                    className="input"
                    value={bankFormData.country}
                    onChange={(e) => setBankFormData({ ...bankFormData, country: e.target.value })}
                    required
                  >
                    <option value="Nigeria">Nigeria</option>
                    <option value="Cameroon">Cameroon</option>
                    <option value="Ghana">Ghana</option>
                    <option value="Kenya">Kenya</option>
                    <option value="South Africa">South Africa</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-dark-300 text-sm mb-2">SWIFT Code (Optional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="FBNINGLA"
                    value={bankFormData.swift_code}
                    onChange={(e) => setBankFormData({ ...bankFormData, swift_code: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-dark-300 text-sm mb-2">Routing Code (Optional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="For US banks"
                    value={bankFormData.routing_code}
                    onChange={(e) => setBankFormData({ ...bankFormData, routing_code: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg text-sm text-blue-300">
                  <Shield className="w-5 h-5 flex-shrink-0" />
                  <p>Your bank details are encrypted and stored securely.</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit" 
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    {hasBankDetails ? 'Update Details' : 'Save Details'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBankModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showQuickWithdrawModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary-500/10">
                  <Zap className="w-6 h-6 text-primary-500" />
                </div>
                <h2 className="text-xl font-bold text-dark-50">Quick Withdrawal</h2>
              </div>
              
              <div className="p-4 bg-dark-800/50 rounded-lg mb-6">
                <p className="text-dark-400 text-sm mb-1">Withdraw to:</p>
                <p className="text-dark-50 font-medium">{bankAccount?.bank_name}</p>
                <p className="text-dark-300 text-sm">
                  {bankAccount?.account_name} • {bankAccount?.account_number_masked}
                </p>
              </div>
              
              <form onSubmit={handleQuickWithdraw} className="space-y-4">
                <div>
                  <label className="block text-dark-300 text-sm mb-2">Amount (USD)</label>
                  <input
                    type="number"
                    className="input text-2xl text-center"
                    placeholder="0.00"
                    value={quickWithdrawAmount}
                    onChange={(e) => setQuickWithdrawAmount(e.target.value)}
                    required
                    min="10"
                    max={withdrawableBalance}
                    step="0.01"
                  />
                  <div className="flex justify-between text-xs text-dark-500 mt-2">
                    <span>Min: $10</span>
                    <span>Available: ${withdrawableBalance.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setQuickWithdrawAmount(withdrawableBalance.toString())}
                  className="w-full py-2 text-sm text-primary-400 hover:text-primary-300 border border-primary-500/30 rounded-lg"
                >
                  Withdraw All (${withdrawableBalance.toLocaleString()})
                </button>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit" 
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                    Withdraw Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuickWithdrawModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showManualWithdrawModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full">
              <h2 className="text-xl font-bold text-dark-50 mb-6">Manual Withdrawal</h2>
              
              <form onSubmit={handleManualWithdraw} className="space-y-4">
                <div>
                  <label className="block text-dark-300 text-sm mb-2">Amount (USD)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Enter amount"
                    value={manualFormData.amount}
                    onChange={(e) => setManualFormData({ ...manualFormData, amount: e.target.value })}
                    required
                    min="10"
                    max={withdrawableBalance}
                  />
                  <p className="text-xs text-dark-500 mt-1">
                    Available: ${withdrawableBalance.toLocaleString()} | Min: $10
                  </p>
                </div>

                <div>
                  <label className="block text-dark-300 text-sm mb-2">Bank Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="First Bank"
                    value={manualFormData.bank_name}
                    onChange={(e) => setManualFormData({ ...manualFormData, bank_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-dark-300 text-sm mb-2">Account Number</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="0123456789"
                    value={manualFormData.account_number}
                    onChange={(e) => setManualFormData({ ...manualFormData, account_number: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-dark-300 text-sm mb-2">Account Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="John Doe"
                    value={manualFormData.account_name}
                    onChange={(e) => setManualFormData({ ...manualFormData, account_name: e.target.value })}
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit" 
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    Submit Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManualWithdrawModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Withdrawals;
