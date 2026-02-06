import json
import time
import requests
import os
import re
from urllib.parse import quote

# Caminho do arquivo
json_path = '/home/tesch/ouvidoria/TZ-APP/public/instituicoes.json'

def clean_address(raw_address):
    if not raw_address: return ""
    
    # Remove CEPs pattern like 25.085-131
    addr = re.sub(r'\d{2}\.?\d{3}-\d{3}', '', raw_address)
    
    # Split by common separators used in the dataset
    parts = re.split(r'[–-]', addr)
    
    # Usually the first part is Street + Number
    # Sometimes first part includes Neighborhood too, but that's fine
    primary_part = parts[0].strip()
    
    # If primary part is too short, might have split wrong, take first two
    if len(primary_part) < 5 and len(parts) > 1:
        primary_part = f"{parts[0].strip()}, {parts[1].strip()}"
    
    # Remove parenthesis info like (esquina com...)
    primary_part = re.sub(r'\(.*?\)', '', primary_part).strip()
    
    # Clean up trailing garbage
    primary_part = primary_part.strip(', ')
    
    # Construct final search query
    # We enforce City and State to avoid ambiguity
    final_query = f"{primary_part}, Duque de Caxias, RJ, Brasil"
    
    return final_query

def get_coordinates(address, name):
    try:
        search_query = clean_address(address)
        
        # Fallback if address is empty/bad
        if len(search_query) < 15: 
             search_query = f"{name}, Duque de Caxias, RJ"

        headers = {
            'User-Agent': 'TZ-App-GeoEnricher/2.0 (dev_test@example.com)'
        }
        
        print(f"🔍 Buscando: '{search_query}'")
        
        url = f"https://nominatim.openstreetmap.org/search?q={quote(search_query)}&format=json&limit=1"
        
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                print(f"✅ SUCESSO! -> {data[0]['lat']}, {data[0]['lon']}")
                return float(data[0]['lat']), float(data[0]['lon'])
        
        print(f"❌ Falha para '{search_query}'.")
        
    except Exception as e:
        print(f"Erro: {e}")
    
    return None, None

def enrich_data():
    if not os.path.exists(json_path):
        print("Arquivo JSON não encontrado.")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    categories = ['secretarias', 'unidades_saude', 'escolas', 'servicos_socioassistenciais']
    total_updated = 0
    
    for category in categories:
        if category not in data: continue
        
        print(f"\n--- Categoria: {category} ---")
        items = data[category]
        count = 0 
        
        for item in items:
            # Uncomment below to process ALL items. Limiting to 50 total for now to demonstrate success.
            if total_updated > 50: 
                print("Limite de segurança de 50 atualizações atingido para este teste.")
                break 

            if item.get('latitude') and item.get('longitude'):
                continue

            address = item.get('endereco')
            name = item.get('nome')
            
            if address:
                lat, lon = get_coordinates(address, name)
                
                if lat and lon:
                    item['latitude'] = lat
                    item['longitude'] = lon
                    total_updated += 1
                    
                    # Tenta salvar periodicamente
                    if total_updated % 3 == 0:
                         with open(json_path, 'w', encoding='utf-8') as f:
                            json.dump(data, f, ensure_ascii=False, indent=2)

                time.sleep(1.2) # Nominatim policy: max 1 req/sec
            
    # Final save
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\nConcluído! Total atualizados nesta execução: {total_updated}")

if __name__ == "__main__":
    enrich_data()
