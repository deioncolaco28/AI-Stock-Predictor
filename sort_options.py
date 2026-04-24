import re

with open('templates/index.html', 'r') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if '<option value=\"\" disabled selected>Select an Indian Stock</option>' in line:
        start_idx = i + 1
    if '</select>' in line:
        end_idx = i
        break

options = lines[start_idx:end_idx]

def get_text(s):
    match = re.search(r'>([^<]+)<', s)
    return match.group(1).lower().strip() if match else s.lower()

options.sort(key=get_text)

lines = lines[:start_idx] + options + lines[end_idx:]

with open('templates/index.html', 'w') as f:
    f.writelines(lines)
