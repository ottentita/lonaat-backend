import { DollarSign, Zap, Star, ChevronRight } from 'lucide-react';

const OfferCard = ({ offer, onPromote }) => {
  return (
    <div className="card p-6 hover:border-primary-500/50 transition-colors">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-dark-50 mb-1">{offer.name}</h3>
              <p className="text-dark-400 text-sm mb-3 line-clamp-2">{offer.description}</p>
              
              {/* Offer Details */}
              <div className="flex items-center gap-4 flex-wrap">
                {/* Commission */}
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-800">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-semibold text-green-500">
                    {offer.commission}% Commission
                  </span>
                </div>

                {/* Category */}
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-800">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-dark-300">
                    {offer.category}
                  </span>
                </div>

                {/* Rating */}
                {offer.rating && (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-800">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm text-dark-300">
                      {offer.rating}/5
                    </span>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              {offer.payout_type && (
                <div className="mt-3 pt-3 border-t border-dark-800">
                  <p className="text-xs text-dark-500">
                    Payout Type: <span className="text-dark-300">{offer.payout_type}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Promote Button */}
            <button
              onClick={() => onPromote(offer)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-dark-900 rounded-lg hover:bg-primary-600 whitespace-nowrap transition-colors font-medium flex-shrink-0"
            >
              Promote
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferCard;
