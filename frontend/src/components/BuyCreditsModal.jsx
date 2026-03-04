import { useState } from 'react';
import { formatCurrency } from '@/lib/currency';
import { X, Check, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

const BuyCreditsModal = ({
  show,
  onClose,
  packages = [],
  onPurchase // async function(pkg) => { bankDetails, paymentId }
}) => {
  const [selected, setSelected] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!selected) {
      toast.error('Select a package');
      return;
    }
    setProcessing(true);
    try {
      await onPurchase(selected);
      setSelected(null);
      onClose();
    } catch (e) {
      console.error('purchase error', e);
      toast.error('Purchase failed');
    } finally {
      setProcessing(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-dark-900 p-6 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Buy Credits</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {packages.map(pkg => (
            <div
              key={pkg.id}
              onClick={() => setSelected(pkg)}
              className={`p-4 border rounded cursor-pointer ${
                selected?.id === pkg.id ? 'border-primary-500 bg-dark-800' : 'border-dark-700'
              }`}
            >
              <div className="flex justify-between">
                <span>{pkg.name || `${pkg.credits} credits`}</span>
                <span>{formatCurrency(pkg.price)}</span>
              </div>
              {pkg.description && (
                <p className="text-xs text-dark-400 mt-1">{pkg.description}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selected || processing}
            className="btn btn-primary flex items-center gap-2"
          >
            {processing ? 'Processing...' : 'Purchase'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyCreditsModal;
