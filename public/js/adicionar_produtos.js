document.addEventListener('DOMContentLoaded', () => {
    const API_CLIENTES_URL = 'http://localhost:3000/api/clientes';
    const API_PRODUTOS_REGISTRADOS_URL = 'http://localhost:3000/api/produtos-registrados';

    // Campos do Cliente
    const cpfClienteProdutoInput = document.getElementById('cpfClienteProduto');
    const nomeClienteExibicaoInput = document.getElementById('nomeClienteExibicao');
    const telefoneClienteExibicaoInput = document.getElementById('telefoneClienteExibicao');
    const clientStatusMessage = document.getElementById('clientStatusMessage');

    // Campos do Produto
    const nomeItemInput = document.getElementById('nomeItem');
    const quantidadeItemInput = document.getElementById('quantidadeItem');
    const valorUnitarioItemInput = document.getElementById('valorUnitarioItem');
    const valorTotalItemInput = document.getElementById('valorTotalItem');
    
    const addProdutoBtn = document.getElementById('addProdutoBtn');
    const produtosRegistradosBody = document.getElementById('produtosRegistradosBody');

    let currentClientId = null; // Armazena o ID do cliente encontrado

    // --- Funções de Lógica ---

    // Função para buscar cliente por CPF
    async function searchClientByCpf() {
        const cpf = cpfClienteProdutoInput.value.trim();
        clientStatusMessage.textContent = ''; // Limpa mensagens anteriores
        nomeClienteExibicaoInput.value = '';
        telefoneClienteExibicaoInput.value = '';
        currentClientId = null;

        if (!cpf || cpf.length !== 11) { // Considerando CPF com 11 dígitos
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
            currentClientId = client.id; // Guarda o ID do cliente para uso posterior
            
        } catch (error) {
            console.error('Erro ao pesquisar cliente:', error);
            clientStatusMessage.style.color = 'red';
            clientStatusMessage.textContent = `Erro ao pesquisar cliente: ${error.message}`;
        }
    }

    // Função para calcular o valor total
    function calculateValorTotal() {
        const quantidade = parseFloat(quantidadeItemInput.value) || 0;
        const valorUnitario = parseFloat(valorUnitarioItemInput.value) || 0;
        const valorTotal = quantidade * valorUnitario;
        valorTotalItemInput.value = valorTotal.toFixed(2);
    }

    // Função para registrar o produto/venda
    addProdutoBtn.addEventListener('click', async () => {
        const cpfCliente = cpfClienteProdutoInput.value.trim(); // Usamos o CPF do campo de input
        const nomeItem = nomeItemInput.value.trim();
        const quantidade = parseInt(quantidadeItemInput.value);
        const valorUnitario = parseFloat(valorUnitarioItemInput.value);

        if (!cpfCliente || !nomeItem || isNaN(quantidade) || quantidade <= 0 || isNaN(valorUnitario) || valorUnitario <= 0) {
            alert('Por favor, preencha todos os campos do cliente e do produto corretamente (Quantidade e Valor Unitário > 0).');
            return;
        }

        // Não usamos currentClientId diretamente aqui, pois o backend fará a busca pelo CPF
        // Isso evita problemas se o usuário mudar o CPF depois de ter sido encontrado.
        const productData = { cpfCliente, nome_item: nomeItem, quantidade, valor_unitario: valorUnitario };

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
            clearForm();
            await fetchProdutosRegistrados(); // Recarrega a tabela de produtos registrados
        } catch (error) {
            console.error('Erro ao registrar produto/venda:', error);
            alert('Erro ao registrar produto/venda: ' + error.message);
        }
    });

    // Função para limpar o formulário
    function clearForm() {
        cpfClienteProdutoInput.value = '';
        nomeClienteExibicaoInput.value = '';
        telefoneClienteExibicaoInput.value = '';
        clientStatusMessage.textContent = '';
        nomeItemInput.value = '';
        quantidadeItemInput.value = '1'; // Reseta para 1
        valorUnitarioItemInput.value = '';
        valorTotalItemInput.value = '';
        currentClientId = null;
    }

    // --- Funções para a Tabela de Produtos Registrados ---

    async function fetchProdutosRegistrados() {
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
                <td>${prod.nomeCliente} (${prod.cpf})</td>
                <td>${prod.nome_item}</td>
                <td>${prod.quantidade}</td>
                <td>${prod.valor_unitario.toFixed(2)}</td>
                <td>${prod.valor_total.toFixed(2)}</td>
                <td>${new Date(prod.data_registro).toLocaleString()}</td>
            `;
            // Não há botões de editar/excluir nesta tabela por enquanto
            produtosRegistradosBody.appendChild(row);
        });
    }


    // --- Event Listeners ---

    // Ao digitar no CPF do cliente, tenta buscar
    cpfClienteProdutoInput.addEventListener('input', searchClientByCpf);
    // Ou ao sair do campo (blur) para uma busca mais "final"
    cpfClienteProdutoInput.addEventListener('blur', searchClientByCpf);

    // Ao alterar quantidade ou valor unitário, recalcula o total
    quantidadeItemInput.addEventListener('input', calculateValorTotal);
    valorUnitarioItemInput.addEventListener('input', calculateValorTotal);

    // --- Inicialização ---
    fetchProdutosRegistrados(); // Carrega os produtos registrados ao carregar a página
});