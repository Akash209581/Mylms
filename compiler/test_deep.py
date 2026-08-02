import requests
import time

URL = 'http://127.0.0.1:5000/execute'

deep_tests = [
    {
        'name': 'Infinite Loop (Timeout Test)',
        'payload': {
            'language': 'python',
            'code': 'while True:\n    pass',
            'stdin': ''
        }
    },
    {
        'name': 'Memory Fork Bomb (Resource Limits)',
        'payload': {
            'language': 'python',
            'code': 'a = []\nwhile True:\n    a.append(" " * 10**6)',
            'stdin': ''
        }
    },
    {
        'name': 'Network Access Attempt (Isolation Test)',
        'payload': {
            'language': 'python',
            'code': 'import urllib.request\ntry:\n    urllib.request.urlopen("http://example.com", timeout=2)\n    print("Network is OPEN!")\nexcept Exception as e:\n    print("Network is CLOSED!")',
            'stdin': ''
        }
    },
    {
        'name': 'File System Write Test (Out of bounds)',
        'payload': {
            'language': 'python',
            'code': 'try:\n    with open("/etc/passwd", "w") as f:\n        f.write("hacked")\n    print("Write SUCCESS!")\nexcept Exception as e:\n    print("Write BLOCKED!")',
            'stdin': ''
        }
    }
]

def run_deep_tests():
    for i, test in enumerate(deep_tests, 1):
        print(f"\n[{i}/{len(deep_tests)}] Testing: {test['name']}")
        start_time = time.time()
        try:
            response = requests.post(URL, json=test['payload'])
            elapsed = time.time() - start_time
            if response.status_code == 200:
                result = response.json()
                print(f"  Response {response.status_code} in {elapsed:.2f}s")
                print(f"  Error Payload: {result.get('error')}")
                print(f"  Stdout: {result.get('stdout', '').strip()}")
                print(f"  Stderr: {result.get('stderr', '')[:100].strip()}...")
                print(f"  Exit Code: {result.get('exit_code')}")
            else:
                print(f"  ❌ FAILED HTTP {response.status_code}: {response.text}")
        except Exception as e:
            print(f"  ❌ FAILED with Exception: {type(e).__name__} - {e}")
            
if __name__ == "__main__":
    run_deep_tests()
