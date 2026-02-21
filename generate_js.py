import re
import json

def generate_bus_routes():
    with open('extracted_pdf.txt', 'r', encoding='utf-8') as f:
        text = f.read()
    
    routes_data = {}
    
    # We will simply collect stops in a list. When we hit "ROUTE: xyz", we know the current list belongs to xyz.
    # Then we associate the driver to it.
    
    current_stops = []
    current_route = ""
    current_driver = ""
    
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if not line: continue
        
        # Check if line has a stop
        m_stop = re.match(r'^(\d{2})\s+(.*?)(?:\s+(\d{1,2}[:.]\d{2}))?(?:\s+ROUTE:\s*(.*?))?$', line)
        if m_stop:
            sid = int(m_stop.group(1))
            name = m_stop.group(2).strip()
            time_val = m_stop.group(3) if m_stop.group(3) else ""
            route_val = m_stop.group(4) if m_stop.group(4) else ""
            
            # Sometimes name steals the time
            if not time_val:
                parts = name.rsplit(' ', 1)
                if len(parts) == 2 and re.match(r'\d{1,2}[:.]\d{2}', parts[1]):
                    name = parts[0].strip()
                    time_val = parts[1].strip()
                    
            # check if ROUTE: is inside the name part
            if "ROUTE:" in name:
                nparts = name.split("ROUTE:")
                name = nparts[0].strip()
                route_val = nparts[1].strip()
                
                # Check for time again inside name
                if not time_val:
                    subparts = name.rsplit(' ', 1)
                    if len(subparts) == 2 and re.match(r'\d{1,2}[:.]\d{2}', subparts[1]):
                        name = subparts[0].strip()
                        time_val = subparts[1].strip()
            
            # Check if time_val contains ROUTE:
            if "ROUTE:" in time_val:
                tparts = time_val.split("ROUTE:")
                time_val = tparts[0].strip()
                route_val = tparts[1].strip()
            
            time_val = time_val.replace('.', ':')
            
            current_stops.append({
                'id': sid,
                'name': name,
                'time': time_val,
                'lat': 'null',
                'lng': 'null'
            })
            
            if route_val:
                # We found a route!
                # the format usually is "101 - KULAMANGALAM"
                route_num = re.search(r'(\d+)', route_val)
                if route_num:
                    current_route = route_num.group(1)
        else:
            # Maybe it's a DRIVER NAME line?
            # check if line contains DRIVER NAME:
            if "DRIVER NAME:" in line:
                m_driver = re.search(r'DRIVER NAME:\s*(.*?)(?:\s+ROUTE:\s*(\d+.*))?$', line)
                if m_driver:
                    current_driver = m_driver.group(1).strip()
                    if m_driver.group(2):
                        route_num = re.search(r'(\d+)', m_driver.group(2))
                        if route_num:
                            current_route = route_num.group(1)
                
                # If we have current_route, we can save the block
                if current_route:
                    routes_data[current_route] = {
                        'driver': current_driver,
                        'stops': list(current_stops)
                    }
                    current_stops = []
                    current_route = ""
                    current_driver = ""
            elif "ROUTE:" in line:
                route_num = re.search(r'ROUTE:\s*(\d+)', line)
                if route_num:
                    current_route = route_num.group(1)
                    
                    if current_driver:
                        routes_data[current_route] = {
                            'driver': current_driver,
                            'stops': list(current_stops)
                        }
                        current_stops = []
                        current_route = ""
                        current_driver = ""

    # End of file: some stops might not have been flushed
    if current_route and current_stops:
         routes_data[current_route] = {
              'driver': current_driver,
              'stops': list(current_stops)
         }
         
    # Fix for coordinate merging
    coords_map = {
        "B.B. Kulam - Uzhavar Santhai": {"lat": 9.9388, "lng": 78.1345},
        "BB Kulam Bus Stop": {"lat": 9.9380, "lng": 78.1340},
        "KV School - Lady Doak College": {"lat": 9.9360, "lng": 78.1320},
        "OCPM Back Gate (Narimedu)": {"lat": 9.9340, "lng": 78.1300},
        "OCPM School - Front Gate": {"lat": 9.9320, "lng": 78.1280},
        "Goripalayam": {"lat": 9.9280, "lng": 78.1250},
        "Govt Medical  C ollege (Shenoy Nagar)": {"lat": 9.9270, "lng": 78.1350},
        "Anna  B us Stand": {"lat": 9.9250, "lng": 78.1400},
        "Paalpannai Signal - Aavin": {"lat": 9.9200, "lng": 78.1450}
    }

    for r in routes_data.values():
        for s in r['stops']:
            if s['name'] in coords_map:
                s['lat'] = coords_map[s['name']]['lat']
                s['lng'] = coords_map[s['name']]['lng']

    result = "export const BUS_ROUTES = {\n"
    sorted_keys = sorted(routes_data.keys(), key=lambda x: int(x))
    
    for k in sorted_keys:
        route = routes_data[k]
        result += f'    "{k}": {{\n'
        result += f'        driver: "{route["driver"]}",\n'
        result += f'        stops: [\n'
        for st in route['stops']:
            lat_str = str(st["lat"])
            lng_str = str(st["lng"])
            result += f'            {{ id: {st["id"]}, name: "{st["name"]}", time: "{st["time"]}", lat: {lat_str}, lng: {lng_str} }},\n'
        result += f'        ]\n'
        result += f'    }},\n'
        
    result += "};\n"
    
    with open('apps/student/data/busRoutes.js', 'w', encoding='utf-8') as f:
        f.write(result)

if __name__ == '__main__':
    generate_bus_routes()
