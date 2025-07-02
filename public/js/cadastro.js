/*document.addEventListener('DOMContentLoaded', () => {
    const API_CLIENTES_URL = 'http://localhost:3000/api/clientes';
    const API_VERIFY_PASSWORD_URL = 'http://localhost:3000/api/admin/verify-password';
    const CLIENTS_PER_PAGE = 10;

    // Elementos do Formulário de Cadastro/Edição
    const nomeClienteInput = document.getElementById('nomeCliente');
    const telefoneClienteInput = document.getElementById('telefoneCliente');
    const cpfClienteInput = document.getElementById('cpfCliente');
    // const dividaClienteInput = document.getElementById('dividaCliente'); // REMOVIDO: não há mais input para dívida
    const addRecordBtn = document.getElementById('addRecordBtn');

    // Elementos da Tabela de Clientes Cadastrados
    const clientesListBody = document.getElementById('clientesListBody');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageInfoSpan = document.getElementById('pageInfo');

    let editingClientId = null;
    let currentPage = 1;
    let totalPages = 1;

    // --- Função de Validação de Telefone (FRONTEND) ---
    function validateBrazilianPhoneFrontend(phone) {
        const cleanedPhone = String(phone).replace(/\D/g, '');
        return (cleanedPhone.length === 10 || cleanedPhone.length === 11) && cleanedPhone !== '';
    }

    // --- Event Listener para validação visual do telefone ---
    telefoneClienteInput.addEventListener('input', (event) => {
        const phoneValue = event.target.value;
        event.target.value = phoneValue.replace(/\D/g, ''); 

        if (phoneValue.length > 0 && !validateBrazilianPhoneFrontend(phoneValue)) {
            telefoneClienteInput.style.borderColor = 'red';
            telefoneClienteInput.title = 'Formato inválido: DDD + 8 ou 9 dígitos (somente números)';
        } else {
            telefoneClienteInput.style.borderColor = '';
            telefoneClienteInput.title = '';
        }
    });

    // --- Funções para a Tabela de Clientes Cadastrados (LISTAGEM + PAGINAÇÃO) ---

    async function fetchClientsPaged() {
        clientesListBody.innerHTML = `<tr><td colspan="8" id="noClientFound">Carregando clientes...</td></tr>`;

        try {
            const response = await fetch(`${API_CLIENTES_URL}?page=${currentPage}&limit=${CLIENTS_PER_PAGE}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            
            totalPages = result.totalPages;
            renderClientsList(result.data);
            updatePaginationControls();

        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            clientesListBody.innerHTML = `<tr><td colspan="8" id="noClientFound" style="color: red;">Erro ao carregar clientes: ${error.message}</td></tr>`;
            pageInfoSpan.textContent = 'Erro';
            prevPageBtn.disabled = true;
            nextPageBtn.disabled = true;
        }
    }

    function renderClientsList(clients) {
        clientesListBody.innerHTML = '';

        if (clients.length === 0) {
            clientesListBody.innerHTML = `<tr><td colspan="8" id="noClientFound">Nenhum cliente cadastrado.</td></tr>`;
            return;
        }

        clients.forEach((client) => {
            const row = document.createElement('tr');

            const idCell = document.createElement('td');
            idCell.textContent = client.id;
            row.appendChild(idCell);

            const nomeCell = document.createElement('td');
            nomeCell.textContent = client.nomeCliente;
            row.appendChild(nomeCell);

            const telefoneCell = document.createElement('td');
            telefoneCell.textContent = client.telefone;
            row.appendChild(telefoneCell);

            const cpfCell = document.createElement('td');
            cpfCell.textContent = client.cpf;
            row.appendChild(cpfCell);

            const dividaCell = document.createElement('td');
            dividaCell.textContent = client.divida.toFixed(2);
            row.appendChild(dividaCell);

            // Coluna para exibir a quantidade de itens associados
            const itensAssociadosCell = document.createElement('td');
            let itensCount = 0;
            try {
                const itensArray = JSON.parse(client.itens_associados || '[]');
                itensCount = itensArray.length;
            } catch (e) {
                console.error("Erro ao parsear itens_associados:", e);
            }
            itensAssociadosCell.textContent = `${itensCount} item(s)`;
            row.appendChild(itensAssociadosCell);


            const editCell = document.createElement('td');
            const editButton = document.createElement('button');
            editButton.textContent = 'Editar';
            editButton.classList.add('edit-btn');
            editButton.addEventListener('click', () => editRecord(client));
            editCell.appendChild(editButton);
            row.appendChild(editCell);

            const deleteCell = document.createElement('td');
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Excluir';
            deleteButton.classList.add('delete-btn');
            deleteButton.addEventListener('click', () => deleteRecord(client.id));
            deleteCell.appendChild(deleteButton);
            row.appendChild(deleteCell);

            clientesListBody.appendChild(row);
        });
    }

    function updatePaginationControls() {
        pageInfoSpan.textContent = `Página ${currentPage} de ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
    }

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchClientsPaged();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            fetchClientsPaged();
        }
    });


    // --- Funções do Formulário de Cadastro/Edição ---

    addRecordBtn.addEventListener('click', async () => {
        const nomeCliente = nomeClienteInput.value.trim();
        const telefoneInputVal = telefoneClienteInput.value.trim();
        const cpfCliente = cpfClienteInput.value.trim();
        // const dividaCliente = dividaClienteInput.value.trim(); // REMOVIDO

        if (!validateBrazilianPhoneFrontend(telefoneInputVal)) {
            alert('Por favor, insira um telefone válido no formato (DDD + 8 ou 9 dígitos numéricos).');
            telefoneClienteInput.focus();
            return;
        }

        const telefone = telefoneInputVal; 

        // Removida a validação de divida do formulário
        if (!nomeCliente || !telefone || !cpfCliente) {
            alert('Por favor, preencha todos os campos (Nome, Telefone, CPF).');
            return;
        }
        
        // Dívida não é mais enviada pelo formulário, backend a define como 0
        const clientData = {
            nomeCliente,
            telefone,
            cpf: cpfCliente
        };

        try {
            let response;
            if (editingClientId === null) {
                response = await fetch(API_CLIENTES_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clientData)
                });
            } else {
                response = await fetch(`${API_CLIENTES_URL}/${editingClientId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clientData)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            clearForm();
            editingClientId = null;
            addRecordBtn.textContent = 'Adicionar Cliente';
            alert('Operação realizada com sucesso!');
            currentPage = 1;
            await fetchClientsPaged();

        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            alert('Erro ao salvar cliente: ' + error.message);
        }
    });

    async function editRecord(client) {
        const password = prompt("Para editar, por favor, insira a senha de administrador (Padrão: 123456):");
        if (!password) {
            alert("Edição cancelada. Senha não fornecida.");
            return;
        }

        try {
            const response = await fetch(API_VERIFY_PASSWORD_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            // Senha correta, prosseguir com a edição
            nomeClienteInput.value = client.nomeCliente;
            telefoneClienteInput.value = client.telefone;
            cpfClienteInput.value = client.cpf;
            // dividaClienteInput.value = client.divida; // REMOVIDO

            telefoneClienteInput.style.borderColor = '';
            telefoneClienteInput.title = '';
            addRecordBtn.textContent = 'Salvar Edição';
            editingClientId = client.id;

        } catch (error) {
            console.error('Erro na verificação da senha:', error);
            alert('Falha na verificação da senha: ' + error.message + '\nPor favor, tente novamente.');
        }
    }

    async function deleteRecord(id) {
        const password = prompt("Para EXCLUIR, por favor, insira a senha de administrador (Padrão: 123456):");
        if (!password) {
            alert("Exclusão cancelada. Senha não fornecida.");
            return;
        }

        try {
            const verifyResponse = await fetch(API_VERIFY_PASSWORD_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password })
            });

            if (!verifyResponse.ok) {
                const errorData = await verifyResponse.json();
                throw new Error(errorData.message || `HTTP error! status: ${verifyResponse.status}`);
            }

            // Senha correta, prosseguir com a exclusão
            if (confirm('Tem certeza que deseja excluir este cliente?')) {
                const response = await fetch(`${API_CLIENTES_URL}/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                alert('Cliente excluído com sucesso!');
                if (editingClientId === id) {
                    clearForm();
                    editingClientId = null;
                    addRecordBtn.textContent = 'Adicionar Cliente';
                }
                currentPage = 1;
                await fetchClientsPaged();
            }

        } catch (error) {
            console.error('Erro na verificação da senha ou exclusão:', error);
            alert('Falha na exclusão: ' + error.message + '\nPor favor, tente novamente.');
        }
    }

    function clearForm() {
        nomeClienteInput.value = '';
        telefoneClienteInput.value = '';
        cpfClienteInput.value = '';
        // dividaClienteInput.value = ''; // REMOVIDO
        telefoneClienteInput.style.borderColor = '';
        telefoneClienteInput.title = '';
    }

    fetchClientsPaged();
});
*/

document.addEventListener('DOMContentLoaded', () => {
    const API_CLIENTES_URL = 'http://localhost:3000/api/clientes';
    const API_VERIFY_PASSWORD_URL = 'http://localhost:3000/api/admin/verify-password';
    const CLIENTS_PER_PAGE = 10;

    // Elementos do Formulário de Cadastro/Edição
    const nomeClienteInput = document.getElementById('nomeCliente');
    const telefoneClienteInput = document.getElementById('telefoneCliente');
    const cpfClienteInput = document.getElementById('cpfCliente');
    const addRecordBtn = document.getElementById('addRecordBtn');

    // Elementos da Tabela de Clientes Cadastrados
    const clientesListBody = document.getElementById('clientesListBody');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageInfoSpan = document.getElementById('pageInfo');

    let editingClientId = null;
    let currentPage = 1;
    let totalPages = 1;

    // --- Função de Validação de Telefone (FRONTEND) ---
    function validateBrazilianPhoneFrontend(phone) {
        const cleanedPhone = String(phone).replace(/\D/g, '');
        return (cleanedPhone.length === 10 || cleanedPhone.length === 11) && cleanedPhone !== '';
    }

    // --- Função de Validação de CPF Brasileiro (FRONTEND) ---
    function isValidCPF(cpf) {
        if (!cpf) return false;
        cpf = String(cpf).replace(/\D/g, ''); // Remove caracteres não numéricos

        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
            return false; // CPF deve ter 11 dígitos e não pode ter todos os dígitos iguais
        }

        let sum = 0;
        let remainder;

        // Validação do primeiro dígito verificador
        for (let i = 1; i <= 9; i++) {
            sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
        }
        remainder = (sum * 10) % 11;

        if (remainder === 10 || remainder === 11) {
            remainder = 0;
        }
        if (remainder !== parseInt(cpf.substring(9, 10))) {
            return false;
        }

        sum = 0;
        // Validação do segundo dígito verificador
        for (let i = 1; i <= 10; i++) {
            sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
        }
        remainder = (sum * 10) % 11;

        if (remainder === 10 || remainder === 11) {
            remainder = 0;
        }
        if (remainder !== parseInt(cpf.substring(10, 11))) {
            return false;
        }

        return true; // CPF válido
    }

    // --- Event Listener para validação visual do telefone ---
    telefoneClienteInput.addEventListener('input', (event) => {
        const phoneValue = event.target.value;
        event.target.value = phoneValue.replace(/\D/g, ''); 

        if (phoneValue.length > 0 && !validateBrazilianPhoneFrontend(phoneValue)) {
            telefoneClienteInput.style.borderColor = 'red';
            telefoneClienteInput.title = 'Formato inválido: DDD + 8 ou 9 dígitos (somente números)';
        } else {
            telefoneClienteInput.style.borderColor = '';
            telefoneClienteInput.title = '';
        }
    });

    // --- Event Listener para validação visual do CPF ---
    cpfClienteInput.addEventListener('input', (event) => {
        const cpfValue = event.target.value;
        event.target.value = cpfValue.replace(/\D/g, ''); // Limpa caracteres não numéricos

        if (cpfValue.length === 11 && !isValidCPF(cpfValue)) {
            cpfClienteInput.style.borderColor = 'red';
            cpfClienteInput.title = 'CPF inválido.';
        } else if (cpfValue.length === 11 && isValidCPF(cpfValue)) {
            cpfClienteInput.style.borderColor = 'green'; // Opcional: borda verde para CPF válido
            cpfClienteInput.title = 'CPF válido.';
        }
        else {
            cpfClienteInput.style.borderColor = '';
            cpfClienteInput.title = '';
        }
    });


    // --- Funções para a Tabela de Clientes Cadastrados (LISTAGEM + PAGINAÇÃO) ---

    async function fetchClientsPaged() {
        clientesListBody.innerHTML = `<tr><td colspan="8" id="noClientFound">Carregando clientes...</td></tr>`;

        try {
            const response = await fetch(`${API_CLIENTES_URL}?page=${currentPage}&limit=${CLIENTS_PER_PAGE}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            
            totalPages = result.totalPages;
            renderClientsList(result.data);
            updatePaginationControls();

        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            clientesListBody.innerHTML = `<tr><td colspan="8" id="noClientFound" style="color: red;">Erro ao carregar clientes: ${error.message}</td></tr>`;
            pageInfoSpan.textContent = 'Erro';
            prevPageBtn.disabled = true;
            nextPageBtn.disabled = true;
        }
    }

    function renderClientsList(clients) {
        clientesListBody.innerHTML = '';

        if (clients.length === 0) {
            clientesListBody.innerHTML = `<tr><td colspan="8" id="noClientFound">Nenhum cliente cadastrado.</td></tr>`;
            return;
        }

        clients.forEach((client) => {
            const row = document.createElement('tr');

            const idCell = document.createElement('td');
            idCell.textContent = client.id;
            row.appendChild(idCell);

            const nomeCell = document.createElement('td');
            nomeCell.textContent = client.nomeCliente;
            row.appendChild(nomeCell);

            const telefoneCell = document.createElement('td');
            telefoneCell.textContent = client.telefone;
            row.appendChild(telefoneCell);

            const cpfCell = document.createElement('td');
            cpfCell.textContent = client.cpf;
            row.appendChild(cpfCell);

            const dividaCell = document.createElement('td');
            dividaCell.textContent = client.divida.toFixed(2);
            row.appendChild(dividaCell);

            const itensAssociadosCell = document.createElement('td');
            let itensCount = 0;
            try {
                const itensArray = JSON.parse(client.itens_associados || '[]');
                itensCount = itensArray.length;
            } catch (e) {
                console.error("Erro ao parsear itens_associados:", e);
            }
            itensAssociadosCell.textContent = `${itensCount} item(s)`;
            row.appendChild(itensAssociadosCell);


            const editCell = document.createElement('td');
            const editButton = document.createElement('button');
            editButton.textContent = 'Editar';
            editButton.classList.add('edit-btn');
            editButton.addEventListener('click', () => editRecord(client));
            editCell.appendChild(editButton);
            row.appendChild(editCell);

            const deleteCell = document.createElement('td');
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Excluir';
            deleteButton.classList.add('delete-btn');
            deleteButton.addEventListener('click', () => deleteRecord(client.id));
            deleteCell.appendChild(deleteButton);
            row.appendChild(deleteCell);

            clientesListBody.appendChild(row);
        });
    }

    function updatePaginationControls() {
        pageInfoSpan.textContent = `Página ${currentPage} de ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
    }

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchClientsPaged();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            fetchClientsPaged();
        }
    });


    // --- Funções do Formulário de Cadastro/Edição ---

    addRecordBtn.addEventListener('click', async () => {
        const nomeCliente = nomeClienteInput.value.trim();
        const telefoneInputVal = telefoneClienteInput.value.trim();
        const cpfClienteInputVal = cpfClienteInput.value.trim(); // Pega o valor do input do CPF

        if (!validateBrazilianPhoneFrontend(telefoneInputVal)) {
            alert('Por favor, insira um telefone válido no formato (DDD + 8 ou 9 dígitos numéricos).');
            telefoneClienteInput.focus();
            return;
        }
        if (!isValidCPF(cpfClienteInputVal)) { // Validação de CPF antes de enviar
            alert('Por favor, insira um CPF válido e real.');
            cpfClienteInput.focus();
            return;
        }

        const telefone = telefoneInputVal;
        const cpf = cpfClienteInputVal; // Usa o CPF validado
        
        if (!nomeCliente || !telefone || !cpf) {
            alert('Por favor, preencha todos os campos (Nome, Telefone, CPF).');
            return;
        }

        const clientData = {
            nomeCliente,
            telefone,
            cpf: cpf
        };

        try {
            let response;
            if (editingClientId === null) {
                response = await fetch(API_CLIENTES_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clientData)
                });
            } else {
                response = await fetch(`${API_CLIENTES_URL}/${editingClientId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clientData)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            clearForm();
            editingClientId = null;
            addRecordBtn.textContent = 'Adicionar Cliente';
            alert('Operação realizada com sucesso!');
            currentPage = 1;
            await fetchClientsPaged();

        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            alert('Erro ao salvar cliente: ' + error.message);
        }
    });

    async function editRecord(client) {
        const password = prompt("Para editar, por favor, insira a senha de administrador (Padrão: 123456):");
        if (!password) {
            alert("Edição cancelada. Senha não fornecida.");
            return;
        }

        try {
            const response = await fetch(API_VERIFY_PASSWORD_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            // Senha correta, prosseguir com a edição
            nomeClienteInput.value = client.nomeCliente;
            telefoneClienteInput.value = client.telefone;
            cpfClienteInput.value = client.cpf;
            // Define as cores de borda e títulos para o estado "válido" ao carregar para edição
            telefoneClienteInput.style.borderColor = '';
            telefoneClienteInput.title = '';
            cpfClienteInput.style.borderColor = 'green'; // Assume que o CPF no DB já é válido
            cpfClienteInput.title = 'CPF válido.';

            addRecordBtn.textContent = 'Salvar Edição';
            editingClientId = client.id;

        } catch (error) {
            console.error('Erro na verificação da senha:', error);
            alert('Falha na verificação da senha: ' + error.message + '\nPor favor, tente novamente.');
        }
    }

    async function deleteRecord(id) {
        const password = prompt("Para EXCLUIR, por favor, insira a senha de administrador (Padrão: 123456):");
        if (!password) {
            alert("Exclusão cancelada. Senha não fornecida.");
            return;
        }

        try {
            const verifyResponse = await fetch(API_VERIFY_PASSWORD_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password })
            });

            if (!verifyResponse.ok) {
                const errorData = await verifyResponse.json();
                throw new Error(errorData.message || `HTTP error! status: ${verifyResponse.status}`);
            }

            if (confirm('Tem certeza que deseja excluir este cliente?')) {
                const response = await fetch(`${API_CLIENTES_URL}/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                alert('Cliente excluído com sucesso!');
                if (editingClientId === id) {
                    clearForm();
                    editingClientId = null;
                    addRecordBtn.textContent = 'Adicionar Cliente';
                }
                currentPage = 1;
                await fetchClientsPaged();
            }

        } catch (error) {
            console.error('Erro na verificação da senha ou exclusão:', error);
            alert('Falha na exclusão: ' + error.message + '\nPor favor, tente novamente.');
        }
    }

    function clearForm() {
        nomeClienteInput.value = '';
        telefoneClienteInput.value = '';
        cpfClienteInput.value = '';
        telefoneClienteInput.style.borderColor = '';
        telefoneClienteInput.title = '';
        cpfClienteInput.style.borderColor = ''; // Limpa feedback visual do CPF
        cpfClienteInput.title = '';
    }

    fetchClientsPaged();
});
