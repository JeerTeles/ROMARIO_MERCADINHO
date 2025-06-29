document.addEventListener('DOMContentLoaded', () => {
    const API_CLIENTES_URL = 'http://localhost:3000/api/clientes';
    const API_ESTOQUE_LIST_URL = 'http://localhost:3000/api/estoque/list-for-select';
    const API_CLIENTES_ITENS_URL_BASE = 'http://localhost:3000/api/clientes';

    // Elementos de Pesquisa
    const searchCpfInput = document.getElementById('searchCpf');
    const searchCpfBtn = document.getElementById('searchCpfBtn');
    const searchNameInput = document.getElementById('searchName');
    const searchNameBtn = document.getElementById('searchNameBtn');
    const searchResultMessage = document.getElementById('searchResultMessage');

    // Elementos de Detalhes do Cliente Encontrado
    const clientDetailsContent = document.getElementById('clientDetailsContent');
    const clientActionsSection = document.getElementById('clientActionsSection');
    
    // Elementos para Associar Produto
    const addProductSection = document.getElementById('addProductSection'); // A seção do formulário de adição (invisível por padrão)
    const itemProdutoSelect = document.getElementById('itemProdutoSelect');
    const quantidadeProdutoInput = document.getElementById('quantidadeProduto');
    const valorUnitarioProdutoInput = document.getElementById('valorUnitarioProduto');
    const valorTotalProdutoAssocInput = document.getElementById('valorTotalProdutoAssoc');
    const addProductToClientBtn = document.getElementById('addProductToClientBtn');

    // Elementos da Tabela de Produtos Associados ao Cliente
    const clientAssociatedProductsBody = document.getElementById('clientAssociatedProductsBody');
    const toggleAddProductFormBtn = document.getElementById('toggleAddProductFormBtn'); // Botão de alternância

    let currentSelectedClient = null;
    let estoqueProductsCache = [];

    // --- Funções de Inicialização e Utilitários ---

    function clearAssociatedProductsTable(message = "Nenhum produto associado.") {
        clientAssociatedProductsBody.innerHTML = `<tr><td colspan="6">${message}</td></tr>`;
    }

    async function populateItemProdutoSelect() {
        try {
            const response = await fetch(API_ESTOQUE_LIST_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            estoqueProductsCache = await response.json();

            itemProdutoSelect.innerHTML = '<option value="">Selecione um Produto</option>';
            estoqueProductsCache.forEach(prod => {
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

    function calculateProductAssocTotal() {
        const quantidade = parseFloat(quantidadeProdutoInput.value) || 0;
        const valorUnitario = parseFloat(valorUnitarioProdutoInput.value) || 0;
        valorTotalProdutoAssocInput.value = (quantidade * valorUnitario).toFixed(2);
    }

    // --- Funções de Pesquisa de Cliente ---

    function renderClientDetails(clients) {
        clientDetailsContent.innerHTML = '';
        if (clients.length === 0) {
            clientDetailsContent.innerHTML = '<p>Nenhum cliente encontrado.</p>';
            clientActionsSection.style.display = 'none';
            currentSelectedClient = null;
            return;
        }

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
                    <button class="select-client-btn">Selecionar para ver produtos</button>
                    <hr>
                `;
                clientDetailsContent.appendChild(clientDiv);
                clientDiv.querySelector('.select-client-btn').addEventListener('click', () => selectClientForDetails(client));
            });
            clientActionsSection.style.display = 'none';
            currentSelectedClient = null;
            return;
        }

        const client = clients[0];
        currentSelectedClient = client;
        
        let clientHtml = `
            <div class="client-info">
                <p><strong>ID:</strong> ${client.id}</p>
                <p><strong>Nome:</strong> ${client.nomeCliente}</p>
                <p><strong>Telefone:</strong> ${client.telefone}</p>
                <p><strong>CPF:</strong> ${client.cpf}</p>
                <p><strong>Dívida Geral:</strong> R$ ${client.divida.toFixed(2)}</p>
        `;

        let associatedItems = [];
        try {
            associatedItems = JSON.parse(client.itens_associados || '[]');
        } catch (e) {
            console.error("Erro ao parsear itens_associados do cliente:", e);
        }

        if (associatedItems.length > 0) {
            clientHtml += `
                <div class="associated-items-details">
                    <p><strong>Itens Associados:</strong></p>
                    <ul>
            `;
            associatedItems.forEach(item => {
                const itemTotal = (item.quantidade * item.preco_venda_unitario).toFixed(2);
                clientHtml += `
                    <li>
                        ${item.nome} (Qtd: ${item.quantidade}) - R$ ${item.preco_venda_unitario.toFixed(2)}/un - Total: R$ ${itemTotal}
                    </li>
                `;
            });
            clientHtml += `
                    </ul>
                </div>
            `;
        } else {
            clientHtml += `<p><strong>Itens Associados:</strong> Nenhum item associado.</p>`;
        }

        // NOVO BOTÃO "Adicionar Item ao Cliente" AQUI
        clientHtml += `
                <button id="addItemToClientDirectBtn" style="background-color: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Adicionar Item ao Cliente</button>
                <button class="delete-client-btn" data-client-id="${client.id}">Excluir Cliente</button>
            </div>
            <hr>
        `;

        clientDetailsContent.innerHTML = clientHtml;
        clientActionsSection.style.display = 'flex';

        // Adiciona event listener ao NOVO BOTÃO
        const addItemToClientDirectBtn = document.getElementById('addItemToClientDirectBtn');
        if (addItemToClientDirectBtn) {
            addItemToClientDirectBtn.addEventListener('click', () => {
                if (currentSelectedClient) {
                    // Exibe o formulário de adição de produto e rola a tela
                    addProductSection.style.display = 'block';
                    addProductSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    toggleAddProductFormBtn.textContent = '- Esconder Formulário'; // Ajusta o texto do botão de toggle inferior
                } else {
                    alert('Nenhum cliente selecionado.');
                }
            });
        }
        
        clientDetailsContent.querySelector('.delete-client-btn').addEventListener('click', () => deleteClient(client.id));

        renderClientAssociatedProducts(associatedItems); // Renderiza a tabela de baixo com os itens associados
        
    }

    function selectClientForDetails(client) {
        renderClientDetails([client]);
    }

    async function searchClients(type, query) {
        searchResultMessage.textContent = '';
        clientDetailsContent.innerHTML = '<p>Pesquisando...</p>';
        clientActionsSection.style.display = 'none';
        clearAssociatedProductsTable("Carregando produtos...");
        addProductSection.style.display = 'none'; // Esconde o formulário de adição ao iniciar nova pesquisa
        toggleAddProductFormBtn.textContent = '+ Adicionar Item'; // Reseta o texto do botão de alternância

        if (!query) {
            searchResultMessage.style.color = 'orange';
            searchResultMessage.textContent = 'Por favor, digite um valor para pesquisar.';
            clientDetailsContent.innerHTML = '<p>Nenhum cliente selecionado para exibir detalhes.</p>';
            return;
        }

        try {
            let response;
            let url;

            if (type === 'cpf') {
                if (query.length !== 11) {
                    searchResultMessage.style.color = 'orange';
                    searchResultMessage.textContent = 'CPF deve ter 11 dígitos.';
                    return;
                }
                url = `${API_CLIENTES_URL}/cpf/${query}`;
            } else if (type === 'nome') {
                url = `${API_CLIENTES_URL}/nome/${encodeURIComponent(query)}`;
            } else {
                throw new Error('Tipo de pesquisa inválido.');
            }

            response = await fetch(url);

            if (!response.ok) {
                if (response.status === 404) {
                    searchResultMessage.style.color = 'red';
                    searchResultMessage.textContent = `Nenhum cliente encontrado com ${type === 'cpf' ? 'o CPF' : 'o nome'} "${query}".`;
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                renderClientDetails([]);
                return;
            }

            const clients = await response.json();
            const clientsArray = Array.isArray(clients) ? clients : [clients];
            
            searchResultMessage.style.color = 'green';
            searchResultMessage.textContent = `${clientsArray.length} cliente(s) encontrado(s).`;
            renderClientDetails(clientsArray);

        } catch (error) {
            console.error(`Erro ao pesquisar cliente por ${type}:`, error);
            searchResultMessage.style.color = 'red';
            searchResultMessage.textContent = `Erro ao pesquisar cliente: ${error.message}`;
            renderClientDetails([]);
        }
    }

    async function deleteClient(id) {
        const password = prompt("Para EXCLUIR, por favor, insira a senha de administrador (Padrão: 123456):");
        if (!password) {
            alert("Exclusão cancelada. Senha não fornecida.");
            return;
        }

        try {
            const verifyResponse = await fetch('http://localhost:3000/api/admin/verify-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password })
            });

            if (!verifyResponse.ok) {
                const errorData = await verifyResponse.json();
                throw new Error(errorData.message || `HTTP error! status: ${verifyResponse.status}`);
            }

            if (confirm('Tem certeza que deseja excluir este cliente? Isso removerá também todas as suas associações de produtos.')) {
                const response = await fetch(`${API_CLIENTES_URL}/${id}`, {
                    method: 'DELETE'
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                alert('Cliente excluído com sucesso!');
                searchCpfInput.value = '';
                searchNameInput.value = '';
                searchResultMessage.textContent = '';
                clientDetailsContent.innerHTML = '<p>Nenhum cliente selecionado para exibir detalhes.</p>';
                clientActionsSection.style.display = 'none';
                currentSelectedClient = null;
            }
        } catch (error) {
            console.error('Erro na verificação da senha ou exclusão:', error);
            alert('Falha na exclusão: ' + error.message + '\nPor favor, tente novamente.');
        }
    }


    // --- Funções de Associação de Produtos (com a nova estrutura de itens_associados) ---

    itemProdutoSelect.addEventListener('change', () => {
        const selectedProductId = itemProdutoSelect.value;
        const selectedProduct = estoqueProductsCache.find(p => String(p.id) === selectedProductId);

        if (selectedProduct) {
            valorUnitarioProdutoInput.value = selectedProduct.precoDeVenda.toFixed(2);
        } else {
            valorUnitarioProdutoInput.value = '';
        }
        calculateProductAssocTotal();
    });

    quantidadeProdutoInput.addEventListener('input', calculateProductAssocTotal);
    valorUnitarioProdutoInput.addEventListener('input', calculateProductAssocTotal);


    addProductToClientBtn.addEventListener('click', async () => {
        if (!currentSelectedClient) {
            alert('Por favor, pesquise e selecione um cliente primeiro.');
            return;
        }

        const produtoId = itemProdutoSelect.value;
        const quantidade = parseInt(quantidadeProdutoInput.value);
        
        if (!produtoId || isNaN(quantidade) || quantidade <= 0) {
            alert('Preencha o Produto e a Quantidade (> 0) corretamente.');
            return;
        }

        try {
            const response = await fetch(`${API_CLIENTES_ITENS_URL_BASE}/${currentSelectedClient.id}/itens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ produto_id: parseInt(produtoId), quantidade: quantidade })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            alert('Item adicionado ao cliente com sucesso!');
            itemProdutoSelect.value = '';
            quantidadeProdutoInput.value = '1';
            valorUnitarioProdutoInput.value = '';
            valorTotalProdutoAssocInput.value = '';

            // Recarrega os detalhes do cliente para que a lista de itens_associados seja atualizada
            await searchClients('cpf', currentSelectedClient.cpf);

        } catch (error) {
            console.error('Erro ao adicionar item ao cliente:', error);
            alert('Erro ao adicionar item: ' + error.message);
        }
    });

    function renderClientAssociatedProducts(productsArray) {
        clientAssociatedProductsBody.innerHTML = '';
        if (!productsArray || productsArray.length === 0) {
            clearAssociatedProductsTable();
            return;
        }

        productsArray.forEach(prod => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${prod.id}</td>
                <td>${prod.nome}</td>
                <td>${prod.quantidade}</td>
                <td>${prod.preco_venda_unitario.toFixed(2)}</td>
                <td>${(prod.quantidade * prod.preco_venda_unitario).toFixed(2)}</td>
                <td><button class="delete-item-btn" data-item-id-in-array="${prod.id}">Excluir</button></td>
            `;
            clientAssociatedProductsBody.appendChild(row);
            row.querySelector('.delete-item-btn').addEventListener('click', (e) => {
                const itemIdInArray = parseInt(e.target.dataset.itemIdInArray);
                deleteClientItem(currentSelectedClient.id, itemIdInArray);
            });
        });
    }

    async function deleteClientItem(clientId, itemIdInArray) {
        if (confirm('Tem certeza que deseja remover este item da lista do cliente?')) {
            try {
                const response = await fetch(`${API_CLIENTES_ITENS_URL_BASE}/${clientId}/itens/${itemIdInArray}`, {
                    method: 'DELETE'
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }
                alert('Item removido com sucesso!');
                await searchClients('cpf', currentSelectedClient.cpf);
            } catch (error) {
                console.error('Erro ao remover item do cliente:', error);
                alert('Erro ao remover item: ' + error.message);
            }
        }
    }


    // --- Event Listeners Principais (Pesquisa) ---
    searchCpfBtn.addEventListener('click', () => searchClients('cpf', searchCpfInput.value.trim()));
    searchNameBtn.addEventListener('click', () => searchClients('nome', searchNameInput.value.trim()));

    // --- NOVO Event Listener para o botão "Adicionar Item ao Cliente" direto nos detalhes ---
    // Este listener é adicionado DENTRO de renderClientDetails, pois o botão é criado dinamicamente lá.
    // O botão existente no HTML (`toggleAddProductFormBtn`) continua a funcionar como um toggle para a seção.


    // --- Event Listener para o botão de toggle (do lado da tabela de itens associados) ---
    toggleAddProductFormBtn.addEventListener('click', () => {
        if (addProductSection.style.display === 'none') {
            addProductSection.style.display = 'block';
            toggleAddProductFormBtn.textContent = '- Esconder Formulário';
        } else {
            addProductSection.style.display = 'none';
            toggleAddProductFormBtn.textContent = '+ Adicionar Item';
        }
    });


    // --- Inicialização ---
    populateItemProdutoSelect();
});