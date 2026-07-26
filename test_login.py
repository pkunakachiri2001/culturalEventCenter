import urllib.request
import urllib.error
import json

url = 'https://cultural-blue.vercel.app/api/auth/login'
data = json.dumps({"username": "admin@nyatsime.com", "password": "admin123"}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as res:
        print(res.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code}")
    print(e.read().decode())
except Exception as e:
    print(f"Error: {e}")
