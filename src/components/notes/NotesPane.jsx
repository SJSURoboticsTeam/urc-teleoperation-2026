import {
  MDXEditor,
  markdownShortcutPlugin,
  headingsPlugin,
  toolbarPlugin,
  listsPlugin,
  thematicBreakPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  diffSourcePlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  Separator,
  StrikeThroughSupSubToggles,
  ListsToggle,
  BlockTypeSelect,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  CodeToggle,
  DiffSourceToggleWrapper,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { preserveEmptyParagraphsPlugin } from "./preserveEmptyParagraphsPlugin";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import { useState, useRef, useEffect } from "react";

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
  const [overlayContainer, setOverlayContainer] = useState(null);

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
    <Box
      ref={setOverlayContainer}
      sx={{
        px: 2,
        pb: 2,
        '& [data-editor-block-type="image"]': {
          maxWidth: "100%",
        },
        '& [data-editor-block-type="image"] img': {
          maxWidth: "100%",
          height: "auto",
        },
      }}
    >
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
          component="span"
          aria-hidden="true"
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
        overlayContainer={overlayContainer}
        plugins={[
          preserveEmptyParagraphsPlugin(),
          headingsPlugin(),
          listsPlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          imagePlugin(),
          tablePlugin(),
          diffSourcePlugin(),
          markdownShortcutPlugin(),
          toolbarPlugin({
            toolbarContents: () => (
              <DiffSourceToggleWrapper options={["rich-text", "source"]}>
                <BlockTypeSelect />
                <Separator />
                <UndoRedo />
                <Separator />
                <BoldItalicUnderlineToggles />
                <Separator />
                <StrikeThroughSupSubToggles />
                <Separator />
                <ListsToggle />
                <Separator />
                <CreateLink />
                <InsertImage />
                <Separator />
                <InsertTable />
                <InsertThematicBreak />
                <Separator />
                <CodeToggle />
              </DiffSourceToggleWrapper>
            ),
          }),
        ]}
        onChange={onChange}
      />
    </Box>
  );
}
