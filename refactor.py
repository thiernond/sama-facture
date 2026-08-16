import re
import os

filepath = r'c:\Users\MCNOTHIER\Desktop\SAMA FACTURE\js\app.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add async to method definitions
methods_to_async = [
    'navigateTo\(',
    'renderUserAuthUI\(',
    'renderView\(',
    'renderDashboard\(',
    'renderClientsView\(',
    'renderDocumentsListView\(',
    'setupDocumentEditor\(',
    'renderDocumentView\(',
    'renderSettingsView\(',
    'bindUserAuthEvents\(',
    'handleLogin\(',
    'handleRegister\(',
    'showAuthView\('
]

for method in methods_to_async:
    content = re.sub(r'(\b' + method + ')', r'async \1', content)

# Also add async to event listeners that call async methods
# e.g., document.getElementById('...').addEventListener('click', (e) => { ... })
# This is tricky with regex, so we'll just await the store calls, which means the enclosing function MUST be async.
# We'll use a regex to find store calls and make sure they are awaited.

async_store_methods = [
    'saveOrganization', 'getClients', 'getClientById', 'saveClient', 'deleteClient',
    'getDocuments', 'getDocumentById', 'generateDocumentNumber', 'saveDocument',
    'deleteDocument', 'addPayment', 'updateDocumentStatus', 'loginUser', 'registerUser', 'logoutUser'
]

for method in async_store_methods:
    content = re.sub(r'store\.' + method + r'\(', r'await store.' + method + '(', content)

# Fix some arrow functions to be async
content = re.sub(r'(\(\w*\)\s*=>\s*\{[^{}]*await)', r'async \1', content)
# We might need to run this multiple times to catch nested blocks or just use a broader regex
content = re.sub(r'(item\.addEventListener\(\'click\',\s*)\(e\)\s*=>', r'\1async (e) =>', content)
content = re.sub(r'(newConfirmBtn\.addEventListener\(\'click\',\s*)\(\)\s*=>', r'\1async () =>', content)
content = re.sub(r'(tabLoginBtn\.onclick\s*=\s*)\(\)\s*=>', r'\1async () =>', content)
content = re.sub(r'(tabRegisterBtn\.onclick\s*=\s*)\(\)\s*=>', r'\1async () =>', content)
content = re.sub(r'(switchReg\.onclick\s*=\s*)\(\)\s*=>', r'\1async () =>', content)
content = re.sub(r'(switchLog\.onclick\s*=\s*)\(\)\s*=>', r'\1async () =>', content)
content = re.sub(r'(form\.addEventListener\(\'submit\',\s*)\(e\)\s*=>', r'\1async (e) =>', content)

# Update await this.method() calls where we added async
for method in methods_to_async:
    clean_method = method.replace('\\', '')
    content = re.sub(r'this\.' + clean_method, r'await this.' + clean_method, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Refactored app.js")
