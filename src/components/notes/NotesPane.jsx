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

export default function NotesPane() {
  return (
    <MDXEditor
      markdown="type notes here"
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
      onChange={(markdown) => console.log(markdown)}
    />
  );
}
