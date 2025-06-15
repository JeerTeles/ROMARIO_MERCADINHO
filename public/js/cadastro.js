document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api/clientes';

    const nomeClienteInput = document.getElementById('nomeCliente');
    const telefoneClienteInput = document.getElementById('telefoneCliente');
    const cpfClienteInput = document.getElementById('cpfCliente');
    const addRecordBtn = document.getElementById('addRecordBtn');
    const recordsBody = document.getElementById('recordsBody');

    // Elementos de pesquisa removidos, então essas variáveis são removidas
    // const searchCpfInput = document.getElementById('searchCpf');
    // const searchBtn = document.getElementById('searchBtn');
    // const searchResultDiv = document.getElementById('searchResult');

    let editingClientId = null;

    // Função para buscar e renderizar todos os clientes
    async function fetchClients() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const clients = await response.json();
            renderRecords(clients);
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            recordsBody.innerHTML = `<tr><td colspan="6" id="noRecordFound" style="color: red;">Erro ao carregar dados: ${error.message}</td></tr>`;
        }
    }

    // Função para renderizar a tabela de clientes
    function renderRecords(clients) {
        recordsBody.innerHTML = '';

        if (clients.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 6;
            cell.id = 'noRecordFound';
            cell.textContent = 'Nenhum cliente cadastrado';
            row.appendChild(cell);
            recordsBody.appendChild(row);
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

            /*const editCell = document.createElement('td');
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
            row.appendChild(deleteCell);*/

            recordsBody.appendChild(row);
        });
    }

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
                response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clientData)
                });
            } else {
                // Atualizar cliente existente (PUT)
                response = await fetch(`${API_URL}/${editingClientId}`, {
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
            await fetchClients(); // Recarrega a tabela após a operação

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
                const response = await fetch(`${API_URL}/${id}`, {
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
                    // cpfClienteInput.readOnly = false;
                }
                // searchResultDiv.innerHTML = ''; // Não há div de resultado de pesquisa nesta página
                await fetchClients(); // Recarrega a tabela após a exclusão
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

    // A funcionalidade de pesquisa foi removida daqui

    // Carrega os clientes do banco de dados ao iniciar a página
    fetchClients();
});