"use client";

import { useState } from "react";
import { MessageCircle, Copy, Check } from "lucide-react";
import { waLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";

export function ReportActions({ reportText }: { reportText: string }) {
  const [copied, setCopied] = useState(false);

  const sendWa = () => {
    window.open(waLink(reportText), "_blank", "noopener,noreferrer");
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback diabaikan
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={sendWa}>
        <MessageCircle /> Kirim ke WhatsApp
      </Button>
      <Button variant="outline" onClick={copy}>
        {copied ? <Check /> : <Copy />} {copied ? "Tersalin" : "Salin Teks"}
      </Button>
    </div>
  );
}
