"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

export default function TestBackend() {
  const [message, setMessage] = useState("Connecting...");

  useEffect(() => {
    apiRequest("/api/health")
      .then(data => setMessage(data.message))
      .catch(() => setMessage("Backend connection failed"));
  }, []);

  return (
    <div style={{padding:"20px"}}>
      Backend status: {message}
    </div>
  );
}
