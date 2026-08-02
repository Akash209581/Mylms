import requests
import json

URL = 'http://127.0.0.1:5000/execute'

test_cases = [
    {
        'name': 'Python - Simple Print',
        'payload': {
            'language': 'python',
            'code': 'print("Hello from Python E2E!")',
            'stdin': ''
        },
        'expected_stdout': 'Hello from Python E2E!\n'
    },
    {
        'name': 'Python - Stdin',
        'payload': {
            'language': 'python',
            'code': 'name = input()\nprint(f"Welcome, {name}!")',
            'stdin': 'Alice'
        },
        'expected_stdout': 'Welcome, Alice!\n'
    },
    {
        'name': 'JavaScript - Simple Log',
        'payload': {
            'language': 'javascript',
            'code': 'console.log("Hello from JS E2E!");',
            'stdin': ''
        },
        'expected_stdout': 'Hello from JS E2E!\n'
    },
    {
        'name': 'JavaScript - Stdin',
        'payload': {
            'language': 'javascript',
            'code': "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(`Hello, ${input}`);",
            'stdin': 'Bob'
        },
        'expected_stdout': 'Hello, Bob\n'
    },
    {
        'name': 'C - Simple Print',
        'payload': {
            'language': 'c',
            'code': '#include <stdio.h>\nint main() { printf("Hello from C E2E!\\n"); return 0; }',
            'stdin': ''
        },
        'expected_stdout': 'Hello from C E2E!\n'
    },
    {
        'name': 'C - Stdin',
        'payload': {
            'language': 'c',
            'code': '#include <stdio.h>\nint main() { char name[50]; scanf("%49s", name); printf("Greetings, %s!\\n", name); return 0; }',
            'stdin': 'Charlie'
        },
        'expected_stdout': 'Greetings, Charlie!\n'
    },
    {
        'name': 'Java - Simple Print',
        'payload': {
            'language': 'java',
            'code': 'public class Main { public static void main(String[] args) { System.out.println("Hello from Java E2E!"); } }',
            'stdin': ''
        },
        'expected_stdout': 'Hello from Java E2E!\n'
    },
    {
        'name': 'Java - Stdin',
        'payload': {
            'language': 'java',
            'code': 'import java.util.Scanner;\npublic class Main { public static void main(String[] args) { Scanner scanner = new Scanner(System.in); String name = scanner.nextLine(); System.out.println("Salutations, " + name + "!"); } }',
            'stdin': 'Dave'
        },
        'expected_stdout': 'Salutations, Dave!\n'
    }
]

def run_tests():
    passed = 0
    failed = 0
    for i, test in enumerate(test_cases, 1):
        print(f"[{i}/{len(test_cases)}] Testing {test['name']}...")
        try:
            response = requests.post(URL, json=test['payload'], timeout=30)
            if response.status_code != 200:
                print(f"  ❌ FAILED: HTTP HTTP {response.status_code}")
                print(f"  Response: {response.text}")
                failed += 1
                continue
                
            result = response.json()
            if result.get('error'):
                print(f"  ❌ FAILED: Internal Error: {result['error']}")
                failed += 1
                continue
                
            stdout = result.get('stdout', '')
            
            # Use endswith or in because some languages add extra newlines or prompts depending on environment
            # Java print vs println, Python input() might not emit newline cleanly without tty depending on version
            # We'll normalize by stripping whitespace
            if stdout.strip() == test['expected_stdout'].strip():
                print(f"  ✅ PASSED (Exit Code: {result.get('exit_code')})")
                passed += 1
            else:
                print(f"  ❌ FAILED: Unexpected output")
                print(f"    Expected: {repr(test['expected_stdout'])}")
                print(f"    Got:      {repr(stdout)}")
                if result.get('stderr'):
                    print(f"    Stderr:   {repr(result['stderr'])}")
                failed += 1
                
        except Exception as e:
            print(f"  ❌ FAILED: Exception occurred: {e}")
            failed += 1

    print("-" * 30)
    print(f"SUMMARY: {passed} PASSED, {failed} FAILED.")

if __name__ == "__main__":
    run_tests()
