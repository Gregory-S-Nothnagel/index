# Python script to convert kjv.txt to a JavaScript array

input_file = 'kjv.txt'
output_file = 'bible_array.js'

# Read the file and process lines
with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Convert lines to JavaScript array format
js_array = 'const bibleText = [\n'
for line in lines:
    clean_line = line.strip().replace('"', '\\"')  # Escape quotes
    js_array += f'    "{clean_line}",\n'
js_array += '];\n\nexport default bibleText;'

# Write to output file
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(js_array)

print(f"JavaScript array saved to {output_file}")
