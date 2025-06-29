const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Certifique-se de ter 'bcryptjs' instalado (npm install bcryptjs)

const app = express();
const PORT = 3000;
const DB_FILE = './server/database.sqlite';

// --- Função de Validação de Telefone Brasileiro (BACKEND) ---
function isValidBrazilianPhone(phone) {
    if (!phone) return false;
    const cleanedPhone = String(phone).replace(/\D/g, '');
    return (cleanedPhone.length === 10 || cleanedPhone.length === 11) && cleanedPhone !== '';
}

// Configurações do Express
app.use(express.json());
app.use(cors());

// Conecta ao banco de dados SQLite e inicializa tabelas
const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');

        // --- Criação da Tabela 'clientes' (com 'itens_associados' como TEXT JSON) ---
        db.run(`CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nomeCliente TEXT NOT NULL,
            telefone TEXT NOT NULL,
            cpf TEXT UNIQUE NOT NULL,
            divida REAL DEFAULT 0.0,
            itens_associados TEXT DEFAULT '[]' -- Armazenará um JSON array de {id_interno, produto_id, nome, quantidade, preco_venda_unitario}
        )`, (err) => {
            if (err) { console.error('Erro ao criar tabela "clientes":', err.message); } else { console.log('Tabela "clientes" criada ou já existe.'); }
        });

        // Tabela 'produtos_registrados' (para registro de vendas históricas)
        db.run(`CREATE TABLE IF NOT EXISTS produtos_registrados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            nome_item TEXT NOT NULL,
            quantidade INTEGER NOT NULL,
            valor_unitario REAL NOT NULL,
            valor_total REAL NOT NULL,
            data_registro TEXT NOT NULL,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
        )`, (err) => {
            if (err) { console.error('Erro ao criar tabela "produtos_registrados":', err.message); } else { console.log('Tabela "produtos_registrados" criada ou já existe.'); }
        });

        // Tabela 'estoque'
        db.run(`CREATE TABLE IF NOT EXISTS estoque (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto TEXT NOT NULL UNIQUE,
            quantidade INTEGER NOT NULL,
            precoDeCompra REAL NOT NULL,
            precoDeVenda REAL NOT NULL
        )`, (err) => {
            if (err) { console.error('Erro ao criar tabela "estoque":', err.message); } else { console.log('Tabela "estoque" criada ou já existe.'); }
        });

        // Tabela 'administrador'
        db.run(`CREATE TABLE IF NOT EXISTS administrador (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            senha_hash TEXT NOT NULL
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela "administrador":', err.message);
            } else {
                console.log('Tabela "administrador" criada ou já existe.');
                db.get('SELECT COUNT(*) AS count FROM administrador', (err, row) => {
                    if (err) { console.error('Erro ao verificar administrador:', err.message); return; }
                    if (row.count === 0) {
                        const defaultPassword = '123456';
                        bcrypt.hash(defaultPassword, 10, (err, hash) => {
                            if (err) { console.error('Erro ao gerar hash da senha:', err); return; }
                            db.run('INSERT INTO administrador (senha_hash) VALUES (?)', [hash], (err) => {
                                if (err) { console.error('Erro ao inserir senha padrão:', err.message); } else { console.log('Senha padrão (123456) inserida na tabela administrador.'); }
                            });
                        });
                    } else {
                        console.log('Tabela administrador já contém dados, não inserindo senha padrão.');
                    }
                });
            }
        });
    }
});

// --- Rotas da API para Clientes ---

// Obter todos os clientes com paginação (agora seleciona itens_associados)
app.get('/api/clientes', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let totalClients = 0;

    db.get('SELECT COUNT(*) AS count FROM clientes', [], (err, row) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        totalClients = row.count;

        const sql = `
            SELECT 
                id, nomeCliente, telefone, cpf, divida, itens_associados
            FROM clientes
            LIMIT ? OFFSET ?
        `;
        db.all(sql, [limit, offset], (err, rows) => {
            if (err) { res.status(500).json({ error: err.message }); return; }
            res.json({ data: rows, currentPage: page, perPage: limit, totalItems: totalClients, totalPages: Math.ceil(totalClients / limit) });
        });
    });
});

// Rota para buscar cliente por CPF (agora seleciona itens_associados)
app.get('/api/clientes/cpf/:cpf', (req, res) => {
    const cpf = req.params.cpf;
    db.get('SELECT id, nomeCliente, telefone, cpf, divida, itens_associados FROM clientes WHERE cpf = ?', [cpf], (err, row) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (!row) { res.status(404).json({ message: 'Cliente não encontrado com este CPF.' }); } else { res.json(row); }
    });
});

// Rota para buscar clientes por nome (agora seleciona itens_associados)
app.get('/api/clientes/nome/:nome', (req, res) => {
    const nome = req.params.nome;
    db.all('SELECT id, nomeCliente, telefone, cpf, divida, itens_associados FROM clientes WHERE nomeCliente LIKE ?', [`%${nome}%`], (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (rows.length === 0) { res.status(404).json({ message: 'Nenhum cliente encontrado com este nome.' }); } else { res.json(rows); }
    });
});

// Adicionar um novo cliente (define itens_associados como array JSON vazio)
app.post('/api/clientes', (req, res) => {
    let { nomeCliente, telefone, cpf, divida } = req.body;

    telefone = String(telefone).replace(/\D/g, '');
    divida = parseFloat(divida) || 0.0;
    const itens_associados = '[]'; // Padrão: array JSON vazio

    if (!nomeCliente || !telefone || !cpf) { return res.status(400).json({ error: 'Os campos obrigatórios (Nome, Telefone, CPF) são necessários.' }); }
    if (!isValidBrazilianPhone(telefone)) { return res.status(400).json({ error: 'Formato de telefone inválido. Use DDD + 8 ou 9 dígitos (somente números).' }); }
    if (isNaN(divida) || divida < 0) { return res.status(400).json({ error: 'Dívida deve ser um número não negativo válido.' }); }

    db.run(`INSERT INTO clientes (nomeCliente, telefone, cpf, divida, itens_associados) VALUES (?, ?, ?, ?, ?)`,
        [nomeCliente, telefone, cpf, divida, itens_associados],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: clientes.cpf')) { return res.status(409).json({ error: 'CPF já cadastrado. O CPF deve ser único.' }); }
                res.status(500).json({ error: err.message }); return;
            }
            res.status(201).json({ id: this.lastID, ...req.body });
        }
    );
});

// Atualizar um cliente existente (pode atualizar itens_associados)
app.put('/api/clientes/:id', (req, res) => {
    const { id } = req.params;
    // Aceita itens_associados do body. Se não vier, será preenchido na busca abaixo
    let { nomeCliente, telefone, cpf, divida, itens_associados } = req.body;

    telefone = String(telefone).replace(/\D/g, '');
    divida = parseFloat(divida) || 0.0;

    if (!nomeCliente || !telefone || !cpf) { return res.status(400).json({ error: 'Os campos obrigatórios (Nome, Telefone, CPF) são necessários.' }); }
    if (!isValidBrazilianPhone(telefone)) { return res.status(400).json({ error: 'Formato de telefone inválido. Use DDD + 8 ou 9 dígitos (somente números).' }); }
    if (isNaN(divida) || divida < 0) { return res.status(400).json({ error: 'Dívida deve ser um número não negativo válido.' }); }

    // Busca o cliente atual para obter o valor de itens_associados se não for fornecido no body
    db.get('SELECT itens_associados FROM clientes WHERE id = ?', [id], (err, currentClient) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (!currentClient) { return res.status(404).json({ message: 'Cliente não encontrado.' }); }

        // Use o itens_associados do body se for uma string JSON válida, caso contrário, preserve o do banco de dados
        const updatedItensAssociados = (typeof itens_associados === 'string' && (itens_associados.startsWith('[') && itens_associados.endsWith(']')))
                                       ? itens_associados
                                       : currentClient.itens_associados;

        db.run(`UPDATE clientes SET nomeCliente = ?, telefone = ?, cpf = ?, divida = ?, itens_associados = ? WHERE id = ?`,
            [nomeCliente, telefone, cpf, divida, updatedItensAssociados, id],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed: clientes.cpf')) { return res.status(409).json({ error: 'CPF já cadastrado para outro cliente. O CPF deve ser único.' }); }
                    res.status(500).json({ error: err.message }); return;
                }
                if (this.changes === 0) { res.status(404).json({ error: 'Cliente não encontrado.' }); } else { res.json({ message: 'Cliente atualizado com sucesso.' }); }
            }
        );
    });
});

app.delete('/api/clientes/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM clientes WHERE id = ?`, id, function (err) {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (this.changes === 0) { res.status(404).json({ error: 'Cliente não encontrado.' }); } else { res.json({ message: 'Cliente excluído com sucesso.' }); }
    });
});

// --- Rota API: Verificação de Senha do Administrador ---
app.post('/api/admin/verify-password', (req, res) => {
    const { password } = req.body;

    if (!password) { return res.status(400).json({ message: 'Senha é obrigatória.' }); }

    db.get('SELECT senha_hash FROM administrador LIMIT 1', (err, row) => {
        if (err) { console.error('Erro ao buscar hash da senha:', err.message); return res.status(500).json({ message: 'Erro interno do servidor.' }); }
        if (!row) { return res.status(500).json({ message: 'Nenhuma senha de administrador configurada.' }); }

        bcrypt.compare(password, row.senha_hash, (err, result) => {
            if (err) { console.error('Erro ao comparar senhas:', err); return res.status(500).json({ message: 'Erro na comparação de senha.' }); }
            if (result) { res.status(200).json({ message: 'Senha correta.' }); } else { res.status(401).json({ message: 'Senha incorreta.' }); }
        });
    });
});

// --- Rotas da API para Produtos Registrados (Vendas Históricas) ---
app.post('/api/produtos-registrados', (req, res) => {
    const { cpfCliente, nome_item, quantidade, valor_unitario } = req.body;

    if (!cpfCliente || !nome_item || !quantidade || !valor_unitario) {
        return res.status(400).json({ error: 'Todos os campos (CPF do Cliente, Item, Quantidade, Valor Unitário) são obrigatórios.' });
    }

    if (quantidade <= 0 || valor_unitario <= 0) {
        return res.status(400).json({ error: 'Quantidade e Valor Unitário devem ser maiores que zero.' });
    }

    // Primeiro, encontra o ID do cliente pelo CPF
    db.get('SELECT id FROM clientes WHERE cpf = ?', [cpfCliente], (err, clientRow) => {
        if (err) {
            console.error("Erro ao buscar cliente por CPF em produtos-registrados:", err.message);
            res.status(500).json({ error: "Erro ao registrar produto: problema com a busca do cliente." });
            return;
        }
        if (!clientRow) {
            res.status(404).json({ error: 'Cliente com CPF não encontrado. Cadastre o cliente primeiro.' });
            return;
        }

        const cliente_id = clientRow.id;
        const valor_total = quantidade * valor_unitario;
        const data_registro = new Date().toISOString(); // Data e hora atual

        db.run(`INSERT INTO produtos_registrados (cliente_id, nome_item, quantidade, valor_unitario, valor_total, data_registro) VALUES (?, ?, ?, ?, ?, ?)`,
            [cliente_id, nome_item, quantidade, valor_unitario, valor_total, data_registro],
            function (err) {
                if (err) {
                    console.error("Erro ao inserir produto registrado:", err.message);
                    res.status(500).json({ error: "Erro ao inserir produto registrado." });
                    return;
                }
                res.status(201).json({ id: this.lastID, ...req.body, cliente_id, valor_total, data_registro });
            }
        );
    });
});

// GET: Obter todos os produtos registrados (para exibição na página adicionar_produtos.html)
app.get('/api/produtos-registrados', (req, res) => {
    const sql = `
        SELECT
            pr.id,
            pr.nome_item,
            pr.quantidade,
            pr.valor_unitario,
            pr.valor_total,
            pr.data_registro,
            c.nomeCliente,
            c.cpf
        FROM produtos_registrados pr
        JOIN clientes c ON pr.cliente_id = c.id
        ORDER BY pr.data_registro DESC
        LIMIT 20
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Erro ao buscar produtos registrados:", err.message);
            res.status(500).json({ error: "Erro ao buscar produtos registrados." });
            return;
        }
        res.json(rows);
    });
});


// --- Rotas da API para Estoque ---
// Obter lista simples de produtos do estoque (id, produto, precoDeVenda) para selects
app.get('/api/estoque/list-for-select', (req, res) => {
    db.all('SELECT id, produto, precoDeVenda FROM estoque ORDER BY produto ASC', [], (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        res.json(rows);
    });
});
app.get('/api/estoque', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    let totalItems = 0;
    db.get('SELECT COUNT(*) AS count FROM estoque', [], (err, row) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        totalItems = row.count;
        db.all('SELECT * FROM estoque LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
            if (err) { res.status(500).json({ error: err.message }); return; }
            res.json({ data: rows, currentPage: page, perPage: limit, totalItems: totalItems, totalPages: Math.ceil(totalItems / limit) });
        });
    });
});
app.post('/api/estoque', (req, res) => {
    const { produto, quantidade, precoDeCompra, precoDeVenda } = req.body;

    if (!produto || quantidade === undefined || precoDeCompra === undefined || precoDeVenda === undefined) {
        return res.status(400).json({ error: 'Todos os campos (Produto, Quantidade, Preço de Compra, Preço de Venda) são obrigatórios.' });
    }
    if (quantidade < 0 || precoDeCompra < 0 || precoDeVenda < 0) {
        return res.status(400).json({ error: 'Valores de Quantidade, Preço de Compra e Preço de Venda não podem ser negativos.' });
    }

    db.run(`INSERT INTO estoque (produto, quantidade, precoDeCompra, precoDeVenda) VALUES (?, ?, ?, ?)`,
        [produto, quantidade, precoDeCompra, precoDeVenda],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: estoque.produto')) {
                    return res.status(409).json({ error: 'Produto com este nome já existe no estoque.' });
                }
                res.status(201).json({ id: this.lastID, ...req.body });
            }
        }
    );
});
app.put('/api/estoque/:id', (req, res) => {
    const { id } = req.params;
    const { produto, quantidade, precoDeCompra, precoDeVenda } = req.body;

    if (!produto || quantidade === undefined || precoDeCompra === undefined || precoDeVenda === undefined) {
        return res.status(400).json({ error: 'Todos os campos (Produto, Quantidade, Preço de Compra, Preço de Venda) são obrigatórios.' });
    }
    if (quantidade < 0 || precoDeCompra < 0 || precoDeVenda < 0) {
        return res.status(400).json({ error: 'Valores de Quantidade, Preço de Compra e Preço de Venda não podem ser negativos.' });
    }

    db.run(`UPDATE estoque SET produto = ?, quantidade = ?, precoDeCompra = ?, precoDeVenda = ? WHERE id = ?`,
        [produto, quantidade, precoDeCompra, precoDeVenda, id],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: estoque.produto')) {
                    return res.status(409).json({ error: 'Produto com este nome já existe no estoque.' });
                }
                res.status(500).json({ error: err.message }); return;
            }
            if (this.changes === 0) { res.status(404).json({ error: 'Item de estoque não encontrado.' }); } else { res.json({ message: 'Item de estoque atualizado com sucesso.' }); }
        }
    );
});
app.delete('/api/estoque/:id', (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM estoque WHERE id = ?`, id, function (err) {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (this.changes === 0) { res.status(404).json({ error: 'Item de estoque não encontrado.' }); } else { res.json({ message: 'Item de estoque excluído com sucesso.' }); }
    });
});

// --- Rotas para GERENCIAR ITENS ASSOCIADOS AO CLIENTE (diretamente no campo 'itens_associados') ---

// POST: Adicionar um item à lista de itens_associados de um cliente
app.post('/api/clientes/:id/itens', (req, res) => {
    const clientId = req.params.id;
    const { produto_id, quantidade } = req.body; // Recebe o ID do produto do estoque e a quantidade

    if (!produto_id || !quantidade || quantidade <= 0) {
        return res.status(400).json({ error: 'Produto (ID) e quantidade (> 0) são obrigatórios.' });
    }

    // 1. Busca o cliente para obter sua lista atual de itens_associados
    db.get('SELECT itens_associados FROM clientes WHERE id = ?', [clientId], (err, clientRow) => {
        if (err) { console.error('Erro ao buscar cliente para adicionar item:', err.message); res.status(500).json({ error: 'Erro interno ao buscar cliente.' }); return; }
        if (!clientRow) { return res.status(404).json({ message: 'Cliente não encontrado.' }); }

        let itens = [];
        try {
            itens = JSON.parse(clientRow.itens_associados || '[]'); // Parseia o JSON, ou inicia com array vazio
        } catch (e) {
            console.error('Erro ao parsear itens_associados do cliente:', e);
            itens = []; // Reseta se o JSON estiver corrompido
        }
        
        // 2. Busca os detalhes do produto do estoque para obter o NOME e o precoDeVenda
        db.get('SELECT produto, precoDeVenda FROM estoque WHERE id = ?', [produto_id], (err, productRow) => {
            if (err) { console.error('Erro ao buscar produto do estoque:', err.message); res.status(500).json({ error: 'Erro interno ao buscar produto.' }); return; }
            if (!productRow) { return res.status(404).json({ message: 'Produto não encontrado no estoque.' }); }

            const newItem = {
                // Geramos um ID único para o item dentro do array (timestamp)
                id: Date.now(), 
                produto_id: productRow.id, // Guarda o ID do estoque para referência, se necessário
                nome: productRow.produto,
                quantidade: quantidade,
                preco_venda_unitario: productRow.precoDeVenda // Guarda o preço de venda no momento da associação
            };

            itens.push(newItem); // Adiciona o novo item
            const updatedItensAssociados = JSON.stringify(itens); // Converte de volta para string JSON

            // 3. Atualiza o registro do cliente com a nova lista de itens
            db.run('UPDATE clientes SET itens_associados = ? WHERE id = ?', [updatedItensAssociados, clientId], function(err) {
                if (err) { console.error('Erro ao atualizar cliente com novo item:', err.message); res.status(500).json({ error: 'Erro ao salvar item no cliente.' }); return; }
                res.status(200).json({ message: 'Item adicionado ao cliente com sucesso.', item: newItem });
            });
        });
    });
});

// DELETE: Remover um item da lista itens_associados de um cliente
app.delete('/api/clientes/:cliente_id/itens/:item_id_in_array', (req, res) => {
    const clientId = req.params.cliente_id;
    const itemIdInArray = parseInt(req.params.item_id_in_array); // O ID único gerado (timestamp)

    if (isNaN(itemIdInArray)) {
        return res.status(400).json({ error: 'ID do item inválido para remoção.' });
    }

    db.get('SELECT itens_associados FROM clientes WHERE id = ?', [clientId], (err, clientRow) => {
        if (err) { console.error('Erro ao buscar cliente para remover item:', err.message); res.status(500).json({ error: 'Erro interno ao buscar cliente.' }); return; }
        if (!clientRow) { return res.status(404).json({ message: 'Cliente não encontrado.' }); }

        let itens = [];
        try {
            itens = JSON.parse(clientRow.itens_associados || '[]');
        } catch (e) {
            console.error('Erro ao parsear itens_associados do cliente para remoção:', e);
            itens = [];
        }

        const initialLength = itens.length;
        // Filtra o item a ser removido pelo seu ID único dentro do array
        const updatedItens = itens.filter(item => item.id !== itemIdInArray);

        if (updatedItens.length === initialLength) {
            return res.status(404).json({ message: 'Item não encontrado na lista do cliente.' });
        }

        const updatedItensAssociados = JSON.stringify(updatedItens);

        db.run('UPDATE clientes SET itens_associados = ? WHERE id = ?', [updatedItensAssociados, clientId], function(err) {
            if (err) { console.error('Erro ao atualizar cliente após remover item:', err.message); res.status(500).json({ error: 'Erro ao remover item do cliente.' }); return; }
            res.status(200).json({ message: 'Item removido do cliente com sucesso.' });
        });
    });
});


// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

