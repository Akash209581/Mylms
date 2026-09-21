import docker
import docker.errors
import os
import tempfile

def run_code(code, language, stdin):
    client = docker.from_env()

    image_map = {
        'python': 'python-compiler',
        'c': 'c-compiler',
        'java': 'java-compiler',
        'javascript': 'javascript-compiler'
    }

    if language not in image_map:
        return {'error': f'Unsupported language: {language}'}

    image_name = image_map[language]
    
    try:
        client.images.get(image_name)
    except docker.errors.ImageNotFound:
        try:
            print(f"Building image for {language}...")
            dockerfile_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dockerfiles', language)
            client.images.build(
                path=dockerfile_dir,
                tag=image_name,
                rm=True
            )
            print("Image built.")
        except docker.errors.BuildError as e:
            return {'error': 'Failed to build docker image.', 'details': str(e)}


    script_map = {
        'python': 'script.py',
        'c': 'script.c',
        'java': 'Main.java',
        'javascript': 'script.js'
    }
    
    filename = script_map[language]

    with tempfile.TemporaryDirectory() as temp_dir:
        script_path = os.path.join(temp_dir, filename)
        with open(script_path, 'w') as f:
            f.write(code)

        run_script_content = create_run_script(language)
        run_script_path = os.path.join(temp_dir, 'run.sh')
        with open(run_script_path, 'w') as f:
            f.write(run_script_content)
        
        # Make the run script executable
        os.chmod(run_script_path, 0o755)

        # Write stdin to file safely without shell interpolation injection
        input_path = os.path.join(temp_dir, 'input.txt')
        with open(input_path, 'w', encoding='utf-8') as f:
            f.write(stdin or '')

        container = None
        try:
            container = client.containers.run(
                image_name,
                command='/bin/sh -c "timeout 30s /bin/sh /app/run.sh < /app/input.txt"',
                volumes={temp_dir: {'bind': '/app', 'mode': 'rw'}},
                network_mode='none',  # Prevent sandbox network access / SSRF
                pids_limit=100,       # Prevent fork bomb DoS
                mem_limit='512m',
                cpu_shares=1,
                working_dir='/app',
                detach=True
            )

            result = container.wait(timeout=35)
            stdout = container.logs(stdout=True, stderr=False).decode('utf-8', errors='replace')
            stderr = container.logs(stdout=False, stderr=True).decode('utf-8', errors='replace')
            
            container.remove()

            return {
                'stdout': stdout,
                'stderr': stderr,
                'exit_code': result['StatusCode']
            }

        except docker.errors.ContainerError as e:
            if container:
                container.remove()
            return {'error': 'Execution failed.', 'details': str(e)}
        except Exception as e:
            if container:
                container.remove()
            return {'error': 'An unexpected error occurred.', 'details': str(e)}

def create_run_script(language):
    if language == 'c':
        return """
#!/bin/sh
gcc script.c -o myapp
if [ $? -eq 0 ]; then
    ./myapp
fi
"""
    elif language == 'java':
        return """
#!/bin/sh
javac -J-Xmx256m Main.java
if [ $? -eq 0 ]; then
    java -Xmx256m -Xss512k -XX:+UseSerialGC Main
fi
"""
    elif language == 'python':
        return "python script.py"
    elif language == 'javascript':
        return "node script.js"
    return ""
