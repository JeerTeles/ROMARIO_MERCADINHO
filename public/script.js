document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api/bills'; // URL da sua API de backend

    const clientNameInput = document.getElementById('clientName');
    const clientPhoneInput = document.getElementById('clientPhone');
    const itemNameInput = document.getElementById('itemName');
    const itemPriceInput = document.getElementById('itemPrice');
    const totalAmountInput = document.getElementById('totalAmount');
    const addRecordBtn = document.getElementById('addRecordBtn');
    const recordsBody = document.getElementById('recordsBody');

    let editingBillId = null; // Armazena o ID da conta sendo editada (agora do banco de dados)

    async function fetchBills() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const bills = await response.json();
            renderRecords(bills);
        } catch (error) {
            console.error('Erro ao buscar contas:', error);
            // Renderiza a mensagem de erro na tabela
            recordsBody.innerHTML = `<tr><td colspan="7" id="noRecordFound" style="color: red;">Erro ao carregar dados: ${error.message}</td></tr>`;
        }
    }

    function renderRecords(bills) {
        recordsBody.innerHTML = ''; // Limpa as linhas existentes

        if (bills.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 7;
            cell.id = 'noRecordFound';
            cell.textContent = 'Nenhuma conta adicionada';
            row.appendChild(cell);
            recordsBody.appendChild(row);
            return;
        }

        bills.forEach((bill) => { // Não precisamos mais do 'index' do array local, usamos o 'id' do DB
            const row = document.createElement('tr');

            const clientCell = document.createElement('td');
            clientCell.textContent = bill.clientName;
            row.appendChild(clientCell);

            const phoneCell = document.createElement('td');
            phoneCell.textContent = bill.clientPhone;
            row.appendChild(phoneCell);

            const itemCell = document.createElement('td');
            itemCell.textContent = bill.itemName;
            row.appendChild(itemCell);

            const priceCell = document.createElement('td');
            priceCell.textContent = bill.itemPrice;
            row.appendChild(priceCell);

            const totalCell = document.createElement('td');
            totalCell.textContent = bill.totalAmount;
            row.appendChild(totalCell);

            const editCell = document.createElement('td');
            const editButton = document.createElement('button');
            editButton.textContent = 'Editar';
            editButton.classList.add('edit-btn');
            editButton.addEventListener('click', () => editRecord(bill)); // Passa o objeto bill completo
            editCell.appendChild(editButton);
            row.appendChild(editCell);

            const deleteCell = document.createElement('td');
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Excluir';
            deleteButton.classList.add('delete-btn');
            deleteButton.addEventListener('click', () => deleteRecord(bill.id)); // Passa o ID da conta
            deleteCell.appendChild(deleteButton);
            row.appendChild(deleteCell);

            recordsBody.appendChild(row);
        });
    }

    function calculateTotal() {
        const price = parseFloat(itemPriceInput.value) || 0;
        totalAmountInput.value = price.toFixed(2);
    }

    itemPriceInput.addEventListener('input', calculateTotal);

    addRecordBtn.addEventListener('click', async () => {
        const clientName = clientNameInput.value.trim();
        const clientPhone = clientPhoneInput.value.trim();
        const itemName = itemNameInput.value.trim();
        const itemPrice = parseFloat(itemPriceInput.value);
        const totalAmount = parseFloat(totalAmountInput.value);

        if (!clientName || !clientPhone || !itemName || isNaN(itemPrice) || isNaN(totalAmount)) {
            alert('Por favor, preencha todos os campos corretamente.');
            return;
        }

        const billData = { clientName, clientPhone, itemName, itemPrice, totalAmount };

        try {
            let response;
            if (editingBillId === null) {
                // Adicionar nova conta (POST)
                response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(billData)
                });
            } else {
                // Atualizar conta existente (PUT)
                response = await fetch(`${API_URL}/${editingBillId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(billData)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            // Se a operação foi bem-sucedida, recarrega as contas do banco de dados
            clearForm();
            editingBillId = null; // Reseta o modo de edição
            addRecordBtn.textContent = 'Adicionar conta';
            await fetchBills(); // Recarrega os dados do DB
            alert('Operação realizada com sucesso!');

        } catch (error) {
            console.error('Erro ao salvar conta:', error);
            alert('Erro ao salvar conta: ' + error.message);
        }
    });

    function editRecord(bill) {
        clientNameInput.value = bill.clientName;
        clientPhoneInput.value = bill.clientPhone;
        itemNameInput.value = bill.itemName;
        itemPriceInput.value = bill.itemPrice;
        totalAmountInput.value = bill.totalAmount;
        addRecordBtn.textContent = 'Salvar Edição';
        editingBillId = bill.id; // Armazena o ID do banco de dados
    }

    async function deleteRecord(id) {
        if (confirm('Tem certeza que deseja excluir esta conta?')) {
            try {
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                alert('Conta excluída com sucesso!');
                if (editingBillId === id) { // Se a conta sendo editada for excluída
                    clearForm();
                    editingBillId = null;
                    addRecordBtn.textContent = 'Adicionar conta';
                }
                await fetchBills(); // Recarrega os dados do DB
            } catch (error) {
                console.error('Erro ao excluir conta:', error);
                alert('Erro ao excluir conta: ' + error.message);
            }
        }
    }

    function clearForm() {
        clientNameInput.value = '';
        clientPhoneInput.value = '';
        itemNameInput.value = '';
        itemPriceInput.value = '';
        totalAmountInput.value = '';
    }

    // Carrega as contas do banco de dados ao iniciar
    fetchBills();
});