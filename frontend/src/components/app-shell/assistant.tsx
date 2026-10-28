// components/app-shell/assistant.tsx
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { useRole } from "@/lib/role";

type PromptSet = { placeholder: string; suggestions: string[] };

const BRAND_PROMPTS: PromptSet = {
  placeholder: "Ask StyleAI to analyse, match, or create…",
  suggestions: [
    "Find influencers for the Noir Evening Dress",
    "Generate a campaign for AW26",
    "Show my best performing creators",
  ],
};

const INFLUENCER_PROMPTS: PromptSet = {
  placeholder: "Ask StyleAI about your profile, pricing, or brands…",
  suggestions: [
    "Suggest a price for my Instagram reels",
    "Which brands match my audience?",
    "Write a bio for my creator profile",
  ],
};

const TEAM_MEMBER_PROMPTS: PromptSet = {
  placeholder: "Ask StyleAI to help with your assigned work…",
  suggestions: [
    "What should I work on first today?",
    "Draft a caption for the Noir Evening Edit",
    "Prepare a creator brief for Luna Accessories",
  ],
};

const ADMIN_PROMPTS: PromptSet = {
  placeholder: "Ask StyleAI about platform operations…",
  suggestions: [
    "Show today's platform health",
    "Which users signed up this week?",
    "Any brands pending review?",
  ],
};

const AGENCY_PROMPTS: PromptSet = {
  placeholder: "Ask StyleAI about your client portfolio…",
  suggestions: [
    "Which client needs attention first?",
    "Compare performance across my brands",
    "Show pending approvals across clients",
  ],
};

function getPromptSetForRoles(userRoles: string[]): PromptSet {
  if (userRoles.includes("SUPER_ADMIN")) return ADMIN_PROMPTS;
  if (userRoles.includes("AGENCY")) return AGENCY_PROMPTS;
  if (userRoles.includes("BRAND_OWNER")) return BRAND_PROMPTS;
  if (userRoles.includes("BRAND_TEAM_MEMBER")) return TEAM_MEMBER_PROMPTS;
  if (userRoles.includes("INFLUENCER")) return INFLUENCER_PROMPTS;
  return BRAND_PROMPTS;
}

export function Assistant() {
  const { user } = useRole();
  const [open, setOpen] = useState(false);
  const promptSet = getPromptSetForRoles(user?.roles ?? []);

  return (
    <>
      <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Sparkles className="size-4" />
        <span className="hidden sm:inline">Ask StyleAI</span>
      </Button>

      {open && (
        <AssistantChat
          onClose={() => setOpen(false)}
          suggestions={promptSet.suggestions}
          placeholder={promptSet.placeholder}
        />
      )}
    </>
  );
}