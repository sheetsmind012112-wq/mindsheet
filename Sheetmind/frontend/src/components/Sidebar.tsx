import Header from "./Header";
import MessageArea from "./MessageArea";
import InputArea from "./InputArea";
import type { Message, QuickAction, ChatMode, SheetInfo, ConversationListResponse, User } from "../types/api";

interface SidebarProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  responseTime: number | null;
  onSend: (text: string) => void;
  onNewChat: () => void;
  quickActions?: QuickAction[];
  onQuickAction?: (prompt: string) => void;
  sheetName?: string;
  rowCount?: number;
  isConnected?: boolean;
  // Mode and sheet selection
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  sheets: SheetInfo[];
  selectedSheet: string | null;
  onSheetChange: (sheetName: string) => void;
  // Navigation
  onShowPricing?: () => void;
  // Undo
  onUndo?: (messageId: string) => void;
  // Clarification
  onClarificationSelect?: (messageId: string, value: string) => void;
  // Conversation history
  conversations?: ConversationListResponse["conversations"];
  activeConversationId?: string | null;
  onLoadConversation?: (conversationId: string) => void;
  onDeleteConversation?: (conversationId: string) => void;
  user?: User | null;
  onLogout?: () => void;
  trialRefreshKey?: number;
  trialExpired?: boolean;
}

function Sidebar({
  messages,
  isLoading,
  error,
  responseTime,
  onSend,
  onNewChat,
  quickActions,
  onQuickAction,
  sheetName,
  rowCount,
  isConnected = true,
  mode,
  onModeChange,
  sheets,
  selectedSheet,
  onSheetChange,
  onShowPricing,
  onUndo,
  onClarificationSelect,
  conversations,
  activeConversationId,
  onLoadConversation,
  onDeleteConversation,
  user,
  onLogout,
  trialRefreshKey = 0,
  trialExpired = false,
}: SidebarProps) {
  return (
    <div className="flex flex-col h-screen w-full bg-white font-sans overflow-hidden">
      <Header
        onNewChat={onNewChat}
        sheetName={sheetName}
        rowCount={rowCount}
        isConnected={isConnected}
        mode={mode}
        onModeChange={onModeChange}
        sheets={sheets}
        selectedSheet={selectedSheet}
        onSheetChange={onSheetChange}
        onShowPricing={onShowPricing}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onLoadConversation={onLoadConversation}
        onDeleteConversation={onDeleteConversation}
        user={user}
        onLogout={onLogout}
        usageRefreshKey={trialRefreshKey}
      />
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <MessageArea
          messages={messages}
          isLoading={isLoading}
          error={error}
          responseTime={responseTime}
          onUndo={onUndo}
          onQuickAction={onQuickAction}
          onClarificationSelect={onClarificationSelect}
        />
      </div>
      <InputArea
        onSend={onSend}
        isLoading={isLoading}
        quickActions={quickActions}
        onQuickAction={onQuickAction}
        mode={mode}
        onModeChange={onModeChange}
        sheets={sheets}
        selectedSheet={selectedSheet}
        onSheetChange={onSheetChange}
        sheetName={sheetName}
        rowCount={rowCount}
        trialExpired={trialExpired}
      />
    </div>
  );
}

export default Sidebar;
