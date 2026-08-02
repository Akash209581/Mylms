from flask import Flask, request, jsonify
from orchestrator import run_code

app = Flask(__name__)

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
    app.run(debug=True)
