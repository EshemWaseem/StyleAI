import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { http } from "@/lib/api";
import type { EditorialStory } from "@/lib/editorial";

export const Route = createFileRoute("/editorial/$slug")({
  component: SingleStoryPage,
});

function SingleStoryPage() {
  const { slug } = Route.useParams();
  const [story, setStory] = useState<EditorialStory | null>(null);

  useEffect(() => {
    http.get<{stories: EditorialStory[]}>("/api/editorial").then(res => {
      const found = res.stories.find(s => s.slug === slug);
      if (found) setStory(found);
    });
  }, [slug]);

  if (!story) return <div className="pt-32 text-center">Loading...</div>;

  return (
    <article className="min-h-screen bg-background pt-24 pb-20 px-4 max-w-3xl mx-auto">
      <Link to="/editorial" className="text-sm text-muted-foreground hover:text-accent mb-8 inline-block">← Back to Journal</Link>
      <p className="text-accent text-sm tracking-widest uppercase mb-4">{story.category}</p>
      <h1 className="font-display text-4xl sm:text-5xl mb-6">{story.title}</h1>
      <p className="text-muted-foreground mb-10">{story.publishedAt} · By {story.author}</p>
      
      <img src={story.coverImage} className="w-full aspect-video object-cover rounded-xl mb-12" />
      
      <div className="prose prose-invert prose-lg mx-auto">
        {story.body.map((paragraph, i) => (
          <p key={i} className="mb-6 text-foreground/80 leading-relaxed">{paragraph}</p>
        ))}
      </div>

      {story.pullQuote && (
        <blockquote className="border-l-4 border-accent pl-6 my-12 italic text-2xl font-display text-foreground">
          "{story.pullQuote}"
        </blockquote>
      )}
    </article>
  );
}