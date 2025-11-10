import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <Link to="/" className="text-primary hover:underline mb-4 inline-block">&larr; Back to Home</Link>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-6">Last updated: November 2025</p>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">1. Information We Collect</h2>
          <p className="text-gray-700 mb-4">
            We collect information you provide when you:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li>Register for an account (name, email, password)</li>
            <li>Add bank account information for withdrawals</li>
            <li>Create and manage affiliate campaigns</li>
            <li>Connect social media accounts</li>
            <li>Communicate with our support team</li>
          </ul>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">2. Automatically Collected Data</h2>
          <p className="text-gray-700 mb-4">
            We automatically collect certain information when you use Lonaat:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li>Device information (IP address, browser type, operating system)</li>
            <li>Usage data (pages visited, features used, time spent)</li>
            <li>Affiliate link clicks and conversions</li>
            <li>Performance metrics and analytics</li>
          </ul>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">3. How We Use Your Information</h2>
          <p className="text-gray-700 mb-4">
            Your information is used to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li>Provide and improve our services</li>
            <li>Process withdrawals and track commissions</li>
            <li>Send transactional emails (welcome, commission approvals, withdrawal notifications)</li>
            <li>Detect and prevent fraud</li>
            <li>Comply with legal obligations</li>
          </ul>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">4. Affiliate Tracking</h2>
          <p className="text-gray-700 mb-4">
            We track affiliate link clicks, conversions, and commissions to ensure accurate payment. This data is essential for platform functionality and fraud prevention.
          </p>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">5. Email Communication</h2>
          <p className="text-gray-700 mb-4">
            We send emails for:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li>Account registration and verification</li>
            <li>Commission approvals</li>
            <li>Withdrawal confirmations</li>
            <li>Fraud alerts and security notifications</li>
            <li>Important platform updates</li>
          </ul>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">6. Data Sharing</h2>
          <p className="text-gray-700 mb-4">
            We do not sell your personal information. We may share data with:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li>Service providers (hosting, email, payment processing)</li>
            <li>Affiliate network partners (when you use their services)</li>
            <li>Law enforcement when required by law</li>
          </ul>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">7. Data Security</h2>
          <p className="text-gray-700 mb-4">
            We implement industry-standard security measures including:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li>Encrypted data transmission (HTTPS)</li>
            <li>Secure password hashing</li>
            <li>Regular security audits</li>
            <li>Access controls and authentication</li>
          </ul>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">8. Your Rights</h2>
          <p className="text-gray-700 mb-4">
            You have the right to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li>Access your personal data</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your account</li>
            <li>Opt-out of marketing communications</li>
          </ul>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">9. Cookies & Tracking</h2>
          <p className="text-gray-700 mb-4">
            We use cookies and similar technologies for authentication, preferences, and analytics. You can control cookie settings in your browser.
          </p>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">10. Changes to Privacy Policy</h2>
          <p className="text-gray-700 mb-4">
            We may update this policy periodically. We will notify you of significant changes via email or platform notifications.
          </p>
          
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">11. Contact Us</h2>
          <p className="text-gray-700 mb-4">
            For privacy-related questions or to exercise your rights, contact us at{' '}
            <a href="mailto:privacy@lonaat.com" className="text-primary hover:underline">privacy@lonaat.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
