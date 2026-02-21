export const faqs = [
  {
    q: 'What is SheetMind?',
    a: 'SheetMind is an AI-powered sidebar that works inside Google Sheets. You can ask questions about your data in plain English, generate formulas, create charts, and automate multi-step sheet actions — all without leaving your spreadsheet.',
  },
  {
    q: 'How does SheetMind read my data?',
    a: 'When you send a message, SheetMind reads the headers and data from your selected sheet (up to 200 rows for chat, or uses RAG indexing for larger sheets). Your data is sent to our AI backend for processing and is never stored permanently.',
  },
  {
    q: 'Is my data safe?',
    a: 'Yes. SheetMind never stores your spreadsheet content. Our analytics are privacy-first — we never track your messages or sheet data. We also automatically detect PII (personally identifiable information) and warn you before processing. Your database is protected with row-level security policies.',
  },
  {
    q: 'Do I need an API key?',
    a: 'No. SheetMind works out of the box. No OpenAI API key, no configuration, no setup. Just install and start chatting.',
  },
  {
    q: 'Can SheetMind actually modify my spreadsheet?',
    a: 'Yes! In Action mode, SheetMind can create new sheets, write values, insert formulas, format cells, and generate charts. Every action is tracked and can be undone step-by-step.',
  },
  {
    q: "What's the difference between Chat mode and Action mode?",
    a: 'Chat mode answers questions and provides analysis without modifying your sheet. Action mode can create sheets, write formulas, format data, and generate charts. You choose which mode to use for each conversation.',
  },
  {
    q: 'How is SheetMind different from GPT for Sheets or SheetAI?',
    a: 'Most AI tools for Google Sheets work as cell functions (=GPT(), =AI()). SheetMind is a conversational sidebar that understands your full sheet context, takes multi-step actions, validates formulas against 120+ functions, detects PII automatically, and gives you step-by-step undo. No other tool offers this combination.',
  },
  {
    q: 'What happens when my free messages run out?',
    a: 'You can upgrade to Pro ($9/month) for 1,000 messages per month, or Team ($29/month) for unlimited messages. No pressure — we will let you know when you are running low.',
  },
]
