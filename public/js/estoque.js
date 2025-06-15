document.addEventListener('DOMContentLoaded', () => {
    const API_ESTOQUE_URL = 'http://localhost:3000/api/estoque';

    const produtoNomeInput = document.getElementById('produtoNome');
    const produtoQuantidadeInput = document.getElementById('produtoQuantidade');
    const produtoPrecoCompraInput = document.getElementById('produtoPrecoCompra');
    const produtoPrecoVendaInput = document.getElementById('produtoPrecoVenda');
    const addItemBtn = document.getElementById('addItemBtn');
    const estoqueBody = document.getElementById('estoqueBody');

    let editingItemId = null; // Armazena o ID do item de estoque sendo editado

    // Função para buscar e renderizar todos os itens do estoque
    async function fetchEstoque() {
        try {
            const response = await fetch(API_ESTOQUE_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const estoqueItems = await response.json();
            renderEstoque(estoqueItems);
        } catch (error) {
            console.error('Erro ao buscar itens do estoque:', error);
            estoqueBody.innerHTML = `<tr><td colspan="7" id="noEstoqueFound" style="color: red;">Erro ao carregar estoque: ${error.message}</td></tr>`;
        }
    }

    // Função para renderizar a tabela do estoque
    function renderEstoque(items) {
        estoqueBody.innerHTML = '';

        if (items.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 7;
            cell.id = 'noEstoqueFound';
            cell.textContent = 'Nenhum item no estoque';
            row.appendChild(cell);
            estoqueBody.appendChild(row);
            return;
        }

        items.forEach((item) => {
            const row = document.createElement('tr');

            const idCell = document.createElement('td');
            idCell.textContent = item.id;
            row.appendChild(idCell);

            const produtoCell = document.createElement('td');
            produtoCell.textContent = item.produto;
            row.appendChild(produtoCell);

            const quantidadeCell = document.createElement('td');
            quantidadeCell.textContent = item.quantidade;
            row.appendChild(quantidadeCell);

            const precoCompraCell = document.createElement('td');
            precoCompraCell.textContent = item.precoDeCompra.toFixed(2);
            row.appendChild(precoCompraCell);

            const precoVendaCell = document.createElement('td');
            precoVendaCell.textContent = item.precoDeVenda.toFixed(2);
            row.appendChild(precoVendaCell);

            const editCell = document.createElement('td');
            const editButton = document.createElement('button');
            editButton.textContent = 'Editar';
            editButton.classList.add('edit-btn');
            editButton.addEventListener('click', () => editItem(item));
            editCell.appendChild(editButton);
            row.appendChild(editCell);

            const deleteCell = document.createElement('td');
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Excluir';
            deleteButton.classList.add('delete-btn');
            deleteButton.addEventListener('click', () => deleteItem(item.id));
            deleteCell.appendChild(deleteButton);
            row.appendChild(deleteCell);

            estoqueBody.appendChild(row);
        });
    }

    // Função para adicionar ou atualizar item do estoque
    addItemBtn.addEventListener('click', async () => {
        const produto = produtoNomeInput.value.trim();
        const quantidade = parseInt(produtoQuantidadeInput.value);
        const precoDeCompra = parseFloat(produtoPrecoCompraInput.value);
        const precoDeVenda = parseFloat(produtoPrecoVendaInput.value);

        if (!produto || isNaN(quantidade) || quantidade < 0 || isNaN(precoDeCompra) || precoDeCompra < 0 || isNaN(precoDeVenda) || precoDeVenda < 0) {
            alert('Por favor, preencha todos os campos corretamente (quantidade, preços >= 0).');
            return;
        }

        const itemData = { produto, quantidade, precoDeCompra, precoDeVenda };

        try {
            let response;
            if (editingItemId === null) {
                // Adicionar novo item (POST)
                response = await fetch(API_ESTOQUE_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(itemData)
                });
            } else {
                // Atualizar item existente (PUT)
                response = await fetch(`${API_ESTOQUE_URL}/${editingItemId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(itemData)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            clearForm();
            editingItemId = null;
            addItemBtn.textContent = 'Adicionar Item ao Estoque';
            alert('Operação realizada com sucesso!');
            await fetchEstoque(); // Recarrega a tabela após a operação

        } catch (error) {
            console.error('Erro ao salvar item do estoque:', error);
            alert('Erro ao salvar item do estoque: ' + error.message);
        }
    });

    // Função para preencher o formulário para edição
    function editItem(item) {
        produtoNomeInput.value = item.produto;
        produtoQuantidadeInput.value = item.quantidade;
        produtoPrecoCompraInput.value = item.precoDeCompra;
        produtoPrecoVendaInput.value = item.precoDeVenda;
        addItemBtn.textContent = 'Salvar Edição';
        editingItemId = item.id;
    }

    // Função para excluir um item do estoque
    async function deleteItem(id) {
        if (confirm('Tem certeza que deseja excluir este item do estoque?')) {
            try {
                const response = await fetch(`${API_ESTOQUE_URL}/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                alert('Item excluído com sucesso!');
                if (editingItemId === id) {
                    clearForm();
                    editingItemId = null;
                    addItemBtn.textContent = 'Adicionar Item ao Estoque';
                }
                await fetchEstoque(); // Recarrega a tabela após a exclusão
            } catch (error) {
                console.error('Erro ao excluir item do estoque:', error);
                alert('Erro ao excluir item do estoque: ' + error.message);
            }
        }
    }

    // Função para limpar o formulário
    function clearForm() {
        produtoNomeInput.value = '';
        produtoQuantidadeInput.value = '';
        produtoPrecoCompraInput.value = '';
        produtoPrecoVendaInput.value = '';
    }

    // Carrega os itens do estoque ao iniciar a página
    fetchEstoque();
});