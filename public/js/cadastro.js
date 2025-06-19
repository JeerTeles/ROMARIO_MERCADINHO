/*document.addEventListener('DOMContentLoaded', () => {
    const API_CLIENTES_URL = 'http://localhost:3000/api/clientes';
    const CLIENTS_PER_PAGE = 10; // Define quantos clientes por página

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

    let editingClientId = null; // Armazena o ID do cliente sendo editado
    let currentPage = 1;
    let totalPages = 1;

    // --- Funções para a Tabela de Clientes Cadastrados (LISTAGEM + PAGINAÇÃO) ---

    // Função para buscar e renderizar clientes com paginação
    async function fetchClientsPaged() {
        clientesListBody.innerHTML = `<tr><td colspan="6" id="noClientFound">Carregando clientes...</td></tr>`;

        try {
            const response = await fetch(`${API_CLIENTES_URL}?page=${currentPage}&limit=${CLIENTS_PER_PAGE}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json(); // A resposta agora contém data, totalPages, etc.
            
            totalPages = result.totalPages;
            renderClientsList(result.data);
            updatePaginationControls();
            
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            clientesListBody.innerHTML = `<tr><td colspan="6" id="noClientFound" style="color: red;">Erro ao carregar clientes, sem servidor! </td></tr>`;
            pageInfoSpan.textContent = 'Erro';
            prevPageBtn.disabled = true;
            nextPageBtn.disabled = true;
        }
    }

    // Função para renderizar a tabela de clientes
    function renderClientsList(clients) {
        clientesListBody.innerHTML = ''; // Limpa as linhas existentes

        if (clients.length === 0) {
            clientesListBody.innerHTML = `<tr><td colspan="6" id="noClientFound">Nenhum cliente cadastrado.</td></tr>`;
            return;
        }

        clients.forEach((client) => {
            const row = document.createElement('tr');

            const nomeCell = document.createElement('td');
            nomeCell.textContent = client.nomeCliente;
            row.appendChild(nomeCell);

            const telefoneCell = document.createElement('td');
            telefoneCell.textContent = client.telefone;
            row.appendChild(telefoneCell);

            const cpfCell = document.createElement('td');
            cpfCell.textContent = client.cpf;
            row.appendChild(cpfCell);

            const editCell = document.createElement('td');
            const editButton = document.createElement('button');
            editButton.textContent = 'Editar';
            editButton.classList.add('edit-btn');
            editButton.addEventListener('click', () => editRecord(client)); // Chama editRecord para preencher o formulário
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

    // Função para atualizar o estado dos botões de paginação e info
    function updatePaginationControls() {
        pageInfoSpan.textContent = `Página ${currentPage} de ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
    }

    // Event Listeners para os botões de paginação
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

    // Função para adicionar ou atualizar cliente
    addRecordBtn.addEventListener('click', async () => {
        const nomeCliente = nomeClienteInput.value.trim();
        const telefoneCliente = telefoneClienteInput.value.trim();
        const cpfCliente = cpfClienteInput.value.trim();

        if (!nomeCliente || !telefoneCliente || !cpfCliente) {
            alert('Por favor, preencha todos os campos (Nome, Telefone, CPF).');
            return;
        }

        const clientData = { nomeCliente, telefone: telefoneCliente, cpf: cpfCliente };

        try {
            let response;
            if (editingClientId === null) {
                // Adicionar novo cliente (POST)
                response = await fetch(API_CLIENTES_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clientData)
                });
            } else {
                // Atualizar cliente existente (PUT)
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
            editingClientId = null; // Reseta o modo de edição
            addRecordBtn.textContent = 'Adicionar Cliente';
            alert('Cliente cadastrado com sucesso!');
            currentPage = 1; // Volta para a primeira página após adicionar/editar
            await fetchClientsPaged(); // Recarrega a tabela após a operação

        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            alert('Erro ao salvar cliente: ' + error.message);
        }
    });

    // Função para preencher o formulário para edição
    function editRecord(client) {
        nomeClienteInput.value = client.nomeCliente;
        telefoneClienteInput.value = client.telefone;
        cpfClienteInput.value = client.cpf;
        // cpfClienteInput.readOnly = true; // Opcional: Impedir edição do CPF ao entrar no modo de edição
        addRecordBtn.textContent = 'Salvar Edição';
        editingClientId = client.id;
    }

    // Função para excluir um cliente
    async function deleteRecord(id) {
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
            try {
                const response = await fetch(`${API_CLIENTES_URL}/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                alert('Cliente excluído com sucesso!');
                if (editingClientId === id) { // Se o cliente sendo editado for excluído
                    clearForm();
                    editingClientId = null;
                    addRecordBtn.textContent = 'Adicionar Cliente';
                    // cpfClienteInput.readOnly = false;
                }
                currentPage = 1; // Volta para a primeira página após excluir
                await fetchClientsPaged(); // Recarrega a tabela após a exclusão
            } catch (error) {
                console.error('Erro ao excluir cliente:', error);
                alert('Erro ao excluir cliente: ' + error.message);
            }
        }
    }

    // Função para limpar o formulário
    function clearForm() {
        nomeClienteInput.value = '';
        telefoneClienteInput.value = '';
        cpfClienteInput.value = '';
        // cpfClienteInput.readOnly = false;
    }

    // Carrega a primeira página de clientes ao iniciar
    fetchClientsPaged();
}); */




document.addEventListener('DOMContentLoaded', () => {
    const API_CLIENTES_URL = 'http://localhost:3000/api/clientes';
    const API_VERIFY_PASSWORD_URL = 'http://localhost:3000/api/admin/verify-password';
    const API_ESTOQUE_LIST_URL = 'http://localhost:3000/api/estoque/list-for-select'; // NOVA ROTA
    const CLIENTS_PER_PAGE = 10;

    // Elementos do Formulário de Cadastro/Edição
    const nomeClienteInput = document.getElementById('nomeCliente');
    const telefoneClienteInput = document.getElementById('telefoneCliente');
    const cpfClienteInput = document.getElementById('cpfCliente');
    const itemClienteSelect = document.getElementById('itemClienteSelect'); // AGORA É UM SELECT
    const quantidadeClienteInput = document.getElementById('quantidadeCliente');
    const dividaClienteInput = document.getElementById('dividaCliente');
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

    // --- NOVA FUNÇÃO: Carregar e popular o dropdown de itens do estoque ---
    async function populateItemSelect() {
        try {
            const response = await fetch(API_ESTOQUE_LIST_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const items = await response.json();

            // Limpa as opções existentes (exceto a primeira "Selecione...")
            itemClienteSelect.innerHTML = '<option value="0">Selecione um Item (Opcional)</option>';

            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id; // O valor da opção será o ID do produto
                option.textContent = item.produto; // O texto visível será o nome do produto
                itemClienteSelect.appendChild(option);
            });

        } catch (error) {
            console.error('Erro ao carregar itens do estoque para seleção:', error);
            // Opcional: Adicionar uma mensagem de erro ao usuário ou desabilitar o select
            itemClienteSelect.innerHTML = '<option value="0" disabled>Erro ao carregar itens</option>';
        }
    }


    // --- Funções para a Tabela de Clientes Cadastrados (LISTAGEM + PAGINAÇÃO) ---

    async function fetchClientsPaged() {
        clientesListBody.innerHTML = `<tr><td colspan="9" id="noClientFound">Carregando clientes...</td></tr>`;

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
            clientesListBody.innerHTML = `<tr><td colspan="9" id="noClientFound" style="color: red;">Erro ao carregar clientes: ${error.message}</td></tr>`;
            pageInfoSpan.textContent = 'Erro';
            prevPageBtn.disabled = true;
            nextPageBtn.disabled = true;
        }
    }

    function renderClientsList(clients) {
        clientesListBody.innerHTML = '';

        if (clients.length === 0) {
            clientesListBody.innerHTML = `<tr><td colspan="9" id="noClientFound">Nenhum cliente cadastrado.</td></tr>`;
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

            // NOVO: Exibe o nome do produto ou "N/A" se não houver
            const itemCell = document.createElement('td');
            itemCell.textContent = client.nomeProdutoItem || 'N/A'; // Usa o nome do produto retornado pelo backend
            row.appendChild(itemCell);

            const quantidadeCell = document.createElement('td');
            quantidadeCell.textContent = client.quantidade;
            row.appendChild(quantidadeCell);

            const dividaCell = document.createElement('td');
            dividaCell.textContent = client.divida.toFixed(2);
            row.appendChild(dividaCell);


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
        const itemCliente = itemClienteSelect.value;       // NOVO: Pega o value do SELECT
        const quantidadeCliente = quantidadeClienteInput.value.trim();
        const dividaCliente = dividaClienteInput.value.trim();

        if (!validateBrazilianPhoneFrontend(telefoneInputVal)) {
            alert('Por favor, insira um telefone válido no formato (DDD + 8 ou 9 dígitos numéricos).');
            telefoneClienteInput.focus();
            return;
        }

        const telefone = telefoneInputVal; 

        if (!nomeCliente || !telefone || !cpfCliente || quantidadeCliente === '' || dividaCliente === '') {
            alert('Por favor, preencha todos os campos (Nome, Telefone, CPF, Quantidade, Dívida). Selecione um Item, se aplicável.');
            return;
        }

        // Validação de número para quantidade e dívida
        if (isNaN(parseInt(quantidadeCliente)) || parseInt(quantidadeCliente) < 0 || isNaN(parseFloat(dividaCliente)) || parseFloat(dividaCliente) < 0) {
            alert('Quantidade e Dívida devem ser números não negativos válidos.');
            return;
        }
        // Validação específica para o item selecionado (se não for a opção padrão "0")
        if (itemCliente !== "0" && isNaN(parseInt(itemCliente))) {
             alert('Selecione um item válido ou deixe a opção padrão "Selecione um Item".');
             return;
        }


        const clientData = {
            nomeCliente,
            telefone,
            cpf: cpfCliente,
            item: parseInt(itemCliente),         // Converte para inteiro (será 0 se "Selecione..." for escolhido)
            quantidade: parseInt(quantidadeCliente),
            divida: parseFloat(dividaCliente)
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
            await fetchClientsPaged(); // Recarrega a tabela após a operação

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
            // Define o valor do select para o ID do item
            itemClienteSelect.value = client.item || '0'; // Se o item for null/undefined, define para a opção padrão
            quantidadeClienteInput.value = client.quantidade;
            dividaClienteInput.value = client.divida;

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
        itemClienteSelect.value = '0';       // NOVO: Reseta o select
        quantidadeClienteInput.value = '';
        dividaClienteInput.value = '';
        telefoneClienteInput.style.borderColor = '';
        telefoneClienteInput.title = '';
    }

    // --- Chamadas iniciais ao carregar a página ---
    populateItemSelect(); // Carrega os itens do estoque para o select
    fetchClientsPaged();  // Carrega a primeira página de clientes
});