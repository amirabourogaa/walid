import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WhatsAppHistory {
  id: string;
  visa_status: string;
  sent_at: string;
}

export const useWhatsAppHistory = (clientId?: string) => {
  const [history, setHistory] = useState<WhatsAppHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!clientId) {
      setHistory([]);
      return;
    }

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        console.log('📱 Récupération de l\'historique WhatsApp pour:', clientId);
        const { data, error } = await supabase
          .from('whatsapp_message_history')
          .select('id, visa_status, sent_at')
          .eq('client_id', clientId)
          .order('sent_at', { ascending: false }) as { data: WhatsAppHistory[] | null; error: any };

        if (error) {
          console.error('❌ Erreur lors de la récupération de l\'historique:', error);
          throw error;
        }
        console.log('✅ Historique récupéré:', data?.length, 'messages');
        setHistory(data || []);
      } catch (error) {
        console.error('Error fetching WhatsApp history:', error);
        setHistory([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();

    // Listen for real-time updates
    const channel = supabase
      .channel('whatsapp-history-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_message_history',
          filter: `client_id=eq.${clientId}`
        },
        (payload) => {
          console.log('📱 Nouveau message WhatsApp reçu:', payload);
          const newRecord = payload.new as WhatsAppHistory;
          setHistory((prev) => [newRecord, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  return { history, isLoading };
};
