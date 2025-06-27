document.addEventListener('DOMContentLoaded', () => {
    const API_CLIENTES_URL = 'http://localhost:3000/api/clientes';
    const API_ESTOQUE_LIST_URL = 'http://localhost:3000/api/estoque/list-for-select';
    const API_CLIENTE_PRODUTOS_URL = 'http://localhost:3000/api/cliente-produtos'; // Nova rota de API

    // Elementos de Pesquisa
    const searchCpfInput = document.getElementById('searchCpf');
    const searchCpfBtn = document.getElementById('searchCpfBtn');
    const searchNameInput = document.getElementById('searchName');
    const searchNameBtn = document.getElementById('searchNameBtn');
    const searchResultMessage = document.getElementById('searchResultMessage');

    // Elementos de Detalhes do Cliente Encontrado
    const clientDetailsContent = document.getElementById('clientDetailsContent');
    const clientActionsSection = document.getElementById('clientActionsSection'); // Seção para mostrar/esconder
    
    // Elementos para Associar Produto
    const itemProdutoSelect = document.getElementById('itemProdutoSelect');
    const quantidadeProdutoInput = document.getElementById('quantidadeProduto');
    const valorUnitarioProdutoInput = document.getElementById('valorUnitarioProduto');
    const valorTotalProdutoAssocInput = document.getElementById('valorTotalProdutoAssoc');
    const addProductToClientBtn = document.getElementById('addProductToClientBtn');

    // Elementos da Tabela de Produtos Associados ao Cliente
    const clientAssociatedProductsBody = document.getElementById('clientAssociatedProductsBody');

    let currentSelectedClient = null; // Armazena o objeto do cliente atualmente selecionado
    let estoqueProducts = []; // Cache dos produtos do estoque para popular o select

    // --- Funções de Inicialização e Utilitários ---

    // Limpa e exibe mensagem padrão na tabela de produtos associados
    function clearAssociatedProductsTable(message = "Nenhum produto associado.") {
        clientAssociatedProductsBody.innerHTML = `<tr><td colspan="7">${message}</td></tr>`;
    }

    // Carrega produtos do estoque para o dropdown
    async function populateItemProdutoSelect() {
        try {
            const response = await fetch(API_ESTOQUE_LIST_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            estoqueProducts = await response.json(); // Armazena o cache dos produtos

            itemProdutoSelect.innerHTML = '<option value="">Selecione um Produto</option>';
            estoqueProducts.forEach(prod => {
                const option = document.createElement('option');
                option.value = prod.id; // O valor é o ID do produto do estoque
                option.textContent = prod.produto; // O texto visível é o nome do produto
                itemProdutoSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar produtos do estoque:', error);
            itemProdutoSelect.innerHTML = '<option value="">Erro ao carregar produtos</option>';
            itemProdutoSelect.disabled = true;
        }
    }

    // Calcula valor total ao mudar quantidade ou valor unitário no formulário de associação
    function calculateProductAssocTotal() {
        const quantidade = parseFloat(quantidadeProdutoInput.value) || 0;
        const valorUnitario = parseFloat(valorUnitarioProdutoInput.value) || 0;
        valorTotalProdutoAssocInput.value = (quantidade * valorUnitario).toFixed(2);
    }

    // --- Funções de Pesquisa de Cliente ---

    // Renderiza os detalhes de um cliente (ou múltiplos, se for pesquisa por nome)
    function renderClientDetails(clients) {
        clientDetailsContent.innerHTML = '';
        if (clients.length === 0) {
            clientDetailsContent.innerHTML = '<p>Nenhum cliente encontrado.</p>';
            clientActionsSection.style.display = 'none';
            currentSelectedClient = null;
            return;
        }

        // Se mais de um cliente for encontrado (pesquisa por nome), lista-os.
        // Ações de associar produto só funcionam com um cliente selecionado.
        if (clients.length > 1) {
            clientDetailsContent.innerHTML = '<h3>Múltiplos Clientes Encontrados:</h3>';
            clients.forEach(client => {
                const clientDiv = document.createElement('div');
                clientDiv.className = 'client-info';
                clientDiv.innerHTML = `
                    <p><strong>ID:</strong> ${client.id}</p>
                    <p><strong>Nome:</strong> ${client.nomeCliente}</p>
                    <p><strong>Telefone:</strong> ${client.telefone}</p>
                    <p><strong>CPF:</strong> ${client.cpf}</p>
                    <p><strong>Dívida Geral:</strong> R$ ${client.divida.toFixed(2)}</p>
                    <button class="select-client-btn" data-client-id="${client.id}">Selecionar para ver produtos</button>
                    <hr>
                `;
                clientDetailsContent.appendChild(clientDiv);
                clientDiv.querySelector('.select-client-btn').addEventListener('click', () => selectClientForDetails(client));
            });
            clientActionsSection.style.display = 'none'; // Esconde seção de ações se múltiplos
            currentSelectedClient = null;
            return;
        }

        // Se apenas um cliente for encontrado, exibe os detalhes e mostra a seção de ações
        const client = clients[0];
        currentSelectedClient = client; // Define o cliente selecionado
        
        clientDetailsContent.innerHTML = `
            <div class="client-info">
                <p><strong>ID:</strong> ${client.id}</p>
                <p><strong>Nome:</strong> ${client.nomeCliente}</p>
                <p><strong>Telefone:</strong> ${client.telefone}</p>
                <p><strong>CPF:</strong> ${client.cpf}</p>
                <p><strong>Dívida Geral:</strong> R$ ${client.divida.toFixed(2)}</p>
                <button class="edit-client-btn" data-client='${JSON.stringify(client)}'>Editar Cliente</button>
                <button class="delete-client-btn" data-client-id="${client.id}">Excluir Cliente</button>
            </div>
            <hr>
        `;
        clientActionsSection.style.display = 'flex'; // Exibe a seção de ações
        clientDetailsContent.querySelector('.edit-client-btn').addEventListener('click', (e) => {
            const clientData = JSON.parse(e.target.dataset.client);
            window.location.href = `cadastro.html?id=${clientData.id}&nome=${encodeURIComponent(clientData.nomeCliente)}&telefone=${encodeURIComponent(clientData.telefone)}&cpf=${encodeURIComponent(clientData.cpf)}&divida=${clientData.divida}`;
        });
        clientDetailsContent.querySelector('.delete-client-btn').addEventListener('click', () => deleteClient(client.id));

        fetchClientAssociatedProducts(client.id); // Carrega os produtos associados a este cliente
    }

    // Função para selecionar um cliente da lista de múltiplos
    function selectClientForDetails(client) {
        renderClientDetails([client]); // Renderiza como se fosse um único cliente encontrado
    }

    // Função genérica de pesquisa
    async function searchClients(type, query) {
        searchResultMessage.textContent = '';
        clientDetailsContent.innerHTML = '<p>Pesquisando...</p>';
        clientActionsSection.style.display = 'none'; // Esconde enquanto pesquisa
        clearAssociatedProductsTable("Carregando produtos...");

        if (!query) {
            searchResultMessage.style.color = 'orange';
            searchResultMessage.textContent = 'Por favor, digite um valor para pesquisar.';
            clientDetailsContent.innerHTML = '<p>Nenhum cliente selecionado para exibir detalhes.</p>';
            return;
        }

        try {
            let response;
            if (type === 'cpf') {
                if (query.length !== 11) {
                    searchResultMessage.style.color = 'orange';
                    searchResultMessage.textContent = 'CPF deve ter 11 dígitos.';
                    clientDetailsContent.innerHTML = '<p>Nenhum cliente selecionado para exibir detalhes.</p>';
                    return;
                }
                response = await fetch(`${API_CLIENTES_URL}/cpf/${query}`);
            } else if (type === 'nome') {
                response = await fetch(`${API_CLIENTES_URL}/nome/${encodeURIComponent(query)}`);
            } else {
                throw new Error('Tipo de pesquisa inválido.');
            }

            if (!response.ok) {
                if (response.status === 404) {
                    searchResultMessage.style.color = 'red';
                    searchResultMessage.textContent = `Nenhum cliente encontrado com ${type === 'cpf' ? 'o CPF' : 'o nome'} "${query}".`;
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                renderClientDetails([]); // Exibe vazio
                return;
            }

            const clients = await response.json(); // Pode ser um objeto (cpf) ou um array (nome)
            const clientsArray = Array.isArray(clients) ? clients : [clients]; // Garante que seja um array
            
            searchResultMessage.style.color = 'green';
            searchResultMessage.textContent = `${clientsArray.length} cliente(s) encontrado(s).`;
            renderClientDetails(clientsArray);

        } catch (error) {
            console.error(`Erro ao pesquisar cliente por ${type}:`, error);
            searchResultMessage.style.color = 'red';
            searchResultMessage.textContent = `Erro ao pesquisar cliente: ${error.message}`;
            renderClientDetails([]); // Exibe vazio
        }
    }

    // --- Funções de Associação de Produtos ---

    // Lida com a seleção de um produto no dropdown e preenche o valor unitário
    itemProdutoSelect.addEventListener('change', () => {
        const selectedProductId = itemProdutoSelect.value;
        const selectedProduct = estoqueProducts.find(p => String(p.id) === selectedProductId); // Comparar como string

        if (selectedProduct) {
            valorUnitarioProdutoInput.value = selectedProduct.precoDeVenda.toFixed(2);
        } else {
            valorUnitarioProdutoInput.value = '';
        }
        calculateProductAssocTotal();
    });

    quantidadeProdutoInput.addEventListener('input', calculateProductAssocTotal);
    valorUnitarioProdutoInput.addEventListener('input', calculateProductAssocTotal);


    // Adicionar produto ao cliente selecionado
    addProductToClientBtn.addEventListener('click', async () => {
        if (!currentSelectedClient) {
            alert('Por favor, pesquise e selecione um cliente primeiro.');
            return;
        }

        const produtoId = itemProdutoSelect.value;
        const quantidade = parseInt(quantidadeProdutoInput.value);
        const valorUnitario = parseFloat(valorUnitarioProdutoInput.value);

        if (!produtoId || isNaN(quantidade) || quantidade <= 0 || isNaN(valorUnitario) || valorUnitario <= 0) {
            alert('Preencha o produto, quantidade (deve ser > 0) e valor unitário (deve ser > 0) corretamente.');
            return;
        }

        const productAssocData = {
            cliente_id: currentSelectedClient.id,
            produto_id: parseInt(produtoId),
            quantidade_vendida: quantidade,
            valor_unitario_vendido: valorUnitario
        };

        try {
            const response = await fetch(API_CLIENTE_PRODUTOS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productAssocData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            alert('Produto associado ao cliente com sucesso!');
            // Limpa o formulário de associação de produto
            itemProdutoSelect.value = '';
            quantidadeProdutoInput.value = '1';
            valorUnitarioProdutoInput.value = '';
            valorTotalProdutoAssocInput.value = '';
            
            // Recarrega a lista de produtos associados para o cliente atual
            fetchClientAssociatedProducts(currentSelectedClient.id);

        } catch (error) {
            console.error('Erro ao associar produto:', error);
            alert('Erro ao associar produto: ' + error.message);
        }
    });

    // --- Funções para Listar Produtos Associados ---

    // Busca e exibe os produtos associados a um cliente
    async function fetchClientAssociatedProducts(clienteId) {
        clearAssociatedProductsTable("Carregando produtos associados...");
        try {
            const response = await fetch(`${API_CLIENTES_URL}/${clienteId}/produtos`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const products = await response.json();
            renderClientAssociatedProducts(products);
        } catch (error) {
            console.error('Erro ao buscar produtos associados:', error);
            clearAssociatedProductsTable(`Erro ao carregar produtos: ${error.message}`);
        }
    }

    // Renderiza a tabela de produtos associados
    function renderClientAssociatedProducts(products) {
        clientAssociatedProductsBody.innerHTML = '';
        if (products.length === 0) {
            clearAssociatedProductsTable();
            return;
        }

        products.forEach(prod => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${prod.id}</td>
                <td>${prod.nome_produto_estoque}</td>
                <td>${prod.quantidade_vendida}</td>
                <td>${prod.valor_unitario_vendido.toFixed(2)}</td>
                <td>${prod.valor_total_item.toFixed(2)}</td>
                <td>${new Date(prod.data_venda).toLocaleDateString()}</td>
                <td><button class="delete-item-btn" data-assoc-id="${prod.id}">Excluir</button></td>
            `;
            clientAssociatedProductsBody.appendChild(row);
            row.querySelector('.delete-item-btn').addEventListener('click', () => deleteClientProduct(prod.id));
        });
    }

    // Deletar associação de produto
    async function deleteClientProduct(assocId) {
        if (confirm('Tem certeza que deseja excluir esta associação de produto do cliente?')) {
            try {
                const response = await fetch(`${API_CLIENTE_PRODUTOS_URL}/${assocId}`, {
                    method: 'DELETE'
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                alert('Produto desassociado com sucesso!');
                fetchClientAssociatedProducts(currentSelectedClient.id); // Recarrega a lista
            } catch (error) {
                console.error('Erro ao desassociar produto:', error);
                alert('Erro ao desassociar produto: ' + error.message);
            }
        }
    }

    // --- Event Listeners Principais (Pesquisa) ---
    searchCpfBtn.addEventListener('click', () => searchClients('cpf', searchCpfInput.value.trim()));
    searchNameBtn.addEventListener('click', () => searchClients('nome', searchNameInput.value.trim()));

    // --- Inicialização ---
    populateItemProdutoSelect(); // Popula o dropdown de produtos
    clearAssociatedProductsTable(); // Limpa a tabela de produtos associados inicialmente
});