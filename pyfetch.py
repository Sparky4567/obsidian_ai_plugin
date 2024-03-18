import requests

API_TOKEN="BmFgsw0U6yK2tWI6w9IL9xwsp_careKYKR8iNmEF"
API_BASE_URL = "https://api.cloudflare.com/client/v4/accounts/50f234217be5524ba7bb223bb8c1322b/ai/run/"
headers = {"Authorization": f"Bearer {API_TOKEN}"}

def run(model, inputs):
    input = { "messages": inputs }
    response = requests.post(f"{API_BASE_URL}{model}", headers=headers, json=input)
    return response.json()

inputs = [
    { "role": "system", "content": "You are a friendly assistan that helps write stories" },
    { "role": "user", "content": "Write a short story about a llama that goes on a journey to find an orange cloud "}
];
output = run("@cf/meta/llama-2-7b-chat-int8", inputs)
print(output)