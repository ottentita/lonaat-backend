"use client";
import DashboardLayout from "@/layouts/DashboardLayout";
import MessageList from "@/components/Messages/MessageList";
import ConversationView from "@/components/Messages/ConversationView";
import MessageComposer from "@/components/Messages/MessageComposer";
import { useState } from "react";

const mockMessages = [
  { id: "1", sender: "John Doe", subject: "Property Inquiry", preview: "Is the 3BR apartment still available?", time: "10:00", unread: true },
  { id: "2", sender: "AffiliateBot", subject: "Campaign Approved", preview: "Your campaign Yoga Masterclass Q1 is now live.", time: "Yesterday", unread: false },
  { id: "3", sender: "Jane Smith", subject: "Payment Received", preview: "We have received your payment.", time: "2 days ago", unread: false },
];
type Conversation = { id: string; sender: string; subject: string; body: string; time: string };
const mockConversations: { [key: string]: Conversation } = {
  "1": { id: "1", sender: "John Doe", subject: "Property Inquiry", body: "Hi, is the 3BR apartment still available? I am interested in scheduling a viewing.", time: "2026-03-12 10:00" },
  "2": { id: "2", sender: "AffiliateBot", subject: "Campaign Approved", body: "Congratulations! Your campaign Yoga Masterclass Q1 is now live and receiving traffic.", time: "2026-03-11 09:00" },
  "3": { id: "3", sender: "Jane Smith", subject: "Payment Received", body: "We have received your payment of $49.00 for your Pro subscription. Thank you!", time: "2026-03-10 15:30" },
};

export default function MessagesDashboard() {
  const [selectedId, setSelectedId] = useState<string | null>(mockMessages[0].id);
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Messages</h1>
      <div className="flex flex-col md:flex-row gap-6 h-[60vh]">
        <MessageList messages={mockMessages} onSelect={setSelectedId} selectedId={selectedId} />
        <div className="flex-1 flex flex-col">
          <ConversationView message={selectedId ? mockConversations[selectedId] : null} />
          <MessageComposer />
        </div>
      </div>
    </DashboardLayout>
  );
}
