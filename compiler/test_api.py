import requests

# Set the URL of the API endpoint
url = 'http://127.0.0.1:5000/execute'

# Define the data payload
data = {
    'language': 'python',
    'code': 'print("Hello, Python!")',
    'stdin': ''
}

# Send the POST request
response = requests.post(url, json=data)

# Print the response
print(response.json())