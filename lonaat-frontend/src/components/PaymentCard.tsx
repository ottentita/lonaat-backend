// PaymentCard.tsx
interface PaymentCardProps {
  date: string;
  amount: string;
  status: string;
  invoice: string;
}

export default function PaymentCard({ date, amount, status, invoice }: PaymentCardProps) {
  return (
    <div className="bg-white shadow rounded p-4 flex flex-col gap-1">
      <div className="font-semibold text-base">{amount}</div>
      <div className="text-xs text-gray-500">{date}</div>
      <div className={`text-xs font-medium ${status === 'Paid' ? 'text-green-600' : 'text-yellow-600'}`}>Status: {status}</div>
      <a href={invoice} className="text-xs text-blue-700 underline mt-1">View Invoice</a>
    </div>
  );
}
