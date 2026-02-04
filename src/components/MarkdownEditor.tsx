import { useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  placeholder?: string;
}

export default function MarkdownEditor({
  value,
  onChange,
  height = 400,
  placeholder = "Введите текст в формате Markdown...",
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<string>("edit");

  return (
    <div className="markdown-editor-wrapper">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50 border border-border mb-2">
          <TabsTrigger value="edit">Редактор</TabsTrigger>
          <TabsTrigger value="preview">Предпросмотр</TabsTrigger>
          <TabsTrigger value="both">Оба</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-0">
          <div data-color-mode="dark">
            <MDEditor
              value={value}
              onChange={(val) => onChange(val || "")}
              height={height}
              preview="edit"
              hideToolbar={false}
              enableScroll={true}
              visibleDragbar={false}
              textareaProps={{
                placeholder: placeholder,
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <Card className="p-4 min-h-[400px] overflow-auto bg-card/60 backdrop-blur border border-border rounded-2xl">
            <div data-color-mode="dark">
              <MDEditor.Markdown
                source={value || placeholder}
                className="prose prose-invert max-w-none"
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="both" className="mt-0">
          <div data-color-mode="dark">
            <MDEditor
              value={value}
              onChange={(val) => onChange(val || "")}
              height={height}
              preview="live"
              hideToolbar={false}
              enableScroll={true}
              visibleDragbar={false}
              textareaProps={{
                placeholder: placeholder,
              }}
            />
          </div>
        </TabsContent>
      </Tabs>

      <style>{`
        .markdown-editor-wrapper .w-md-editor {
          background-color: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 0.75rem;
          color: hsl(var(--foreground));
        }

        .markdown-editor-wrapper .w-md-editor-toolbar {
          background-color: hsl(var(--muted));
          border-bottom: 1px solid hsl(var(--border));
          border-radius: 0.75rem 0.75rem 0 0;
        }

        .markdown-editor-wrapper .w-md-editor-toolbar button {
          color: hsl(var(--foreground));
        }

        .markdown-editor-wrapper .w-md-editor-toolbar button:hover {
          background-color: hsl(var(--accent));
        }

        .markdown-editor-wrapper .w-md-editor-content {
          background-color: hsl(var(--background));
        }

        .markdown-editor-wrapper .w-md-editor-text-pre,
        .markdown-editor-wrapper .w-md-editor-text-input {
          color: hsl(var(--foreground));
          background-color: transparent;
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          line-height: 1.6;
          padding: 10px;
        }

        .markdown-editor-wrapper .w-md-editor-text-pre {
          padding: 0px;
        }

        .markdown-editor-wrapper .w-md-editor-text-input {
          padding: 10px;
        }

        .markdown-editor-wrapper .w-md-editor-text {
          font-family: 'JetBrains Mono', monospace;
        }

        .markdown-editor-wrapper .w-md-editor-preview {
          background-color: hsl(var(--card));
        }

        .markdown-editor-wrapper .wmde-markdown {
          background-color: transparent;
          color: hsl(var(--foreground));
        }

        .markdown-editor-wrapper .wmde-markdown h1,
        .markdown-editor-wrapper .wmde-markdown h2,
        .markdown-editor-wrapper .wmde-markdown h3,
        .markdown-editor-wrapper .wmde-markdown h4,
        .markdown-editor-wrapper .wmde-markdown h5,
        .markdown-editor-wrapper .wmde-markdown h6 {
          color: hsl(var(--foreground));
          border-bottom-color: hsl(var(--border));
        }

        .markdown-editor-wrapper .wmde-markdown a {
          color: hsl(var(--primary));
        }

        .markdown-editor-wrapper .wmde-markdown code {
          background-color: hsl(var(--muted));
          color: hsl(var(--foreground));
        }

        .markdown-editor-wrapper .wmde-markdown pre {
          background-color: hsl(var(--muted));
        }

        .markdown-editor-wrapper .wmde-markdown pre code {
          background-color: transparent;
        }

        .markdown-editor-wrapper .wmde-markdown blockquote {
          color: hsl(var(--muted-foreground));
          border-left-color: hsl(var(--border));
        }

        .markdown-editor-wrapper .wmde-markdown table {
          border-color: hsl(var(--border));
        }

        .markdown-editor-wrapper .wmde-markdown table th,
        .markdown-editor-wrapper .wmde-markdown table td {
          border-color: hsl(var(--border));
        }

        .markdown-editor-wrapper .wmde-markdown table tr {
          background-color: hsl(var(--card));
          border-color: hsl(var(--border));
        }

        .markdown-editor-wrapper .wmde-markdown table tr:nth-child(2n) {
          background-color: hsl(var(--muted) / 0.5);
        }

        .markdown-editor-wrapper .w-md-editor-text-pre > code,
        .markdown-editor-wrapper .w-md-editor-text-input,
        .markdown-editor-wrapper .w-md-editor-text-pre {
          font-size: 14px !important;
          line-height: 1.6 !important;
          font-family: 'JetBrains Mono', monospace !important;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .markdown-editor-wrapper .w-md-editor-text-pre,
        .markdown-editor-wrapper .w-md-editor-text-input {
          min-height: 100%;
          box-sizing: border-box;
        }

        .markdown-editor-wrapper .w-md-editor-text {
          position: relative;
        }
      `}</style>
    </div>
  );
}
