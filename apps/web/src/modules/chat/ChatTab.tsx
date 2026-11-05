import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "../../app/hooks";
import {
  Send,
  Hash,
  Volume2,
  Lock,
  Plus,
  RefreshCw,
  Pin,
  Paperclip,
} from "lucide-react";
import { Channel, Message, Employee } from "@flowos/shared-types";

export default function ChatTab() {
  const token = useAppSelector((state) => state.auth.token);
  const queryClient = useQueryClient();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active selection
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedDM, setSelectedDM] = useState<Employee | null>(null);

  // New message
  const [text, setText] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Queries
  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ["channels", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/communication/channels", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees", token],
    queryFn: async () => {
      const res = await fetch("/api/v1/employees", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token,
  });

  const activeChannelId = selectedChannel?.id || "";
  const activeDMId = selectedDM?.id || "";

  const { data: messages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["messages", activeChannelId, activeDMId, token],
    queryFn: async () => {
      const url = activeChannelId
        ? `/api/v1/communication/messages?channelId=${activeChannelId}`
        : `/api/v1/communication/messages?receiverId=${activeDMId}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).data || [];
    },
    enabled: !!token && (!!activeChannelId || !!activeDMId),
  });

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Set default channel on load
  useEffect(() => {
    if (channels.length > 0 && !selectedChannel && !selectedDM) {
      setSelectedChannel(channels[0]);
    }
  }, [channels]);

  // Mutations
  const postMsgMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/v1/communication/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      setText("");
    },
  });

  const reactMsgMutation = useMutation({
    mutationFn: async ({ id, emoji }: { id: string; emoji: string }) => {
      const r = await fetch(`/api/v1/communication/messages/${id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ emoji }),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  const pinMsgMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const r = await fetch(`/api/v1/communication/messages/${id}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isPinned }),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      showToast("✓ Message pin status changed.");
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    postMsgMutation.mutate({
      channelId: selectedChannel?.id || undefined,
      receiverId: selectedDM?.id || undefined,
      text,
    });
  };

  const handleReact = (msgId: string, emoji: string) => {
    reactMsgMutation.mutate({ id: msgId, emoji });
  };

  const handlePinToggle = (msg: Message) => {
    pinMsgMutation.mutate({ id: msg.id, isPinned: !msg.isPinned });
  };

  const selectChannel = (chan: Channel) => {
    setSelectedDM(null);
    setSelectedChannel(chan);
  };

  const selectDM = (emp: Employee) => {
    setSelectedChannel(null);
    setSelectedDM(emp);
  };

  return (
    <div className="flex-1 flex overflow-hidden min-h-[70vh] bg-[#070b13] text-slate-100 rounded-2xl border border-white/5">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 glass-card px-5 py-3 rounded-lg border-brand-500/30 shadow-lg shadow-brand-500/10 animate-bounce flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200">{toastMessage}</span>
        </div>
      )}

      {/* CHAT SIDEBAR */}
      <div className="w-64 border-r border-white/5 flex flex-col gap-6 p-4 select-none bg-slate-950/20 shrink-0">
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Channels</h3>
            <button className="text-slate-500 hover:text-white p-0.5">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col gap-1 text-xs">
            {channels.map(chan => {
              const Icon = chan.type === "announcement" ? Volume2 : chan.isPrivate ? Lock : Hash;
              const isActive = selectedChannel?.id === chan.id;
              return (
                <button
                  key={chan.id}
                  onClick={() => selectChannel(chan)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                    isActive ? "bg-brand-600 text-white font-bold" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{chan.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Direct Messages</h3>
          </div>
          <div className="flex-1 flex flex-col gap-1 text-xs overflow-y-auto pr-1">
            {employees.map(emp => {
              const isActive = selectedDM?.id === emp.id;
              return (
                <button
                  key={emp.id}
                  onClick={() => selectDM(emp)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                    isActive ? "bg-brand-600 text-white font-bold" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <span className="h-2 w-2 bg-emerald-500 rounded-full shrink-0"></span>
                  <span className="truncate">{emp.firstName} {emp.lastName}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CHAT WINDOW (RIGHT) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* WINDOW HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-950/20">
          <div>
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
              {selectedChannel ? (
                <>
                  <Hash className="h-4 w-4 text-slate-500" />
                  <span>{selectedChannel.name}</span>
                </>
              ) : selectedDM ? (
                <>
                  <span className="h-2 w-2 bg-emerald-500 rounded-full"></span>
                  <span>{selectedDM.firstName} {selectedDM.lastName}</span>
                </>
              ) : (
                <span>Loading channel...</span>
              )}
            </h3>
          </div>
          <button
            onClick={() => refetchMessages()}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* MESSAGES CONTAINER */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {messages.map(msg => (
            <div key={msg.id} className="group relative flex flex-col gap-1 max-w-3xl">
              <div className="flex items-baseline gap-2 text-[10px] text-slate-500">
                <span className="font-bold text-slate-300 font-mono">{msg.senderName}</span>
                <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                {msg.isPinned && (
                  <span className="flex items-center gap-0.5 text-indigo-400 font-bold font-sans">
                    <Pin className="h-2.5 w-2.5" /> Pinned
                  </span>
                )}
              </div>

              <div className="glass-card p-3 rounded-xl border border-white/5 bg-slate-950/20 text-xs text-slate-200">
                {msg.text}
              </div>

              {/* Reactions list */}
              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 pl-1">
                  {Object.entries(msg.reactions).map(([emoji, users]) => (
                    <button
                      key={emoji}
                      onClick={() => handleReact(msg.id, emoji)}
                      className="bg-white/5 px-2 py-0.5 rounded text-[10px] text-slate-400 font-bold border border-white/5 hover:bg-white/10"
                    >
                      {emoji} {users.length}
                    </button>
                  ))}
                </div>
              )}

              {/* Hover actions panel */}
              <div className="absolute right-0 top-0 hidden group-hover:flex items-center bg-slate-900 border border-white/10 rounded-lg p-1 gap-1.5 shadow-lg">
                <button
                  onClick={() => handleReact(msg.id, "👍")}
                  className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-slate-200 text-[10px]"
                  title="React thumbs up"
                >
                  👍
                </button>
                <button
                  onClick={() => handleReact(msg.id, "❤️")}
                  className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-slate-200 text-[10px]"
                  title="React heart"
                >
                  ❤️
                </button>
                <button
                  onClick={() => handleReact(msg.id, "🚀")}
                  className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-slate-200 text-[10px]"
                  title="React rocket"
                >
                  🚀
                </button>
                <button
                  onClick={() => handlePinToggle(msg)}
                  className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
                  title="Pin message"
                >
                  <Pin className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT FORM */}
        <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-slate-950/20 flex gap-3 items-center">
          <button type="button" className="text-slate-500 hover:text-white">
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            type="text"
            placeholder={
              selectedChannel?.type === "announcement"
                ? "Announcements channel is read-only..."
                : `Message #${selectedChannel?.name || selectedDM?.firstName || ""}`
            }
            disabled={selectedChannel?.type === "announcement"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none placeholder-slate-600"
          />
          <button
            type="submit"
            disabled={!text.trim() || selectedChannel?.type === "announcement"}
            className="p-2.5 bg-brand-600 hover:bg-brand-500 rounded-xl text-white disabled:bg-slate-800 disabled:text-slate-500 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
