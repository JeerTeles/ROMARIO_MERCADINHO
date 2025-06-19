/*document.addEventListener('DOMContentLoaded', () => {
    const API_CLIENTES_URL = 'http://localhost:3000/api/clientes';

    const searchCpfInput = document.getElementById('searchCpf');
    const searchBtn = document.getElementById('searchBtn');
    const searchResultBody = document.getElementById('searchResultBody');
    const searchResultMessage = document.getElementById('searchResultMessage');

    // Inicializa a tabela de resultados vazia
    function clearSearchResultTable() {
        searchResultBody.innerHTML = `
            <tr>
                <td colspan="6" id="noClientFoundInSearch">Nenhum cliente encontrado</td>
            </tr>
        `;
    }

    // Função para renderizar um único cliente na tabela de resultados da pesquisa
    function renderClientInSearchTable(client) {
        searchResultBody.innerHTML = ''; // Limpa qualquer mensagem ou cliente anterior

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
        // Ao clicar em editar, redireciona para a página de cadastro com os dados do cliente
        editButton.addEventListener('click', () => {
            // Assumindo que você tem (ou terá) uma página de cadastro que aceita parâmetros para edição
            window.location.href = `cadastro.html?id=${client.id}&nome=${encodeURIComponent(client.nomeCliente)}&telefone=${encodeURIComponent(client.telefone)}&cpf=${encodeURIComponent(client.cpf)}`;
        });
        editCell.appendChild(editButton);
        row.appendChild(editCell);

        const deleteCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Excluir';
        deleteButton.classList.add('delete-btn');
        deleteButton.addEventListener('click', () => deleteClient(client.id)); // Chama função para excluir
        deleteCell.appendChild(deleteButton);
        row.appendChild(deleteCell);

        searchResultBody.appendChild(row);
    }

    // Função para excluir um cliente (reutilizada do script de cadastro)
    async function deleteClient(id) {
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
                searchResultMessage.style.color = 'green';
                searchResultMessage.textContent = 'Cliente excluído com sucesso!';
                clearSearchResultTable(); // Limpa a tabela após exclusão
            } catch (error) {
                console.error('Erro ao excluir cliente:', error);
                searchResultMessage.style.color = 'red';
                searchResultMessage.textContent = 'Erro ao excluir cliente: ' + error.message;
            }
        }
    }


    // Event Listener para o botão de pesquisa
    searchBtn.addEventListener('click', async () => {
        const cpf = searchCpfInput.value.trim();
        searchResultMessage.textContent = ''; // Limpa mensagens anteriores
        clearSearchResultTable(); // Limpa a tabela antes de uma nova pesquisa

        if (!cpf || cpf.length !== 11) {
            searchResultMessage.style.color = 'orange';
            searchResultMessage.textContent = 'Por favor, digite um CPF válido (11 dígitos).';
            return;
        }

        try {
            const response = await fetch(`${API_CLIENTES_URL}/cpf/${cpf}`);
            if (!response.ok) {
                if (response.status === 404) {
                    searchResultMessage.style.color = 'red';
                    searchResultMessage.textContent = `Cliente com CPF "${cpf}" não encontrado.`;
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                return;
            }

            const client = await response.json();
            searchResultMessage.style.color = 'green';
            searchResultMessage.textContent = `Cliente encontrado: ${client.nomeCliente}`;
            renderClientInSearchTable(client); // Exibe o cliente na tabela

        } catch (error) {
            console.error('Erro ao pesquisar cliente:', error);
            searchResultMessage.style.color = 'red';
            searchResultMessage.textContent = 'Erro ao pesquisar cliente: ' + error.message;
        }
    });

    // Inicializa a tabela de resultados vazia ao carregar a página
    clearSearchResultTable();
});*/


document.addEventListener('DOMContentLoaded', () => {
    const API_CLIENTES_URL = 'http://localhost:3000/api/clientes';

    const searchCpfInput = document.getElementById('searchCpf');
    const searchCpfBtn = document.getElementById('searchCpfBtn'); // Novo ID
    
    const searchNameInput = document.getElementById('searchName'); // Novo input
    const searchNameBtn = document.getElementById('searchNameBtn'); // Novo botão

    const searchResultBody = document.getElementById('searchResultBody');
    const searchResultMessage = document.getElementById('searchResultMessage');

    // Inicializa a tabela de resultados vazia com mensagem inicial
    function clearAndInitSearchResultTable(message = "Utilize os campos acima para pesquisar clientes.") {
        searchResultBody.innerHTML = `
            <tr>
                <td colspan="6" id="noClientFoundInSearch">${message}</td>
            </tr>
        `;
    }

    // Função para renderizar um único cliente ou múltiplos clientes na tabela de resultados da pesquisa
    function renderClientsInSearchTable(clients) {
        searchResultBody.innerHTML = ''; // Limpa qualquer mensagem ou cliente anterior

        if (clients.length === 0) {
            clearAndInitSearchResultTable("Nenhum cliente encontrado com os critérios da pesquisa.");
            return;
        }

        clients.forEach(client => {
            const row = document.createElement('tr');

            /*const idCell = document.createElement('td');
            idCell.textContent = client.id;
            row.appendChild(idCell);*/

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
            editButton.addEventListener('click', () => {
                // Redireciona para a página de cadastro com os dados para edição
                window.location.href = `cadastro.html?id=${client.id}&nome=${encodeURIComponent(client.nomeCliente)}&telefone=${encodeURIComponent(client.telefone)}&cpf=${encodeURIComponent(client.cpf)}`;
            });
            editCell.appendChild(editButton);
            row.appendChild(editCell);

            const deleteCell = document.createElement('td');
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Excluir';
            deleteButton.classList.add('delete-btn');
            deleteButton.addEventListener('click', () => deleteClient(client.id));
            deleteCell.appendChild(deleteButton);
            row.appendChild(deleteCell);*/

            searchResultBody.appendChild(row);
        });
    }

    // Função para excluir um cliente
    async function deleteClient(id) {
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
                searchResultMessage.style.color = 'green';
                searchResultMessage.textContent = 'Cliente excluído com sucesso!';
                clearAndInitSearchResultTable(); // Limpa a tabela após exclusão
            } catch (error) {
                console.error('Erro ao excluir cliente:', error);
                searchResultMessage.style.color = 'red';
                searchResultMessage.textContent = 'Erro ao excluir cliente: ' + error.message;
            }
        }
    }


    // Event Listener para o botão de pesquisa por CPF
    searchCpfBtn.addEventListener('click', async () => {
        const cpf = searchCpfInput.value.trim();
        searchResultMessage.textContent = '';
        clearAndInitSearchResultTable("Pesquisando..."); // Mensagem de carregamento

        if (!cpf || cpf.length !== 11) {
            searchResultMessage.style.color = 'orange';
            searchResultMessage.textContent = 'Por favor, digite um CPF válido (11 dígitos).';
            clearAndInitSearchResultTable(); // Volta ao estado inicial
            return;
        }

        try {
            const response = await fetch(`${API_CLIENTES_URL}/cpf/${cpf}`);
            if (!response.ok) {
                if (response.status === 404) {
                    searchResultMessage.style.color = 'red';
                    searchResultMessage.textContent = `Cliente com CPF "${cpf}" não encontrado.`;
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                clearAndInitSearchResultTable("Nenhum cliente encontrado."); // Volta ao estado inicial
                return;
            }

            const client = await response.json();
            searchResultMessage.style.color = 'green';
            searchResultMessage.textContent = `Cliente encontrado por CPF: ${client.nomeCliente}`;
            renderClientsInSearchTable([client]); // Exibe o cliente na tabela (agora espera um array)

        } catch (error) {
            console.error('Erro ao pesquisar cliente por CPF:', error);
            searchResultMessage.style.color = 'red';
            searchResultMessage.textContent = 'Erro ao pesquisar cliente por CPF: ' + error.message;
            clearAndInitSearchResultTable("Erro na pesquisa.");
        }
    });

    // Event Listener para o botão de pesquisa por Nome
    searchNameBtn.addEventListener('click', async () => {
        const nome = searchNameInput.value.trim();
        searchResultMessage.textContent = '';
        clearAndInitSearchResultTable("Pesquisando..."); // Mensagem de carregamento

        if (!nome) {
            searchResultMessage.style.color = 'orange';
            searchResultMessage.textContent = 'Por favor, digite um nome para pesquisar.';
            clearAndInitSearchResultTable(); // Volta ao estado inicial
            return;
        }

        try {
            const response = await fetch(`${API_CLIENTES_URL}/nome/${encodeURIComponent(nome)}`); // Usar encodeURIComponent para nomes com espaços/caracteres especiais
            if (!response.ok) {
                if (response.status === 404) {
                    searchResultMessage.style.color = 'red';
                    searchResultMessage.textContent = `Nenhum cliente encontrado com o nome "${nome}".`;
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                clearAndInitSearchResultTable("Nenhum cliente encontrado."); // Volta ao estado inicial
                return;
            }

            const clients = await response.json(); // Pode retornar múltiplos clientes
            searchResultMessage.style.color = 'green';
            searchResultMessage.textContent = `${clients.length} cliente(s) encontrado(s) por nome.`;
            renderClientsInSearchTable(clients); // Exibe todos os clientes encontrados

        } catch (error) {
            console.error('Erro ao pesquisar cliente por Nome:', error);
            searchResultMessage.style.color = 'red';
            searchResultMessage.textContent = 'Erro ao pesquisar cliente por Nome: ' + error.message;
            clearAndInitSearchResultTable("Erro na pesquisa.");
        }
    });

    // Inicializa a tabela de resultados vazia ao carregar a página
    clearAndInitSearchResultTable();
});