import {
  MDXEditor,
  markdownShortcutPlugin,
  headingsPlugin,
  toolbarPlugin,
  listsPlugin,
  thematicBreakPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import { useRef, useEffect } from "react";

export default function NotesPane({
  markdown,
  saveStatus,
  loadError,
  onChange,
  onRetry,
  refreshError,
}) {
  const editorRef = useRef(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (
      typeof markdown == "string" &&
      editor &&
      editor.getMarkdown() !== markdown
    ) {
      editor.setMarkdown(markdown);
    }
  }, [markdown]);

  if (loadError) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          p: 2,
          gap: 1,
        }}
      >
        <p role="alert">{loadError}</p>
        <Button variant="contained" onClick={onRetry}>
          Retry
        </Button>
      </Box>
    );
  }

  if (markdown == null) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <p>Loading notes...</p>
      </Box>
    );
  }

  return (
    <>
      {refreshError && <p role="alert">{refreshError}</p>}
      <p role="status">{saveStatus}</p>
      <MDXEditor
        markdown={markdown}
        ref={editorRef}
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <UndoRedo />
                <BoldItalicUnderlineToggles />
              </>
            ),
          }),
        ]}
        onChange={onChange}
      />
    </>
  );
}
