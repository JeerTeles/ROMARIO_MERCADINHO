document.addEventListener('DOMContentLoaded', () => {
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
            clientesListBody.innerHTML = `<tr><td colspan="6" id="noClientFound" style="color: red;">Erro ao carregar clientes: ${error.message}</td></tr>`;
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
            alert('Operação realizada com sucesso!');
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
});