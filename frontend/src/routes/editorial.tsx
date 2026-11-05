import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useRole } from "@/lib/role";
import { http } from "@/lib/api";
import type { EditorialStory } from "@/lib/editorial";

export const Route = createFileRoute("/editorial")({
  component: AllStoriesPage,
});

function AllStoriesPage() {
  const [stories, setStories] = useState<EditorialStory[]>([]);
  
  useEffect(() => {
    http.get<{stories: EditorialStory[]}>("/api/editorial").then(res => setStories(res.stories));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <h1 className="font-display text-4xl mb-12">The Journal</h1>
      <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
        {stories.map((story) => (
          <Link key={story.slug} to="/editorial/$slug" params={{ slug: story.slug }} className="group">
            <div className="aspect-[4/3] overflow-hidden rounded-xl mb-4">
              <img src={story.coverImage} className="object-cover w-full h-full group-hover:scale-105 transition-transform" />
            </div>
            <p className="text-xs text-accent uppercase tracking-wider mb-2">{story.category}</p>
            <h2 className="font-display text-xl mb-2">{story.title}</h2>
            <p className="text-sm text-muted-foreground line-clamp-2">{story.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}