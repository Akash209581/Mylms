import os
from flask import Flask, request, jsonify
from orchestrator import run_code

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/execute', methods=['POST'])
def execute():
    data = request.get_json()
    if not data or 'code' not in data or 'language' not in data:
        return jsonify({'error': 'Invalid request. "code" and "language" are required.'}), 400

    code = data['code']
    language = data['language']
    stdin = data.get('stdin', '')

    result = run_code(code, language, stdin)
    return jsonify(result)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
