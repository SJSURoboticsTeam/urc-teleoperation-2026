// NOTE: This makes it so newlines visually replicate to other clients.
// very hacky solution but it may be the only way with MDXEDitor.
// see https://github.com/mdx-editor/editor/issues/112

import {
  realmPlugin,
  addExportVisitor$,
  addImportVisitor$,
} from "@mdxeditor/editor";
import {
  $isParagraphNode,
  $createParagraphNode,
  $isLineBreakNode,
  $createLineBreakNode,
  $createTextNode,
} from "lexical";

export const preserveEmptyParagraphsPlugin = realmPlugin({
  init(realm) {
    // Preserve newline/paragraph
    realm.pub(addExportVisitor$, {
      priority: 10,
      testLexicalNode(node) {
        const parent = node.getParent();

        return (
          $isParagraphNode(node) &&
          node.isEmpty() &&
          parent?.getType() === "root" &&
          parent.getChildrenSize() > 1
        );
      },
      visitLexicalNode({ actions, mdastParent }) {
        actions.appendToParent(mdastParent, {
          type: "paragraph",
          children: [{ type: "html", value: "&#160;" }],
        });
      },
    });

    realm.pub(addImportVisitor$, {
      priority: 10,
      testNode: (node) =>
        node.type === "paragraph" &&
        node.children.length === 1 &&
        node.children[0].type === "text" &&
        node.children[0].value === "\u00a0",

      visitNode({ lexicalParent, actions }) {
        if (lexicalParent.getType() !== "root") {
          actions.nextVisitor();
          return;
        }

        lexicalParent.append($createParagraphNode());
      },
    });

    // Preserve shift+enter
    realm.pub(addExportVisitor$, {
      priority: 10,
      testLexicalNode: $isLineBreakNode,
      visitLexicalNode({ actions, mdastParent }) {
        actions.appendToParent(mdastParent, {
          type: "html",
          value: "&#10;",
        });
      },
    });

    realm.pub(addImportVisitor$, {
      priority: 10,
      testNode: (node) => node.type === "text" && node.value.includes("\n"),

      visitNode({ mdastNode, lexicalParent, actions }) {
        const format = actions.getParentFormatting();
        const style = actions.getParentStyle();

        mdastNode.value.split("\n").forEach((part, index) => {
          if (index > 0) {
            lexicalParent.append($createLineBreakNode());
          }

          if (part) {
            lexicalParent.append(
              $createTextNode(part).setFormat(format).setStyle(style),
            );
          }
        });
      },
    });
  },
});
