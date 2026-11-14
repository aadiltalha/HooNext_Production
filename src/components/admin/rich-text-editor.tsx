import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    Heading2, Heading3, List, ListOrdered, Quote,
    LinkIcon, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight,
    Undo, Redo,
} from "lucide-react";

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
}

function ToolbarButton({
    onClick, active, disabled, title, children,
}: {
    onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            title={title}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={cn(
                "h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none",
                active && "bg-primary/15 text-primary hover:bg-primary/15 hover:text-primary"
            )}
        >
            {children}
        </button>
    );
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadingRef = useRef(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
                link: false,
                underline: false,
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                autolink: true,
                HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
            }),
            ImageExtension.configure({ HTMLAttributes: { class: "rounded-lg max-w-full" } }),
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            Placeholder.configure({ placeholder: placeholder || "Write your post here…" }),
            CharacterCount,
        ],
        content: value || "",
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-4 py-3",
            },
        },
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
    });

    useEffect(() => {
        if (!editor) return;
        const current = editor.getHTML();
        if (value !== current && value !== undefined) {
            editor.commands.setContent(value || "", { emitUpdate: false });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor, value]);

    if (!editor) return null;

    const setLink = () => {
        const previousUrl = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt("URL", previousUrl || "https://");
        if (url === null) return;
        if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    };

    const handleImagePick = () => fileInputRef.current?.click();

    const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || uploadingRef.current) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("File too large — max 5MB");
            return;
        }

        uploadingRef.current = true;
        try {
            const ext = file.name.split(".").pop() ?? "jpg";
            const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

            const { error } = await supabase.storage.from("blogs").upload(path, file, {
                cacheControl: "3600",
                upsert: false,
            });
            if (error) throw error;

            const { data } = supabase.storage.from("blogs").getPublicUrl(path);
            editor.chain().focus().setImage({ src: data.publicUrl }).run();
            toast.success("Image uploaded");
        } catch (err: any) {
            toast.error(err.message ?? "Upload failed");
        } finally {
            uploadingRef.current = false;
        }
    };

    const charCount = editor.storage.characterCount?.characters?.() ?? 0;

    return (
        <div className="rounded-md border border-input bg-background overflow-hidden">
            <div className="flex flex-wrap items-center gap-0.5 border-b border-border/70 bg-muted/30 px-2 py-1.5">
                <ToolbarButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
                    <Bold className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
                    <Italic className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                    <UnderlineIcon className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
                    <Strikethrough className="h-4 w-4" />
                </ToolbarButton>

                <div className="w-px h-5 bg-border mx-1" />

                <ToolbarButton title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                    <Heading2 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                    <Heading3 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton title="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                    <Quote className="h-4 w-4" />
                </ToolbarButton>

                <div className="w-px h-5 bg-border mx-1" />

                <ToolbarButton title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                    <List className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                    <ListOrdered className="h-4 w-4" />
                </ToolbarButton>

                <div className="w-px h-5 bg-border mx-1" />

                <ToolbarButton title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
                    <AlignLeft className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
                    <AlignCenter className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
                    <AlignRight className="h-4 w-4" />
                </ToolbarButton>

                <div className="w-px h-5 bg-border mx-1" />

                <ToolbarButton title="Link" active={editor.isActive("link")} onClick={setLink}>
                    <LinkIcon className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton title="Insert image" onClick={handleImagePick}>
                    <ImageIcon className="h-4 w-4" />
                </ToolbarButton>

                <div className="w-px h-5 bg-border mx-1" />

                <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
                    <Undo className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
                    <Redo className="h-4 w-4" />
                </ToolbarButton>
            </div>

            <EditorContent editor={editor} />

            <div className="flex items-center justify-end border-t border-border/70 bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground">
                {charCount.toLocaleString()} characters
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageFile}
            />
        </div>
    );
}