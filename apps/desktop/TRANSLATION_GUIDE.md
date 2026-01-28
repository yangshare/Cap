# Translation Guide

This guide explains how to add and manage translations in the Cap desktop application.

## Table of Contents

- [Translation Key Naming](#translation-key-naming)
- [File Organization](#file-organization)
- [Adding New Translations](#adding-new-translations)
- [Adding New Modules](#adding-new-modules)
- [Best Practices](#best-practices)
- [Common Issues](#common-issues)

## Translation Key Naming

### Structure

Translation keys follow the pattern: `module.category.item`

- **module**: Feature module (e.g., `recording`, `settings`, `editor`)
- **category**: Sub-category (e.g., `button`, `mode`, `language`)
- **item**: Specific item (e.g., `start`, `stop`, `title`)

### Rules

1. Use lowercase letters and dots
2. Use English for key names (NFR-M01)
3. Follow descriptive conventions (NFR-M03)
4. Keep naming consistent

### Examples

```json
{
  "recording.button.start": "Start Recording",
  "recording.button.stop": "Stop Recording",
  "recording.mode.studio": "Studio Mode",
  "settings.language.title": "Language",
  "settings.general.appearance": "Appearance",
  "editor.action.cut": "Cut",
  "editor.action.split": "Split"
}
```

## File Organization

### Directory Structure

```
apps/desktop/src/locales/
├── en/
│   ├── common.json      # Common translations
│   ├── recording.json   # Recording related
│   ├── settings.json    # Settings related
│   └── editor.json      # Editor related
└── zh-CN/
    ├── common.json
    ├── recording.json
    ├── settings.json
    └── editor.json
```

### File Naming

- Use lowercase letters and hyphens
- Reflect the functional module name
- Correspond to code structure

## Adding New Translations

### Step 1: Determine the Module

Identify which JSON file the translation belongs to:
- `common.json` - General UI elements (buttons, labels, etc.)
- `recording.json` - Recording functionality
- `settings.json` - Settings and preferences
- `editor.json` - Video editor functionality

### Step 2: Add English Translation

Add the key to the appropriate English file:

```json
// In locales/en/common.json
{
  "button.save": "Save",
  "button.cancel": "Cancel",
  "message.success": "Success!"
}
```

### Step 3: Add Chinese Translation

Add the corresponding key to the Chinese file:

```json
// In locales/zh-CN/common.json
{
  "button.save": "保存",
  "button.cancel": "取消",
  "message.success": "成功！"
}
```

### Step 4: Use in Code

Use the translation in your component:

```typescript
import { useI18n } from "~/i18n";

function MyComponent() {
  const t = useI18n();

  return (
    <div>
      <button>{t("button.save")}</button>
      <button>{t("button.cancel")}</button>
    </div>
  );
}
```

## Adding New Modules

### Step 1: Create JSON Files

Create new JSON files in both language directories:

```bash
# English
touch apps/desktop/src/locales/en/new-module.json

# Chinese
touch apps/desktop/src/locales/zh-CN/new-module.json
```

### Step 2: Add Translations

Use the template from `locales/.template/template.json`:

```json
{
  "_comment": "Translation file for new module",
  "_module": "new-module",
  "_language": "en",

  "newmodule.title": "Title",
  "newmodule.description": "Description"
}
```

### Step 3: Import in i18n.ts

Import and merge the new translations:

```typescript
// In apps/desktop/src/i18n.ts
import newModule from "./locales/en/new-module.json";
import newModuleZhCN from "./locales/zh-CN/new-module.json";

const en = {
  ...common,
  ...recording,
  ...settings,
  ...editor,
  ...newModule,
};

const zhCN = {
  ...commonZhCN,
  ...recordingZhCN,
  ...settingsZhCN,
  ...editorZhCN,
  ...newModuleZhCN,
};
```

## Best Practices

### 1. Keep It Concise

- Translation text should be brief and clear
- Avoid overly long sentences
- Consider UI space constraints

### 2. Context Matters

- Translation keys should reflect usage context
- Provide sufficient context information
- Consider variants for different locations

### 3. Use Parameters

For text containing variable values, use parameterized translations:

```json
{
  "message.welcome": "Welcome, {name}!",
  "recording.saved": "Recording saved as {filename}"
}
```

Usage:

```typescript
t("message.welcome", { name: "John" });
t("recording.saved", { filename: "my-recording.cap" });
```

### 4. Avoid Concatenation

Don't concatenate translated text in code:

```typescript
// Bad
const text = t("greeting") + ", " + name + "!";

// Good
t("greeting.withName", { name });
```

### 5. Technical Terms

Keep technical terms consistent across the application:

| English | Chinese |
|---------|---------|
| Recording | 录制 |
| Screenshot | 截图 |
| Settings | 设置 |
| Export | 导出 |
| Editor | 编辑器 |

## Common Issues

### Missing Translation

If a translation is missing, the app falls back to English (if available) or displays the key itself.

Check the browser console for warnings in development mode.

### Key Not Found

Make sure the key exists in both language files:

```typescript
// Check if key exists
if (t("some.key") === "some.key") {
  console.warn("Translation missing for: some.key");
}
```

### Type Errors

TypeScript types are auto-generated in `translation-keys.ts`. If you see type errors, make sure:

1. The key exists in both English and Chinese files
2. The key follows the naming structure
3. Both language files are properly formatted JSON

## Development Workflow

### Quick Start

1. Add translation to `en/[module].json`
2. Add translation to `zh-CN/[module].json`
3. Use `t()` in your component
4. Test both languages

### Estimated Time

With this guide and templates, adding new translations should take less than 30 minutes (NFR-M04).

## Additional Resources

- [Translation File Template](../src/locales/.template/template.json)
- [i18n Implementation](../src/i18n.ts)
- [Translation Keys](../src/translation-keys.ts)
- [PRD Requirements](../../../../_bmad-output/planning-artifacts/prd.md)
