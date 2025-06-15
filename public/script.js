document.addEventListener('DOMContentLoaded', () => {
    const clientNameInput = document.getElementById('clientName');
    const clientPhoneInput = document.getElementById('clientPhone');
    const itemNameInput = document.getElementById('itemName');
    const itemPriceInput = document.getElementById('itemPrice');
    const totalAmountInput = document.getElementById('totalAmount');
    const addRecordBtn = document.getElementById('addRecordBtn');
    const recordsBody = document.getElementById('recordsBody');
    const noRecordFoundRow = document.getElementById('noRecordFound');

    let bills = [];
    let editingIndex = -1;

    function renderRecords() {
        recordsBody.innerHTML = '';

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

        bills.forEach((bill, index) => {
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
            editButton.addEventListener('click', () => editRecord(index));
            editCell.appendChild(editButton);
            row.appendChild(editCell);

            const deleteCell = document.createElement('td');
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Excluir';
            deleteButton.classList.add('delete-btn');
            deleteButton.addEventListener('click', () => deleteRecord(index));
            deleteCell.appendChild(deleteButton);
            row.appendChild(deleteCell);

            recordsBody.appendChild(row);
        });
    }

    function calculateTotal() {
        const price = parseFloat(itemPriceInput.value) || 0;
        totalAmountInput.value = price.toFixed(2); // Assuming total is just the price for now
    }

    itemPriceInput.addEventListener('input', calculateTotal);

    addRecordBtn.addEventListener('click', () => {
        const clientName = clientNameInput.value.trim();
        const clientPhone = clientPhoneInput.value.trim();
        const itemName = itemNameInput.value.trim();
        const itemPrice = parseFloat(itemPriceInput.value);
        const totalAmount = parseFloat(totalAmountInput.value);

        if (!clientName || !clientPhone || !itemName || isNaN(itemPrice)) {
            alert('Por favor, preencha todos os campos corretamente.');
            return;
        }

        const newBill = { clientName, clientPhone, itemName, itemPrice, totalAmount };

        if (editingIndex === -1) {
            bills.push(newBill);
        } else {
            bills.splice(editingIndex, 1, newBill);
            editingIndex = -1;
            addRecordBtn.textContent = 'Adicionar conta';
        }

        clearForm();
        renderRecords();
    });

    function editRecord(index) {
        const billToEdit = bills.at(index); // Use .at() for safer index access
        if (billToEdit) {
            clientNameInput.value = billToEdit.clientName;
            clientPhoneInput.value = billToEdit.clientPhone;
            itemNameInput.value = billToEdit.itemName;
            itemPriceInput.value = billToEdit.itemPrice;
            totalAmountInput.value = billToEdit.totalAmount;
            addRecordBtn.textContent = 'Salvar Edição';
            editingIndex = index;
        }
    }

    function deleteRecord(index) {
        if (confirm('Tem certeza que deseja excluir esta conta?')) {
            bills.splice(index, 1);
            renderRecords();
            if (editingIndex === index) {
                clearForm();
                editingIndex = -1;
                addRecordBtn.textContent = 'Adicionar conta';
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

    renderRecords();
});