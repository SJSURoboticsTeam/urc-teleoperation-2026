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

export default function NotesPane({
  markdown,
  saveStatus,
  loadError,
  onChange,
  onRetry,
}) {
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
      <p role="status">{saveStatus}</p>
      <MDXEditor
        markdown={markdown}
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
