import { Link } from 'react-router-dom';
import { Mail, MessageSquare, HelpCircle } from 'lucide-react';

export default function Contact() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-primary hover:underline mb-4 inline-block">&larr; Back to Home</Link>
        
        <div className="bg-white rounded-lg shadow-lg p-8 mt-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-gray-600 mb-8">
            Have questions or need support? We're here to help!
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="border border-gray-200 rounded-lg p-6 hover:border-primary transition-colors">
              <Mail className="h-8 w-8 text-primary mb-3" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Email Support</h3>
              <p className="text-gray-600 mb-3">
                Get help from our support team via email.
              </p>
              <a 
                href="mailto:support@lonaat.com" 
                className="text-primary hover:underline font-medium"
              >
                support@lonaat.com
              </a>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-6 hover:border-primary transition-colors">
              <MessageSquare className="h-8 w-8 text-primary mb-3" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Business Inquiries</h3>
              <p className="text-gray-600 mb-3">
                Partnership and business opportunities.
              </p>
              <a 
                href="mailto:business@lonaat.com" 
                className="text-primary hover:underline font-medium"
              >
                business@lonaat.com
              </a>
            </div>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <HelpCircle className="h-8 w-8 text-primary mb-3" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Frequently Asked Questions</h3>
            
            <div className="space-y-4 mt-4">
              <div>
                <h4 className="font-medium text-gray-900">How do I get paid?</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Withdrawals are processed via direct bank transfer after admin approval. Add your bank account in Settings, then request a withdrawal when you have sufficient balance.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">How long does withdrawal approval take?</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Most withdrawals are reviewed within 1-3 business days. You'll receive email notifications when your request is approved and paid.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Which affiliate networks are supported?</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Lonaat integrates with Amazon, ShareASale, CJ Affiliate, Impact, ClickBank, and more. Connect your affiliate accounts in the Networks section.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Can I promote any product?</h4>
                <p className="text-gray-600 text-sm mt-1">
                  You can promote products from our integrated affiliate networks, as long as they comply with our Terms of Service and the network's own policies.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
