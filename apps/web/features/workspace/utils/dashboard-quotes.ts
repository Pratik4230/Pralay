export type Quote = {
  text: string;
  author?: string;
};

export const DASHBOARD_QUOTES: Quote[] = [
  // Famous creativity quotes
  { text: "Creativity is intelligence having fun.", author: "Albert Einstein" },
  { text: "You can't use up creativity. The more you use, the more you have.", author: "Maya Angelou" },
  { text: "Creativity takes courage.", author: "Henri Matisse" },
  { text: "The worst enemy to creativity is self-doubt.", author: "Sylvia Plath" },
  { text: "Imagination is the beginning of creation.", author: "George Bernard Shaw" },
  { text: "An idea that is not dangerous is unworthy of being called an idea at all.", author: "Oscar Wilde" },
  { text: "Every artist was first an amateur.", author: "Ralph Waldo Emerson" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { text: "Design is not just what it looks like. Design is how it works.", author: "Steve Jobs" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "Think different.", author: "Apple" },
  { text: "Make something people want.", author: "Paul Graham" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Great things are done by a series of small things brought together.", author: "Vincent van Gogh" },
  // Original Pralay-flavoured quotes
  { text: "A creative workspace for the next generation." },
  { text: "Ideas are infinite. Build the ones that matter." },
  { text: "From vision to visual, faster than ever." },
  { text: "Every great workspace started with a single idea." },
  { text: "Create without limits. Ship without fear." },
  { text: "The canvas is always blank. What you do with it is everything." },
  { text: "Creativity is not a talent. It's a habit." },
  { text: "Build things that outlast the moment." },
  { text: "Your best work hasn't been made yet." },
  { text: "Turn chaos into clarity. One workspace at a time." },
  { text: "Great design is invisible. Great creativity is unforgettable." },
  { text: "The future belongs to those who build it today." },
];

/** Returns a stable random quote for the current session (changes on page refresh). */
export function getRandomQuote(): Quote {
  const idx = Math.floor(Math.random() * DASHBOARD_QUOTES.length);
  return DASHBOARD_QUOTES[idx]!;
}
