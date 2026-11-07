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
  baseConnected,
}) {
  const editorRef = useRef(null);
  const failed =
    saveStatus === "Save failed" ||
    saveStatus === "Save unconfirmed: automatic retries exhausted";
  const statusColor =
    refreshError || failed
      ? "error.main"
      : !baseConnected
        ? "text.disabled"
        : saveStatus === "Saved"
          ? "success.main"
          : "warning.main";
  const statusLabel = refreshError
    ? "Refresh failed"
    : !baseConnected
      ? saveStatus === "Saved"
        ? "Saved · offline"
        : "Unsaved · offline"
      : saveStatus;

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
      <Box
        role="status"
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1,
          textAlign: "center",
        }}
      >
        <Box
          compoenent="span"
          sx={{
            width: 8,
            height: 8,
            flexShrink: 0,
            borderRadius: "50%",
            bgcolor: statusColor,
          }}
        />
        <span>{statusLabel}</span>
      </Box>
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
