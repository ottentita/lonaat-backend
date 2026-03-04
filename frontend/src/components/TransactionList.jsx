import { Wallet as WalletIcon } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/currency';

const TransactionList = ({ transactions = [] }) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-8 text-dark-400">
        <WalletIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No transactions yet</p>
      </div>
    );
  }

  return (
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
          {transactions.map(tx => (
            <tr key={tx.id} className="border-b border-dark-800 hover:bg-dark-800">
              <td className="py-3 px-4">
                {new Date(tx.created_at || tx.date).toLocaleDateString()}
              </td>
              <td className="py-3 px-4 capitalize">{tx.type.replace(/_/g, ' ')}</td>
              <td className="py-3 px-4">{tx.description || tx.note || '-'}</td>
              <td className="py-3 px-4 text-right">
                {tx.amount ? formatNumber(tx.amount) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionList;
