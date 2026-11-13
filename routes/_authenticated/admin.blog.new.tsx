import { createFileRoute } from "@tanstack/react-router";
import { BlogEditor } from "@/components/admin/blog-editor";

export const Route = createFileRoute("/_authenticated/admin/blog/new")({
  component: () => <BlogEditor />,
});