import docker
import docker.errors
import os
import tempfile
import time

def run_code(language, code, stdin):
    client = docker.from_env()

    image_name = f'{language}-executor'
    try:
        client.images.get(image_name)
    except docker.errors.ImageNotFound:
        return {'error': f'Docker image for {language} not found.'}

    with tempfile.TemporaryDirectory() as temp_dir:
        file_name, file_ext = get_file_details(language)
        file_path = os.path.join(temp_dir, f'{file_name}{file_ext}')
        with open(file_path, 'w') as f:
            f.write(code)

        stdin_path = os.path.join(temp_dir, 'stdin.txt')
        with open(stdin_path, 'w') as f:
            f.write(stdin or '')

        container = client.containers.run(
            image_name,
            command=['timeout', '10s', *get_command(language, f'{file_name}{file_ext}')],
            volumes={temp_dir: {'bind': '/app', 'mode': 'rw'}},
            working_dir='/app',
            detach=True,
            mem_limit='512m',
            network_disabled=True,
            user='1000:1000',
            pids_limit=200
        )

        try:
            start_time = time.time()
            timeout_hit = False
            while True:
                container.reload()
                if container.status == 'exited':
                    break
                if time.time() - start_time > 11:
                    timeout_hit = True
                    break
                time.sleep(0.5)
            
            if timeout_hit:
                container.stop(timeout=1)
                stdout = ""
                stderr = "Error: Docker wait process timed out (Max 10 seconds allowed).\n"
                exit_code = 124
            else:
                result = container.wait()
                stdout = container.logs(stdout=True, stderr=False).decode('utf-8', errors='ignore')
                stderr = container.logs(stdout=False, stderr=True).decode('utf-8', errors='ignore')
                exit_code = result['StatusCode']
                
                # If the timeout command killed it, exit_code is usually 124
                if exit_code == 124:
                    stderr = "Error: Execution Timed Out (Max 10 seconds allowed).\n" + stderr
                    
        except Exception as e:
            print(f"Exception during execution monitoring: {e}")
            try:
                container.stop(timeout=1)
            except Exception:
                pass
            stdout = ""
            stderr = f"Error: Container execution failed ({str(e)})."
            exit_code = 1

        print("Removing container...")
        try:
            container.remove(force=True)
        except Exception as re:
            print(f"Exception during remove: {re}")
        print("Container removed!")

        return {
            'stdout': stdout,
            'stderr': stderr,
            'exit_code': exit_code
        }

def get_file_details(language):
    if language == 'python':
        return 'script', '.py'
    elif language == 'javascript':
        return 'script', '.js'
    elif language == 'c':
        return 'program', '.c'
    elif language == 'java':
        return 'Main', '.java'
    else:
        raise ValueError(f'Unsupported language: {language}')

def get_command(language, file_name):
    if language == 'python':
        return ['sh', '-c', f'python {file_name} < stdin.txt']
    elif language == 'javascript':
        return ['sh', '-c', f'node {file_name} < stdin.txt']
    elif language == 'c':
        return ['sh', '-c', f'gcc {file_name} -o program && ./program < stdin.txt']
    elif language == 'java':
        return ['sh', '-c', f'javac {file_name} && java Main < stdin.txt']
    else:
        raise ValueError(f'Unsupported language: {language}')
