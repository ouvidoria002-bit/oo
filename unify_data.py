import json
import os
import math

base_path = '/home/tesch/ouvidoria/TZ-APP/banco/'
output_file = '/home/tesch/ouvidoria/TZ-APP/public/instituicoes.json'

files_to_merge = {
    "secretarias": "ULTIMATE_secretarias.json",
    "unidades_saude": "ULTIMATE_unidades_saude.json",
    "escolas": "ULTIMATE_escolas.json",
    "servicos_socioassistenciais": "ULTIMATE_servicos_socioassistenciais.json"
}

def clean_data(obj):
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
    elif isinstance(obj, list):
        return [clean_data(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: clean_data(value) for key, value in obj.items()}
    return obj

final_data = {}

for key, filename in files_to_merge.items():
    file_path = os.path.join(base_path, filename)
    if os.path.exists(file_path):
        try:
            # Python's json loader handles NaN by default by converting to float('nan')
            with open(file_path, 'r', encoding='utf-8') as f:
                # We need to manually handle strict=False if the file actually contains unquoted NaN
                # But standard json.load usually accepts it.
                data = json.load(f)
                cleaned_data = clean_data(data)
                final_data[key] = cleaned_data
                print(f"Loaded {len(data)} items from {filename} into '{key}'")
        except json.JSONDecodeError as e:
            # If standard load fails, try simplified manual fix for unquoted NaN
            print(f"Standard JSON load failed for {filename}, trying to fix NaN manually...")
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Replace unquoted NaN with null
                    content = content.replace(': NaN', ': null').replace(':NaN', ': null')
                    data = json.loads(content)
                    final_data[key] = data
                    print(f"Loaded {len(data)} items (manually fixed) from {filename} into '{key}'")
            except Exception as e2:
                print(f"Error reading {filename}: {e2}")
                final_data[key] = []
        except Exception as e:
             print(f"Error reading {filename}: {e}")
             final_data[key] = []
    else:
        print(f"File not found: {filename}")
        final_data[key] = []

try:
    with open(output_file, 'w', encoding='utf-8') as f:
        # allow_nan=False will raise error if we missed any, ensuring valid JSON
        json.dump(final_data, f, ensure_ascii=False, indent=2, allow_nan=False)
    print(f"Successfully created {output_file}")
except Exception as e:
    print(f"Error writing output file: {e}")
