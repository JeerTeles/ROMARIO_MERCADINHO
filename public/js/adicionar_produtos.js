document.addEventListener('DOMContentLoaded', () => {
    const API_CLIENTES_URL = 'http://localhost:3000/api/clientes';
    const API_PRODUTOS_REGISTRADOS_URL = 'http://localhost:3000/api/produtos-registrados';
    const API_ESTOQUE_LIST_URL = 'http://localhost:3000/api/estoque/list-for-select'; // Rota para listar produtos (id, nome)
    const API_ESTOQUE_GET_ONE_URL = 'http://localhost:3000/api/estoque/'; // Para buscar preço de venda

    // Campos do Cliente
    const cpfClienteProdutoInput = document.getElementById('cpfClienteProduto');
    const nomeClienteExibicaoInput = document.getElementById('nomeClienteExibicao');
    const telefoneClienteExibicaoInput = document.getElementById('telefoneClienteExibicao');
    const clientStatusMessage = document.getElementById('clientStatusMessage');

    // Campos do Produto (agora com select)
    const itemProdutoSelect = document.getElementById('itemProdutoSelect'); // NOVO SELECT
    const quantidadeItemInput = document.getElementById('quantidadeItem');
    const valorUnitarioItemInput = document.getElementById('valorUnitarioItem');
    const valorTotalItemInput = document.getElementById('valorTotalItem');
    
    const addProdutoBtn = document.getElementById('addProdutoBtn');
    const produtosRegistradosBody = document.getElementById('produtosRegistradosBody');

    let currentClientId = null; // Armazena o ID do cliente encontrado
    let estoqueProductsCache = []; // Para armazenar todos os produtos do estoque

    // --- Funções de Lógica ---

    // Função para buscar cliente por CPF
    async function searchClientByCpf() { /* ... (mantido igual) ... */
        const cpf = cpfClienteProdutoInput.value.trim();
        clientStatusMessage.textContent = '';
        nomeClienteExibicaoInput.value = '';
        telefoneClienteExibicaoInput.value = '';
        currentClientId = null;

        if (!cpf || cpf.length !== 11) {
            clientStatusMessage.style.color = 'orange';
            clientStatusMessage.textContent = 'Digite um CPF válido (11 dígitos).';
            return;
        }

        try {
            const response = await fetch(`${API_CLIENTES_URL}/cpf/${cpf}`);
            if (!response.ok) {
                if (response.status === 404) {
                    clientStatusMessage.style.color = 'red';
                    clientStatusMessage.textContent = `Cliente com CPF "${cpf}" não encontrado. Cadastre-o primeiro.`;
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                return;
            }

            const client = await response.json();
            nomeClienteExibicaoInput.value = client.nomeCliente;
            telefoneClienteExibicaoInput.value = client.telefone;
            clientStatusMessage.style.color = 'green';
            clientStatusMessage.textContent = `Cliente "${client.nomeCliente}" encontrado.`;
            currentClientId = client.id;
            
        } catch (error) {
            console.error('Erro ao pesquisar cliente:', error);
            clientStatusMessage.style.color = 'red';
            clientStatusMessage.textContent = `Erro ao pesquisar cliente: ${error.message}`;
        }
    }

    // --- NOVA FUNÇÃO: Carrega produtos do estoque para popular o select ---
    async function populateProductSelect() {
        try {
            const response = await fetch(API_ESTOQUE_LIST_URL); // Busca ID e Produto
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            estoqueProductsCache = await response.json(); // Armazena em cache

            itemProdutoSelect.innerHTML = '<option value="">Selecione um Produto</option>';
            estoqueProductsCache.forEach(prod => {
                const option = document.createElement('option');
                option.value = prod.id; // O valor da opção é o ID do produto
                option.textContent = prod.produto; // O texto visível é o nome do produto
                itemProdutoSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar produtos para seleção:', error);
            itemProdutoSelect.innerHTML = '<option value="">Erro ao carregar produtos</option>';
            itemProdutoSelect.disabled = true;
        }
    }

    // --- NOVO Event Listener para o SELECT de Produto ---
    itemProdutoSelect.addEventListener('change', () => {
        const selectedProductId = itemProdutoSelect.value;
        const selectedProduct = estoqueProductsCache.find(p => String(p.id) === selectedProductId); // Encontra o produto no cache

        if (selectedProduct) {
            valorUnitarioItemInput.value = selectedProduct.precoDeVenda.toFixed(2); // Preenche preço de venda
        } else {
            valorUnitarioItemInput.value = ''; // Limpa se nada selecionado ou opção inválida
        }
        calculateValorTotal(); // Recalcula o total
    });


    // Função para calcular o valor total
    function calculateValorTotal() {
        const quantidade = parseFloat(quantidadeItemInput.value) || 0;
        const valorUnitario = parseFloat(valorUnitarioItemInput.value) || 0; // Pega do campo readonly
        valorTotalItemInput.value = (quantidade * valorUnitario).toFixed(2);
    }

    // Event listeners para recalcular total
    quantidadeItemInput.addEventListener('input', calculateValorTotal);
    // valorUnitarioItemInput não precisa de event listener direto, pois é readonly e preenchido pelo select

    // Função para registrar o produto/venda
    addProdutoBtn.addEventListener('click', async () => {
        const cpfCliente = cpfClienteProdutoInput.value.trim();
        const produtoIdEstoque = itemProdutoSelect.value; // Pega o ID do produto selecionado
        const quantidade = parseInt(quantidadeItemInput.value);
        const valorUnitario = parseFloat(valorUnitarioItemInput.value); // Pega o valor do campo readonly

        if (!cpfCliente || !produtoIdEstoque || isNaN(quantidade) || quantidade <= 0 || isNaN(valorUnitario) || valorUnitario <= 0) {
            alert('Por favor, preencha todos os campos corretamente (CPF do Cliente, Produto, Quantidade > 0, Valor Unitário > 0).');
            return;
        }
        
        // O backend vai buscar o nome_item e valor_unitario_vendido com base no produtoIdEstoque
        const productData = { 
            cpfCliente, 
            produto_id_estoque: parseInt(produtoIdEstoque), // Envia o ID numérico para o backend
            quantidade
            // 'valor_unitario' não precisa ser enviado, o backend buscará o precoDeVenda
        };

        try {
            const response = await fetch(API_PRODUTOS_REGISTRADOS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            alert('Produto/Venda registrado com sucesso!');
            clearFormProduto();
            await fetchProdutosRegistrados(); // Recarrega a tabela de produtos registrados
        } catch (error) {
            console.error('Erro ao registrar produto/venda:', error);
            alert('Erro ao registrar produto/venda: ' + error.message);
        }
    });

    // Função para limpar APENAS os campos do formulário de produto/venda
    function clearFormProduto() {
        cpfClienteProdutoInput.value = '';
        nomeClienteExibicaoInput.value = '';
        telefoneClienteExibicaoInput.value = '';
        clientStatusMessage.textContent = '';
        itemProdutoSelect.value = ''; // Reseta o select
        quantidadeItemInput.value = '1';
        valorUnitarioItemInput.value = '';
        valorTotalItemInput.value = '';
        currentClientId = null;
    }

    // --- Funções para a Tabela de Produtos Registrados (Listagem) ---

    async function fetchProdutosRegistrados() {
        produtosRegistradosBody.innerHTML = `<tr><td colspan="7" id="noProdutoRegistradoFound">Carregando registros...</td></tr>`;
        try {
            const response = await fetch(API_PRODUTOS_REGISTRADOS_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const produtos = await response.json();
            renderProdutosRegistrados(produtos);
        } catch (error) {
            console.error('Erro ao buscar produtos registrados:', error);
            produtosRegistradosBody.innerHTML = `<tr><td colspan="7" id="noProdutoRegistradoFound" style="color: red;">Erro ao carregar registros: ${error.message}</td></tr>`;
        }
    }

    function renderProdutosRegistrados(produtos) {
        produtosRegistradosBody.innerHTML = '';

        if (produtos.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 7;
            cell.id = 'noProdutoRegistradoFound';
            cell.textContent = 'Nenhum produto registrado';
            row.appendChild(cell);
            produtosRegistradosBody.appendChild(row);
            return;
        }

        produtos.forEach((prod) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${prod.id}</td>
                <td>${prod.nomeCliente || 'N/A'} (${prod.cpf || 'N/A'})</td>
                <td>${prod.nome_item}</td>
                <td>${prod.quantidade}</td>
                <td>${prod.valor_unitario.toFixed(2)}</td>
                <td>${prod.valor_total.toFixed(2)}</td>
                <td>${new Date(prod.data_registro).toLocaleString()}</td>
            `;
            produtosRegistradosBody.appendChild(row);
        });
    }

    // --- Event Listeners ---

    // Ao digitar no CPF do cliente, tenta buscar
    cpfClienteProdutoInput.addEventListener('input', searchClientByCpf);
    cpfClienteProdutoInput.addEventListener('blur', searchClientByCpf);

    // --- Inicialização ---
    populateProductSelect(); // Carrega os produtos do estoque para o select
    fetchProdutosRegistrados(); // Carrega os produtos registrados ao carregar a página
});