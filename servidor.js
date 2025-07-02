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

        // --- Criação da Tabela 'clientes' (SEM campos item, quantidade) ---
        db.run(`CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nomeCliente TEXT NOT NULL,
            telefone TEXT NOT NULL,
            cpf TEXT UNIQUE NOT NULL,
            divida REAL DEFAULT 0.0       -- Dívida geral do cliente
        )`, (err) => {
            if (err) { console.error('Erro ao criar tabela "clientes":', err.message); } else { console.log('Tabela "clientes" criada ou já existe.'); }
        });

        // --- NOVA TABELA DE LIGAÇÃO: 'cliente_produtos' (para N para N) ---
        // Associa um cliente a um produto específico do estoque com quantidade e preço de venda no momento
        db.run(`CREATE TABLE IF NOT EXISTS cliente_produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            produto_id INTEGER NOT NULL,
            quantidade_vendida INTEGER NOT NULL,
            valor_unitario_vendido REAL NOT NULL,
            valor_total_item REAL NOT NULL,
            data_venda TEXT NOT NULL,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
            FOREIGN KEY (produto_id) REFERENCES estoque(id) ON DELETE RESTRICT -- Impede apagar produto se estiver associado a uma venda
        )`, (err) => {
            if (err) { console.error('Erro ao criar tabela "cliente_produtos":', err.message); } else { console.log('Tabela "cliente_produtos" criada ou já existe.'); }
        });


        // Tabela 'produtos_registrados' (antiga, agora pode ser redundante com cliente_produtos, mas mantida por enquanto)
        // Se a funcionalidade de 'produtos_registrados' se refere a algo diferente de 'itens que um cliente possui',
        // ela pode ser mantida. Caso contrário, 'cliente_produtos' a substitui.
        // Vou manter a estrutura atual do usuário para evitar quebrar outras partes, mas com essa observação.
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

// MODIFICADA: Obter todos os clientes com paginação (agora SEM item, quantidade)
app.get('/api/clientes', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let totalClients = 0;

    db.get('SELECT COUNT(*) AS count FROM clientes', [], (err, row) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        totalClients = row.count;

        // Selecionando apenas os campos da tabela clientes
        db.all('SELECT id, nomeCliente, telefone, cpf, divida FROM clientes LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
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

// MODIFICADA: Rota para buscar cliente por CPF (agora SEM item, quantidade)
app.get('/api/clientes/cpf/:cpf', (req, res) => {
    const cpf = req.params.cpf;
    db.get('SELECT id, nomeCliente, telefone, cpf, divida FROM clientes WHERE cpf = ?', [cpf], (err, row) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (!row) { res.status(404).json({ message: 'Cliente não encontrado com este CPF.' }); } else { res.json(row); }
    });
});

// MODIFICADA: Rota para buscar clientes por nome (agora SEM item, quantidade)
app.get('/api/clientes/nome/:nome', (req, res) => {
    const nome = req.params.nome;
    db.all('SELECT id, nomeCliente, telefone, cpf, divida FROM clientes WHERE nomeCliente LIKE ?', [`%${nome}%`], (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (rows.length === 0) { res.status(404).json({ message: 'Nenhum cliente encontrado com este nome.' }); } else { res.json(rows); }
    });
});

// MODIFICADA: Adicionar um novo cliente (SEM campos item, quantidade no body)
app.post('/api/clientes', (req, res) => {
    let { nomeCliente, telefone, cpf, divida } = req.body; // 'item' e 'quantidade' removidos

    telefone = String(telefone).replace(/\D/g, '');
    divida = parseFloat(divida) || 0.0;

    if (!nomeCliente || !telefone || !cpf) {
        return res.status(400).json({ error: 'Os campos obrigatórios (Nome, Telefone, CPF) são necessários.' });
    }
    if (!isValidBrazilianPhone(telefone)) {
        return res.status(400).json({ error: 'Formato de telefone inválido. Use DDD + 8 ou 9 dígitos (somente números).' });
    }
    if (isNaN(divida) || divida < 0) {
        return res.status(400).json({ error: 'Dívida deve ser um número não negativo válido.' });
    }

    db.run(`INSERT INTO clientes (nomeCliente, telefone, cpf, divida) VALUES (?, ?, ?, ?)`,
        [nomeCliente, telefone, cpf, divida],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: clientes.cpf')) { return res.status(409).json({ error: 'CPF já cadastrado. O CPF deve ser único.' }); }
                res.status(500).json({ error: err.message }); return;
            }
            res.status(201).json({ id: this.lastID, ...req.body });
        }
    );
});

// MODIFICADA: Atualizar um cliente existente (SEM campos item, quantidade no body)
app.put('/api/clientes/:id', (req, res) => {
    const { id } = req.params;
    let { nomeCliente, telefone, cpf, divida } = req.body; // 'item' e 'quantidade' removidos

    telefone = String(telefone).replace(/\D/g, '');
    divida = parseFloat(divida) || 0.0;

    if (!nomeCliente || !telefone || !cpf) {
        return res.status(400).json({ error: 'Os campos obrigatórios (Nome, Telefone, CPF) são necessários.' });
    }
    if (!isValidBrazilianPhone(telefone)) {
        return res.status(400).json({ error: 'Formato de telefone inválido. Use DDD + 8 ou 9 dígitos (somente números).' });
    }
    if (isNaN(divida) || divida < 0) {
        return res.status(400).json({ error: 'Dívida deve ser um número não negativo válido.' });
    }

    db.run(`UPDATE clientes SET nomeCliente = ?, telefone = ?, cpf = ?, divida = ? WHERE id = ?`,
        [nomeCliente, telefone, cpf, divida, id],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: clientes.cpf')) { return res.status(409).json({ error: 'CPF já cadastrado para outro cliente. O CPF deve ser único.' }); }
                res.status(500).json({ error: err.message }); return;
            }
            if (this.changes === 0) { res.status(404).json({ error: 'Cliente não encontrado.' }); } else { res.json({ message: 'Cliente atualizado com sucesso.' }); }
            }
    );
});

app.delete('/api/clientes/:id', (req, res) => { /* ... */ });

// --- Rota API: Verificação de Senha do Administrador (existente) ---
app.post('/api/admin/verify-password', (req, res) => { /* ... */ });

// --- Rotas da API para Produtos Registrados (Vendas/Itens para Clientes) ---
// Mantidas como estão, assumindo que são para um propósito diferente de 'cliente_produtos'
app.post('/api/produtos-registrados', (req, res) => { /* ... */ });
app.get('/api/produtos-registrados', (req, res) => { /* ... */ });


// --- Rotas da API para Estoque ---
// Rota para obter lista simples de produtos do estoque (id e produto) para selects
app.get('/api/estoque/list-for-select', (req, res) => { /* ... */ });
app.get('/api/estoque', (req, res) => { /* ... */ });
app.post('/api/estoque', (req, res) => { /* ... */ });
app.put('/api/estoque/:id', (req, res) => { /* ... */ });
app.delete('/api/estoque/:id', (req, res) => { /* ... */ });

// --- NOVAS ROTAS PARA A TABELA 'cliente_produtos' ---

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