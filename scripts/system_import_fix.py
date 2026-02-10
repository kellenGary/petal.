
import os
import re

PROJECT_ROOT = "/Users/Kellen/Desktop/petal"
COMPONENTS_DIR = os.path.join(PROJECT_ROOT, "components")
UI_DIR = os.path.join(COMPONENTS_DIR, "ui")

def to_kebab_case(name):
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1-\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1-\2', s1).lower()

def run_fixes():
    targets = []
    for root, _, files in os.walk(PROJECT_ROOT):
        if any(x in root for x in ['node_modules', '.git', '.expo', 'scripts', '.system_generated']):
            continue
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                targets.append(os.path.join(root, file))

    # UI filenames for reference
    if os.path.exists(UI_DIR):
        ui_files = {f.split('.')[0] for f in os.listdir(UI_DIR) if os.path.isfile(os.path.join(UI_DIR, f))}
    else:
        ui_files = set()

    for file_path in targets:
        with open(file_path, 'r') as f:
            content = f.read()
        
        orig = content
        
        # 1. Alias normalizations
        # Convert @/components/Hero -> @/components/ui/hero
        # Convert @/components/ThemedText -> @/components/ui/themed-text
        
        def fix_alias(match):
            prefix = match.group(1) # @/components/
            name = match.group(2)   # Hero or ui/Hero or home/Feed
            
            # If it already starts with ui/, home/, etc, just kebab the rest
            parts = name.split('/')
            parts = [to_kebab_case(p) for p in parts]
            
            # Specific logic for components that were moved into ui/ but might be referenced without 'ui/'
            # e.g. @/components/themed-text -> @/components/ui/themed-text
            comp_name = parts[-1]
            if len(parts) == 1 and comp_name in ui_files:
                parts.insert(0, 'ui')
            elif len(parts) == 1 and comp_name == 'themed-text': # fallback for common one
                parts.insert(0, 'ui')
            elif len(parts) == 1 and comp_name == 'themed-view':
                parts.insert(0, 'ui')
            elif len(parts) == 1 and comp_name == 'hero':
                parts.insert(0, 'ui')

            return f"{prefix}{'/'.join(parts)}"

        content = re.sub(r'(@/components/)([a-zA-Z0-9_\-\/]+)', fix_alias, content)

        # 2. Fix UI internal relative imports
        # Files in components/ui/... often import "./ThemedText" but it should be "./themed-text" (if sibling)
        # or "../themed-text" (if in subfolder like ui/hero)
        if "/components/ui/" in file_path:
            # Handle sibling/parent cases for ui components
            rel_ui_path = os.path.relpath(file_path, UI_DIR)
            depth = len(rel_ui_path.split(os.sep)) - 1 # 0 if in root of UI, 1 if in subfolder
            
            def fix_ui_rel(match):
                prefix = match.group(1) # from "
                path = match.group(2)   # ./ThemedText or ../ThemedText
                
                if not path.startswith('.'): return match.group(0)
                
                parts = path.split('/')
                # kebab the basename
                parts[-1] = to_kebab_case(parts[-1])
                
                # Check if it was supposed to be a UI component
                base = parts[-1]
                if base in ui_files:
                    # If we are in ui/root and it was ./ThemedText, keep ./themed-text
                    # If we are in ui/hero and it was ./themed-text, it was likely wrong, should be ../themed-text
                    if depth > 0 and parts[0] == '.':
                        # Check if base exists in current dir
                        curr_dir = os.path.dirname(file_path)
                        if not any(os.path.exists(os.path.join(curr_dir, base + ext)) for ext in ['.tsx', '.ts']):
                            # Not in current dir, but in UI root?
                            parts[0] = '..'
                
                return f"{prefix}{'/'.join(parts)}"

            content = re.sub(r'(from\s+["\'])([\.][^"\']+)', fix_ui_rel, content)

        if content != orig:
            print(f"Fixed {file_path}")
            with open(file_path, 'w') as f:
                f.write(content)

if __name__ == "__main__":
    run_fixes()
