
import DashboardLayout from "@/layouts/DashboardLayout";
import SubscriptionPanel from "@/components/SubscriptionPanel";
import PaymentCard from "@/components/PaymentCard";
import CoinbasePaymentUI from "@/components/CoinbasePaymentUI";

export default function PaymentsDashboard() {
  // Mock data
  const subscription = { plan: "Pro", status: "Active", renewal: "2026-04-01" };
  const payments = [
    { date: "2026-03-01", amount: "$49.00", status: "Paid", invoice: "#" },
    { date: "2026-02-01", amount: "$49.00", status: "Paid", invoice: "#" },
    { date: "2026-01-01", amount: "$49.00", status: "Paid", invoice: "#" },
  ];
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Payments</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SubscriptionPanel {...subscription} />
        <CoinbasePaymentUI />
      </div>
      <h2 className="text-xl font-semibold mb-4">Payment History</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {payments.map((p, i) => (
          <PaymentCard key={i} {...p} />
        ))}
      </div>
    </DashboardLayout>
  );
}
