// Real, verified lines only - see the project brief, Section 7. Nothing here
// is invented or paraphrased into something it didn't mean. Add new quotes
// through this array (or eventually the admin panel) without touching the
// layout of ConversationBubbles.

export type Quote = {
  text: string;
  who: "a" | "b";
  context?: string;
};

export const quotes: Quote[] = [
  {
    text: "I don't like expecting things from people.",
    who: "b",
  },
  {
    text: "I know my words don't mean much to you right now - we haven't known each other very long. I'd rather prove them through actions over time than just keep talking about them.",
    who: "a",
  },
  {
    text: "I just hope you know I don't expect you to gift me any of them.",
    who: "b",
    context: "on book collecting",
  },
  {
    text: "I was thinking about that for a while... maybe some random things are just meant to happen😊",
    who: "a",
  },
  {
    text: "I feel happy when I have a chance to spend some time with you, no matter of how it sounds like",
    who: "a",
  },
  {
    text: "Just be sure I'm always here for you",
    who: "a",
  },
  {
    text: "Honestly you seem really nice. You're just too self conscious in my opinion",
    who: "b",
  },
  {
    text: "If it happens it happens if not then not",
    who: "b",
  },
  {
    text: "I feel like I shouldn't have said that… You're using it against me",
    who: "b",
  },
  {
    text: "If I see the words and behaviour match then that's a good way to judge a person in general",
    who: "b",
  },
  {
    text: "I think you are the smartest person I know",
    who: "a",
  },
  {
    text: "I wouldn't call myself wise… Just practical",
    who: "b",
  },
  {
    text: "That is what a wise person would say",
    who: "a",
  },
];
