import { Reveal } from "@/components/ui/reveal";
import { ConversationBubbles } from "@/components/sections/conversation-bubbles";

export const metadata = { title: "Conversations - two story" };

export default function ConversationsPage() {
  return (
    <div className="pb-32 pt-40">
      <div className="container-page">
        <Reveal>
          <p className="eyebrow mb-4 justify-center text-center">Chapter 03</p>
          <h1 className="text-balance text-center font-display text-4xl font-light md:text-5xl">
            The words that stuck
          </h1>
        </Reveal>
        <div className="mt-16">
          <ConversationBubbles />
        </div>
      </div>
    </div>
  );
}
