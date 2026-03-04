import { useState } from 'react';
import { X, Copy, CheckCircle, DollarSign, Zap, Share2 } from 'lucide-react';

const PromoteModal = ({ show, onClose, offer }) => {
  const [affiliateLink, setAffiliateLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [generated, setGenerated] = useState(false);

  if (!show || !offer) {
    return null;
  }

  const handleGenerateLink = () => {
    // Generate affiliate link with offer ID and user ID placeholder
    const userId = localStorage.getItem('userId') || 'user-' + Date.now();
    const link = `${window.location.origin}/offers/${offer.id}?ref=${userId}&affiliate=true`;
    setAffiliateLink(link);
    setGenerated(true);
    setCopied(false);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate potential earnings
  const estimatedEarnings = {
    perClick: 0.05,
    per100Clicks: 5,
    per1000Clicks: 50 + (50 * offer.commission / 100)
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-dark-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-700 sticky top-0 bg-dark-900">
          <div>
            <h2 className="text-2xl font-bold text-dark-50">Promote Offer</h2>
            <p className="text-dark-400 text-sm mt-1">{offer.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-dark-800 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Offer Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-dark-800 rounded-lg border border-dark-700">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                <span className="text-dark-400 text-sm">Commission</span>
              </div>
              <p className="text-2xl font-bold text-green-500">{offer.commission}%</p>
            </div>
            <div className="p-4 bg-dark-800 rounded-lg border border-dark-700">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span className="text-dark-400 text-sm">Category</span>
              </div>
              <p className="text-lg font-semibold text-yellow-500">{offer.category}</p>
            </div>
            {offer.rating && (
              <div className="p-4 bg-dark-800 rounded-lg border border-dark-700">
                <span className="text-dark-400 text-sm block mb-1">Rating</span>
                <p className="text-2xl font-bold text-yellow-500">{offer.rating}/5</p>
              </div>
            )}
          </div>

          {/* Affiliate Link Generation */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-dark-50">Generate Affiliate Link</h3>
            
            {!generated ? (
              <button
                onClick={handleGenerateLink}
                className="w-full btn btn-primary flex items-center justify-center gap-2"
              >
                <Share2 className="w-5 h-5" />
                Generate Your Link
              </button>
            ) : (
              <div className="space-y-2">
                {/* Link Display */}
                <div className="p-4 bg-dark-800 rounded-lg border border-primary-500/30">
                  <p className="text-xs text-dark-400 mb-2">Your Affiliate Link</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-dark-300 font-mono break-all">
                      {affiliateLink}
                    </code>
                    <button
                      onClick={handleCopyToClipboard}
                      className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                        copied
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-primary-500/20 text-primary-500 hover:bg-primary-500/30'
                      }`}
                      title={copied ? 'Copied!' : 'Copy to clipboard'}
                    >
                      {copied ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Copy Feedback */}
                {copied && (
                  <div className="text-sm text-green-500 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Link copied to clipboard!
                  </div>
                )}

                {/* Alternative Generation */}
                <button
                  onClick={handleGenerateLink}
                  className="text-sm text-primary-500 hover:text-primary-400 transition-colors"
                >
                  Generate new link
                </button>
              </div>
            )}
          </div>

          {/* Earning Estimates */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-dark-50">Earning Estimates</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                <span className="text-dark-400">Per click</span>
                <span className="text-green-500 font-semibold">
                  ~${estimatedEarnings.perClick.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                <span className="text-dark-400">Per 100 clicks</span>
                <span className="text-green-500 font-semibold">
                  ~${estimatedEarnings.per100Clicks.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                <span className="text-dark-400">Per 1,000 clicks</span>
                <span className="text-green-500 font-semibold">
                  ~${estimatedEarnings.per1000Clicks.toFixed(2)}
                </span>
              </div>
            </div>
            <p className="text-xs text-dark-500 pt-2 border-t border-dark-700">
              Estimates based on {offer.commission}% commission rate. Actual earnings may vary.
            </p>
          </div>

          {/* Promotion Tips */}
          <div className="space-y-3 pt-4 border-t border-dark-700">
            <h3 className="text-lg font-semibold text-dark-50">Promotion Tips</h3>
            <ul className="space-y-2 text-sm text-dark-300">
              <li className="flex gap-2">
                <span className="text-primary-500">•</span>
                <span>Share your affiliate link on social media platforms for maximum reach</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary-500">•</span>
                <span>Include the link in emails and newsletters to engaged audiences</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary-500">•</span>
                <span>Create promotional content highlighting the offer's benefits</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary-500">•</span>
                <span>Track your referrals through the dashboard to optimize performance</span>
              </li>
            </ul>
          </div>

          {/* Close Button */}
          <div className="flex gap-3 pt-4 border-t border-dark-700">
            <button
              onClick={onClose}
              className="flex-1 btn btn-secondary"
            >
              Close
            </button>
            {generated && (
              <button
                onClick={() => {
                  handleCopyToClipboard();
                  setTimeout(onClose, 1000);
                }}
                className="flex-1 btn btn-primary"
              >
                Copy & Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromoteModal;
