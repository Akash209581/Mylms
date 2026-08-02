from flask import Flask, request, jsonify, render_template
import orchestrator

app = Flask(__name__, template_folder='templates')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/execute', methods=['POST'])
def execute():
    data = request.get_json()
    language = data.get('language')
    code = data.get('code')
    stdin = data.get('stdin')

    if not language or not code:
        return jsonify({'error': 'Language and code are required.'}), 400

    result = orchestrator.run_code(language, code, stdin)
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)
