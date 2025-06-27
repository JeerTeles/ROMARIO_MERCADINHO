const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;
const DB_FILE = './server/database.sqlite';

// --- Função de Validação de Telefone Brasileiro (BACKEND) ---
function isValidBrazilianPhone(phone) {
    if (!phone) return false;
    const cleanedPhone = String(phone).replace(/\D/g, '');
    return (cleanedPhone.length === 10 || cleanedPhone.length === 11) && cleanedPhone !== '';
}

app.use(express.json());
app.use(cors());

// Conecta ao banco de dados SQLite e inicializa tabelas
const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');

        // --- Criação da Tabela 'clientes' (com item INTEGER e quantidade INTEGER) ---
        // Ao excluir database.sqlite, esta lógica a criará do zero com a nova estrutura.
        db.run(`CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nomeCliente TEXT NOT NULL,
            telefone TEXT NOT NULL,
            cpf TEXT UNIQUE NOT NULL,
            item INTEGER DEFAULT 0,       -- AGORA É INTEGER novamente (ID do produto)
            quantidade INTEGER DEFAULT 0, -- AGORA É INTEGER novamente
            divida REAL DEFAULT 0.0       -- Continua REAL
        )`, (err) => {
            if (err) { console.error('Erro ao criar tabela "clientes":', err.message); } else { console.log('Tabela "clientes" criada ou já existe.'); }
        });

        // Tabela 'cliente_produtos' (para N para N - Multiplos itens por cliente)
        db.run(`CREATE TABLE IF NOT EXISTS cliente_produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            produto_id INTEGER NOT NULL,
            quantidade_vendida INTEGER NOT NULL,
            valor_unitario_vendido REAL NOT NULL,
            valor_total_item REAL NOT NULL,
            data_venda TEXT NOT NULL,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
            FOREIGN KEY (produto_id) REFERENCES estoque(id) ON DELETE RESTRICT
        )`, (err) => {
            if (err) { console.error('Erro ao criar tabela "cliente_produtos":', err.message); } else { console.log('Tabela "cliente_produtos" criada ou já existe.'); }
        });

        // Tabela 'produtos_registrados' (mantida como estava)
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

        // Tabela 'estoque' (existente)
        db.run(`CREATE TABLE IF NOT EXISTS estoque (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto TEXT NOT NULL UNIQUE,
            quantidade INTEGER NOT NULL,
            precoDeCompra REAL NOT NULL,
            precoDeVenda REAL NOT NULL
        )`, (err) => {
            if (err) { console.error('Erro ao criar tabela "estoque":', err.message); } else { console.log('Tabela "estoque" criada ou já existe.'); }
        });

        // Tabela 'administrador' (existente)
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

// MODIFICADA: Obter todos os clientes com paginação (faz JOIN com estoque para nome do produto)
app.get('/api/clientes', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let totalClients = 0;

    db.get('SELECT COUNT(*) AS count FROM clientes', [], (err, row) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        totalClients = row.count;

        // Selecionando os campos do cliente e o nome do produto do estoque
        const sql = `
            SELECT 
                c.id, c.nomeCliente, c.telefone, c.cpf, c.item, c.quantidade, c.divida,
                e.produto AS nomeProdutoItem -- Nome do produto do estoque (se houver)
            FROM clientes c
            LEFT JOIN estoque e ON c.item = e.id -- JOIN para pegar o nome do produto
            LIMIT ? OFFSET ?
        `;
        db.all(sql, [limit, offset], (err, rows) => {
            if (err) { res.status(500).json({ error: err.message }); return; }
            res.json({
                data: rows,
                currentPage: page,
                perPage: limit,
                totalItems: totalClients,
                totalPages: Math.ceil(totalClients / limit)
            });
        });
    });
});

// MODIFICADA: Rota para buscar cliente por CPF (faz JOIN com estoque para nome do produto)
app.get('/api/clientes/cpf/:cpf', (req, res) => {
    const cpf = req.params.cpf;
    const sql = `
        SELECT
            c.id, c.nomeCliente, c.telefone, c.cpf, c.item, c.quantidade, c.divida,
            e.produto AS nomeProdutoItem
        FROM clientes c
        LEFT JOIN estoque e ON c.item = e.id
        WHERE c.cpf = ?
    `;
    db.get(sql, [cpf], (err, row) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (!row) { res.status(404).json({ message: 'Cliente não encontrado com este CPF.' }); } else { res.json(row); }
    });
});

// MODIFICADA: Rota para buscar clientes por nome (faz JOIN com estoque para nome do produto)
app.get('/api/clientes/nome/:nome', (req, res) => {
    const nome = req.params.nome;
    const sql = `
        SELECT
            c.id, c.nomeCliente, c.telefone, c.cpf, c.item, c.quantidade, c.divida,
            e.produto AS nomeProdutoItem
        FROM clientes c
        LEFT JOIN estoque e ON c.item = e.id
        WHERE c.nomeCliente LIKE ?
    `;
    db.all(sql, [`%${nome}%`], (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (rows.length === 0) { res.status(404).json({ message: 'Nenhum cliente encontrado com este nome.' }); } else { res.json(rows); }
    });
});

// MODIFICADA: Adicionar um novo cliente (define item e quantidade como padrão)
app.post('/api/clientes', (req, res) => {
    let { nomeCliente, telefone, cpf, divida } = req.body; // 'item' e 'quantidade' NÃO vêm do formulário

    telefone = String(telefone).replace(/\D/g, '');
    divida = parseFloat(divida) || 0.0;
    const item = 0; // Valor padrão
    const quantidade = 0; // Valor padrão

    if (!nomeCliente || !telefone || !cpf) {
        return res.status(400).json({ error: 'Os campos obrigatórios (Nome, Telefone, CPF) são necessários.' });
    }
    if (!isValidBrazilianPhone(telefone)) {
        return res.status(400).json({ error: 'Formato de telefone inválido. Use DDD + 8 ou 9 dígitos (somente números).' });
    }
    if (isNaN(divida) || divida < 0) {
        return res.status(400).json({ error: 'Dívida deve ser um número não negativo válido.' });
    }

    db.run(`INSERT INTO clientes (nomeCliente, telefone, cpf, item, quantidade, divida) VALUES (?, ?, ?, ?, ?, ?)`,
        [nomeCliente, telefone, cpf, item, quantidade, divida],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: clientes.cpf')) { return res.status(409).json({ error: 'CPF já cadastrado. O CPF deve ser único.' }); }
                res.status(500).json({ error: err.message }); return;
            }
            res.status(201).json({ id: this.lastID, ...req.body });
        }
    );
});

// MODIFICADA: Atualizar um cliente existente (define item e quantidade como padrão, ou aceita se enviado)
app.put('/api/clientes/:id', (req, res) => {
    const { id } = req.params;
    let { nomeCliente, telefone, cpf, item, quantidade, divida } = req.body; // item e quantidade podem vir ou não

    telefone = String(telefone).replace(/\D/g, '');
    divida = parseFloat(divida) || 0.0;

    // Se item e quantidade não foram enviados no body (do frontend de cadastro), usa os valores existentes no DB
    // A query de update será mais inteligente
    // Para simplificar, assumimos que esta rota de PUT pode atualizar tudo,
    // mas o frontend de cadastro não envia item/quantidade.
    // O frontend de consulta enviaria se tivesse um formulário de edição completo.

    if (!nomeCliente || !telefone || !cpf) {
        return res.status(400).json({ error: 'Os campos obrigatórios (Nome, Telefone, CPF) são necessários.' });
    }
    if (!isValidBrazilianPhone(telefone)) {
        return res.status(400).json({ error: 'Formato de telefone inválido. Use DDD + 8 ou 9 dígitos (somente números).' });
    }
    if (isNaN(divida) || divida < 0) {
        return res.status(400).json({ error: 'Dívida deve ser um número não negativo válido.' });
    }

    // Busca os valores atuais do cliente para preservar item e quantidade se não forem fornecidos
    db.get('SELECT item, quantidade FROM clientes WHERE id = ?', [id], (err, currentClient) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (!currentClient) { res.status(404).json({ error: 'Cliente não encontrado.' }); return; }

        // Usa os valores do body se existirem, caso contrário, usa os valores atuais do DB
        const updatedItem = (item !== undefined && item !== null) ? parseInt(item) || 0 : currentClient.item;
        const updatedQuantidade = (quantidade !== undefined && quantidade !== null) ? parseInt(quantidade) || 0 : currentClient.quantidade;

        db.run(`UPDATE clientes SET nomeCliente = ?, telefone = ?, cpf = ?, item = ?, quantidade = ?, divida = ? WHERE id = ?`,
            [nomeCliente, telefone, cpf, updatedItem, updatedQuantidade, divida, id],
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

app.delete('/api/clientes/:id', (req, res) => { /* ... */ });

// --- Rota API: Verificação de Senha do Administrador (existente) ---
app.post('/api/admin/verify-password', (req, res) => { /* ... */ });

// --- Rotas da API para Produtos Registrados (Vendas/Itens para Clientes) ---
// Mantidas como estão
/*app.post('/api/produtos-registrados', (req, res) => {  ...  });
app.get('/api/produtos-registrados', (req, res) => { ... });*/

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
    // JOIN com a tabela clientes para trazer os dados do cliente também
    const sql = `
        SELECT
            pr.id,
            pr.nome_item,
            pr.quantidade,
            pr.valor_unitario,
            pr.valor_total,
            pr.data_registro,
            c.nomeCliente, -- Nome do cliente
            c.cpf          -- CPF do cliente
        FROM produtos_registrados pr
        JOIN clientes c ON pr.cliente_id = c.id
        ORDER BY pr.data_registro DESC
        LIMIT 20 -- Limitar para mostrar apenas os últimos 20, por exemplo
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

app.get('/api/estoque', (req, res) => {
    const page = parseInt(req.query.page) || 1; // Página atual, padrão 1
    const limit = parseInt(req.query.limit) || 10; // Itens por página, padrão 10
    const offset = (page - 1) * limit; // Offset para a consulta SQL

    let totalItems = 0;

    // Primeiro, obtém a contagem total de itens no estoque
    db.get('SELECT COUNT(*) AS count FROM estoque', [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        totalItems = row.count;

        // Em seguida, obtém os itens para a página atual
        db.all('SELECT * FROM estoque LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                data: rows, // Dados dos itens da página atual
                currentPage: page,
                perPage: limit,
                totalItems: totalItems,
                totalPages: Math.ceil(totalItems / limit) // Calcula o total de páginas
            });
        });
    });
});



// --- Rotas da API para Estoque ---
// Rota para obter lista simples de produtos do estoque (id e produto) para selects
app.get('/api/estoque/list-for-select', (req, res) => { /* ... */ });
//app.get('/api/estoque', (req, res) => { /* ... */ });
app.post('/api/estoque', (req, res) => { /* ... */ });
app.put('/api/estoque/:id', (req, res) => { /* ... */ });
app.delete('/api/estoque/:id', (req, res) => { /* ... */ });

// --- NOVAS ROTAS PARA A TABELA 'cliente_produtos' (Associação N para N) ---

// POST: Associar um produto a um cliente
app.post('/api/cliente-produtos', (req, res) => {
    const { cliente_id, produto_id, quantidade_vendida, valor_unitario_vendido } = req.body;

    if (!cliente_id || !produto_id || !quantidade_vendida || !valor_unitario_vendido) {
        return res.status(400).json({ error: 'Todos os campos (cliente_id, produto_id, quantidade_vendida, valor_unitario_vendido) são obrigatórios.' });
    }
    if (quantidade_vendida <= 0 || valor_unitario_vendido < 0) {
        return res.status(400).json({ error: 'Quantidade deve ser maior que zero e Valor Unitário não negativo.' });
    }

    const valor_total_item = quantidade_vendida * valor_unitario_vendido;
    const data_venda = new Date().toISOString();

    db.run(`INSERT INTO cliente_produtos (cliente_id, produto_id, quantidade_vendida, valor_unitario_vendido, valor_total_item, data_venda) VALUES (?, ?, ?, ?, ?, ?)`,
        [cliente_id, produto_id, quantidade_vendida, valor_unitario_vendido, valor_total_item, data_venda],
        function (err) {
            if (err) {
                console.error("Erro ao associar produto ao cliente:", err.message);
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json({ id: this.lastID, ...req.body, valor_total_item, data_venda });
        }
    );
});

// GET: Obter todos os produtos associados a um cliente específico
app.get('/api/clientes/:cliente_id/produtos', (req, res) => {
    const cliente_id = req.params.cliente_id;
    const sql = `
        SELECT
            cp.id, cp.produto_id, cp.quantidade_vendida, cp.valor_unitario_vendido, cp.valor_total_item, cp.data_venda,
            e.produto AS nome_produto_estoque -- Nome do produto do estoque
        FROM cliente_produtos cp
        JOIN estoque e ON cp.produto_id = e.id
        WHERE cp.cliente_id = ?
        ORDER BY cp.data_venda DESC
    `;
    db.all(sql, [cliente_id], (err, rows) => {
        if (err) {
            console.error("Erro ao buscar produtos associados ao cliente:", err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// DELETE: Remover uma associação de produto de um cliente
app.delete('/api/cliente-produtos/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM cliente_produtos WHERE id = ?`, id, function (err) {
        if (err) {
            console.error("Erro ao deletar associação de produto:", err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) { res.status(404).json({ error: 'Associação de produto não encontrada.' }); } else { res.json({ message: 'Associação de produto excluída com sucesso.' }); }
    });
});


// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
