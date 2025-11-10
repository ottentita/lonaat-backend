import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <Link to="/" className="text-primary hover:underline mb-4 inline-block">&larr; Back to Home</Link>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-6">Last updated: November 2025</p>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-700 mb-4">
            By accessing and using Lonaat, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.
          </p>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">2. Affiliate Responsibilities</h2>
          <p className="text-gray-700 mb-4">
            As an affiliate marketer on Lonaat, you agree to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li>Promote products honestly and accurately</li>
            <li>Comply with all applicable laws and regulations</li>
            <li>Not engage in spamming or deceptive marketing practices</li>
            <li>Disclose affiliate relationships in your content</li>
            <li>Respect intellectual property rights</li>
          </ul>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">3. Prohibited Content</h2>
          <p className="text-gray-700 mb-4">
            You may not promote or create content that:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li>Is illegal, harmful, or offensive</li>
            <li>Infringes on intellectual property rights</li>
            <li>Contains false or misleading information</li>
            <li>Violates privacy or data protection laws</li>
          </ul>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">4. Commission & Payment Terms</h2>
          <p className="text-gray-700 mb-4">
            Commissions are earned when valid affiliate actions are completed. Payouts are processed via direct bank transfer after admin approval. Minimum withdrawal amount and processing times apply.
          </p>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">5. Anti-Fraud Policy</h2>
          <p className="text-gray-700 mb-4">
            Lonaat employs automated fraud detection systems. Any fraudulent activity, including but not limited to click fraud, fake referrals, or manipulation of commission tracking, will result in immediate account termination and forfeiture of unpaid commissions.
          </p>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">6. Account Termination</h2>
          <p className="text-gray-700 mb-4">
            We reserve the right to suspend or terminate accounts that violate these terms or engage in prohibited activities. You may close your account at any time, subject to processing of pending withdrawals.
          </p>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">7. Limitation of Liability</h2>
          <p className="text-gray-700 mb-4">
            Lonaat is provided "as is" without warranties. We are not liable for indirect, incidental, or consequential damages arising from your use of the platform.
          </p>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">8. Changes to Terms</h2>
          <p className="text-gray-700 mb-4">
            We may update these terms at any time. Continued use of Lonaat after changes constitutes acceptance of the new terms.
          </p>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">9. Contact</h2>
          <p className="text-gray-700 mb-4">
            For questions about these terms, contact us at{' '}
            <a href="mailto:support@lonaat.com" className="text-primary hover:underline">support@lonaat.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
