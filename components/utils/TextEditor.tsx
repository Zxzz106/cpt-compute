"use client";
import React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { githubLight } from "@uiw/codemirror-theme-github";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { python } from "@codemirror/lang-python";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { StreamLanguage } from "@codemirror/language";
import { EditorView } from "@codemirror/view";

type Props = {
  value: string;
  onChange: (val: string) => void;
  height?: string;
  filename?: string;
  className?: string;
  readOnly?: boolean;
};

function pickExtensions(filename?: string) {
  const name = (filename || "").toLowerCase();
  if (name.endsWith(".js") || name.endsWith(".jsx") || name.endsWith(".mjs") || name.endsWith(".cjs")) {
    return [javascript({ jsx: true })];
  }
  if (name.endsWith(".ts") || name.endsWith(".tsx")) {
    return [javascript({ jsx: true, typescript: true })];
  }
  if (name.endsWith(".json")) {
    return [javascript({ jsx: false })];
  }
  if (name.endsWith(".html") || name.endsWith(".htm")) {
    return [html()];
  }
  if (name.endsWith(".css")) {
    return [css()];
  }
  if (name.endsWith(".py")) {
    return [python()];
  }
  if (name.endsWith(".sh") || name.endsWith(".bash")) {
    return [StreamLanguage.define(shell)];
  }
  return [javascript({ jsx: true })];
}

export default function TextEditor({ value, onChange, filename, className, wrap, height, readOnly }: Props & { wrap?: boolean }) {
  return (
    <CodeMirror
      value={value}
      height={height || "100%"}
      theme={githubLight}
      extensions={[
        ...pickExtensions(filename),
        ...(wrap ? [EditorView.lineWrapping] : []),
        ...(readOnly ? [EditorView.editable.of(false)] : [])
      ]}
      onChange={(val: string) => onChange(val)}
      className={className}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        autocompletion: true,
        bracketMatching: true,
        closeBrackets: true,
        highlightSelectionMatches: true,
        defaultKeymap: true,
        searchKeymap: true,
        historyKeymap: true,
        foldKeymap: true,
        lintKeymap: true,
        completionKeymap: true
      }}
    />
  );
}
