$content = Get-Content -Raw "c:\Users\MCNOTHIER\Desktop\SAMA FACTURE\js\app.js"

$methodsToAsync = "navigateTo\(", "renderUserAuthUI\(", "renderView\(", "renderDashboard\(", "renderClientsView\(", "renderDocumentsListView\(", "setupDocumentEditor\(", "renderDocumentView\(", "renderSettingsView\(", "bindUserAuthEvents\(", "handleLogin\(", "handleRegister\(", "showAuthView\("

foreach ($method in $methodsToAsync) {
    $content = [regex]::Replace($content, "\b$method", "async $method")
}

$asyncStoreMethods = "saveOrganization", "getClients", "getClientById", "saveClient", "deleteClient", "getDocuments", "getDocumentById", "generateDocumentNumber", "saveDocument", "deleteDocument", "addPayment", "updateDocumentStatus", "loginUser", "registerUser", "logoutUser"

foreach ($method in $asyncStoreMethods) {
    $content = [regex]::Replace($content, "store\.$method\(", "await store.$method(")
}

$content = [regex]::Replace($content, "\((item\.addEventListener\('click',\s*)\(e\)\s*=>", '$1async (e) =>')
$content = [regex]::Replace($content, "\((newConfirmBtn\.addEventListener\('click',\s*)\(\)\s*=>", '$1async () =>')
$content = [regex]::Replace($content, "(tabLoginBtn\.onclick\s*=\s*)\(\)\s*=>", '$1async () =>')
$content = [regex]::Replace($content, "(tabRegisterBtn\.onclick\s*=\s*)\(\)\s*=>", '$1async () =>')
$content = [regex]::Replace($content, "(switchReg\.onclick\s*=\s*)\(\)\s*=>", '$1async () =>')
$content = [regex]::Replace($content, "(switchLog\.onclick\s*=\s*)\(\)\s*=>", '$1async () =>')

Set-Content -Path "c:\Users\MCNOTHIER\Desktop\SAMA FACTURE\js\app.js" -Value $content
